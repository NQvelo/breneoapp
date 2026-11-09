import { describe, expect, it } from "vitest";
import {
  industryYearsForAnswers,
  jobMatchesOnboardingLocation,
  skillsForRoles,
} from "../onboardingAnswers";

describe("onboarding answers", () => {
  it("turns selected roles into profile skills", () => {
    expect(skillsForRoles(["react", "devops"])).toEqual(["React", "DevOps"]);
  });

  it("maps experience and roles onto industry years", () => {
    expect(industryYearsForAnswers(["react", "product_designer"], "mid")).toEqual({
      technology: 3,
      design: 3,
    });
  });

  it("does not invent industry years for someone just starting", () => {
    expect(industryYearsForAnswers(["react"], "starting")).toEqual({});
  });

  it("matches jobs to the chosen region and ignores the US state of Georgia", () => {
    expect(jobMatchesOnboardingLocation("Georgia", "Tbilisi", "georgia")).toBe(
      true,
    );
    expect(
      jobMatchesOnboardingLocation("United States", "Atlanta, Georgia", "georgia"),
    ).toBe(false);
    expect(jobMatchesOnboardingLocation("Germany", "Berlin", "europe")).toBe(
      true,
    );
    expect(jobMatchesOnboardingLocation("India", "Bengaluru", "asia")).toBe(
      true,
    );
    expect(
      jobMatchesOnboardingLocation("", "Remote · Anywhere in the World", "europe"),
    ).toBe(false);
  });
});
