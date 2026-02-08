/**
 * Job–user matching service (Jobright-style match %).
 * Compares structured job fields to user profile and returns
 * Exp. Level %, Skill %, Industry % + overall and explanations.
 */

import type { JobDetail } from "@/api/jobs/types";
import type {
  UserMatchProfile,
  StructuredJob,
  MatchResult,
  MatchBucket,
  SeniorityLevel,
} from "@/types/matching";
import { extractJobSkills } from "@/utils/jobMatchUtils";

// ---------------------------------------------------------------------------
// Canonical skill catalog: variant -> canonical name (same as jobMatchUtils)
// ---------------------------------------------------------------------------
const SKILL_KEYWORDS: Record<string, string[]> = {
  javascript: ["javascript", "js", "node.js", "nodejs", "react", "vue", "angular"],
  python: ["python", "django", "flask", "fastapi"],
  java: ["java", "spring", "spring boot"],
  "c++": ["c++", "cpp", "c plus plus"],
  "c#": ["c#", "csharp", "dotnet", ".net"],
  go: ["go", "golang"],
  rust: ["rust"],
  php: ["php", "laravel", "symfony"],
  ruby: ["ruby", "rails"],
  swift: ["swift", "ios"],
  kotlin: ["kotlin", "android"],
  typescript: ["typescript", "ts"],
  html: ["html", "html5"],
  css: ["css", "css3", "sass", "scss", "tailwind"],
  sql: ["sql", "mysql", "postgresql", "mongodb", "database"],
  react: ["react", "reactjs", "react.js"],
  vue: ["vue", "vuejs", "vue.js"],
  angular: ["angular", "angularjs"],
  "node.js": ["node.js", "nodejs", "node"],
  express: ["express", "express.js"],
  django: ["django"],
  flask: ["flask"],
  spring: ["spring", "spring boot"],
  laravel: ["laravel"],
  rails: ["rails", "ruby on rails"],
  git: ["git", "github", "gitlab"],
  docker: ["docker", "containerization"],
  kubernetes: ["kubernetes", "k8s"],
  aws: ["aws", "amazon web services"],
  azure: ["azure", "microsoft azure"],
  gcp: ["gcp", "google cloud", "google cloud platform"],
  linux: ["linux", "unix"],
  "machine learning": ["machine learning", "ml", "deep learning", "neural network"],
  "data science": ["data science", "data analysis", "data analytics"],
  ai: ["artificial intelligence", "ai", "nlp", "natural language processing"],
  blockchain: ["blockchain", "ethereum", "solidity", "web3"],
  devops: ["devops", "ci/cd", "continuous integration"],
  testing: ["testing", "qa", "quality assurance", "test automation"],
  ui: ["ui", "user interface", "ux", "user experience"],
  design: ["design", "figma", "sketch", "adobe"],
};

/** Map: lowercase variant -> canonical skill name. Prefer self-mapping (e.g. "react" -> "react"). */
const VARIANT_TO_CANONICAL: Record<string, string> = {};
for (const canonical of Object.keys(SKILL_KEYWORDS)) {
  const key = canonical.toLowerCase().trim();
  VARIANT_TO_CANONICAL[key] = canonical;
}
for (const [canonical, variants] of Object.entries(SKILL_KEYWORDS)) {
  for (const v of variants) {
    const key = v.toLowerCase().trim();
    if (!(key in VARIANT_TO_CANONICAL)) VARIANT_TO_CANONICAL[key] = canonical;
  }
}

/**
 * Normalize a skill string to the same canonical name used in the job catalog.
 */
export function normalizeSkillName(s: string): string {
  const key = s.toLowerCase().trim().replace(/\s+/g, " ");
  return VARIANT_TO_CANONICAL[key] ?? key;
}

/** Seniority rank for comparison (intern=0 .. lead=4, unknown=null) */
const SENIORITY_RANK: Record<SeniorityLevel, number | null> = {
  intern: 0,
  junior: 1,
  mid: 2,
  senior: 3,
  lead: 4,
  unknown: null,
};

