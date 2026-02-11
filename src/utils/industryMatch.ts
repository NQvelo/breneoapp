/**
 * Industry Experience Match (frontend-only, deterministic).
 * Compares job.industry_tags with user industry profile from backend.
 * No "related industries" — exact match only.
 */

/**
 * Parse job industry_tags string to lowercase array.
 * - null/empty => []
 * - split by ",", trim, lowercase, dedupe
 */
export function parseJobIndustryTags(
  industryTags: string | null | undefined
): string[] {
  if (industryTags == null || typeof industryTags !== "string") return [];
  const s = industryTags.trim();
  if (!s) return [];
  const tags = s
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(tags)];
}

export interface IndustryMatchResult {
  percent: number | null;
  matchedExact: { tag: string; years: number }[];
  missing: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Compute industry match % from job tags and user industry years (from backend).
 * Exact match only; years boost = clamp(years/5, 0, 1) * 0.2 per tag.
 */
export function computeIndustryMatchPercent(
  jobTags: string[],
  userIndustryYears: Record<string, number>
): IndustryMatchResult {
  if (jobTags.length === 0) {
    return { percent: null, matchedExact: [], missing: [] };
  }

  const matchedExact: { tag: string; years: number }[] = [];
  const missing: string[] = [];
  let totalPoints = 0;

  for (const tag of jobTags) {
    const years = userIndustryYears[tag];
    if (years != null && years > 0) {
      const points = 1.0;
      const yearsBoost = clamp(years / 5, 0, 1) * 0.2;
      const tagPoints = clamp(points + yearsBoost, 0, 1);
      totalPoints += tagPoints;
      matchedExact.push({ tag, years });
    } else {
      missing.push(tag);
    }
  }

  const rawScore = totalPoints / jobTags.length;
  const percent = Math.round(rawScore * 100);

  return {
    percent,
    matchedExact,
    missing,
  };
}
