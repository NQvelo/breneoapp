import { useQuery } from "@tanstack/react-query";
import { TokenManager } from "@/api/auth/tokenManager";
import { AppBffAuthError } from "@/api/jobs/jobApplicationsApi";
import {
  fetchMyCvViews,
  MY_CV_VIEWS_QUERY_KEY,
  type ApplicantCvView,
} from "@/api/jobs/cvViewsApi";

export { MY_CV_VIEWS_QUERY_KEY };

type UseMyCvViewsOptions = {
  refetchInterval?: number | false;
};

export function useMyCvViews(enabled: boolean, options?: UseMyCvViewsOptions) {
  return useQuery({
    queryKey: MY_CV_VIEWS_QUERY_KEY,
    queryFn: fetchMyCvViews,
    enabled: enabled && Boolean(TokenManager.getAccessToken()),
    staleTime: 30_000,
    refetchInterval: options?.refetchInterval,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      if (error instanceof AppBffAuthError) return false;
      return failureCount < 1;
    },
  });
}

export type { ApplicantCvView };
