import { describe, expect, it } from "vitest";
import { listingJobId, withoutAppliedJobs } from "../appliedJobs";

describe("withoutAppliedJobs", () => {
  it("keeps every job when the user has not applied", () => {
    const jobs = [{ id: "1" }, { id: "2" }];
    expect(withoutAppliedJobs(jobs, undefined)).toEqual(jobs);
    expect(withoutAppliedJobs(jobs, new Set())).toEqual(jobs);
  });

  it("hides only the jobs the user applied to", () => {
    const jobs = [{ id: "keep" }, { id: "gone", job_id: "gone" }, { job_id: "also" }];
    expect(withoutAppliedJobs(jobs, new Set(["gone", "also"]))).toEqual([
      { id: "keep" },
    ]);
  });

  it("reads id before job_id", () => {
    expect(listingJobId({ id: 12, job_id: 99 })).toBe("12");
  });
});
