/**
 * Unit tests for job–user matching (Exp. Level %, Skill %, Industry %).
 * Run with: npx vitest run src/services/__tests__/matching.test.ts
 * Or add vitest and run: npm test
 */
import { describe, it, expect } from "vitest";
import {
  normalizeSkillName,
  matchJobToUser,
  getDefaultUserMatchProfile,
  buildUserMatchProfileFromSkillTest,
} from "../matching";
import type { StructuredJob } from "@/types/matching";

describe("normalizeSkillName", () => {
  it("normalizes common variants to canonical names", () => {
    expect(normalizeSkillName("JavaScript")).toBe("javascript");
    expect(normalizeSkillName("react")).toBe("react");
    expect(normalizeSkillName("Node.js")).toBe("node.js");
    expect(normalizeSkillName("  docker  ")).toBe("docker");
  });
  it("returns lowercase trimmed for unknown skills", () => {
    const out = normalizeSkillName("SomeCustomSkill");
    expect(out).toBe("somecustomskill");
  });
});

function makeJob(overrides: Partial<StructuredJob> = {}): StructuredJob {
  return {
    skillsRequired: [],
    skillsPreferred: [],
    seniority: null,
    roleCategory: "",
    minYearsExperience: null,
    languagesRequired: [],
    techStack: [],
    industryTags: [],
    ...overrides,
  };
}

describe("matchJobToUser - required skills missing", () => {
  it("reports missing required skills in missingCritical and lower skill percent", () => {
    const job = makeJob({
      skillsRequired: ["docker", "kubernetes", "react"],
      skillsPreferred: [],
      techStack: [],
    });
    const user = getDefaultUserMatchProfile({
      userSkills: ["react"],
      techStackExperience: ["react"],
    });
    const result = matchJobToUser(job, user);
    expect(result.skills.percent).toBeLessThan(50);
    expect(result.missingCritical.some((m) => m.includes("docker") || m.includes("kubernetes"))).toBe(true);
    expect(result.missingCritical.length).toBeGreaterThanOrEqual(2);
  });
});

describe("matchJobToUser - preferred only", () => {
  it("when only preferred skills exist, no required, skill percent from preferred", () => {
    const job = makeJob({
      skillsRequired: [],
      skillsPreferred: ["docker", "aws"],
      techStack: [],
    });
    const user = getDefaultUserMatchProfile({
      userSkills: ["docker"],
      techStackExperience: ["docker"],
    });
    const result = matchJobToUser(job, user);
    expect(result.skills.percent).toBeGreaterThanOrEqual(0);
    expect(result.missingCritical.length).toBe(0);
    expect(result.skills.percent).toBe(50);
  });
});

describe("matchJobToUser - unknown min years", () => {
  it("when job minYearsExperience is null, exp level uses only seniority or N/A", () => {
    const job = makeJob({
      seniority: "mid",
      minYearsExperience: null,
    });
    const user = getDefaultUserMatchProfile({
      seniority: "mid",
      yearsExperienceTotal: null,
    });
    const result = matchJobToUser(job, user);
    expect(result.expLevel.percent).not.toBeNull();
    expect(result.expLevel.reasons.length).toBeGreaterThan(0);
  });
});

describe("matchJobToUser - unknown seniority", () => {
  it("when job seniority is null, exp level percent can be N/A or from years only", () => {
    const job = makeJob({
      seniority: null,
      minYearsExperience: 3,
    });
    const user = getDefaultUserMatchProfile({
      seniority: "unknown",
      yearsExperienceTotal: 5,
    });
    const result = matchJobToUser(job, user);
    expect(result.expLevel.percent).not.toBeNull();
    expect(result.expLevel.details).toBeDefined();
  });
});

describe("matchJobToUser - industry tags missing", () => {
  it("when job industryTags empty, industry percent is null and reason says not specified", () => {
    const job = makeJob({ industryTags: [] });
    const user = getDefaultUserMatchProfile({ industryTags: ["Technology"] });
    const result = matchJobToUser(job, user);
    expect(result.industry.percent).toBeNull();
    expect(result.industry.reasons.some((r) => r.toLowerCase().includes("not specified"))).toBe(true);
  });
});

describe("matchJobToUser - language required pass/fail", () => {
  it("when user has required language, no language in missingCritical", () => {
    const job = makeJob({ languagesRequired: ["English C1"] });
    const user = getDefaultUserMatchProfile({ languages: ["English C1"] });
    const result = matchJobToUser(job, user);
    expect(result.missingCritical.some((m) => m.includes("English"))).toBe(false);
    expect(result.badges.some((b) => b.includes("Language"))).toBe(true);
  });
  it("when user misses required language, added to missingCritical", () => {
    const job = makeJob({ languagesRequired: ["German B2"] });
    const user = getDefaultUserMatchProfile({ languages: ["English C1"] });
    const result = matchJobToUser(job, user);
    expect(result.missingCritical.some((m) => m.includes("German"))).toBe(true);
    expect(result.overallPercent).toBeLessThanOrEqual(100);
  });
});

describe("buildUserMatchProfileFromSkillTest", () => {
  it("normalizes skills and sets defaults", () => {
    const profile = buildUserMatchProfileFromSkillTest(["React", "TypeScript"]);
    expect(profile.userSkills).toContain("react");
    expect(profile.userSkills).toContain("typescript");
    expect(profile.seniority).toBe("unknown");
    expect(profile.yearsExperienceTotal).toBeNull();
    expect(profile.industryTags).toEqual([]);
  });
});
