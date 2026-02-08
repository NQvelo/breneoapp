/**
 * Job matching types: user profile for matching, structured job fields, and match result.
 */

/** Seniority levels used for experience level matching */
export type SeniorityLevel =
  | "intern"
  | "junior"
  | "mid"
  | "senior"
  | "lead"
  | "unknown";

/**
 * User profile data used for job matching.
 * Arrays default to [], numbers to null, seniority to "unknown" when not present.
 */
export interface UserMatchProfile {
  /** Canonical skill names (same normalization as jobs) */
  userSkills: string[];
  /** Total years of experience */
  yearsExperienceTotal: number | null;
  /** Years per industry, e.g. { "E-commerce": 2, "FinTech": 1 } */
  yearsExperienceByIndustry: Record<string, number>;
  /** Industry tags, e.g. ["E-commerce", "FinTech"] */
  industryTags: string[];
  seniority: SeniorityLevel;
  /** Formatted like "English C1", "German B2" */
  languages: string[];
  /** Optional role interests */
  roleInterests: string[];
  /** Optional; can be merged with userSkills for matching */
  techStackExperience: string[];
}

/**
 * Structured job fields used for matching.
 * Missing fields are treated as N/A (no penalty).
 */
export interface StructuredJob {
  skillsRequired: string[];
  skillsPreferred: string[];
  seniority: SeniorityLevel | null;
  roleCategory: string;
  minYearsExperience: number | null;
  languagesRequired: string[];
  techStack: string[];
  /** Inferred or from source; empty => industry match N/A */
  industryTags: string[];
}

/** Single bucket result (exp level, skills, or industry) */
export interface MatchBucket {
  percent: number | null;
  reasons: string[];
  details: Record<string, unknown>;
}

/**
 * Result of matchJobToUser(job, user).
 * Deterministic and explainable.
 */
export interface MatchResult {
  expLevel: MatchBucket;
  skills: MatchBucket;
  industry: MatchBucket;
  overallPercent: number;
  badges: string[];
  missingCritical: string[];
}