function parseSeniority(raw: string | undefined): SeniorityLevel | null {
  if (!raw || typeof raw !== "string") return null;
  const v = raw.toLowerCase().trim();
  if (v in SENIORITY_RANK && SENIORITY_RANK[v as SeniorityLevel] !== null)
    return v as SeniorityLevel;
  if (/\bintern\b/.test(v)) return "intern";
  if (/\bjunior\b|\bentry\b/.test(v)) return "junior";
  if (/\bmid\b|\bmiddle\b|\bintermediate\b/.test(v)) return "mid";
  if (/\bsenior\b/.test(v)) return "senior";
  if (/\blead\b|\bprincipal\b|\bstaff\b/.test(v)) return "lead";
  return null;
}

/** Parse min years from strings like "2-5 years", "3+ years", "5" */
function parseMinYears(raw: string | undefined): number | null {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim();
  const lowMatch = s.match(/(\d+)\s*[-–—]\s*\d+/); // "2-5"
  if (lowMatch) return parseInt(lowMatch[1], 10);
  const plusMatch = s.match(/(\d+)\s*\+/); // "3+"
  if (plusMatch) return parseInt(plusMatch[1], 10);
  const numMatch = s.match(/\b(\d+)\s*(?:year|yr|y\.?)?s?\b/i);
  if (numMatch) return parseInt(numMatch[1], 10);
  return null;
}

/** Infer industry tags from role category / job title (simple mapping) */
const ROLE_TO_INDUSTRY: Record<string, string[]> = {
  engineering: ["Technology", "Software"],
  software: ["Technology", "Software"],
  "data science": ["Technology", "Data & Analytics"],
  "product management": ["Product", "Technology"],
  design: ["Design", "Creative"],
  marketing: ["Marketing", "Advertising"],
  sales: ["Sales", "Business Development"],
  finance: ["Finance", "FinTech"],
  healthcare: ["Healthcare"],
  "customer support": ["Customer Service"],
  operations: ["Operations"],
};

function inferIndustryTags(
  roleCategory: string,
  jobIndustry: string | undefined,
  title: string | undefined
): string[] {
  const tags: string[] = [];
  const industryStr = (jobIndustry || "").trim();
  if (industryStr) {
    industryStr.split(/[,;|/]/).forEach((t) => {
      const t2 = t.trim();
      if (t2) tags.push(t2);
    });
  }
  const roleLower = (roleCategory || "").toLowerCase();
  for (const [role, industries] of Object.entries(ROLE_TO_INDUSTRY)) {
    if (roleLower.includes(role)) {
      industries.forEach((ind) => {
        if (!tags.includes(ind)) tags.push(ind);
      });
    }
  }
  const titleLower = (title || "").toLowerCase();
  if (titleLower.includes("fintech") || titleLower.includes("finance")) {
    if (!tags.includes("FinTech")) tags.push("FinTech");
  }
  if (titleLower.includes("e-commerce") || titleLower.includes("ecommerce")) {
    if (!tags.includes("E-commerce")) tags.push("E-commerce");
  }
  return [...new Set(tags)];
}

/**
 * Build structured job from API JobDetail.
 * Uses existing fields when present; infers from description/title when not.
 */
