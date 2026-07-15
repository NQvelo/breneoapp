export const PWA_THEME_COLORS = {
  light: "#F3F3F4",
  dark: "#181818",
} as const;

export const PWA_THEME_COLOR_TRANSPARENT = "transparent";
export const PWA_IOS_STATUS_BAR_STYLE = "black-translucent";

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

function upsertMetaTag(name: string, content: string, media?: string): void {
  const selector = media
    ? `meta[name="${name}"][media="${media}"]`
    : `meta[name="${name}"]:not([media])`;
  let meta = document.querySelector(selector);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", name);
    if (media) {
      meta.setAttribute("media", media);
    }
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

function applySurfaceBackground(surfaceColor: string): void {
  document.documentElement.style.backgroundColor = surfaceColor;
  document.body.style.backgroundColor = surfaceColor;

  const root = document.getElementById("root");
  if (root) {
    root.style.backgroundColor = surfaceColor;
  }
}

export function applyPwaThemeColor(isDark: boolean): void {
  if (typeof document === "undefined") return;

  const surfaceColor = isDark ? PWA_THEME_COLORS.dark : PWA_THEME_COLORS.light;

  upsertMetaTag("theme-color", PWA_THEME_COLOR_TRANSPARENT);
  upsertMetaTag(
    "apple-mobile-web-app-status-bar-style",
    PWA_IOS_STATUS_BAR_STYLE,
  );
  upsertMetaTag("msapplication-TileColor", surfaceColor);

  // Fallback theme-color for browsers that ignore transparent.
  upsertMetaTag("theme-color", PWA_THEME_COLORS.light, "(prefers-color-scheme: light)");
  upsertMetaTag("theme-color", PWA_THEME_COLORS.dark, "(prefers-color-scheme: dark)");

  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  applySurfaceBackground(surfaceColor);
}

export function syncPwaThemeColorFromPreference(
  theme?: string | null,
): void {
  applyPwaThemeColor(resolveIsDarkTheme(theme ?? readStoredThemePreference()));
}
