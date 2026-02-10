/**
 * API contract: industry match in job detail and job list responses.
 * Backend should return match.industry in this shape.
 */

export interface IndustryMatchApi {
  percent: number | null;
  reasons: string[];
  matchedExact: { tag: string; years: number }[];
  matchedRelated: { jobTag: string; matchedVia: string; years: number }[];
  missing: string[];
}

/**
 * When percent is null, frontend should display "—" or "N/A"
 * and not penalize overall match.
 */
