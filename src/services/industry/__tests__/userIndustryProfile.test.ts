/**
 * Unit tests: compute years (including endDate null = current job), build industry years.
 * Run: npx vitest run src/services/industry/__tests__/userIndustryProfile.test.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  computeYearsForRow,
  buildIndustryYearsFromWorkExperience,
  getUserIndustryYears,
} from "../userIndustryProfile";
import type { WorkExperienceRow } from "../userIndustryProfile";

describe("computeYearsForRow", () => {
  const now = new Date("2025-06-01T12:00:00Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("computes years from start to end", () => {
    const y = computeYearsForRow("2020-01-01", "2023-01-01");
    expect(y).toBeGreaterThan(2.9);
    expect(y).toBeLessThan(3.2);
  });

  it("uses now when endDate is null (current job)", () => {
    const y = computeYearsForRow("2023-01-01", null);
    expect(y).toBeGreaterThan(2.4);
    expect(y).toBeLessThan(2.6);
  });

  it("uses now when endDate is empty and is_current true", () => {
    const y = computeYearsForRow("2023-01-01", "", true);
    expect(y).toBeGreaterThan(2.4);
  });

  it("returns 0 when start is invalid", () => {
    expect(computeYearsForRow("")).toBe(0);
    expect(computeYearsForRow("invalid")).toBe(0);
  });

  it("returns 0 when end < start", () => {
    const y = computeYearsForRow("2023-01-01", "2020-01-01");
    expect(y).toBe(0);
  });

  it("caps at MAX_YEARS_PER_ROW (10)", () => {
    const y = computeYearsForRow("2010-01-01", "2025-01-01");
    expect(y).toBe(10);
  });
});

describe("buildIndustryYearsFromWorkExperience", () => {
  it("assigns industries from job title / position only", () => {
    const rows: WorkExperienceRow[] = [
      {
        jobTitle: "UI/UX Designer",
        startDate: "2020-01-01",
        endDate: "2022-06-01",
      },
      {
        jobTitle: "Random Job Title",
        startDate: "2018-01-01",
        endDate: "2020-01-01",
      },
    ];
    const profile = buildIndustryYearsFromWorkExperience("user-1", rows);
    expect(profile.userId).toBe("user-1");
    expect(profile.industryYearsJson.design).toBeGreaterThan(0);
    expect(Object.keys(profile.industryYearsJson)).not.toContain("random");
  });

  it("sums years across multiple roles in same industry", () => {
    const rows: WorkExperienceRow[] = [
      { jobTitle: "Software Engineer", startDate: "2020-01-01", endDate: "2021-01-01" },
      { jobTitle: "Frontend Developer", startDate: "2021-01-01", endDate: "2022-01-01" },
    ];
    const profile = buildIndustryYearsFromWorkExperience("u", rows);
    const tech = profile.industryYearsJson.technology ?? 0;
    expect(tech).toBeGreaterThan(1.5);
  });

  it("includes updatedAt", () => {
    const profile = buildIndustryYearsFromWorkExperience("u", []);
    expect(profile.updatedAt).toBeDefined();
    expect(() => new Date(profile.updatedAt)).not.toThrow();
  });
});

describe("getUserIndustryYears", () => {
  it("returns copy of industryYearsJson when profile valid", () => {
    const profile = {
      userId: "u",
      industryYearsJson: { fintech: 2.5 },
      updatedAt: new Date().toISOString(),
    };
    const out = getUserIndustryYears(profile);
    expect(out).toEqual({ fintech: 2.5 });
    expect(out).not.toBe(profile.industryYearsJson);
  });
  it("returns empty object when profile null or invalid", () => {
    expect(getUserIndustryYears(null)).toEqual({});
    expect(getUserIndustryYears(undefined)).toEqual({});
    expect(getUserIndustryYears({ userId: "u", industryYearsJson: null, updatedAt: "" })).toEqual({});
  });
});
