import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchMyJobMatch,
  fetchMyJobMatches,
  fetchMyJobMatchesByIds,
  numericJobId,
  type JobMatchScope,
} from "@/api/jobs/jobMatchesApi";

const STALE_TIME_MS = 15 * 60 * 1000;

export function useJobMatchList(scope: JobMatchScope, limit: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["job-matches", "list", user?.id, scope, limit],
    queryFn: () => fetchMyJobMatches(scope, limit),
    enabled: !!user,
    staleTime: STALE_TIME_MS,
  });
}

export function useJobMatch(jobId: string | number | undefined | null) {
  const { user } = useAuth();
  const id = numericJobId(jobId);
  return useQuery({
    queryKey: ["job-matches", "one", user?.id, id],
    queryFn: () => fetchMyJobMatch(id as number),
    enabled: !!user && id != null,
    staleTime: STALE_TIME_MS,
  });
}

export function useJobMatchesForIds(jobIds: Array<string | number>) {
  const { user } = useAuth();
  const ids = [
    ...new Set(
      jobIds
        .map((id) => numericJobId(id))
        .filter((id): id is number => id != null)
        .map(String),
    ),
  ].sort();
  return useQuery({
    queryKey: ["job-matches", "by-id", user?.id, ids.join(",")],
    queryFn: () => fetchMyJobMatchesByIds(ids),
    enabled: !!user && ids.length > 0,
    staleTime: STALE_TIME_MS,
  });
}
