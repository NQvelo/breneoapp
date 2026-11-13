import { describe, expect, it } from "vitest";
import type { JobDetail } from "@/api/jobs/types";
import {
  buildUserMatchProfileFromSkillTest,
  matchJobDetailToUser,
} from "@/services/matching";
import { matchJobAsShownOnJobPost } from "@/utils/displayedJobMatch";

const job = {
  id: "1",
  title: "React Developer",
  description:
    "We use javascript, react, docker, git, and aws daily in this role.",
  skills_required: ["React", "TypeScript"],
  skills_preferred: ["GraphQL"],
  tech_stack: ["Docker", "AWS"],
  seniority: "unknown",
  industry_tags: "",
} as unknown as JobDetail;

describe("matchJobAsShownOnJobPost", () => {
  it("matches the job post overall %, not the wider listing score", () => {
    const userSkills = ["react", "communication"];
    const onPost = matchJobAsShownOnJobPost(job, userSkills).overallPercent;
    const widerListing = matchJobDetailToUser(
      job,
      buildUserMatchProfileFromSkillTest(userSkills),
    ).overallPercent;

    // 1 of 2 required skills, with experience and industry unspecified (counted as 0).
    expect(onPost).toBe(25);
    expect(widerListing).not.toBe(onPost);
  });

  it("uses the same default as pre-selected skill chips on the job post", () => {
    const userSkills = ["react"];
    const withDefault = matchJobAsShownOnJobPost(job, userSkills);
    const withChips = matchJobAsShownOnJobPost(job, userSkills, {
      selectedSkillNames: ["React"],
    });
    expect(withChips.overallPercent).toBe(withDefault.overallPercent);
    expect(withChips.skills.percent).toBe(withDefault.skills.percent);
  });

  it("scores a seniority match above a seniority miss using work experience", () => {
    const seniorJob = {
      ...job,
      title: "Senior React Developer",
      seniority: "senior",
    } as unknown as JobDetail;
    const juniorJob = {
      ...job,
      title: "Junior React Developer",
      seniority: "junior",
    } as unknown as JobDetail;
    const experience = { yearsExperienceTotal: 6, seniority: "senior" as const };
    const seniorScore = matchJobAsShownOnJobPost(seniorJob, ["react"], {
      experience,
    }).overallPercent;
    const juniorScore = matchJobAsShownOnJobPost(juniorJob, ["react"], {
      experience,
    }).overallPercent;
    expect(seniorScore).toBeGreaterThan(juniorScore);
  });
});
