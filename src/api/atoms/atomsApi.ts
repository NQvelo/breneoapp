import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import type {
  Atom,
  AtomSubmitResult,
  NextAtomResult,
  Profession,
  ProfessionAssignment,
} from "./types";
import type {
  AtomPathItem,
  AtomPathStatus,
  ProfessionAtomPath,
} from "./pathTypes";

const PATH_CACHE_KEY = "breneo:atom-path-cache";

type AtomCatalogItem = Pick<AtomPathItem, "id" | "title" | "sequence_order">;

interface PathCacheEntry {
  atoms: AtomCatalogItem[];
}

const CATALOG_ENDPOINTS = (professionId: number) => [
  API_ENDPOINTS.ATOMS.LIST(professionId),
  `/api/professions/${professionId}/atoms/`,
];

function parseNextAtomError(detail: unknown): NextAtomResult["errorReason"] {
  const message =
    typeof detail === "string"
      ? detail
      : typeof detail === "object" && detail !== null && "detail" in detail
        ? String((detail as { detail: unknown }).detail)
        : "";

  if (message.includes("Profession not found")) return "profession_not_found";
  if (message.includes("no atoms")) return "no_atoms";
  if (message.includes("completed all atoms")) return "all_completed";
  return "unknown";
}

function readPathCache(professionId: number): AtomCatalogItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PATH_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, PathCacheEntry>;
    return parsed[String(professionId)]?.atoms ?? [];
  } catch {
    return [];
  }
}

function writePathCache(professionId: number, atoms: AtomCatalogItem[]) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(PATH_CACHE_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as Record<string, PathCacheEntry>)
      : {};
    const merged = new Map<number, AtomCatalogItem>();
    [...(parsed[String(professionId)]?.atoms ?? []), ...atoms].forEach((atom) => {
      merged.set(atom.sequence_order, atom);
    });
    parsed[String(professionId)] = {
      atoms: [...merged.values()].sort(
        (a, b) => a.sequence_order - b.sequence_order,
      ),
    };
    localStorage.setItem(PATH_CACHE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore storage errors
  }
}

function normalizeStatus(value: unknown): AtomPathStatus | null {
  if (value === "locked" || value === "available" || value === "completed") {
    return value;
  }
  return null;
}

