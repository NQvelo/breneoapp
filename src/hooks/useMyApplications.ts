import { useQuery } from "@tanstack/react-query";
import { TokenManager } from "@/api/auth/tokenManager";
import {
  AppBffAuthError,
  fetchAllMyApplications,
  fetchMyApplications,
  fetchMyExternalApplications,
  jobIdFromApplication,
  type JobApplicationItem,
  type MyApplicationsPage,
} from "@/api/jobs/jobApplicationsApi";

export const MY_APPLICATIONS_QUERY_KEY = ["myApplications"] as const;

export interface MyApplicationsResult {
  applications: JobApplicationItem[];
  appliedJobIds: Set<string>;
  pagination?: MyApplicationsPage["pagination"];
}

export interface ApplicationCounts {
  /** Every job application the user has sent. */
  applied: number;
  /** Applications whose CV the employer has opened. */
  viewedByEmployer: number;
  /** Applications whose status mentions an interview. */
  interviews: number;
}

/** External applications are optional extras; never fail the in-app list because of them. */
async function fetchExternalApplicationsSafe(): Promise<JobApplicationItem[]> {
  try {
    return await fetchMyExternalApplications();
  } catch (err) {
    if (err instanceof AppBffAuthError) throw err;
    console.warn("Could not load external job applications:", err);
    return [];
  }
}

function appliedAtMs(item: JobApplicationItem): number {
  const t = new Date(String(item.applied_at ?? "")).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** In-app applications win when the same job id appears in both lists. */
function mergeApplications(
  inApp: JobApplicationItem[],
  external: JobApplicationItem[],
): JobApplicationItem[] {
  const seen = new Set(inApp.map(jobIdFromApplication).filter(Boolean));
  const extra = external.filter((item) => {
    const id = jobIdFromApplication(item);
    return id && !seen.has(id);
  });
  return [...inApp, ...extra].sort((a, b) => appliedAtMs(b) - appliedAtMs(a));
}

/** Counts across all pages of the user's applications (same data as the Applied Jobs page). */
export function useMyApplicationCounts(enabled: boolean) {
  return useQuery({
    queryKey: [...MY_APPLICATIONS_QUERY_KEY, "all-counts"],
    queryFn: async (): Promise<ApplicationCounts> => {
      const [{ items, pagination }, external] = await Promise.all([
        fetchAllMyApplications(),
        fetchExternalApplicationsSafe(),
      ]);
      const inAppTotal = Math.max(pagination?.total ?? 0, items.length);
      const externalOnly = mergeApplications(items, external).length - items.length;
      return {
        applied: inAppTotal + externalOnly,
        viewedByEmployer: items.filter(
          (app) => app.employer_viewed_cv === true,
        ).length,
        interviews: items.filter((app) =>
          String(app.status ?? "")
            .toLowerCase()
            .includes("interview"),
        ).length,
      };
    },
    enabled: enabled && Boolean(TokenManager.getAccessToken()),
    staleTime: 60_000,
    retry: (failureCount, error) => {
      if (error instanceof AppBffAuthError) return false;
      return failureCount < 1;
    },
  });
}

export function useMyApplications(enabled: boolean) {
  return useQuery({
    queryKey: MY_APPLICATIONS_QUERY_KEY,
    queryFn: async (): Promise<MyApplicationsResult> => {
      const [page, external] = await Promise.all([
        fetchMyApplications(1),
        fetchExternalApplicationsSafe(),
      ]);
      const applications = mergeApplications(page.items, external);
      const appliedJobIds = new Set<string>();
      for (const app of applications) {
        const id = jobIdFromApplication(app);
        if (id) appliedJobIds.add(id);
      }
      return {
        applications,
        appliedJobIds,
        pagination: page.pagination,
      };
    },
    enabled: enabled && Boolean(TokenManager.getAccessToken()),
    staleTime: 60_000,
    retry: (failureCount, error) => {
      if (error instanceof AppBffAuthError) return false;
      return failureCount < 1;
    },
  });
}
