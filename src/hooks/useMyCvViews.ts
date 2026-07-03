import { useQuery } from "@tanstack/react-query";
import { TokenManager } from "@/api/auth/tokenManager";
import {
  AppBffAuthError,
  fetchMyCvViews,
  MY_CV_VIEWS_QUERY_KEY,
  type ApplicantCvView,
} from "@/api/jobs/cvViewsApi";

export { MY_CV_VIEWS_QUERY_KEY };

export function useMyCvViews(enabled: boolean) {
  return useQuery({
    queryKey: MY_CV_VIEWS_QUERY_KEY,
    queryFn: fetchMyCvViews,
    enabled: enabled && Boolean(TokenManager.getAccessToken()),
    staleTime: 30_000,
    retry: (failureCount, error) => {
      if (error instanceof AppBffAuthError) return false;
      return failureCount < 1;
    },
  });
}

export type { ApplicantCvView };
