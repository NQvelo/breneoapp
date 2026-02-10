/**
 * User industry profile: derive industry years from work experience using
 * job title / position (e.g. "UI/UX Designer" → design). Company is not used.
 */

import { getIndustriesForPosition } from "./position_to_industry";

/** Max years to count per single work experience row (avoid bad data) */
const MAX_YEARS_PER_ROW = 10;

/** Work experience row shape (matches API: company, start_date, end_date) */
export interface WorkExperienceRow {
  userId?: string;
  companyName?: string;
  company?: string;
  jobTitle?: string;
  location?: string;
  startDate: string;
  endDate?: string | null;
  is_current?: boolean;
  description?: string;
}

/** Cache record: industry -> years */
export interface UserIndustryProfile {
  userId: string;
  industryYearsJson: Record<string, number>;
  updatedAt: string; // ISO
}

/**
 * Parse date string to timestamp (ms). Handles YYYY-MM-DD and ISO.
 */
function parseDate(s: string | null | undefined): number | null {
  if (s == null || typeof s !== "string" || !s.trim()) return null;
  const t = Date.parse(s.trim());
  return Number.isNaN(t) ? null : t;
}

/**
 * Compute years between start and end. If end is null/absent, use now (current job).
 * Returns max(0, years), capped at MAX_YEARS_PER_ROW.
 */
export function computeYearsForRow(
  startDate: string,
  endDate?: string | null,
  isCurrent?: boolean
): number {
  const start = parseDate(startDate);
  if (start == null) return 0;

  let end: number;
  if (endDate != null && String(endDate).trim()) {
    const e = parseDate(endDate);
    end = e ?? Date.now();
  } else if (isCurrent === true) {
    end = Date.now();
  } else {
    end = Date.now();
  }

  if (end < start) return 0;
  const years = (end - start) / (365.25 * 24 * 60 * 60 * 1000);
  return Math.min(MAX_YEARS_PER_ROW, Math.max(0, years));
}

/**
 * Build industry years map from work experience rows.
 * Uses job title / position to infer industries (e.g. "UI/UX Designer" → design).
 * Rows with no matching position keywords are skipped.
 */
export function buildIndustryYearsFromWorkExperience(
  userId: string,
  rows: WorkExperienceRow[]
): UserIndustryProfile {
  const industryYears: Record<string, number> = {};

  for (const row of rows) {
    const position = row.jobTitle ?? "";
    const industries = getIndustriesForPosition(position);
    if (industries.length === 0) continue;

    const years = computeYearsForRow(
      row.startDate,
      row.endDate,
      row.is_current
    );
    if (years <= 0) continue;

    for (const ind of industries) {
      industryYears[ind] = (industryYears[ind] ?? 0) + years;
    }
  }

  return {
    userId,
    industryYearsJson: industryYears,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get user industry years from a cached profile (e.g. from DB).
 * Returns empty record if profile missing or invalid.
 */
export function getUserIndustryYears(
  profile: UserIndustryProfile | null | undefined
): Record<string, number> {
  if (profile?.industryYearsJson && typeof profile.industryYearsJson === "object") {
    return { ...profile.industryYearsJson };
  }
  return {};
}
