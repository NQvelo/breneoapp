import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchMyJobMatch,
  fetchMyJobMatches,
  isNumericJobId,
  type ApiJobMatch,
  type JobMatchScope,
} from "@/api/jobs/jobMatchesApi";

const STALE_MS = 15 * 60 * 1000;

export function useJobMatchList(
  scope: JobMatchScope,
  limit: number,
  enabled: boolean,
) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["job-matches", user?.id, scope, limit],
    queryFn: () => fetchMyJobMatches(scope, limit),
    enabled: !!user && enabled,
    staleTime: STALE_MS,
    retry: 1,
  });
}

export function useJobMatch(jobId: string | number | null | undefined) {
  const { user } = useAuth();
  const id = String(jobId ?? "").trim();
  return useQuery({
    queryKey: ["job-match", user?.id, id],
    queryFn: () => fetchMyJobMatch(id),
    enabled: !!user && isNumericJobId(id),
    staleTime: STALE_MS,
    retry: 1,
  });
}

/** Backend match_percent for each visible job. Missing ids are left unset. */
export function useJobMatchByIds(jobIds: Array<string | number | undefined>) {
  const { user } = useAuth();
  const idKey = jobIds
    .map((id) => String(id ?? "").trim())
    .filter((id) => isNumericJobId(id))
    .sort()
    .join(",");
  const numericIds = useMemo(
    () => (idKey ? idKey.split(",") : []),
    [idKey],
  );

  const queries = useQueries({
    queries: numericIds.map((id) => ({
      queryKey: ["job-match", user?.id, id],
      queryFn: () => fetchMyJobMatch(id),
      enabled: !!user,
      staleTime: STALE_MS,
      retry: 1,
    })),
  });

  const byId = new Map<string, ApiJobMatch>();
  queries.forEach((query, index) => {
    const match = query.data;
    if (match) byId.set(numericIds[index], match);
  });

  return {
    byId,
    isLoading: numericIds.length > 0 && queries.some((query) => query.isLoading),
  };
}

export function matchPercentFor(
  byId: Map<string, ApiJobMatch>,
  jobId: string | number | undefined,
): number | undefined {
  const match = byId.get(String(jobId ?? "").trim());
  return match?.match_percent;
}
