import { describe, expect, it } from "vitest";
import {
  PWA_IOS_STATUS_BAR_STYLE,
  PWA_THEME_COLOR_TRANSPARENT,
  PWA_THEME_COLORS,
  resolveIsDarkTheme,
} from "@/lib/pwaThemeColor";

describe("pwaThemeColor", () => {
  it("resolves explicit light and dark themes", () => {
    expect(resolveIsDarkTheme("light")).toBe(false);
    expect(resolveIsDarkTheme("dark")).toBe(true);
  });

  it("uses transparent PWA chrome settings", () => {
    expect(PWA_THEME_COLOR_TRANSPARENT).toBe("transparent");
    expect(PWA_IOS_STATUS_BAR_STYLE).toBe("black-translucent");
    expect(PWA_THEME_COLORS.light).toBe("#F3F3F4");
    expect(PWA_THEME_COLORS.dark).toBe("#181818");
  });
});