export function getStructuredJobFromDetail(job: JobDetail): StructuredJob {
  const raw = job as Record<string, unknown>;
  const skillsFromApi = (
    raw.required_skills ?? raw.skills ?? raw.job_skills ?? []
  ) as string[] | string;
  const requiredArr = Array.isArray(skillsFromApi)
    ? skillsFromApi.filter((x): x is string => typeof x === "string")
    : typeof skillsFromApi === "string"
      ? skillsFromApi.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
      : [];
  const extracted = extractJobSkills(job);
  const requiredNormalized = [
    ...new Set([
      ...requiredArr.map(normalizeSkillName),
      ...extracted.map(normalizeSkillName),
    ]),
  ];
  const preferredFromApi = (raw.skills_preferred ?? raw.skillsPreferred) as string[] | undefined;
  const preferredArr = Array.isArray(preferredFromApi)
    ? preferredFromApi.filter((x): x is string => typeof x === "string")
    : [];
  const preferredNormalized = [...new Set(preferredArr.map(normalizeSkillName))];
  const techStackRaw = (raw.tech_stack ?? raw.techStack) as string[] | undefined;
  const techArr = Array.isArray(techStackRaw)
    ? techStackRaw.filter((x): x is string => typeof x === "string")
    : [];
  const techNormalized = techArr.length > 0
    ? [...new Set(techArr.map(normalizeSkillName))]
    : [...new Set(extracted.map(normalizeSkillName))];

  const seniorityRaw =
    (raw.seniority as string) ??
    (job.job_required_experience as string) ??
    (job.required_experience as string);
  let seniority = parseSeniority(seniorityRaw);
  if (!seniority && (job.title || job.job_title)) {
    seniority = parseSeniority((job.title || job.job_title) as string);
  }

  const roleCategory =
    (raw.role_category as string) ??
    (raw.roleCategory as string) ??
    (job.job_category as string) ??
    (job.category as string) ??
    (job.industry as string) ??
    (job.job_industry as string) ??
    "";

  const minYears =
    typeof raw.min_years_experience === "number"
      ? raw.min_years_experience
      : typeof raw.minYearsExperience === "number"
        ? raw.minYearsExperience
        : parseMinYears(
            (job.job_required_experience ?? job.required_experience) as string
          );

  const langRaw = (raw.languages_required ?? raw.languagesRequired) as string[] | string | undefined;
  const languagesRequired: string[] = Array.isArray(langRaw)
    ? langRaw.filter((x): x is string => typeof x === "string")
    : typeof langRaw === "string"
      ? langRaw.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
      : [];

  const jobIndustry = (job.industry ?? job.job_industry) as string | undefined;
  const industryTags = inferIndustryTags(
    roleCategory,
    jobIndustry,
    (job.title ?? job.job_title) as string
  );

  return {
    skillsRequired: requiredNormalized,
    skillsPreferred: preferredNormalized,
    seniority: seniority ?? null,
    roleCategory,
    minYearsExperience: minYears,
    languagesRequired,
    techStack: techNormalized,
    industryTags,
  };
}

// ---------- Skill matching ----------
const SKILL_WEIGHTS = { required: 0.7, preferred: 0.2, stack: 0.1 };
const MAX_REASONS = 6;

function computeSkillMatch(
  job: StructuredJob,
  user: UserMatchProfile
): { bucket: MatchBucket; missingCritical: string[] } {
  const userSkillSet = new Set<string>([
    ...user.userSkills.map(normalizeSkillName),
    ...(user.techStackExperience || []).map(normalizeSkillName),
  ]);

  const required = [...new Set(job.skillsRequired.map(normalizeSkillName))];
  const preferred = [...new Set(job.skillsPreferred.map(normalizeSkillName))];
  const stack = [...new Set(job.techStack.map(normalizeSkillName))];

  let requiredCoverage: number | null = null;
  let preferredCoverage: number | null = null;
  let stackCoverage: number | null = null;

  let requiredMatched = 0;
  const matchedRequired: string[] = [];
  const missingRequired: string[] = [];

  if (required.length > 0) {
    for (const r of required) {
      if (userSkillSet.has(r)) {
        requiredMatched++;
        matchedRequired.push(r);
      } else {
        missingRequired.push(r);
      }
    }
    requiredCoverage = requiredMatched / required.length;
  }

  let preferredMatched = 0;
  const matchedPreferred: string[] = [];
  if (preferred.length > 0) {
    for (const p of preferred) {
      if (userSkillSet.has(p)) {
        preferredMatched++;
        matchedPreferred.push(p);
      }
    }
    preferredCoverage = preferredMatched / preferred.length;
  }

  if (stack.length > 0) {
    const stackMatched = stack.filter((s) => userSkillSet.has(s)).length;
    stackCoverage = stackMatched / stack.length;
  }

  const parts: { w: number; v: number }[] = [];
  if (requiredCoverage !== null) parts.push({ w: SKILL_WEIGHTS.required, v: requiredCoverage });
  if (preferredCoverage !== null) parts.push({ w: SKILL_WEIGHTS.preferred, v: preferredCoverage });
  if (stackCoverage !== null) parts.push({ w: SKILL_WEIGHTS.stack, v: stackCoverage });

  let skillsPercent: number | null = null;
  if (parts.length > 0) {
    const totalW = parts.reduce((a, x) => a + x.w, 0);
    const weightedSum = parts.reduce((a, x) => a + x.w * x.v, 0);
    skillsPercent = Math.round((weightedSum / totalW) * 100);
  }

  const reasons: string[] = [];
  if (matchedRequired.length) {
    reasons.push(`Matched required: ${matchedRequired.slice(0, MAX_REASONS).join(", ")}`);
  }
  if (missingRequired.length) {
    reasons.push(`Missing required: ${missingRequired.slice(0, MAX_REASONS).join(", ")}`);
  }
  if (matchedPreferred.length) {
    reasons.push(`Matched preferred: ${matchedPreferred.slice(0, MAX_REASONS).join(", ")}`);
  }
  if (reasons.length === 0 && skillsPercent !== null) {
    reasons.push("Skills compared with job requirements.");
  }

  const missingCritical: string[] = missingRequired.map((s) => `Missing required skill: ${s}`);

  const details: Record<string, unknown> = {
    requiredMatched,
    requiredTotal: required.length,
    preferredMatched,
    preferredTotal: preferred.length,
    matchedRequired: matchedRequired.slice(0, MAX_REASONS),
    missingRequired: missingRequired.slice(0, MAX_REASONS),
    matchedPreferred: matchedPreferred.slice(0, MAX_REASONS),
  };

  return {
    bucket: {
      percent: skillsPercent,
      reasons,
      details,
    },
    missingCritical,
  };
}

