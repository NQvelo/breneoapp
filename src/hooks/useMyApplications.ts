import { useQuery } from "@tanstack/react-query";
import { TokenManager } from "@/api/auth/tokenManager";
import {
  AppBffAuthError,
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
