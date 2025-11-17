import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { getLocalizedPath } from "@/utils/localeUtils";

/**
 * Hook for navigation with automatic language prefix
 */
export function useLocalizedNavigate() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  return (to: string, options?: { replace?: boolean }) => {
    const localizedPath = getLocalizedPath(to, language);
    navigate(localizedPath, options);
  };
}