// ---------- Experience level matching ----------
function computeExpLevelMatch(job: StructuredJob, user: UserMatchProfile): MatchBucket {
  let seniorityComponent: number | null = null;
  const jobRank = job.seniority !== null ? SENIORITY_RANK[job.seniority] : null;
  const userRank = user.seniority !== "unknown" ? SENIORITY_RANK[user.seniority] : null;

  if (jobRank !== null && jobRank !== undefined) {
    if (userRank === null || userRank === undefined) {
      seniorityComponent = 0.5;
    } else {
      const diff = userRank - jobRank;
      if (diff === 0) seniorityComponent = 1.0;
      else if (diff === 1) seniorityComponent = 0.85;
      else if (diff >= 2) seniorityComponent = 0.75;
      else if (diff === -1) seniorityComponent = 0.55;
      else seniorityComponent = 0.25;
    }
  }

  let yearsComponent: number | null = null;
  if (job.minYearsExperience != null && user.yearsExperienceTotal != null) {
    if (user.yearsExperienceTotal >= job.minYearsExperience) {
      yearsComponent = 1.0;
    } else {
      yearsComponent = Math.min(
        1,
        Math.max(0, user.yearsExperienceTotal / job.minYearsExperience)
      );
    }
  }

  const parts: { w: number; v: number }[] = [];
  if (seniorityComponent !== null) parts.push({ w: 0.6, v: seniorityComponent });
  if (yearsComponent !== null) parts.push({ w: 0.4, v: yearsComponent });

  let expLevelPercent: number | null = null;
  if (parts.length > 0) {
    const totalW = parts.reduce((a, x) => a + x.w, 0);
    expLevelPercent = Math.round(
      (parts.reduce((a, x) => a + x.w * x.v, 0) / totalW) * 100
    );
  }

  const reasons: string[] = [];
  if (job.seniority) reasons.push(`Job expects: ${job.seniority}`);
  if (job.minYearsExperience != null) reasons.push(`Job min years: ${job.minYearsExperience}`);
  if (user.seniority !== "unknown") reasons.push(`You have: ${user.seniority}`);
  if (user.yearsExperienceTotal != null) reasons.push(`Your years: ${user.yearsExperienceTotal}`);
  if (reasons.length === 0) reasons.push("Experience level not specified for this job.");

  return {
    percent: expLevelPercent,
    reasons,
    details: {
      seniorityComponent,
      yearsComponent,
      jobSeniority: job.seniority,
      jobMinYears: job.minYearsExperience,
      userSeniority: user.seniority,
      userYears: user.yearsExperienceTotal,
    },
  };
}

