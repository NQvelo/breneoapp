import React from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { LocalizedLink } from "@/components/routing/LocalizedLink";
import { removeLanguagePrefix } from "@/utils/localeUtils";
import { Bell, Moon, Sun, Zap, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getRole } from "@/utils/getRole";
import { useTheme } from "next-themes";
import { useTranslation } from "@/contexts/LanguageContext";
import {
  getSettingsSectionLabel,
  isSettingsPath,
  isValidSettingsSection,
} from "@/constants/settingsSections";
import { useUnreadNotificationCount } from "@/hooks/useUnreadNotificationCount";
import { NotificationCountBadge } from "@/components/notifications/NotificationCountBadge";

interface DashboardHeaderProps {
  sidebarCollapsed: boolean;
  isVisible: boolean; // Prop for visibility
  showSidebar: boolean;
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
  const courseAddEditPattern =
    /^(\/(en|ka))?\/academy\/courses\/(add|edit\/[^/]+)$/;
  return courseAddEditPattern.test(pathname);
};

/** Employer add/edit job — preview mode uses URL hash #preview (same as Job detail back UX) */
const isEmployerJobFormPreviewPath = (pathname: string): boolean => {
  return (
    pathname === "/employer/jobs/add" ||
    /^\/employer\/jobs\/edit\/[^/]+$/.test(pathname)
  );
};

const isEmployerJobStatsPath = (pathname: string): boolean => {
  return (
    /^\/employer\/jobs\/[^/]+$/.test(pathname) &&
    pathname !== "/employer/jobs/add" &&
    !pathname.startsWith("/employer/jobs/edit/")
  );
};

const isAcademyCourseStatsPath = (pathname: string): boolean => {
  return (
    /^\/academy\/courses\/[^/]+$/.test(pathname) &&
    pathname !== "/academy/courses/add" &&
    !pathname.startsWith("/academy/courses/edit/")
  );
};

// Helper function to get the page title from the pathname
const getPageTitle = (
  pathname: string,
  username?: string,
  t?: ReturnType<typeof useTranslation>,
  settingsSection?: string | null,
) => {
  if (!t) return "Home";

  // Don't show title for job detail pages or course detail pages
  if (isJobDetailPage(pathname) || isCourseDetailPage(pathname)) return null;

  if (isSettingsPath(pathname)) {
    if (isValidSettingsSection(settingsSection ?? null)) return null;
    return t.settings.title;
  }

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
  if (pathname.startsWith("/employer/jobs/add")) return "Add job";
  if (pathname.startsWith("/employer/jobs/edit/")) return "Edit job";
  if (isEmployerJobStatsPath(pathname)) return "Job statistics";
  if (isAcademyCourseStatsPath(pathname)) return "Course statistics";
  if (pathname.startsWith("/employer/jobs")) return "Job Postings";
  if (pathname.startsWith("/employer/members")) return "Members";
  if (pathname.startsWith("/jobs")) return t.jobs.title;
  if (pathname.startsWith("/courses")) return t.courses.title;
  if (
    pathname.startsWith("/profile") ||
    pathname.startsWith("/academy/profile")
  )
    return t.profile.title;
  if (
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/employer/notifications")
  )
    return t.notifications.title;
  if (pathname.startsWith("/cv-views")) return "CV views";
  if (pathname.startsWith("/skill-test")) return t.skillTest.title;
  if (pathname.startsWith("/webinars")) return t.atoms.headerTitle;
  // Don't show title for skill-path page - show back button instead
  if (pathname.startsWith("/skill-path")) return null;
  return t.nav.home;
};

