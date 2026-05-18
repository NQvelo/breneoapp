import type { JobApplicant } from "@/api/employer/jobApplicantsApi";
import type { JobDetail } from "@/api/jobs/types";
import type { PublicUserProfile } from "@/api/profile/publicUserProfileTypes";
import type { UserMatchProfile } from "@/types/matching";
import {
  buildUserMatchProfileFromSkillTest,
  getDefaultUserMatchProfile,
  matchJobDetailToUser,
  normalizeSkillName,
} from "@/services/matching";

const APPLICANT_MATCH_KEYS = [
  "match_percentage",
  "match_percent",
  "overall_percent",
  "overall_match_percent",
  "match_score",
  "overall_match",
  "fit_score",
  "compatibility_score",
] as const;

function parsePercentValue(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value.replace(/%/g, "").trim())
        : Number.NaN;
  if (!Number.isFinite(n)) return null;
  const scaled = n > 0 && n <= 1 ? n * 100 : n;
  return Math.round(Math.min(100, Math.max(0, scaled)));
}

/** Read match % from applicant payload when aggregator/BFF provides it. */
export function applicantMatchPercentFromRecord(
  applicant: JobApplicant,
): number | null {
  for (const key of APPLICANT_MATCH_KEYS) {
    const direct = parsePercentValue(applicant[key]);
    if (direct != null) return direct;
  }
  const nested = applicant.match;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const m = nested as Record<string, unknown>;
    for (const key of [
      "percentage",
      "percent",
      "overall",
      "overall_percent",
      "score",
    ] as const) {
      const v = parsePercentValue(m[key]);
      if (v != null) return v;
    }
  }
  return null;
}

function careerSkillNames(skillsJson: Record<string, unknown> | undefined): string[] {
  if (!skillsJson || typeof skillsJson !== "object") return [];
  const names: string[] = [];
  for (const [key, value] of Object.entries(skillsJson)) {
    if (value == null || value === "") continue;
    if (typeof value === "object" && !Array.isArray(value)) {
      names.push(...Object.keys(value as Record<string, unknown>));
    } else {
      names.push(key);
    }
  }
  return names.map(normalizeSkillName).filter(Boolean);
}

/** Build user match profile from public profile API for job–applicant matching. */
export function buildUserMatchProfileFromPublicProfile(
  profile: PublicUserProfile,
): UserMatchProfile {
  const fromSkills = profile.skills.map((s) => normalizeSkillName(s.skill_name));
  const fromCareer = careerSkillNames(profile.career?.skills_json);
  const userSkills = [...new Set([...fromSkills, ...fromCareer])];

  const industryYears = profile.industry_profile?.industry_years_json ?? {};
  const industryTags = Object.keys(industryYears).filter(
    (k) => typeof industryYears[k] === "number" && industryYears[k] > 0,
  );

  const roleInterests = profile.career?.final_role?.trim()
    ? [profile.career.final_role.trim()]
    : [];

  return getDefaultUserMatchProfile({
    userSkills,
    techStackExperience: userSkills,
    yearsExperienceByIndustry: { ...industryYears },
    industryTags,
    roleInterests,
  });
}

export function computeApplicantMatchPercent(
  jobDetail: JobDetail,
  profile: PublicUserProfile,
): number {
  const user = buildUserMatchProfileFromPublicProfile(profile);
  return matchJobDetailToUser(jobDetail, user).overallPercent;
}

export function resolveApplicantMatchPercent(
  applicant: JobApplicant,
  jobDetail: JobDetail | null,
  profile: PublicUserProfile | null | undefined,
): number | null {
  const fromApi = applicantMatchPercentFromRecord(applicant);
  if (fromApi != null) return fromApi;
  if (!jobDetail || !profile) return null;
  try {
    return computeApplicantMatchPercent(jobDetail, profile);
  } catch {
    return null;
  }
}

/** Fallback when only skill names are known (no full profile fetch). */
export function matchPercentFromSkillNames(
  jobDetail: JobDetail,
  skillNames: string[],
): number | null {
  if (skillNames.length === 0) return null;
  try {
    const user = buildUserMatchProfileFromSkillTest(skillNames);
    return matchJobDetailToUser(jobDetail, user).overallPercent;
  } catch {
    return null;
  }
}
