import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { JobApplicant } from "@/api/employer/jobApplicantsApi";
import type { PublicUserProfile } from "@/api/profile/publicUserProfileTypes";
import type { EmployerJob } from "@/api/employer/jobsApi";
import { fetchPublicUserProfile } from "@/api/profile/publicUserProfileApi";
import { publicUserProfileQueryKey } from "@/hooks/usePublicUserProfile";
import { applicantUserId } from "@/utils/applicantUserId";
import { employerJobToJobDetail } from "@/utils/employerJobToJobDetail";
import {
  applicantMatchPercentFromRecord,
  resolveApplicantMatchPercent,
} from "@/utils/applicantJobMatch";

export function useApplicantMatchPercents(
  job: EmployerJob | null | undefined,
  applicants: JobApplicant[],
): {
  matchByUserId: Map<number, number | null>;
  profileByUserId: Map<number, PublicUserProfile>;
  isLoading: boolean;
} {
  const jobDetail = useMemo(
    () => (job ? employerJobToJobDetail(job) : null),
    [job],
  );

  const userIdsNeedingProfile = useMemo(() => {
    const ids = new Set<number>();
    for (const a of applicants) {
      if (applicantMatchPercentFromRecord(a) != null) continue;
      const id = applicantUserId(a);
      if (id != null) ids.add(id);
    }
    return [...ids];
  }, [applicants]);

  const profileQueries = useQueries({
    queries: userIdsNeedingProfile.map((userId) => ({
      queryKey: publicUserProfileQueryKey(userId),
      queryFn: () => fetchPublicUserProfile(userId),
      enabled: Boolean(jobDetail),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const isLoading =
    Boolean(jobDetail) &&
    userIdsNeedingProfile.length > 0 &&
    profileQueries.some((q) => q.isLoading);

  const profileByUserId = useMemo(() => {
    const map = new Map<number, Awaited<ReturnType<typeof fetchPublicUserProfile>>>();
    userIdsNeedingProfile.forEach((userId, index) => {
      const data = profileQueries[index]?.data;
      if (data) map.set(userId, data);
    });
    return map;
  }, [userIdsNeedingProfile, profileQueries]);

  const matchByUserId = useMemo(() => {
    const map = new Map<number, number | null>();
    for (const applicant of applicants) {
      const userId = applicantUserId(applicant);
      if (userId == null) continue;
      const profile = profileByUserId.get(userId);
      map.set(
        userId,
        resolveApplicantMatchPercent(applicant, jobDetail, profile),
      );
    }
    return map;
  }, [applicants, jobDetail, profileByUserId]);

  return { matchByUserId, profileByUserId, isLoading };
}
