import { describe, expect, it } from "vitest";
import { PWA_THEME_COLORS, resolveIsDarkTheme } from "@/lib/pwaThemeColor";

describe("pwaThemeColor", () => {
  it("resolves explicit light and dark themes", () => {
    expect(resolveIsDarkTheme("light")).toBe(false);
    expect(resolveIsDarkTheme("dark")).toBe(true);
  });

  it("uses app background colors for PWA chrome", () => {
    expect(PWA_THEME_COLORS.light).toBe("#F3F3F4");
    expect(PWA_THEME_COLORS.dark).toBe("#181818");
  });
});
