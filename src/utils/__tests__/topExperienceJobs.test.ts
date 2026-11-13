import { describe, expect, it } from "vitest";
import type { WorkExperienceEntry } from "@/api/profile/types";
import { takeTopExperienceScoredJobs } from "@/utils/topExperienceJobs";
import { experienceFromWorkHistory } from "@/utils/userWorkExperience";

describe("experienceFromWorkHistory", () => {
  it("reads seniority from the current job title and sums years", () => {
    const entries = [
      {
        id: 1,
        job_title: "Junior Developer",
        company: "A",
        start_date: "2018-01-01",
        end_date: "2020-01-01",
        is_current: false,
      },
      {
        id: 2,
        job_title: "Senior Engineer",
        company: "B",
        start_date: "2020-01-01",
        end_date: null,
        is_current: true,
      },
    ] as WorkExperienceEntry[];

    const experience = experienceFromWorkHistory(entries);
    expect(experience.seniority).toBe("senior");
    expect(experience.yearsExperienceTotal).toBeGreaterThan(6);
  });

  it("leaves experience unknown when the profile section is empty", () => {
    expect(experienceFromWorkHistory([])).toEqual({
      yearsExperienceTotal: null,
      seniority: "unknown",
    });
  });
});

describe("takeTopExperienceScoredJobs", () => {
  it("keeps only strong experience fits when the user has work experience", () => {
    const jobs = [
      { id: "low", matchPercentage: 80, experiencePercent: 25 },
      { id: "fit", matchPercentage: 40, experiencePercent: 100 },
      { id: "also", matchPercentage: 70, experiencePercent: 85 },
    ];
    const top = takeTopExperienceScoredJobs(jobs, 3, true);
    expect(top.map((job) => job.id)).toEqual(["fit", "also"]);
  });

  it("uses overall score when there is no work experience", () => {
    const jobs = [
      { id: "a", matchPercentage: 20, experiencePercent: 100 },
      { id: "b", matchPercentage: 90, experiencePercent: 25 },
    ];
    const top = takeTopExperienceScoredJobs(jobs, 1, false);
    expect(top[0].id).toBe("b");
  });
});
