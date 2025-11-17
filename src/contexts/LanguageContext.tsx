import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { en } from "@/locales/en";
import { ka } from "@/locales/ka";
import {
  getLanguageFromPath,
  addLanguagePrefix,
  removeLanguagePrefix,
} from "@/utils/localeUtils";

export type Language = "en" | "ka";

type Translations = typeof en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

const translations = {
  en,
  ka,
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Get language from URL first, then localStorage, then default to English
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const urlLang = getLanguageFromPath(location.pathname);
      if (urlLang) return urlLang;

      const stored = localStorage.getItem("appLanguage");
      if (stored === "en" || stored === "ka") {
        return stored;
      }
    }
    return "en";
  });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync language with URL
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    const urlLang = getLanguageFromPath(location.pathname);
    if (urlLang && urlLang !== language) {
      setLanguageState(urlLang);
      localStorage.setItem("appLanguage", urlLang);
      document.documentElement.lang = urlLang;
    }
  }, [location.pathname, mounted, language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("appLanguage", lang);
      document.documentElement.lang = lang;

      // Update URL with new language prefix
      const currentPath = removeLanguagePrefix(location.pathname);
      const newPath = addLanguagePrefix(currentPath, lang);

      if (newPath !== location.pathname) {
        navigate(newPath, { replace: true });
      }
    }
  };

  useEffect(() => {
    if (mounted && typeof window !== "undefined") {
      document.documentElement.lang = language;

      // Ensure URL has correct language prefix (except for auth routes)
      // Only redirect if we're not already on the correct path to avoid redirect loops
      // Add a small delay to avoid interfering with initial navigation after login
      const timeoutId = setTimeout(() => {
        if (
          !location.pathname.startsWith("/auth/") &&
          location.pathname !== "/auth" &&
          location.pathname !== "/"
        ) {
          const urlLang = getLanguageFromPath(location.pathname);
          if (urlLang !== language) {
            const currentPath = removeLanguagePrefix(location.pathname);
            const newPath = addLanguagePrefix(currentPath, language);
            // Only navigate if the path actually changed and we're not in the middle of a navigation
            if (
              newPath !== location.pathname &&
              !location.pathname.includes("undefined")
            ) {
              navigate(newPath, { replace: true });
            }
          }
        }
      }, 100); // Small delay to let initial navigation complete

      return () => clearTimeout(timeoutId);
    }
  }, [language, mounted, location.pathname, navigate]);

  const t = useMemo(() => translations[language], [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

// Convenience hook for translations
export function useTranslation() {
  const { t } = useLanguage();
  return t;
}
