/**
 * Unit tests for industry taxonomy (parseIndustryTags, synonyms).
 * Run: npx vitest run src/services/industry/__tests__/industry_taxonomy.test.ts
 */
import { describe, it, expect } from "vitest";
import {
  parseIndustryTags,
  INDUSTRY_SYNONYMS,
  INDUSTRY_RELATED,
  capitalizeIndustryTag,
} from "../industry_taxonomy";

describe("parseIndustryTags", () => {
  it("returns empty array for null or empty string", () => {
    expect(parseIndustryTags(null)).toEqual([]);
    expect(parseIndustryTags(undefined)).toEqual([]);
    expect(parseIndustryTags("")).toEqual([]);
    expect(parseIndustryTags("   ")).toEqual([]);
  });

  it("splits by comma, trims, lowercases", () => {
    expect(parseIndustryTags("FinTech, Banking, Payments")).toEqual([
      "fintech",
      "banking",
      "payments",
    ]);
  });

  it("applies synonyms", () => {
    expect(parseIndustryTags("Financial Services")).toContain("fintech");
    expect(parseIndustryTags("E Commerce")).toContain("e-commerce");
    expect(parseIndustryTags("ecommerce")).toContain("e-commerce");
  });

  it("removes duplicates", () => {
    const out = parseIndustryTags("FinTech, fintech, FIN TECH");
    expect(out.filter((t) => t === "fintech").length).toBe(1);
  });

  it("handles extra spaces and multiple commas", () => {
    const out = parseIndustryTags("  FinTech ,  Banking  ,  ");
    expect(out).toContain("fintech");
    expect(out).toContain("banking");
    expect(out.length).toBe(2);
  });
});

describe("INDUSTRY_SYNONYMS", () => {
  it("maps financial services to fintech", () => {
    expect(INDUSTRY_SYNONYMS["financial services"]).toBe("fintech");
  });
  it("maps e commerce to e-commerce", () => {
    expect(INDUSTRY_SYNONYMS["e commerce"]).toBe("e-commerce");
  });
});

describe("capitalizeIndustryTag", () => {
  it("capitalizes first letter", () => {
    expect(capitalizeIndustryTag("fintech")).toBe("Fintech");
  });
  it("handles empty", () => {
    expect(capitalizeIndustryTag("")).toBe("");
  });
});
