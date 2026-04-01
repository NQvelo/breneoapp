import { Navigate } from "react-router-dom";
import { getLocalizedPath } from "@/utils/localeUtils";
import { useLanguage } from "@/contexts/LanguageContext";

/** Kept for bookmarks; canonical employer landing is `/employer/home`. */
export default function EmployerDashboardPage() {
  const { language } = useLanguage();
  return (
    <Navigate
      to={getLocalizedPath("/employer/home", language)}
      replace
    />
  );
}
