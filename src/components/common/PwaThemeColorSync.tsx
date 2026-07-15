import { useEffect } from "react";
import { useTheme } from "next-themes";
import {
  applyPwaThemeColor,
  readStoredThemePreference,
} from "@/lib/pwaThemeColor";

export function PwaThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    applyPwaThemeColor(resolvedTheme === "dark");
  }, [resolvedTheme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      const storedTheme = readStoredThemePreference();
      if (!storedTheme || storedTheme === "system") {
        applyPwaThemeColor(media.matches);
      }
    };

    media.addEventListener("change", handleSystemThemeChange);
    return () => media.removeEventListener("change", handleSystemThemeChange);
  }, []);

  return null;
}
