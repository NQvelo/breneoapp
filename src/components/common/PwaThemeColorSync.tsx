import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  applyPwaThemeColor,
  readStoredThemePreference,
  syncPwaThemeColorFromPreference,
} from "@/lib/pwaThemeColor";

export function PwaThemeColorSync() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    syncPwaThemeColorFromPreference();
  }, []);

  useEffect(() => {
    if (!mounted || !resolvedTheme) return;
    applyPwaThemeColor(resolvedTheme === "dark");
  }, [mounted, resolvedTheme]);

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
