import { describe, expect, it } from "vitest";
import { matchInterviewRoles } from "../interviewRoleMatch";

describe("matchInterviewRoles", () => {
  it("matches React and frontend skills from the CV", () => {
    expect(
      matchInterviewRoles({
        skills: ["React", "TypeScript"],
        jobTitles: ["Frontend Developer"],
      }),
    ).toEqual(["react", "frontend"]);
  });

  it("matches a DevOps job title", () => {
    expect(
      matchInterviewRoles({
        skills: ["Kubernetes", "Docker"],
        jobTitles: ["DevOps Engineer"],
      }),
    ).toEqual(["devops"]);
  });

  it("matches backend and full stack when the CV covers both sides", () => {
    expect(
      matchInterviewRoles({
        skills: ["React", "Node.js"],
        jobTitles: ["Full Stack Developer"],
      }),
    ).toEqual(["react", "frontend", "backend", "fullstack"]);
  });

  it("does not treat JavaScript as Java", () => {
    expect(
      matchInterviewRoles({
        skills: ["JavaScript"],
        jobTitles: [],
      }),
    ).toEqual(["frontend"]);
  });

  it("maps a data engineer CV to the prepared slug", () => {
    expect(
      matchInterviewRoles({
        skills: ["Spark", "Airflow"],
        jobTitles: ["Data Engineer"],
      }),
    ).toEqual(["data_engineer"]);
  });

  it("returns nothing when the CV has no tech role", () => {
    expect(
      matchInterviewRoles({
        skills: ["Communication"],
        jobTitles: ["Project Manager"],
      }),
    ).toEqual([]);
  });
});
