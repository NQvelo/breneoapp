import apiClient from "@/api/auth/apiClient";

/** One scored job from GET /api/me/job-matches/. */
export interface ApiJobMatch {
  id: number;
  title: string;
  company: string;
  company_logo?: string | null;
  location: string | null;
  posted_at: string | null;
  salary?: string | null;
  employment_type?: string | null;
  work_mode?: string | null;
  workplace_type?: string | null;
  match_percent: number;
  skills_percent: number | null;
  experience_percent: number | null;
  industry_percent: number | null;
}

export type JobMatchScope = "georgia" | "worldwide";

export function isNumericJobId(jobId: string | number | null | undefined): boolean {
  return /^\d+$/.test(String(jobId ?? "").trim());
}

/** Top matches for the logged-in user. The browser does not score these. */
export async function fetchMyJobMatches(
  scope: JobMatchScope,
  limit: number,
): Promise<ApiJobMatch[]> {
  const { data } = await apiClient.get<ApiJobMatch[]>("/api/me/job-matches/", {
    params: { scope, limit },
  });
  return Array.isArray(data) ? data : [];
}

export interface JobMatchSearchParams {
  query?: string;
  titles?: string[];
  cities?: string[];
  locationCountries?: string[];
  workModes?: string[];
  jobSeniorities?: string[];
  roleCategories?: string[];
  companies?: string[];
  datePosted?: string;
  limit?: number;
}

function joinList(values: string[] | undefined): string | undefined {
  const joined = (values ?? []).map((item) => item.trim()).filter(Boolean).join(",");
  return joined || undefined;
}

/**
 * Ranked matches for the current search. The aggregator scores the filtered
 * candidate set and omits 0%. Highest match is first.
 */
export async function fetchMyJobMatchSearch(
  params: JobMatchSearchParams,
): Promise<ApiJobMatch[]> {
  const datePosted = params.datePosted && params.datePosted !== "all" ? params.datePosted : undefined;
  const { data } = await apiClient.get<ApiJobMatch[]>("/api/me/job-matches/search/", {
    params: {
      query: params.query?.trim() || undefined,
      title: joinList(params.titles),
      city: joinList(params.cities),
      location_country: joinList(params.locationCountries),
      work_mode: joinList(params.workModes),
      job_seniority: joinList(params.jobSeniorities),
      role_category: joinList(params.roleCategories),
      company: joinList(params.companies),
      date_posted: datePosted,
      limit: params.limit ?? 100,
    },
  });
  return Array.isArray(data) ? data.filter((job) => job.match_percent > 0) : [];
}

/** Score for one job. Same integer the list uses. */
export async function fetchMyJobMatch(
  jobId: string | number,
): Promise<ApiJobMatch | null> {
  if (!isNumericJobId(jobId)) return null;
  try {
    const { data } = await apiClient.get<ApiJobMatch>(
      `/api/me/job-matches/${jobId}/`,
    );
    if (!data || typeof data.match_percent !== "number") return null;
    return data;
  } catch {
    return null;
  }
}
