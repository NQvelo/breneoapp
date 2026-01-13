import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LocalizedLink } from "@/components/routing/LocalizedLink";
import { removeLanguagePrefix } from "@/utils/localeUtils";
import { Bell, Moon, Sun, Globe, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { useLanguage, useTranslation } from "@/contexts/LanguageContext";

interface DashboardHeaderProps {
  sidebarCollapsed: boolean;
  isVisible: boolean; // Prop for visibility
}

// Helper function to check if current path is a job detail page
const isJobDetailPage = (pathname: string): boolean => {
  // Match patterns like /jobs/:jobId, /en/jobs/:jobId, /ka/jobs/:jobId
  const jobDetailPattern = /^(\/(en|ka))?\/jobs\/[^/]+$/;
  return jobDetailPattern.test(pathname);
};

// Helper function to check if current path is a course detail page
const isCourseDetailPage = (pathname: string): boolean => {
  // Match patterns like /course/:courseId, /en/course/:courseId, /ka/course/:courseId
  const courseDetailPattern = /^(\/(en|ka))?\/course\/[^/]+$/;
  return courseDetailPattern.test(pathname);
};

// Helper function to check if current path is a skill path page
const isSkillPathPage = (pathname: string): boolean => {
  // Match patterns like /skill-path, /en/skill-path, /ka/skill-path, /skill-path/:skillName, etc.
  return pathname.includes("/skill-path");
};

// Helper function to check if current path is a course add/edit page
const isCourseAddEditPage = (pathname: string): boolean => {
  // Match patterns like /academy/courses/add, /academy/courses/edit/:courseId
  const courseAddEditPattern = /^(\/(en|ka))?\/academy\/courses\/(add|edit\/[^/]+)$/;
  return courseAddEditPattern.test(pathname);
};

// Helper function to get the page title from the pathname
const getPageTitle = (
  pathname: string,
  username?: string,
  t?: ReturnType<typeof useTranslation>
) => {
  if (!t) return "Home";

  // Don't show title for job detail pages or course detail pages
  if (isJobDetailPage(pathname) || isCourseDetailPage(pathname)) return null;

  if (pathname.startsWith("/home") || pathname.startsWith("/academy/home")) {
    return (
      <>
        {t.dashboard.welcome},{" "}
        <span className="font-bold">{username || "User"}</span>!
      </>
    );
  }
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/academy/dashboard")
  ) {
    return (
      <>
        {t.dashboard.welcome},{" "}
        <span className="font-bold">{username || "User"}</span>!
      </>
    );
  }
  if (pathname.startsWith("/jobs")) return t.jobs.title;
  if (pathname.startsWith("/courses")) return t.courses.title;
  if (
    pathname.startsWith("/settings") ||
    pathname.startsWith("/academy/settings")
  )
    return t.settings.title;
  if (
    pathname.startsWith("/profile") ||
    pathname.startsWith("/academy/profile")
  )
    return t.profile.title;
  if (pathname.startsWith("/notifications")) return t.notifications.title;
  if (pathname.startsWith("/skill-test")) return t.skillTest.title;
  // Don't show title for skill-path page - show back button instead
  if (pathname.startsWith("/skill-path")) return null;
  return t.nav.home;
};

export function DashboardHeader({
  sidebarCollapsed,
  isVisible,
}: DashboardHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const t = useTranslation();
  const [mounted, setMounted] = React.useState(false);
  const username = user?.first_name || user?.email?.split("@")[0] || "User";
  const currentPath = removeLanguagePrefix(location.pathname);
  const pageTitle = getPageTitle(currentPath, username, t);
  const isJobDetail = isJobDetailPage(currentPath);
  const isCourseDetail = isCourseDetailPage(currentPath);
  const isSkillPath = isSkillPathPage(currentPath);
  const isCourseAddEdit = isCourseAddEditPage(currentPath);
  
  // Get course add/edit page title
  const getCourseAddEditTitle = () => {
    if (isCourseAddEdit) {
      if (currentPath.includes("/edit/")) {
        return "Edit Course";
      } else if (currentPath.includes("/add")) {
        return "Add Course";
      }
    }
    return null;
  };
  
  const courseAddEditTitle = getCourseAddEditTitle();

  const currentLanguageText = language === "ka" ? "GEO" : "EN";

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30",
        "bg-gradient-to-b from-breneo-lightgray dark:from-background to-transparent",
        "transition-opacity duration-300 ease-in-out",
        sidebarCollapsed ? "md:left-24" : "md:left-[17rem]",
        "left-0",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <div className="flex items-center justify-between px-5 sm:px-9 md:px-12 lg:px-14 pt-6 pb-4">
        <div className="hidden md:flex items-center space-x-3">
          {isJobDetail || isCourseDetail || isSkillPath || isCourseAddEdit ? (
            <>
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="relative h-10 px-3 rounded-full bg-gray-200 dark:bg-border/50 hover:bg-gray-300 dark:hover:bg-border/70
                           text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
                           text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{t.common.back}</span>
              </Button>
              {courseAddEditTitle && (
                <h1 className="text-2xl font-semibold text-foreground ml-4">
                  {courseAddEditTitle}
                </h1>
              )}
            </>
          ) : (
            pageTitle && (
              <h1 className="text-2xl font-semibold text-foreground">
                {pageTitle}
              </h1>
            )
          )}
        </div>

        {/* This div is a placeholder to balance the flex layout on mobile */}
        <div className="md:hidden"></div>

        {/* Right side icons - hidden on mobile */}
        <div className="hidden md:flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => setLanguage(language === "en" ? "ka" : "en")}
            className="relative h-10 px-3 rounded-full bg-gray-200 dark:bg-border/50 hover:bg-gray-300 dark:hover:bg-border/70
                       text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
                       text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Globe className="h-4 w-4" />
            <span>{currentLanguageText}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative h-10 w-10 rounded-full bg-gray-200 dark:bg-border/50 hover:bg-gray-300 dark:hover:bg-border/70
                       text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            {mounted && theme === "dark" ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
          <LocalizedLink to="/notifications">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-10 w-10 rounded-full bg-gray-200 dark:bg-border/50 hover:bg-gray-300 dark:hover:bg-border/70
                         text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>
          </LocalizedLink>
        </div>
      </div>
    </header>
  );
}
