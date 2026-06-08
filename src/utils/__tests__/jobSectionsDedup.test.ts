import { describe, expect, it } from "vitest";
import {
  hasDistinctStructuredSections,
  resolveJobSectionsAfterAi,
} from "../jobSectionsDedup";

describe("resolveJobSectionsAfterAi", () => {
  it("clears duplicate responsibilities and qualifications", () => {
    const result = resolveJobSectionsAfterAi({
      description: "Short role summary.",
      responsibilities: ["Build APIs", "Write tests"],
      qualifications: ["Build APIs", "Write tests"],
    });
    expect(result.useDescriptionOnly).toBe(true);
    expect(result.responsibilities).toEqual([]);
    expect(result.qualifications).toEqual([]);
    expect(result.description).toBe("Short role summary.");
  });

  it("treats reordered duplicate lists as the same", () => {
    const result = resolveJobSectionsAfterAi({
      description: "Summary",
      responsibilities: ["A", "B"],
      qualifications: ["B", "A"],
    });
    expect(result.useDescriptionOnly).toBe(true);
  });

  it("keeps distinct sections", () => {
    const result = resolveJobSectionsAfterAi({
      description: "Summary",
      responsibilities: ["Build APIs"],
      qualifications: ["3+ years experience"],
    });
    expect(result.useDescriptionOnly).toBe(false);
    expect(result.responsibilities).toEqual(["Build APIs"]);
    expect(result.qualifications).toEqual(["3+ years experience"]);
  });

  it("does not collapse when only one section is present", () => {
    const result = resolveJobSectionsAfterAi({
      description: "Summary",
      responsibilities: ["Build APIs"],
      qualifications: [],
    });
    expect(result.useDescriptionOnly).toBe(false);
    expect(result.responsibilities).toEqual(["Build APIs"]);
  });
});

describe("hasDistinctStructuredSections", () => {
  it("is true only when both lists are present and not duplicate", () => {
    expect(
      hasDistinctStructuredSections({
        useDescriptionOnly: false,
        responsibilities: ["A"],
        qualifications: ["B"],
      }),
    ).toBe(true);
    expect(
      hasDistinctStructuredSections({
        useDescriptionOnly: true,
        responsibilities: ["A"],
        qualifications: ["A"],
      }),
    ).toBe(false);
  });
});