// ---------- Industry matching ----------
function computeIndustryMatch(job: StructuredJob, user: UserMatchProfile): MatchBucket {
  if (job.industryTags.length === 0) {
    return {
      percent: null,
      reasons: ["Industry not specified for this job."],
      details: {},
    };
  }

  const userTags = new Set(
    (user.industryTags || []).map((t) => t.trim()).filter(Boolean)
  );
  const overlap = job.industryTags.filter((t) => userTags.has(t)).length;
  let baseCoverage = overlap / job.industryTags.length;

  let boost = 0;
  const yearsByIndustry = user.yearsExperienceByIndustry || {};
  for (const tag of job.industryTags) {
    const years = yearsByIndustry[tag];
    if (years != null && years > 0) {
      boost = Math.min(0.2, boost + (years / 5) * 0.2);
    }
  }
  const industryCoverage = Math.min(1, Math.max(0, baseCoverage + boost));
  const industryPercent = Math.round(industryCoverage * 100);

  const reasons: string[] = [];
  reasons.push(`Job industries: ${job.industryTags.slice(0, 5).join(", ")}`);
  const matchingTags = job.industryTags.filter((t) => userTags.has(t));
  if (matchingTags.length) {
    reasons.push(`Your matching industries: ${matchingTags.join(", ")}`);
    const withYears = matchingTags
      .filter((t) => yearsByIndustry[t] != null)
      .map((t) => `${t} (${yearsByIndustry[t]} yrs)`);
    if (withYears.length) reasons.push(withYears.join(", "));
  } else {
    reasons.push("No overlapping industry experience.");
  }

  return {
    percent: industryPercent,
    reasons,
    details: {
      overlap,
      totalJobTags: job.industryTags.length,
      baseCoverage,
      boost,
      matchingTags: matchingTags.slice(0, 10),
    },
  };
}

// ---------- Language gating (CEFR) ----------
const CEFR_ORDER = ["a1", "a2", "b1", "b2", "c1", "c2", "native"];

function parseLanguageLevel(s: string): { lang: string; level: string } {
  const t = s.trim();
  const match = t.match(/^(.+?)\s+(a1|a2|b1|b2|c1|c2|native)$/i);
  if (match) return { lang: match[1].trim().toLowerCase(), level: match[2].toLowerCase() };
  return { lang: t.toLowerCase(), level: "native" };
}

function levelAtLeast(userLevel: string, requiredLevel: string): boolean {
  const ui = CEFR_ORDER.indexOf(userLevel.toLowerCase());
  const ri = CEFR_ORDER.indexOf(requiredLevel.toLowerCase());
  if (ri === -1) return true;
  if (ui === -1) return false;
  return ui >= ri;
}

function checkLanguageGate(
  job: StructuredJob,
  user: UserMatchProfile
): string[] {
  const missing: string[] = [];
  if (job.languagesRequired.length === 0) return missing;

  const userLangs = new Map<string, string>();
  for (const u of user.languages || []) {
    const { lang, level } = parseLanguageLevel(u);
    const existing = userLangs.get(lang);
    if (!existing || CEFR_ORDER.indexOf(level) > CEFR_ORDER.indexOf(existing)) {
      userLangs.set(lang, level);
    }
  }

  for (const req of job.languagesRequired) {
    const { lang: reqLang, level: reqLevel } = parseLanguageLevel(req);
    const userLevel = userLangs.get(reqLang);
    if (!userLevel || !levelAtLeast(userLevel, reqLevel)) {
      missing.push(`Missing language: ${req}`);
    }
  }
  return missing;
}

// ---------- Overall + badges ----------
function weightedOverall(
  skillsPercent: number | null,
  expLevelPercent: number | null,
  industryPercent: number | null
): number {
  const parts: { w: number; v: number }[] = [];
  if (skillsPercent !== null) parts.push({ w: 0.5, v: skillsPercent / 100 });
  if (expLevelPercent !== null) parts.push({ w: 0.3, v: expLevelPercent / 100 });
  if (industryPercent !== null) parts.push({ w: 0.2, v: industryPercent / 100 });
  if (parts.length === 0) return 0;
  const totalW = parts.reduce((a, x) => a + x.w, 0);
  return (parts.reduce((a, x) => a + x.w * x.v, 0) / totalW) * 100;
}

