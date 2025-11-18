import React from "react"; // ⛔ Removed useEffect, useState
import { useLocation } from "react-router-dom";
import { LocalizedLink } from "@/components/routing/LocalizedLink";
import { removeLanguagePrefix } from "@/utils/localeUtils";
import {
  LayoutDashboard,
  Briefcase,
  BookOpen,
  Home,
  Settings,
  HelpCircle,
  CircleUserRound,
  Bell,
  Moon,
  Sun,
  LibraryBig,
  Video,
  ChevronRight,
  Sparkles,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { useLanguage, useTranslation } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  collapsed: boolean;
  toggleSidebar: () => void;
}

export function AppSidebar({ collapsed, toggleSidebar }: AppSidebarProps) {
  const location = useLocation();
  // ✅ Get the user object directly from the context
  const { loading, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const t = useTranslation();
  const [mounted, setMounted] = React.useState(false);

  // Remove language prefix for pathname comparison
  const currentPath = removeLanguagePrefix(location.pathname);
  const currentLanguageText = language === "ka" ? "GEO" : "EN";
  // Also check raw pathname for immediate active state detection
  const rawPathname = location.pathname;

  // Determine if user is an academy
  // Check both user object and localStorage (in case user object isn't fully loaded)
  const isAcademy =
    user?.user_type === "academy" ||
    (typeof window !== "undefined" &&
      localStorage.getItem("userRole") === "academy");

  // Handle mounted state to avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // ⛔ Removed old useState and useEffect for localStorage

  if (loading) return null;

  // Helper: Get user display name
  const getDisplayName = () => {
    // ✅ Changed userData to user
    if (!user) return "Member";
    const { first_name, last_name, email } = user;

    if (first_name && last_name) {
      const capitalize = (str: string) =>
        str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";
      return `${capitalize(first_name)} ${capitalize(last_name)}`;
    }
    // ✅ Use user.email as a fallback
    return email ?? "Member";
  };

  // Helper: Get avatar initials (always uppercase)
  const getInitials = () => {
    // ✅ Changed userData to user
    if (user?.first_name && user?.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(
        0
      )}`.toUpperCase();
    }
    // ✅ Fallback to first letter of email or "U"
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  // Navigation items - completely separated by role
  const navItems = isAcademy
    ? [
        {
          icon: Home,
          label: t.nav.home,
          href: "/academy/home",
        },
      ]
    : [
        { icon: Home, label: t.nav.home, href: "/home" },
        { icon: Briefcase, label: t.nav.jobs, href: "/jobs" },
        { icon: LibraryBig, label: t.nav.courses, href: "/courses" },
        { icon: Video, label: t.nav.webinars, href: "/webinars" },
      ];

  const profilePath = isAcademy ? "/academy/profile" : "/profile";
  const settingsPath = isAcademy ? "/academy/settings" : "/settings";
  const homePath = isAcademy ? "/academy/home" : "/home";

  // Mobile navigation
  const mobileNavItems = [
    ...navItems,
    { icon: CircleUserRound, label: t.nav.profile, href: profilePath },
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#F8F9FA]/80 dark:bg-[#181818]/80 backdrop-blur-xl backdrop-saturate-150 border-b border-black/[0.03] dark:border-white/[0.03] px-4 py-3">
        <div className="flex items-center justify-between">
          <LocalizedLink to={homePath} className="flex items-center">
            <img
              src="/lovable-uploads/breneo_logo.png" // ✅ Use root path
              alt="Breneo Logo"
              className="h-7"
            />
          </LocalizedLink>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setLanguage(language === "en" ? "ka" : "en")}
              className="relative h-10 px-3 rounded-full !text-gray-500 hover:!text-gray-700 dark:!text-gray-400 dark:hover:!text-gray-200 
                         bg-black/[0.06] dark:bg-white/[0.03] hover:!bg-black/[0.08] dark:hover:!bg-white/[0.05] transition-colors
                         text-sm font-medium flex items-center gap-2"
            >
              <Globe className="h-4 w-4" />
              <span>{currentLanguageText}</span>
            </Button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-10 w-10 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 
                         bg-black/[0.06] dark:bg-white/[0.03] hover:bg-black/[0.08] dark:hover:bg-white/[0.05] transition-colors rounded-full"
            >
              {mounted && theme === "dark" ? (
                <Moon size={20} />
              ) : (
                <Sun size={20} />
              )}
            </button>
            <LocalizedLink
              to="/notifications"
              className="h-10 w-10 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 
                         bg-black/[0.06] dark:bg-white/[0.03] hover:bg-black/[0.08] dark:hover:bg-white/[0.05] transition-colors rounded-full"
            >
              <Bell size={20} />
            </LocalizedLink>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#F8F9FA]/80 dark:bg-[#181818]/80 backdrop-blur-xl backdrop-saturate-150 border-t border-black/[0.03] dark:border-white/[0.03]">
        <nav className="flex justify-around items-center py-2">
          {mobileNavItems.map((item, index) => {
            // Check if current path matches the item href
            // Handle home/dashboard equivalence (both routes go to same page)
            let isActive = currentPath === item.href;

            // Special handling for home item - it should be active on both /home and /dashboard
            if (item.href === "/home") {
              isActive =
                currentPath === "/home" ||
                currentPath === "/dashboard" ||
                rawPathname.includes("/home") ||
                rawPathname.includes("/dashboard");
            } else if (item.href === "/academy/home") {
              isActive =
                currentPath === "/academy/home" ||
                currentPath === "/academy/dashboard" ||
                rawPathname.includes("/academy/home") ||
                rawPathname.includes("/academy/dashboard");
            } else {
              // For other items, check if pathname ends with the href (handles language prefixes)
              isActive =
                currentPath === item.href || rawPathname.endsWith(item.href);
            }
            return (
              <LocalizedLink
                key={index}
                to={item.href}
                className={cn(
                  "flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 min-w-0 flex-1 mx-1",
                  isActive
                    ? "text-gray-600"
                    : "text-gray-600 hover:text-breneo-blue"
                )}
              >
                <item.icon
                  size={20}
                  className={cn(
                    "transition-colors duration-200 mb-1",
                    isActive
                      ? "text-breneo-blue"
                      : "text-gray-600 group-hover:text-breneo-blue"
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium transition-colors duration-200 text-center",
                    isActive
                      ? "text-gray-600"
                      : "text-gray-600 group-hover:text-breneo-blue"
                  )}
                >
                  {item.label}
                </span>
              </LocalizedLink>
            );
          })}
        </nav>
      </div>

      {/* Desktop Sidebar */}
      <div
        className={cn(
          "hidden md:flex fixed top-4 left-4 bottom-4 z-40 bg-[#FFFFFF] dark:bg-card border border-gray-200 dark:border-border transition-all duration-300 flex-col rounded-2xl",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-border">
          {!collapsed ? (
            <LocalizedLink
              to={homePath}
              className="flex items-center space-x-2"
            >
              <img
                src="/lovable-uploads/breneo_logo.png" // ✅ Use root path
                alt="Breneo Logo"
                className="h-8"
              />
            </LocalizedLink>
          ) : (
            <img
              src="/lovable-uploads/breneo_logo.png" // ✅ Use root path
              alt="Breneo Logo"
              className="h-5 w-10 object-cover object-left"
            />
          )}
        </div>

        {/* Main Nav */}
        <div className="flex flex-col flex-1">
          <div className="flex-1 overflow-y-auto pt-8">
            <nav className="space-y-2 px-4">
              {navItems.map((item, index) => {
                // Check if current path matches the item href
                // Handle home/dashboard equivalence (both routes go to same page)
                let isActive = currentPath === item.href;

                // Special handling for home item - it should be active on both /home and /dashboard
                if (item.href === "/home") {
                  isActive =
                    currentPath === "/home" ||
                    currentPath === "/dashboard" ||
                    rawPathname.includes("/home") ||
                    rawPathname.includes("/dashboard");
                } else if (item.href === "/academy/home") {
                  isActive =
                    currentPath === "/academy/home" ||
                    currentPath === "/academy/dashboard" ||
                    rawPathname.includes("/academy/home") ||
                    rawPathname.includes("/academy/dashboard");
                } else {
                  // For other items, check if pathname ends with the href (handles language prefixes)
                  isActive =
                    currentPath === item.href ||
                    rawPathname.endsWith(item.href);
                }
                return (
                  <LocalizedLink
                    key={index}
                    to={item.href}
                    className={cn(
                      "flex items-center space-x-4 px-4 py-4 rounded-xl transition-all duration-200 group",
                      isActive
                        ? "bg-breneo-blue/10 text-breneo-blue"
                        : "text-gray-600 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] hover:text-breneo-blue"
                    )}
                  >
                    <item.icon
                      size={22}
                      className={cn(
                        "transition-colors duration-200 flex-shrink-0",
                        isActive
                          ? "text-breneo-blue"
                          : "text-gray-400 group-hover:text-breneo-blue dark:text-gray-400 dark:group-hover:text-breneo-blue"
                      )}
                    />
                    {!collapsed && (
                      <span
                        className={cn(
                          "font-medium text-base transition-colors duration-200",
                          isActive
                            ? "text-breneo-blue"
                            : "text-gray-600 group-hover:text-breneo-blue"
                        )}
                      >
                        {item.label}
                      </span>
                    )}
                  </LocalizedLink>
                );
              })}
            </nav>
          </div>

          {/* Bottom section */}
          <div className="px-4 pb-4">
            <div className="border-t border-gray-200 dark:border-border mb-4"></div>

            {/* Settings, Help Center, Theme Toggle grouped together */}
            <div className="space-y-2 mb-4">
              <LocalizedLink
                to={settingsPath}
                className={cn(
                  "flex items-center space-x-4 px-4 py-4 rounded-xl transition-all duration-200 group",
                  currentPath === settingsPath
                    ? "bg-breneo-blue/10 text-breneo-blue"
                    : "text-gray-600 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] hover:text-breneo-blue"
                )}
              >
                <Settings
                  size={22}
                  className={cn(
                    "flex-shrink-0 transition-colors duration-200",
                    currentPath === settingsPath
                      ? "text-breneo-blue"
                      : "text-gray-400 group-hover:text-breneo-blue dark:text-gray-400 dark:group-hover:text-breneo-blue"
                  )}
                />
                {!collapsed && (
                  <span className="font-medium text-base">
                    {t.nav.settings}
                  </span>
                )}
              </LocalizedLink>

              <LocalizedLink
                to="/help"
                className={cn(
                  "flex items-center space-x-4 px-4 py-4 rounded-xl transition-all duration-200 group",
                  currentPath === "/help"
                    ? "bg-breneo-blue/10 text-breneo-blue"
                    : "text-gray-600 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] hover:text-breneo-blue"
                )}
              >
                <HelpCircle
                  size={22}
                  className={cn(
                    "flex-shrink-0 transition-colors duration-200",
                    currentPath === "/help"
                      ? "text-breneo-blue"
                      : "text-gray-400 group-hover:text-breneo-blue dark:text-gray-400 dark:group-hover:text-breneo-blue"
                  )}
                />
                {!collapsed && (
                  <span className="font-medium text-base">{t.nav.help}</span>
                )}
              </LocalizedLink>

              {/* Breneo Pro Plan Widget - Desktop Only */}
              {!isAcademy && (
                <LocalizedLink
                  to="/subscription"
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-md transition-all duration-200 group",
                    "bg-gradient-to-r from-breneo-blue/10 to-purple-500/10 dark:from-breneo-blue/20 dark:to-purple-500/20",
                    "border border-breneo-blue/20 dark:border-breneo-blue/30",
                    "hover:from-breneo-blue/15 hover:to-purple-500/15 dark:hover:from-breneo-blue/25 dark:hover:to-purple-500/25",
                    collapsed && "justify-center px-2"
                  )}
                >
                  {!collapsed ? (
                    <>
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <Sparkles
                          size={14}
                          className="text-breneo-blue flex-shrink-0"
                        />
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">
                          {t.subscription.upgrade}
                        </span>
                      </div>
                      <ChevronRight
                        size={14}
                        className="text-breneo-blue flex-shrink-0 group-hover:translate-x-0.5 transition-transform"
                      />
                    </>
                  ) : (
                    <Sparkles size={14} className="text-breneo-blue" />
                  )}
                </LocalizedLink>
              )}
            </div>

            {/* Profile */}
            <div className="border-t border-gray-200 dark:border-border mt-4 pt-4">
              <LocalizedLink
                to={profilePath}
                className="flex items-center space-x-4 px-4 py-2 rounded-xl hover:bg-gray-50 transition-all duration-200 group"
              >
                {/* Avatar box */}
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-[12px] text-sm font-semibold shrink-0",
                    // ✅ Changed userData to user
                    user?.profile_image
                      ? "overflow-hidden"
                      : "bg-[#AAF0FF] text-[#099DBC]"
                  )}
                >
                  {/* ✅ Changed userData to user */}
                  {user?.profile_image ? (
                    <img
                      src={user.profile_image}
                      alt="Profile"
                      className="w-full h-full object-cover rounded-[12px]"
                    />
                  ) : (
                    getInitials()
                  )}
                </div>

                {!collapsed && (
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-gray-700">
                      {getDisplayName()}
                    </div>
                    {/* ✅ Changed userData to user */}
                    <p className="text-xs text-gray-400">{user?.email}</p>
                  </div>
                )}
              </LocalizedLink>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
