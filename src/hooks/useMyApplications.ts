import { useQuery } from "@tanstack/react-query";
import { TokenManager } from "@/api/auth/tokenManager";
import {
  AppBffAuthError,
  fetchAllMyApplications,
  fetchMyApplications,
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

/** Counts across all pages of the user's applications (same data as the Applied Jobs page). */
export function useMyApplicationCounts(enabled: boolean) {
  return useQuery({
    queryKey: [...MY_APPLICATIONS_QUERY_KEY, "all-counts"],
    queryFn: async (): Promise<ApplicationCounts> => {
      const { items, pagination } = await fetchAllMyApplications();
      return {
        applied: Math.max(pagination?.total ?? 0, items.length),
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
      const page = await fetchMyApplications(1);
      const appliedJobIds = new Set<string>();
      for (const app of page.items) {
        const id = jobIdFromApplication(app);
        if (id) appliedJobIds.add(id);
      }
      return {
        applications: page.items,
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
