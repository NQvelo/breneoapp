import { useQuery } from "@tanstack/react-query";
import {
  fetchPublicUserProfile,
  PublicUserProfileError,
} from "@/api/profile/publicUserProfileApi";
import type { PublicUserProfile } from "@/api/profile/publicUserProfileTypes";

export function publicUserProfileQueryKey(userId: number) {
  return ["public-user-profile", userId] as const;
}

export function usePublicUserProfile(userId: number | null | undefined) {
  return useQuery<PublicUserProfile, Error>({
    queryKey: publicUserProfileQueryKey(userId ?? 0),
    queryFn: () => fetchPublicUserProfile(userId as number),
    enabled: userId != null && userId > 0,
    retry: (failureCount, error) => {
      if (
        error instanceof PublicUserProfileError &&
        error.status === 404
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export { PublicUserProfileError };