export function DashboardHeader({
  sidebarCollapsed,
  isVisible,
  showSidebar,
}: DashboardHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, academyDisplay } = useAuth();
  const { theme, setTheme } = useTheme();
  const t = useTranslation();
  // TODO: wire up to real gamification XP source once available (job seekers only)
  const xp = 0;
  const [mounted, setMounted] = React.useState(false);
  const currentPath = removeLanguagePrefix(location.pathname);
  const isEmployer =
    user?.user_type === "employer" ||
    (typeof window !== "undefined" &&
      localStorage.getItem("userRole") === "employer");
  const isAcademy =
    user?.user_type === "academy" ||
    (typeof window !== "undefined" &&
      localStorage.getItem("userRole") === "academy");
  const isRegularUser = !isEmployer && !isAcademy;
  const username =
    (currentPath.startsWith("/academy/") ? academyDisplay?.name : undefined) ||
    user?.first_name ||
    user?.email?.split("@")[0] ||
    "User";
  const isEmployerJobPreview =
    isEmployerJobFormPreviewPath(currentPath) && location.hash === "#preview";
  const isEmployerJobStats = isEmployerJobStatsPath(currentPath);
  const isAcademyCourseStats = isAcademyCourseStatsPath(currentPath);
  const settingsSectionParam = searchParams.get("section");
  const isSettings = isSettingsPath(currentPath);
  const isSettingsDetail =
    isSettings && isValidSettingsSection(settingsSectionParam);
  const settingsSectionTitle = isSettingsDetail
    ? getSettingsSectionLabel(settingsSectionParam, t)
    : null;
  const pageTitle = isEmployerJobPreview
    ? null
    : getPageTitle(currentPath, username, t, settingsSectionParam);
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
  const showBackHeader =
    isJobDetail ||
    isCourseDetail ||
    isSkillPath ||
    isCourseAddEdit ||
    isEmployerJobPreview ||
    isEmployerJobStats ||
    isAcademyCourseStats ||
    isSettingsDetail;
  const headerTitle = courseAddEditTitle || settingsSectionTitle;

  const notificationsPath =
    getRole() === "employer" ? "/employer/notifications" : "/notifications";
  const { count: unreadNotificationCount } = useUnreadNotificationCount();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30",
        "bg-gradient-to-b from-breneo-lightgray dark:from-background to-transparent",
        "transition-opacity duration-300 ease-in-out",
        showSidebar
          ? sidebarCollapsed
            ? "md:left-24"
            : "md:left-[17rem]"
          : "md:left-0",
        "left-0",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
    >
      <div className="flex items-center justify-between px-5 sm:px-9 md:px-12 lg:px-14 pt-6 pb-4">
        <div className="hidden md:flex items-center space-x-3">
          {showBackHeader ? (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  if (isSettingsDetail) {
                    const nextParams = new URLSearchParams(searchParams);
                    nextParams.delete("section");
                    setSearchParams(nextParams, { replace: true });
                  } else if (isEmployerJobPreview) {
                    navigate({ hash: "" }, { replace: true });
                  } else {
                    navigate(-1);
                  }
                }}
                className="relative h-10 px-3 rounded-full bg-gray-200 dark:bg-border/50 hover:bg-gray-300 dark:hover:bg-border/70
                           text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
                           text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{t.common.back}</span>
              </Button>
              {headerTitle && (
                <h1 className="text-2xl font-semibold text-foreground ml-4">
                  {headerTitle}
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
          {isRegularUser ? (
            <Button
              variant="ghost"
              className="relative h-10 px-3 rounded-full bg-gray-200 dark:bg-border/50 hover:bg-gray-300 dark:hover:bg-border/70
                         text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
                         text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Zap className="h-4 w-4" />
              <span>{xp} XP</span>
            </Button>
          ) : null}
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
          <LocalizedLink to={notificationsPath}>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-10 w-10 rounded-full bg-gray-200 dark:bg-border/50 hover:bg-gray-300 dark:hover:bg-border/70
                         text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <Bell className="h-5 w-5" />
              <NotificationCountBadge count={unreadNotificationCount} />
              <span className="sr-only">
                Notifications
                {unreadNotificationCount > 0
                  ? `, ${unreadNotificationCount} unread`
                  : ""}
              </span>
            </Button>
          </LocalizedLink>
        </div>
      </div>
    </header>
  );
}
