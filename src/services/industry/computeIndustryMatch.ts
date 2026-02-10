/**
 * Deterministic industry experience match: job industry tags vs user industry years.
 * Returns percent (0..100 or null when job has no industry), reasons, and breakdown.
 */

import { INDUSTRY_RELATED } from "./industry_taxonomy";
import { capitalizeIndustryTag } from "./industry_taxonomy";

export interface MatchedExact {
  tag: string;
  years: number;
}

export interface MatchedRelated {
  jobTag: string;
  matchedVia: string;
  years: number;
}

export interface IndustryMatchResult {
  percent: number | null;
  reasons: string[];
  matchedExact: MatchedExact[];
  matchedRelated: MatchedRelated[];
  missing: string[];
  /** When true, frontend should show N/A and not penalize overall match */
  isNa: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Compute industry match between job tags and user industry years.
 * - J = jobIndustryTags (canonical lowercase array)
 * - U = userIndustryYears (canonical tag -> years)
 *
 * If J.length === 0 => percent null, isNa true, reasons ["Job industry not provided"].
 */
export function computeIndustryMatch(
  jobIndustryTags: string[],
  userIndustryYears: Record<string, number>
): IndustryMatchResult {
  const J = jobIndustryTags.filter(Boolean);
  const U = userIndustryYears;

  if (J.length === 0) {
    return {
      percent: null,
      reasons: ["Job industry not provided"],
      matchedExact: [],
      matchedRelated: [],
      missing: [],
      isNa: true,
    };
  }

  const matchedExact: MatchedExact[] = [];
  const matchedRelated: MatchedRelated[] = [];
  const missing: string[] = [];
  const reasons: string[] = [];
  let totalPoints = 0;

  for (const j of J) {
    const jNorm = j.trim().toLowerCase();
    let basePoints: number;
    let years: number;
    let matchedVia: string | null = null;

    if (U[jNorm] != null && U[jNorm] > 0) {
      basePoints = 1.0;
      years = U[jNorm];
      matchedExact.push({ tag: jNorm, years });
    } else {
      const relatedTags = INDUSTRY_RELATED[jNorm] ?? [];
      const found = relatedTags.find((r) => U[r] != null && U[r] > 0);
      if (found) {
        basePoints = 0.5;
        years = U[found];
        matchedVia = found;
        matchedRelated.push({ jobTag: jNorm, matchedVia: found, years });
      } else {
        basePoints = 0;
        years = 0;
        missing.push(jNorm);
      }
    }

    const yearsBoost = clamp(years / 5, 0, 1) * 0.2;
    const points = clamp(basePoints + yearsBoost, 0, 1.0);
    totalPoints += points;
  }

  const percent = Math.round((totalPoints / J.length) * 100);

  if (matchedExact.length) {
    matchedExact.forEach(({ tag, years }) => {
      reasons.push(`Exact match: ${capitalizeIndustryTag(tag)} (${years.toFixed(1)} yrs)`);
    });
  }
  if (matchedRelated.length) {
    matchedRelated.forEach(({ jobTag, matchedVia, years }) => {
      reasons.push(
        `Related match: ${capitalizeIndustryTag(jobTag)} via ${capitalizeIndustryTag(matchedVia)} (${years.toFixed(1)} yrs)`
      );
    });
  }
  if (missing.length) {
    missing.forEach((tag) => {
      reasons.push(`No match: ${capitalizeIndustryTag(tag)}`);
    });
  }

  return {
    percent,
    reasons,
    matchedExact,
    matchedRelated,
    missing,
    isNa: false,
  };
}
