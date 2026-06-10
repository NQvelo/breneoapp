import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { CourseEnrolledUser } from "@/api/academy/courseApi";
import { fetchPublicUserProfile } from "@/api/profile/publicUserProfileApi";
import type { PublicUserProfile } from "@/api/profile/publicUserProfileTypes";
import { publicUserProfileQueryKey } from "@/hooks/usePublicUserProfile";

export function enrolledUserNumericId(user: CourseEnrolledUser): number | null {
  const n = Number(user.id);
  if (Number.isInteger(n) && n > 0) return n;
  return null;
}

export function useEnrolledUserPublicProfiles(enrolledUsers: CourseEnrolledUser[]) {
  const userIds = useMemo(() => {
    const ids = new Set<number>();
    for (const user of enrolledUsers) {
      const id = enrolledUserNumericId(user);
      if (id != null) ids.add(id);
    }
    return [...ids];
  }, [enrolledUsers]);

  const profileQueries = useQueries({
    queries: userIds.map((userId) => ({
      queryKey: publicUserProfileQueryKey(userId),
      queryFn: () => fetchPublicUserProfile(userId),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const profileByUserId = useMemo(() => {
    const map = new Map<number, PublicUserProfile>();
    userIds.forEach((userId, index) => {
      const data = profileQueries[index]?.data;
      if (data) map.set(userId, data);
    });
    return map;
  }, [profileQueries, userIds]);

  const isLoading =
    userIds.length > 0 && profileQueries.some((query) => query.isLoading);

  return { profileByUserId, isLoading };
}
