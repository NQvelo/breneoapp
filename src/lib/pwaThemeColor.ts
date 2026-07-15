export const PWA_THEME_COLORS = {
  light: "#F3F3F4",
  dark: "#181818",
} as const;

const THEME_STORAGE_KEY = "theme";

export function resolveIsDarkTheme(theme?: string | null): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;

  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  return false;
}

export function readStoredThemePreference(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function upsertMetaTag(name: string, content: string): void {
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", name);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

export function applyPwaThemeColor(isDark: boolean): void {
  if (typeof document === "undefined") return;

  const color = isDark ? PWA_THEME_COLORS.dark : PWA_THEME_COLORS.light;

  upsertMetaTag("theme-color", color);
  upsertMetaTag(
    "apple-mobile-web-app-status-bar-style",
    isDark ? "black" : "default",
  );
  upsertMetaTag("msapplication-TileColor", color);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

export function syncPwaThemeColorFromPreference(
  theme?: string | null,
): void {
  applyPwaThemeColor(resolveIsDarkTheme(theme ?? readStoredThemePreference()));
}
