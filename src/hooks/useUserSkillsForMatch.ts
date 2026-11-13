import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/auth/apiClient";
import { profileApi } from "@/api/profile";
import type { UserSkill } from "@/api/profile/types";
import { normalizeSkillName } from "@/services/matching";

/** Skill-test names used for job match %, same source as the job post page. */
export async function fetchSkillTestSkillNames(
  userId: string | number,
): Promise<string[]> {
  try {
    const response = await apiClient.get(
      `/api/skilltest/results/?user=${userId}`,
    );

    let skillTestData: {
      skills_json?: {
        tech?: Record<string, unknown>;
        soft?: Record<string, unknown>;
      };
    } | null = null;
    if (Array.isArray(response.data) && response.data.length > 0) {
      skillTestData = response.data[0];
    } else if (response.data && typeof response.data === "object") {
      skillTestData = response.data;
    }

    if (skillTestData?.skills_json) {
      const techSkills = Object.keys(skillTestData.skills_json.tech || {});
      const softSkills = Object.keys(skillTestData.skills_json.soft || {});
      return [...techSkills, ...softSkills];
    }
    return [];
  } catch (error) {
    console.error("Error fetching user skills for matching:", error);
    return [];
  }
}

/**
 * Profile skills plus skill-test skills, normalized the same way as the job post.
 * Listing pages use this so a job's match % matches that post.
 */
export function useUserSkillsForMatch(userId: string | number | undefined) {
  const enabled = userId != null && String(userId) !== "";

  const profileQuery = useQuery({
    queryKey: ["profileSkills", userId],
    queryFn: () => profileApi.getMySkills(),
    enabled,
  });

  const testQuery = useQuery<string[]>({
    queryKey: ["userSkills", userId],
    queryFn: () => fetchSkillTestSkillNames(userId as string | number),
    enabled,
  });

  const profileSkills: UserSkill[] = profileQuery.data ?? [];
  const skillTestSkills = testQuery.data ?? [];

  const userSkills = useMemo(() => {
    const fromProfile = profileSkills.map((skill) =>
      normalizeSkillName(skill.skill_name),
    );
    const fromTest = skillTestSkills.map((skill) => normalizeSkillName(skill));
    return [...new Set([...fromProfile, ...fromTest])];
  }, [profileSkills, skillTestSkills]);

  return {
    profileSkills,
    userSkills,
    isLoadingUserSkills: profileQuery.isLoading || testQuery.isLoading,
  };
}
