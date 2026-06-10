import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import type { SkillSuggestion } from "@/api/profile/types";

function normalizeSkillLookupKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function unwrapSkillSuggestions(data: unknown): SkillSuggestion[] {
  if (Array.isArray(data)) return data as SkillSuggestion[];
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    for (const key of ["results", "items", "data", "skills"]) {
      const v = o[key];
      if (Array.isArray(v)) return v as SkillSuggestion[];
    }
  }
  return [];
}

function dedupeSkillNames(skillNames: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of skillNames) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = normalizeSkillLookupKey(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

async function findCatalogSkill(name: string): Promise<SkillSuggestion | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const list = await searchSkills(trimmed);
  const needle = normalizeSkillLookupKey(trimmed);
  return (
    list.find((s) => normalizeSkillLookupKey(String(s.name)) === needle) ??
    null
  );
}

async function createCatalogSkill(name: string): Promise<boolean> {
  const trimmed = name.trim();
  if (!trimmed) return false;
  try {
    await apiClient.post(API_ENDPOINTS.SKILLS_SEARCH, { name: trimmed });
    return true;
  } catch (err: unknown) {
    const response = (err as { response?: { status?: number } })?.response;
    const status = response?.status;
    if (status === 400 || status === 409) return true;
    if (status === 404 || status === 405) {
      try {
        await apiClient.post(API_ENDPOINTS.ME.SKILLS, { name: trimmed });
        return true;
      } catch (fallbackErr: unknown) {
        const fallbackStatus = (
          fallbackErr as { response?: { status?: number } }
        )?.response?.status;
        if (fallbackStatus === 400 || fallbackStatus === 409) return true;
        return false;
      }
    }
    return false;
  }
}

/** GET `/api/skills/?query=` — same as profile skill search. */
export async function searchSkills(query: string): Promise<SkillSuggestion[]> {
  if (!query.trim()) return [];
  const { data } = await apiClient.get(API_ENDPOINTS.SKILLS_SEARCH, {
    params: { query: query.trim() },
  });
  return unwrapSkillSuggestions(data);
}

/**
 * Register missing job skill names in the global skills catalog.
 * Safe to fire-and-forget; failures are swallowed so job posting is not blocked.
 */
export async function ensureSkillsInCatalog(
  skillNames: string[],
): Promise<{ created: number; existing: number; failed: number }> {
  const names = dedupeSkillNames(skillNames);
  if (names.length === 0) {
    return { created: 0, existing: 0, failed: 0 };
  }

  let created = 0;
  let existing = 0;
  let failed = 0;

  for (const name of names) {
    try {
      const found = await findCatalogSkill(name);
      if (found) {
        existing += 1;
        continue;
      }
      const ok = await createCatalogSkill(name);
      if (ok) created += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }

  return { created, existing, failed };
}

/** Non-blocking catalog sync for employer job flows. */
export function scheduleSkillsCatalogSync(
  skillNames: string[],
  context = "employer-job",
): void {
  void ensureSkillsInCatalog(skillNames)
    .then((stats) => {
      if (import.meta.env.DEV && (stats.created > 0 || stats.failed > 0)) {
        console.info(`[skills-catalog-sync] ${context}`, stats);
      }
    })
    .catch((err) => {
      console.warn(`[skills-catalog-sync] ${context} failed:`, err);
    });
}
