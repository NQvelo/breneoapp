/**
 * Refresh and persist user industry profile from work experience.
 * Call after user adds, edits, or deletes work experience.
 * Persists to Django backend (not Supabase).
 */

import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { buildIndustryYearsFromWorkExperience } from "./userIndustryProfile";
import type { WorkExperienceRow } from "./userIndustryProfile";

/** Work experience entry from profile API (snake_case) */
export interface WorkExperienceEntryLike {
  company?: string;
  start_date: string;
  end_date?: string | null;
  is_current?: boolean;
}

function toWorkExperienceRow(entry: WorkExperienceEntryLike): WorkExperienceRow {
  return {
    company: entry.company,
    startDate: entry.start_date,
    endDate: entry.end_date,
    is_current: entry.is_current,
  };
}

/**
 * Recompute industry years from the given work experiences and save
 * to Django (user industry profile for the authenticated user).
 * If the list is empty or no known companies, sends {} (no industries).
 *
 * @param _userId - Unused; Django identifies user from auth token
 * @param workExperiences - Current list from API after create/update/delete
 */
export async function refreshUserIndustryProfile(
  _userId: string,
  workExperiences: WorkExperienceEntryLike[]
): Promise<void> {
  const rows = workExperiences.map(toWorkExperienceRow);
  const profile = buildIndustryYearsFromWorkExperience("", rows);

  await apiClient.put(API_ENDPOINTS.ME.INDUSTRY_PROFILE, {
    industry_years_json: profile.industryYearsJson,
    updated_at: profile.updatedAt,
  });
}
