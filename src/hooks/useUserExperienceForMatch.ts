import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/api/profile";
import {
  experienceFromWorkHistory,
  userHasWorkExperience,
  type UserExperienceMatchInput,
} from "@/utils/userWorkExperience";

const EMPTY_EXPERIENCE: UserExperienceMatchInput = {
  yearsExperienceTotal: null,
  seniority: "unknown",
};

/** Profile Work experience, shared by the job post and the job lists. */
export function useUserExperienceForMatch(userId: string | number | undefined) {
  const enabled = userId != null && String(userId) !== "";
  const query = useQuery({
    queryKey: ["workExperiences", userId],
    queryFn: () => profileApi.getWorkExperiences().catch(() => []),
    enabled,
  });

  const experience = useMemo(
    () =>
      query.data ? experienceFromWorkHistory(query.data) : EMPTY_EXPERIENCE,
    [query.data],
  );

  return {
    experience,
    hasWorkExperience: userHasWorkExperience(experience),
  };
}
