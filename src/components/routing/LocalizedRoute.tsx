import { Route, RouteProps } from "react-router-dom";
import { removeLanguagePrefix } from "@/utils/localeUtils";

interface LocalizedRouteProps extends Omit<RouteProps, "path"> {
  path: string;
}

/**
 * Route component that handles language prefixes
 * Supports both /en/path and /ka/path, as well as /path (defaults to /en/path)
 */
export function LocalizedRoute({ path, ...props }: LocalizedRouteProps) {
  // Remove any existing language prefix from the path
  const cleanPath = removeLanguagePrefix(path);
  
  return (
    <>
      {/* Route with language prefix for English */}
      <Route path={`/en${cleanPath}`} {...props} />
      {/* Route with language prefix for Georgian */}
      <Route path={`/ka${cleanPath}`} {...props} />
      {/* Route without prefix (redirects handled by LanguageProvider) */}
      {!path.startsWith("/auth") && <Route path={cleanPath} {...props} />}
    </>
  );
}

