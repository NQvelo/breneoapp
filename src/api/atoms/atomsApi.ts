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

type CachedAtom = Pick<AtomPathItem, "id" | "title" | "sequence_order">;

interface PathCacheEntry {
  atoms: CachedAtom[];
}

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

function readPathCache(professionId: number): CachedAtom[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(PATH_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, PathCacheEntry>;
    return parsed[String(professionId)]?.atoms ?? [];
  } catch {
    return [];
  }
}

function writePathCache(professionId: number, atoms: CachedAtom[]) {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(PATH_CACHE_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as Record<string, PathCacheEntry>)
      : {};
    const merged = new Map<number, CachedAtom>();
    [...(parsed[String(professionId)]?.atoms ?? []), ...atoms].forEach((atom) => {
      merged.set(atom.sequence_order, atom);
    });
    parsed[String(professionId)] = {
      atoms: [...merged.values()].sort(
        (a, b) => a.sequence_order - b.sequence_order,
      ),
    };
    sessionStorage.setItem(PATH_CACHE_KEY, JSON.stringify(parsed));
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

function normalizePathItem(raw: Record<string, unknown>): AtomPathItem | null {
  const id = Number(raw.id);
  const sequence_order = Number(raw.sequence_order);
  const title = typeof raw.title === "string" ? raw.title : "";

  if (!id || !sequence_order || !title) return null;

  const explicitStatus = normalizeStatus(raw.status);
  if (explicitStatus) {
    return { id, title, sequence_order, status: explicitStatus };
  }

  if (raw.is_completed === true) {
    return { id, title, sequence_order, status: "completed" };
  }

  if (raw.is_unlocked === false || raw.is_locked === true) {
    return { id, title, sequence_order, status: "locked" };
  }

  if (raw.is_unlocked === true || raw.is_current === true) {
    return { id, title, sequence_order, status: "available" };
  }

  return { id, title, sequence_order, status: "locked" };
}

function normalizeProfessionAtomPath(
  data: unknown,
  professionId: number,
): ProfessionAtomPath | null {
  const payload =
    Array.isArray(data)
      ? { atoms: data }
      : data && typeof data === "object"
        ? (data as Record<string, unknown>)
        : null;

  if (!payload) return null;

  const atomsRaw = Array.isArray(payload.atoms) ? payload.atoms : [];
  const atoms = atomsRaw
    .map((item) =>
      item && typeof item === "object"
        ? normalizePathItem(item as Record<string, unknown>)
        : null,
    )
    .filter((item): item is AtomPathItem => item !== null)
    .sort((a, b) => a.sequence_order - b.sequence_order);

  if (atoms.length === 0) return null;

  const completed_count = atoms.filter((a) => a.status === "completed").length;
  const current =
    atoms.find((a) => a.status === "available") ??
    atoms.find((a) => a.status === "locked");

  return {
    profession_id: Number(payload.profession_id) || professionId,
    profession_title:
      typeof payload.profession_title === "string" ? payload.profession_title : "",
    atoms,
    current_atom_id: current?.id ?? null,
    completed_count,
    total_count: atoms.length,
  };
}

function buildPathFromNextAtom(
  professionId: number,
  next: NextAtomResult,
  cachedAtoms: CachedAtom[],
): ProfessionAtomPath | null {
  if (next.errorReason === "no_atoms") return null;

  const merged = new Map<number, CachedAtom>();
  cachedAtoms.forEach((atom) => merged.set(atom.sequence_order, atom));

  if (next.errorReason === "all_completed") {
    const atoms = [...merged.values()]
      .sort((a, b) => a.sequence_order - b.sequence_order)
      .map((atom) => ({ ...atom, status: "completed" as const }));

    if (atoms.length === 0) return null;

    return {
      profession_id: professionId,
      profession_title: atoms[0] ? "" : "",
      atoms,
      current_atom_id: null,
      completed_count: atoms.length,
      total_count: atoms.length,
    };
  }

  const current = next.atom;
  if (!current) return null;

  merged.set(current.sequence_order, {
    id: current.id,
    title: current.title,
    sequence_order: current.sequence_order,
  });

  writePathCache(professionId, [...merged.values()]);

  const atoms = [...merged.values()]
    .sort((a, b) => a.sequence_order - b.sequence_order)
    .map((atom) => {
      let status: AtomPathStatus = "locked";
      if (atom.sequence_order < current.sequence_order) {
        status = "completed";
      } else if (atom.id === current.id) {
        status = "available";
      }
      return { ...atom, status };
    });

  return {
    profession_id: professionId,
    profession_title: current.profession_title,
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

  async getProfessionAtomPath(professionId: number): Promise<ProfessionAtomPath | null> {
    try {
      const { data } = await apiClient.get(
        API_ENDPOINTS.ATOMS.LIST(professionId),
      );
      const normalized = normalizeProfessionAtomPath(data, professionId);
      if (normalized) {
        writePathCache(
          professionId,
          normalized.atoms.map(({ id, title, sequence_order }) => ({
            id,
            title,
            sequence_order,
          })),
        );
        return normalized;
      }
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status !== 404) {
        throw error;
      }
    }

    const cached = readPathCache(professionId);
    const next = await this.getNextAtom(professionId);
    return buildPathFromNextAtom(professionId, next, cached);
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
    try {
      return await this.getAtom(atomId);
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status !== 404) {
        throw error;
      }
    }

    const next = await this.getNextAtom(professionId);
    if (next.atom?.id === atomId) {
      return next.atom;
    }

    throw new Error("This atom is not available yet.");
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
};
