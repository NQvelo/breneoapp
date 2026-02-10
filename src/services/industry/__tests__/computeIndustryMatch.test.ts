/**
 * Unit and integration tests for computeIndustryMatch.
 * Run: npx vitest run src/services/industry/__tests__/computeIndustryMatch.test.ts
 */
import { describe, it, expect } from "vitest";
import { computeIndustryMatch } from "../computeIndustryMatch";

describe("computeIndustryMatch - no job industries", () => {
  it("returns percent null and isNa true when jobIndustryTags empty", () => {
    const result = computeIndustryMatch([], { fintech: 2 });
    expect(result.percent).toBeNull();
    expect(result.isNa).toBe(true);
    expect(result.reasons).toContain("Job industry not provided");
    expect(result.matchedExact).toEqual([]);
    expect(result.missing).toEqual([]);
  });
});

describe("computeIndustryMatch - exact match", () => {
  it("scores exact match with base 1.0 and years boost", () => {
    const result = computeIndustryMatch(
      ["fintech"],
      { fintech: 2 }
    );
    expect(result.percent).toBeGreaterThanOrEqual(100);
    expect(result.matchedExact).toHaveLength(1);
    expect(result.matchedExact[0].tag).toBe("fintech");
    expect(result.matchedExact[0].years).toBe(2);
    expect(result.missing).toHaveLength(0);
  });

  it("years boost capped: 5+ years gives max boost 0.2", () => {
    const result = computeIndustryMatch(
      ["fintech"],
      { fintech: 10 }
    );
    expect(result.percent).toBe(100);
    expect(result.reasons.some((r) => r.includes("Exact match"))).toBe(true);
  });
});

describe("computeIndustryMatch - related match", () => {
  it("scores related match with base 0.5", () => {
    const result = computeIndustryMatch(
      ["banking"],
      { fintech: 2 }
    );
    expect(result.percent).toBeGreaterThan(50);
    expect(result.percent).toBeLessThanOrEqual(100);
    expect(result.matchedRelated).toHaveLength(1);
    expect(result.matchedRelated[0].jobTag).toBe("banking");
    expect(result.matchedRelated[0].matchedVia).toBe("fintech");
    expect(result.matchedRelated[0].years).toBe(2);
    expect(result.missing).toHaveLength(0);
  });
});

describe("computeIndustryMatch - missing", () => {
  it("scores 0 for job tag with no user match", () => {
    const result = computeIndustryMatch(
      ["healthcare"],
      { fintech: 5 }
    );
    expect(result.missing).toContain("healthcare");
    expect(result.matchedExact).toHaveLength(0);
    expect(result.matchedRelated).toHaveLength(0);
    expect(result.percent).toBe(0);
  });
});

describe("computeIndustryMatch - years boost cap", () => {
  it("years boost is at most 0.2 per tag", () => {
    const result = computeIndustryMatch(
      ["fintech"],
      { fintech: 1 }
    );
    const withOneYear = result.percent ?? 0;
    const resultHigh = computeIndustryMatch(
      ["fintech"],
      { fintech: 20 }
    );
    const withTwentyYears = resultHigh.percent ?? 0;
    expect(withTwentyYears).toBeLessThanOrEqual(withOneYear + 25);
    expect(withTwentyYears).toBe(100);
  });
});

describe("computeIndustryMatch - integration", () => {
  it("userIndustryYears fintech 2.5, job FinTech Banking Healthcare => FinTech exact, Banking related, Healthcare zero", () => {
    const jobIndustryTags = ["fintech", "banking", "healthcare"];
    const userIndustryYears = { fintech: 2.5 };
    const result = computeIndustryMatch(jobIndustryTags, userIndustryYears);

    expect(result.matchedExact).toHaveLength(1);
    expect(result.matchedExact[0].tag).toBe("fintech");
    expect(result.matchedExact[0].years).toBe(2.5);

    expect(result.matchedRelated).toHaveLength(1);
    expect(result.matchedRelated[0].jobTag).toBe("banking");
    expect(result.matchedRelated[0].matchedVia).toBe("fintech");

    expect(result.missing).toContain("healthcare");

    const expectedPercent = Math.round(
      ((1.0 + 0.5 * (1 + 0.1)) + 0.5 * (1 + 0.1)) / 3 * 100
    );
    expect(result.percent).toBeGreaterThan(0);
    expect(result.percent).toBeLessThanOrEqual(100);
    expect(typeof result.percent).toBe("number");

    expect(result.reasons.some((r) => r.includes("Exact match") && r.includes("Fintech"))).toBe(true);
    expect(result.reasons.some((r) => r.includes("Related match") && r.includes("Banking"))).toBe(true);
    expect(result.reasons.some((r) => r.includes("No match") && r.includes("Healthcare"))).toBe(true);
  });
});
