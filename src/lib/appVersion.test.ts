import { describe, expect, it } from "vitest";
import { compareAppVersions, isAppVersionNewer } from "@/lib/appVersion";

describe("appVersion", () => {
  it("compares semver patch versions", () => {
    expect(compareAppVersions("0.3.7", "0.3.6")).toBe(1);
    expect(compareAppVersions("0.3.6", "0.3.7")).toBe(-1);
    expect(compareAppVersions("0.3.6", "0.3.6")).toBe(0);
  });

  it("detects newer remote versions", () => {
    expect(isAppVersionNewer("0.3.7", "0.3.6")).toBe(true);
    expect(isAppVersionNewer("0.3.6", "0.3.6")).toBe(false);
    expect(isAppVersionNewer("0.3.5", "0.3.6")).toBe(false);
  });
});
