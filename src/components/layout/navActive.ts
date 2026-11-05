import { removeLanguagePrefix } from "@/utils/localeUtils";

/** Home and dashboard render the same page; employer sections include nested routes. */
export function isNavHrefActive(href: string, pathname: string): boolean {
  const currentPath = removeLanguagePrefix(pathname);
  if (href === "/home") {
    return (
      currentPath === "/home" ||
      currentPath === "/dashboard" ||
      pathname.includes("/home") ||
      pathname.includes("/dashboard")
    );
  }
  if (href === "/academy/home") {
    return (
      currentPath === "/academy/home" ||
      currentPath === "/academy/dashboard" ||
      pathname.includes("/academy/home") ||
      pathname.includes("/academy/dashboard")
    );
  }
  if (href === "/employer/jobs" || href === "/employer/members") {
    return currentPath.startsWith(href) || pathname.includes(href);
  }
  return currentPath === href || pathname.endsWith(href);
}
