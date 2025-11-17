import { Link, LinkProps } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { getLocalizedPath } from "@/utils/localeUtils";

/**
 * Link component that automatically adds language prefix to paths
 */
export function LocalizedLink({ to, ...props }: LinkProps) {
  const { language } = useLanguage();
  
  // Don't localize auth routes
  const path = typeof to === "string" ? to : to.pathname || "";
  const localizedTo = path.startsWith("/auth") || path === "/auth" 
    ? to 
    : getLocalizedPath(path, language);

  return <Link to={localizedTo} {...props} />;
}