function buildBadges(
  job: StructuredJob,
  user: UserMatchProfile,
  skillBucket: MatchBucket,
  industryBucket: MatchBucket,
  languageMissing: string[]
): string[] {
  const badges: string[] = [];
  const skillPercent = skillBucket.percent ?? 0;
  if (job.skillsRequired.length > 0 && skillPercent >= 80) {
    badges.push("Meets required skills");
  }
  if (job.skillsPreferred.length > 0 && (skillBucket.details as { preferredMatched?: number }).preferredMatched > 0) {
    badges.push("Has preferred skills");
  }
  if (languageMissing.length === 0 && job.languagesRequired.length > 0) {
    badges.push("Language fit");
  }
  if (user.seniority !== "unknown" && job.seniority && user.seniority === job.seniority) {
    badges.push("Seniority match");
  }
  const industryDetails = industryBucket.details as { matchingTags?: string[] };
  if (job.industryTags.length > 0 && industryDetails.matchingTags?.length) {
    badges.push("Industry experience");
  }
  return badges;
}

// ---------- Main API ----------

/**
 * Compute match result for a job and user profile.
 * Deterministic and explainable.
 */
export function matchJobToUser(
  job: StructuredJob,
  user: UserMatchProfile
): MatchResult {
  const { bucket: skillsBucket, missingCritical: skillCritical } = computeSkillMatch(
    job,
    user
  );
  const expLevelBucket = computeExpLevelMatch(job, user);
  const industryBucket = computeIndustryMatch(job, user);

  const languageMissing = checkLanguageGate(job, user);
  const missingCritical = [...skillCritical, ...languageMissing];

  let overallPercent = weightedOverall(
    skillsBucket.percent ?? 0,
    expLevelBucket.percent ?? 0,
    industryBucket.percent ?? 0
  );
  if (languageMissing.length > 0) {
    overallPercent = overallPercent * 0.75;
  }
  overallPercent = Math.round(Math.min(100, Math.max(0, overallPercent)));

  const badges = buildBadges(job, user, skillsBucket, industryBucket, languageMissing);

  return {
    expLevel: expLevelBucket,
    skills: skillsBucket,
    industry: industryBucket,
    overallPercent,
    badges,
    missingCritical,
  };
}

/**
 * Default user profile when fields are missing.
 */
export function getDefaultUserMatchProfile(partial: Partial<UserMatchProfile> = {}): UserMatchProfile {
  return {
    userSkills: partial.userSkills ?? [],
    yearsExperienceTotal: partial.yearsExperienceTotal ?? null,
    yearsExperienceByIndustry: partial.yearsExperienceByIndustry ?? {},
    industryTags: partial.industryTags ?? [],
    seniority: partial.seniority ?? "unknown",
    languages: partial.languages ?? [],
    roleInterests: partial.roleInterests ?? [],
    techStackExperience: partial.techStackExperience ?? [],
  };
}

/**
 * Build UserMatchProfile from skill test result + optional extras.
 * Normalizes user skills to canonical names.
 */
export function buildUserMatchProfileFromSkillTest(
  skillNames: string[],
  options: Partial<Omit<UserMatchProfile, "userSkills">> = {}
): UserMatchProfile {
  const normalized = [...new Set(skillNames.map(normalizeSkillName))];
  return getDefaultUserMatchProfile({
    userSkills: normalized,
    techStackExperience: normalized,
    ...options,
  });
}

/**
 * Compute match result from API job detail and user profile.
 * Structures the job from detail then runs matchJobToUser.
 */
export function matchJobDetailToUser(
  jobDetail: JobDetail,
  user: UserMatchProfile
): MatchResult {
  const structured = getStructuredJobFromDetail(jobDetail);
  return matchJobToUser(structured, user);
}
