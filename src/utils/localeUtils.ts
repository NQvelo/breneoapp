import { Language } from "@/contexts/LanguageContext";

/**
 * Get language code for URL prefix
 */
export function getLanguageCode(language: Language): string {
  return language === "ka" ? "ka" : "en";
}

/**
 * Get language from URL path
 */
export function getLanguageFromPath(pathname: string): Language {
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  
  if (firstSegment === "ka" || firstSegment === "en") {
    return firstSegment as Language;
  }
  
  // Default to stored language or English
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("appLanguage");
    if (stored === "en" || stored === "ka") {
      return stored as Language;
    }
  }
  
  return "en";
}

/**
 * Remove language prefix from path
 */
export function removeLanguagePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  
  if (firstSegment === "ka" || firstSegment === "en") {
    return "/" + segments.slice(1).join("/");
  }
  
  return pathname;
}

/**
 * Add language prefix to path
 */
export function addLanguagePrefix(path: string, language: Language): string {
  // Don't add prefix to auth routes
  if (path.startsWith("/auth/") || path === "/auth") {
    return path;
  }
  
  // Don't add prefix if already present
  if (path.startsWith("/en/") || path.startsWith("/ka/")) {
    return path;
  }
  
  // Don't add prefix to root
  if (path === "/") {
    return `/${getLanguageCode(language)}`;
  }
  
  const languageCode = getLanguageCode(language);
  return `/${languageCode}${path}`;
}

/**
 * Get localized path (adds language prefix if needed)
 */
export function getLocalizedPath(path: string, language: Language): string {
  return addLanguagePrefix(path, language);
}

