import type { JobDetail } from "@/api/jobs/types";
import {
  buildStructuredJobForDisplayedSkills,
  buildUserMatchProfileFromSkillTest,
  getStructuredJobFromDetail,
  matchJobToUser,
  normalizeSkillName,
} from "@/services/matching";
import type { MatchResult, SeniorityLevel } from "@/types/matching";
import { resolveJobDisplayRequiredSkills } from "@/utils/jobSkillsResolve";

export interface DisplayedJobMatchOptions {
  /** Skill chips selected on the job post. Omit to use skills the user already has. */
  selectedSkillNames?: Iterable<string>;
  /** Years and seniority from the profile Work experience section. */
  experience?: {
    yearsExperienceTotal?: number | null;
    seniority?: SeniorityLevel;
  };
}

/**
 * Match result shown on the job post page.
 *
 * The overall % there uses the required skills listed on the post. Preferred
 * skills, tech stack, and skills guessed from the description are not part of
 * that score. Home, jobs, and search must use this so the same job shows the
 * same percentage.
 *
 * When `selectedSkillNames` is omitted, skills the user already has are
 * treated as selected — the same default as the job post skill chips.
 */
export function matchJobAsShownOnJobPost(
  job: JobDetail,
  userSkillNames: string[],
  options?: DisplayedJobMatchOptions,
): MatchResult {
  const requiredSkillsList = resolveJobDisplayRequiredSkills(job);
  const baseProfile = buildUserMatchProfileFromSkillTest(userSkillNames, {
    yearsExperienceTotal: options?.experience?.yearsExperienceTotal ?? null,
    seniority: options?.experience?.seniority ?? "unknown",
  });
  const userSet = new Set(
    userSkillNames.map((skill) => normalizeSkillName(skill)),
  );
  const selected =
    options?.selectedSkillNames !== undefined
      ? Array.from(options.selectedSkillNames)
      : requiredSkillsList.filter((skill) =>
          userSet.has(normalizeSkillName(skill)),
        );
  const selectedNormalized = [
    ...new Set(
      selected.map((skill) => normalizeSkillName(skill)).filter(Boolean),
    ),
  ];
  const profile = {
    ...baseProfile,
    userSkills: selectedNormalized,
    techStackExperience: selectedNormalized,
  };
  const structured =
    requiredSkillsList.length > 0
      ? buildStructuredJobForDisplayedSkills(job, requiredSkillsList)
      : getStructuredJobFromDetail(job);
  return matchJobToUser(structured, profile);
}
