import { normalizeSkillName } from "@/services/matching";

function normalizeLoose(skill: string): string {
  return skill.toLowerCase().trim().replace(/\s+/g, " ");
}

/** True when two skill labels refer to the same or overlapping skill. */
export function jobSkillMatchesCourseSkill(
  jobSkill: string,
  courseSkill: string,
): boolean {
  const a = normalizeSkillName(jobSkill);
  const b = normalizeSkillName(courseSkill);
  if (a === b) return true;
  const la = normalizeLoose(jobSkill);
  const lb = normalizeLoose(courseSkill);
  if (la === lb) return true;
  return la.includes(lb) || lb.includes(la);
}

/** Job required skills the user does not already have. */
export function getMissingJobSkills(
  requiredSkills: string[],
  ownedSkillNames: string[],
): string[] {
  const owned = new Set(ownedSkillNames.map((s) => normalizeSkillName(s)));
  return requiredSkills.filter((skill) => !owned.has(normalizeSkillName(skill)));
}

/** Course matches when any course required skill overlaps a missing job skill. */
export function courseMatchesMissingSkills(
  courseRequiredSkills: string[],
  missingJobSkills: string[],
): boolean {
  if (missingJobSkills.length === 0 || courseRequiredSkills.length === 0) {
    return false;
  }
  return courseRequiredSkills.some((courseSkill) =>
    missingJobSkills.some((missing) =>
      jobSkillMatchesCourseSkill(missing, courseSkill),
    ),
  );
}
