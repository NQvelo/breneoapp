import { describe, expect, it } from "vitest";
import {
  bilingualLines,
  formatDateRange,
  formatScore,
  namedLines,
  resumeFileProblem,
  showsLlmFallbackNote,
} from "./cvDisplay";

describe("bilingualLines", () => {
  it("renders both lines when both languages are filled", () => {
    expect(bilingualLines({ en: "Engineer", ka: "ინჟინერი" })).toEqual([
      "Engineer",
      "ინჟინერი",
    ]);
  });

  it("renders the only filled language", () => {
    expect(bilingualLines({ en: "  Engineer  ", ka: " " })).toEqual(["Engineer"]);
    expect(bilingualLines({ en: "", ka: "ინჟინერი" })).toEqual(["ინჟინერი"]);
  });

  it("returns nothing for empty text", () => {
    expect(bilingualLines({ en: " ", ka: "" })).toEqual([]);
    expect(bilingualLines(null)).toEqual([]);
  });
});

describe("namedLines", () => {
  it("treats skill names like bilingual text", () => {
    expect(namedLines("PostgreSQL", "პოსტგრე")).toEqual([
      "PostgreSQL",
      "პოსტგრე",
    ]);
    expect(namedLines("Docker", "")).toEqual(["Docker"]);
  });
});

describe("formatDateRange", () => {
  it("joins start and end dates", () => {
    expect(formatDateRange("2019", "2024", false, "Present")).toBe("2019–2024");
  });

  it("shows the start date and Present for a current role", () => {
    expect(formatDateRange("2019", "2024", true, "Present")).toBe(
      "2019–Present",
    );
    expect(formatDateRange("", "", true, "დღემდე")).toBe("დღემდე");
  });

  it("keeps a single date when the other side is empty", () => {
    expect(formatDateRange("2016", "", false, "Present")).toBe("2016");
  });
});

describe("showsLlmFallbackNote", () => {
  it("is true only for the AI parser fallback warnings", () => {
    expect(showsLlmFallbackNote(["llm_not_configured"])).toBe(true);
    expect(showsLlmFallbackNote(["llm_failed"])).toBe(true);
    expect(showsLlmFallbackNote(["other"])).toBe(false);
    expect(showsLlmFallbackNote(undefined)).toBe(false);
  });
});

describe("formatScore", () => {
  it("keeps the score precision from the match response", () => {
    expect(formatScore(79.75)).toBe("79.75");
    expect(formatScore(80)).toBe("80");
    expect(formatScore(62.5)).toBe("62.5");
    expect(formatScore(undefined)).toBe("—");
  });
});

describe("resumeFileProblem", () => {
  it("accepts pdf and docx under 10 MB", () => {
    expect(resumeFileProblem({ name: "cv.PDF", size: 1024 })).toBeNull();
    expect(resumeFileProblem({ name: "cv.docx", size: 10 * 1024 * 1024 })).toBeNull();
  });

  it("rejects legacy doc files and files over 10 MB", () => {
    expect(resumeFileProblem({ name: "cv.doc", size: 100 })).toBe("unsupported");
    expect(resumeFileProblem({ name: "cv.txt", size: 100 })).toBe("unsupported");
    expect(
      resumeFileProblem({ name: "cv.pdf", size: 10 * 1024 * 1024 + 1 }),
    ).toBe("too_large");
  });
});