function pickString(raw: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function pickNumber(raw: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = Number(raw[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

function normalizeCatalogItem(
  raw: Record<string, unknown>,
): AtomCatalogItem | null {
  const id = pickNumber(raw, ["id", "atom_id", "pk"]);
  const sequence_order = pickNumber(raw, [
    "sequence_order",
    "sequence",
    "order",
    "ordering",
  ]);
  const title = pickString(raw, ["title", "name", "lesson_title"]);

  if (!id || !sequence_order) return null;

  return {
    id,
    title: title || `Lesson ${sequence_order}`,
    sequence_order,
  };
}

function extractAtomsArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;

  if (!data || typeof data !== "object") return [];

  const payload = data as Record<string, unknown>;
  if (Array.isArray(payload.atoms)) return payload.atoms;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;

  return [];
}

function normalizeCatalog(data: unknown): AtomCatalogItem[] {
  const merged = new Map<number, AtomCatalogItem>();

  extractAtomsArray(data).forEach((item) => {
    if (!item || typeof item !== "object") return;
    const normalized = normalizeCatalogItem(item as Record<string, unknown>);
    if (normalized) merged.set(normalized.sequence_order, normalized);
  });

  return [...merged.values()].sort(
    (a, b) => a.sequence_order - b.sequence_order,
  );
}

function normalizePathItemWithStatus(
  raw: Record<string, unknown>,
): AtomPathItem | null {
  const catalogItem = normalizeCatalogItem(raw);
  if (!catalogItem) return null;

  const explicitStatus = normalizeStatus(raw.status);
  if (explicitStatus) {
    return { ...catalogItem, status: explicitStatus };
  }

  if (raw.is_completed === true || raw.completed === true) {
    return { ...catalogItem, status: "completed" };
  }

  if (
    raw.is_unlocked === false ||
    raw.is_locked === true ||
    raw.locked === true
  ) {
    return { ...catalogItem, status: "locked" };
  }

  if (
    raw.is_unlocked === true ||
    raw.is_current === true ||
    raw.unlocked === true
  ) {
    return { ...catalogItem, status: "available" };
  }

  return null;
}

function normalizeProfessionAtomPath(
  data: unknown,
  professionId: number,
): ProfessionAtomPath | null {
  const payload =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;

  const atomsRaw = extractAtomsArray(data);
  const atomsWithStatus = atomsRaw
    .map((item) =>
      item && typeof item === "object"
        ? normalizePathItemWithStatus(item as Record<string, unknown>)
        : null,
    )
    .filter((item): item is AtomPathItem => item !== null)
    .sort((a, b) => a.sequence_order - b.sequence_order);

  if (
    atomsWithStatus.length === 0 ||
    atomsWithStatus.length !== atomsRaw.length
  ) {
    return null;
  }

  const completed_count = atomsWithStatus.filter(
    (a) => a.status === "completed",
  ).length;
  const current =
    atomsWithStatus.find((a) => a.status === "available") ??
    atomsWithStatus.find((a) => a.status === "locked");

  return {
    profession_id: Number(payload?.profession_id) || professionId,
    profession_title:
      typeof payload?.profession_title === "string"
        ? payload.profession_title
        : "",
    atoms: atomsWithStatus,
    current_atom_id: current?.id ?? null,
    completed_count,
    total_count: atomsWithStatus.length,
  };
}

function mergeCatalog(
  primary: AtomCatalogItem[],
  secondary: AtomCatalogItem[],
): AtomCatalogItem[] {
  const merged = new Map<number, AtomCatalogItem>();
  [...primary, ...secondary].forEach((atom) => {
    merged.set(atom.sequence_order, atom);
  });
  return [...merged.values()].sort(
    (a, b) => a.sequence_order - b.sequence_order,
  );
}

function fillSequenceGaps(
  catalog: AtomCatalogItem[],
  maxSequence: number,
): AtomCatalogItem[] {
  if (maxSequence <= 0) return catalog;

  const byOrder = new Map(catalog.map((atom) => [atom.sequence_order, atom]));
  const filled: AtomCatalogItem[] = [];

  for (let order = 1; order <= maxSequence; order += 1) {
    filled.push(
      byOrder.get(order) ?? {
        id: -(order * 1000),
        title: `Lesson ${order}`,
        sequence_order: order,
      },
    );
  }

  return filled;
}

function catalogFromPathItems(atoms: AtomPathItem[]): AtomCatalogItem[] {
  return atoms.map(({ id, title, sequence_order }) => ({
    id,
    title,
    sequence_order,
  }));
}

function pathNeedsProgressMerge(path: ProfessionAtomPath): boolean {
  return (
    path.completed_count < path.total_count &&
    !path.atoms.some((atom) => atom.status === "available")
  );
}

async function fetchAtomCatalog(professionId: number): Promise<AtomCatalogItem[]> {
  let catalog: AtomCatalogItem[] = [];

  for (const endpoint of CATALOG_ENDPOINTS(professionId)) {
    try {
      const { data } = await apiClient.get(endpoint);
      const withStatus = normalizeProfessionAtomPath(data, professionId);

      if (withStatus) {
        catalog = mergeCatalog(catalog, catalogFromPathItems(withStatus.atoms));
        continue;
      }

      catalog = mergeCatalog(catalog, normalizeCatalog(data));
    } catch {
      // Catalog endpoints are optional — always fall back to next-atom.
    }
  }

  return mergeCatalog(catalog, readPathCache(professionId));
}

function applyProgressToCatalog(
  professionId: number,
  catalog: AtomCatalogItem[],
  next: NextAtomResult,
  professionTitle = "",
): ProfessionAtomPath | null {
  if (next.errorReason === "no_atoms") return null;

  if (next.errorReason === "all_completed") {
    const atoms = catalog.map((atom) => ({
      ...atom,
      status: "completed" as const,
    }));

    if (atoms.length === 0) return null;

    return {
      profession_id: professionId,
      profession_title: professionTitle,
      atoms,
      current_atom_id: null,
      completed_count: atoms.length,
      total_count: atoms.length,
    };
  }

  const current = next.atom;
  if (!current) return null;

  const catalogWithPreview = mergeCatalog(
    catalog,
    current.path_atoms?.map((atom) => ({
      id: atom.id,
      title: atom.title,
      sequence_order: atom.sequence_order,
    })) ?? [],
  );

  const maxSequence = Math.max(
    current.sequence_order,
    current.total_atoms ?? 0,
    catalogWithPreview.at(-1)?.sequence_order ?? 0,
  );
  const fullCatalog = fillSequenceGaps(catalogWithPreview, maxSequence);

  const atoms: AtomPathItem[] = fullCatalog.map((atom) => {
    let status: AtomPathStatus = "locked";
    if (atom.sequence_order < current.sequence_order) {
      status = "completed";
    } else if (
      atom.id === current.id ||
      atom.sequence_order === current.sequence_order
    ) {
      status = "available";
    }
    return { ...atom, status };
  });

  writePathCache(professionId, fullCatalog);

  return {
    profession_id: professionId,
    profession_title: current.profession_title || professionTitle,
    atoms,
    current_atom_id: current.id,
    completed_count: atoms.filter((a) => a.status === "completed").length,
    total_count: atoms.length,
  };
}

export const atomsApi = {
  async listProfessions(): Promise<Profession[]> {
    const { data } = await apiClient.get<Profession[]>(
      API_ENDPOINTS.PROFESSIONS.LIST,
    );
    return Array.isArray(data) ? data : [];
  },

  async getMyProfessions(): Promise<ProfessionAssignment[]> {
    const { data } = await apiClient.get<ProfessionAssignment[]>(
      API_ENDPOINTS.ME.MATCHED_PROFESSIONS,
    );
    return Array.isArray(data) ? data : [];
  },

  async getProfessionAtomPath(
    professionId: number,
  ): Promise<ProfessionAtomPath | null> {
    try {
      for (const endpoint of CATALOG_ENDPOINTS(professionId)) {
        try {
          const { data } = await apiClient.get(endpoint);
          const withStatus = normalizeProfessionAtomPath(data, professionId);
          if (withStatus && !pathNeedsProgressMerge(withStatus)) {
            writePathCache(
              professionId,
              catalogFromPathItems(withStatus.atoms),
            );
            return withStatus;
          }
        } catch {
          // Optional catalog endpoint — continue to next-atom fallback.
        }
      }

      const catalog = await fetchAtomCatalog(professionId);
      const next = await this.getNextAtom(professionId);

      if (next.errorReason === "profession_not_found") {
        return null;
      }

      return applyProgressToCatalog(professionId, catalog, next);
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 401) {
        throw error;
      }

      try {
        const next = await this.getNextAtom(professionId);
        const cached = mergeCatalog([], readPathCache(professionId));
        return applyProgressToCatalog(professionId, cached, next);
      } catch {
        throw error;
      }
    }
  },

  async getAtom(atomId: number): Promise<Atom> {
    const { data } = await apiClient.get<Atom>(API_ENDPOINTS.ATOMS.DETAIL(atomId));
    return data;
  },

  async getNextAtom(professionId: number): Promise<NextAtomResult> {
    try {
      const { data } = await apiClient.get<Atom>(
        API_ENDPOINTS.ATOMS.NEXT_ATOM(professionId),
      );
      writePathCache(professionId, [
        {
          id: data.id,
          title: data.title,
          sequence_order: data.sequence_order,
        },
        ...(data.path_atoms?.map((atom) => ({
          id: atom.id,
          title: atom.title,
          sequence_order: atom.sequence_order,
        })) ?? []),
      ]);
      return { atom: data };
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { status?: number; data?: { detail?: unknown } };
      };
      if (axiosError.response?.status === 404) {
        const detail = axiosError.response.data?.detail;
        return {
          atom: null,
          errorReason: parseNextAtomError(detail),
          errorDetail:
            typeof detail === "string" ? detail : "Lesson not available.",
        };
      }
      throw error;
    }
  },

  async loadPlayableAtom(
    professionId: number,
    atomId: number,
  ): Promise<Atom> {
    if (atomId < 0) {
      throw new Error("This atom is not available yet.");
    }

    const next = await this.getNextAtom(professionId);
    if (next.atom?.id === atomId) {
      return next.atom;
    }

    try {
      return await this.getAtom(atomId);
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 404 && next.atom?.id === atomId) {
        return next.atom;
      }
      if (axiosError.response?.status === 404) {
        throw new Error("This atom is not available yet.");
      }
      throw error;
    }
  },

  async submitAtomQuiz(
    atomId: number,
    selectedOptionIndex: 0 | 1 | 2,
  ): Promise<AtomSubmitResult> {
    const { data } = await apiClient.post<AtomSubmitResult>(
      API_ENDPOINTS.ATOMS.SUBMIT(atomId),
      { selected_option_index: selectedOptionIndex },
    );
    return data;
  },

  rememberCompletedAtom(
    professionId: number,
    atom: Pick<Atom, "id" | "title" | "sequence_order">,
  ) {
    writePathCache(professionId, [
      {
        id: atom.id,
        title: atom.title,
        sequence_order: atom.sequence_order,
      },
    ]);
  },
};
