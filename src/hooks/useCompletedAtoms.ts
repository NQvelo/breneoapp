import { useQueries, useQuery } from "@tanstack/react-query";
import { atomsApi } from "@/api/atoms";

export const COMPLETED_ATOMS_QUERY_KEY = ["completedAtoms"] as const;

/**
 * Returns the total number of atoms the user has completed across all their
 * matched (or fallback catalogue) professions.
 */
export function useCompletedAtoms(enabled: boolean) {
  const { data: matchedProfessions = [], isLoading: isLoadingProfessions } =
    useQuery({
      queryKey: ["atoms", "matched-professions"],
      queryFn: () => atomsApi.getMyProfessions(),
      enabled,
      staleTime: 60_000,
    });

  const { data: allProfessions = [], isLoading: isLoadingAllProfessions } =
    useQuery({
      queryKey: ["atoms", "professions"],
      queryFn: () => atomsApi.listProfessions(),
      enabled: enabled && !isLoadingProfessions && matchedProfessions.length === 0,
      staleTime: 60_000,
    });

  const professions =
    matchedProfessions.length > 0
      ? matchedProfessions.map((item) => item.profession)
      : allProfessions;

  const pathQueries = useQueries({
    queries: professions.map((profession) => ({
      queryKey: ["atoms", "path", profession.id],
      queryFn: () => atomsApi.getProfessionAtomPath(profession.id),
      enabled,
      staleTime: 60_000,
    })),
  });

  const isLoading =
    enabled &&
    (isLoadingProfessions ||
      isLoadingAllProfessions ||
      pathQueries.some((q) => q.isLoading));

  let completedCount = 0;
  for (const q of pathQueries) {
    if (q.data) {
      completedCount += q.data.completed_count;
    }
  }

  return {
    data: completedCount,
    isLoading,
  };
}
