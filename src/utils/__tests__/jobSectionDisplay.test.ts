import { describe, expect, it } from "vitest";
import {
  cleanJobSectionListItem,
  splitPlainTextParagraphs,
  stripHtmlToPlainText,
} from "../jobSectionDisplay";

describe("stripHtmlToPlainText", () => {
  it("removes HTML tags and keeps readable text", () => {
    expect(
      stripHtmlToPlainText("<p>Hello <strong>world</strong></p>"),
    ).toBe("Hello world");
  });

  it("converts br and block tags to paragraph breaks", () => {
    expect(stripHtmlToPlainText("<p>First</p><p>Second</p>")).toBe(
      "First\n\nSecond",
    );
    expect(stripHtmlToPlainText("Line one<br>Line two")).toBe(
      "Line one\nLine two",
    );
  });
});

describe("splitPlainTextParagraphs", () => {
  it("returns separate paragraphs", () => {
    expect(
      splitPlainTextParagraphs(
        "<p>Role summary.</p><p>Team culture note.</p>",
      ),
    ).toEqual(["Role summary.", "Team culture note."]);
  });

  it("collapses extra whitespace and empty lines", () => {
    expect(
      splitPlainTextParagraphs("  First   para.  \n\n\n\n  Second   para.  "),
    ).toEqual(["First para.", "Second para."]);
  });
});

describe("cleanJobSectionListItem", () => {
  it("strips HTML from list items", () => {
    expect(cleanJobSectionListItem("<span>Build APIs</span>")).toBe(
      "Build APIs",
    );
  });
});
