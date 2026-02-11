/**
 * Fetch and cache user industry profile (industry -> years) from backend.
 * Used for Industry Experience Match on job cards and job detail.
 */

import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/api/profile";
import { useAuth } from "@/contexts/AuthContext";

const STALE_TIME_MS = 15 * 60 * 1000; // 15 minutes

export function useUserIndustryProfile() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["userIndustryProfile", user?.id],
    queryFn: () => profileApi.getIndustryProfile(),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const errorMessage =
    query.error != null
      ? (() => {
          const e = query.error as { response?: { status?: number }; message?: string };
          const status = e?.response?.status;
          if (typeof status === "number") {
            return `Industry profile request failed (${status}). Check GET /api/me/industry-profile/ on the backend.`;
          }
          return e?.message ?? "Failed to load industry profile.";
        })()
      : null;

  return {
    industryYears: query.data ?? {},
    isLoading: query.isLoading,
    isError: query.isError,
    errorMessage,
    refetch: query.refetch,
  };
}
