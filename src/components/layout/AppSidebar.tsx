import React from "react";
import { useLocation } from "react-router-dom";
import { LocalizedLink } from "@/components/routing/LocalizedLink";
import { removeLanguagePrefix } from "@/utils/localeUtils";
import {
  Briefcase,
  Home,
  Settings,
  HelpCircle,
  CircleUserRound,
  Bell,
  Moon,
  Sun,
  LibraryBig,
  Video,
  ArrowRight,
  Globe,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { useLanguage, useTranslation } from "@/contexts/LanguageContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BreneoLogo } from "@/components/common/BreneoLogo";

interface AppSidebarProps {
  collapsed: boolean;
  toggleSidebar: () => void;
  onUpgradeClick?: () => void;
}

export function AppSidebar({
  collapsed,
  toggleSidebar,
  onUpgradeClick,
}: AppSidebarProps) {
  const location = useLocation();
  // ✅ Get the user object directly from the context
  const { loading, user, academyDisplay } = useAuth();
  const { subscriptionInfo } = useSubscription();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const t = useTranslation();
  const [mounted, setMounted] = React.useState(false);

  // Remove language prefix for pathname comparison
  const currentPath = removeLanguagePrefix(location.pathname);
  const currentLanguageText = language === "ka" ? "GEO" : "EN";
  const rawPathname = location.pathname;

  // Determine if user is an academy (same as AuthContext)
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

  // Helper: Get display name (academy name from context for academy users, else user name – no refetch on nav)
  const getDisplayName = () => {
    if (isAcademy && academyDisplay?.name) return academyDisplay.name;
    if (!user) return "Member";
    const { first_name, last_name, email } = user;
    if (first_name && last_name) {
      const capitalize = (str: string) =>
        str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";
      return `${capitalize(first_name)} ${capitalize(last_name)}`;
    }
    return email ?? "Member";
  };

  // Helper: Get display email (academy email from context for academy users, else user email)
  const getDisplayEmail = () => {
    if (isAcademy && academyDisplay?.email) return academyDisplay.email;
    return user?.email ?? "";
  };

  // Helper: Get avatar initials (academy name or user name/email)
  const getInitials = () => {
    if (isAcademy && academyDisplay?.name) {
      return academyDisplay.name.slice(0, 2).toUpperCase();
    }
    if (user?.first_name && user?.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(
        0,
      )}`.toUpperCase();
    }
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
        {
          icon: LibraryBig,
          label: t.nav.courses,
          href: "/academy/courses",
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
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#F3F3F4]/80 dark:bg-[#181818]/80 backdrop-blur-xl backdrop-saturate-150 px-4 py-3">
        <div className="flex items-center justify-between">
          <LocalizedLink to={homePath} className="flex items-center ml-1">
            <BreneoLogo className="h-6 md:h-5" />
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#F3F3F4]/80 dark:bg-[#181818]/80 backdrop-blur-xl backdrop-saturate-150 ">
        <nav className="flex justify-around items-center py-3">
          {mobileNavItems.map((item, index) => {
            let isActive = currentPath === item.href;
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
              isActive =
                currentPath === item.href || rawPathname.endsWith(item.href);
            }
            return (
              <LocalizedLink
                key={index}
                to={item.href}
                className={cn(
                  "flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 min-w-0 flex-1 mx-0",
                  isActive
                    ? "text-gray-600"
                    : "text-gray-600 hover:text-breneo-blue",
                )}
              >
                <item.icon
                  size={20}
                  className={cn(
                    "transition-colors duration-200 mb-0.5",
                    isActive
                      ? "text-breneo-blue"
                      : "text-gray-600 group-hover:text-breneo-blue",
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium transition-colors duration-200 text-center",
                    isActive
                      ? "text-gray-600"
                      : "text-gray-600 group-hover:text-breneo-blue",
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
          "hidden md:flex fixed top-4 left-4 bottom-4 z-40 bg-[#FFFFFF] dark:bg-card transition-all duration-300 flex-col rounded-3xl",
          collapsed ? "w-20" : "w-64",
        )}
      >
        {/* Header */}
        <div className="p-4 pt-5 flex items-center justify-between">
          {!collapsed ? (
            <LocalizedLink
              to={homePath}
              className="flex items-center space-x-2 ml-3"
            >
              <BreneoLogo className="h-6" />
            </LocalizedLink>
          ) : (
            <BreneoLogo className="h-4 w-8 object-cover object-left ml-3" />
          )}
        </div>

        {/* Main Nav */}
        <div className="flex flex-col flex-1">
          <div className="flex-1 overflow-y-auto pt-8">
            <nav className="space-y-1 px-4">
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
                      "flex items-center space-x-4 px-4 py-2.5 rounded-xl transition-all duration-200 group",
                      isActive
                        ? "bg-breneo-blue/10 text-breneo-blue"
                        : "text-gray-600 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] hover:text-breneo-blue",
                    )}
                  >
                    <item.icon
                      size={22}
                      className={cn(
                        "transition-colors duration-200 flex-shrink-0",
                        isActive
                          ? "text-breneo-blue"
                          : "text-gray-400 group-hover:text-breneo-blue dark:text-gray-400 dark:group-hover:text-breneo-blue",
                      )}
                    />
                    {!collapsed && (
                      <span
                        className={cn(
                          "font-medium text-base transition-colors duration-200 flex items-center gap-3",
                          isActive
                            ? "text-breneo-blue"
                            : "text-gray-600 group-hover:text-breneo-blue",
                        )}
                      >
                        {item.label}
                        {item.href === "/webinars" && (
                          <Badge className="bg-breneo-blue text-white border-0 px-3 py-0.8 text-[12px] font-semibold hidden md:inline-flex">
                            Soon
                          </Badge>
                        )}
                      </span>
                    )}
                  </LocalizedLink>
                );
              })}
            </nav>
          </div>

          {/* Bottom section */}
          <div className="px-4 pb-4">
            <div className="mb-4"></div>

            {/* Settings, Help Center, Theme Toggle grouped together */}
            <div className="space-y-1 mb-4">
              <LocalizedLink
                to={settingsPath}
                className={cn(
                  "flex items-center space-x-4 px-4 py-2.5 rounded-xl transition-all duration-200 group",
                  currentPath === settingsPath
                    ? "bg-breneo-blue/10 text-breneo-blue"
                    : "text-gray-600 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] hover:text-breneo-blue",
                )}
              >
                <Settings
                  size={22}
                  className={cn(
                    "flex-shrink-0 transition-colors duration-200",
                    currentPath === settingsPath
                      ? "text-breneo-blue"
                      : "text-gray-400 group-hover:text-breneo-blue dark:text-gray-400 dark:group-hover:text-breneo-blue",
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
                  "flex items-center space-x-4 px-4 py-2.5 rounded-xl transition-all duration-200 group",
                  currentPath === "/help"
                    ? "bg-breneo-blue/10 text-breneo-blue"
                    : "text-gray-600 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] hover:text-breneo-blue",
                )}
              >
                <HelpCircle
                  size={22}
                  className={cn(
                    "flex-shrink-0 transition-colors duration-200",
                    currentPath === "/help"
                      ? "text-breneo-blue"
                      : "text-gray-400 group-hover:text-breneo-blue dark:text-gray-400 dark:group-hover:text-breneo-blue",
                  )}
                />
                {!collapsed && (
                  <span className="font-medium text-base">{t.nav.help}</span>
                )}
              </LocalizedLink>

              {/* Breneo Pro Plan Widget - Desktop Only */}
              {!isAcademy && (
                <button
                  onClick={onUpgradeClick}
                  className={cn(
                    "w-full flex items-center space-x-4 px-4 py-2.5 rounded-xl transition-all duration-200 group",
                    "bg-gradient-to-br from-[#cedcfc] to-[#a0dfee] dark:from-[#6B7BA8]/40 dark:to-[#4A9FB8]/40",
                    "hover:from-[#CFD8EE] hover:to-[#97D9E9] dark:hover:from-[#6B7BA8]/50 dark:hover:to-[#4A9FB8]/50 text-left",
                    collapsed && "justify-center px-4",
                  )}
                >
                  {subscriptionInfo?.is_active ? (
                    <Sparkles
                      size={22}
                      className="text-gray-700 dark:text-gray-200 flex-shrink-0 group-hover:scale-110 transition-transform"
                    />
                  ) : (
                    <ArrowRight
                      size={22}
                      className="text-gray-700 dark:text-gray-200 flex-shrink-0 group-hover:translate-x-0.5 transition-transform"
                    />
                  )}
                  {!collapsed && (
                    <span className="font-medium text-base text-gray-700 dark:text-gray-200 truncate">
                      {subscriptionInfo?.is_active
                        ? subscriptionInfo.plan_name || "Pro Plan"
                        : t.subscription.upgrade}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Profile */}
            <div className="mt-4 pt-4">
              <LocalizedLink
                to={profilePath}
                className="flex items-center space-x-4 px-4 py-2 rounded-xl hover:bg-gray-50 transition-all duration-200 group"
              >
                {/* Avatar box */}
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-[50px] text-sm font-semibold shrink-0",
                    // ✅ Changed userData to user
                    user?.profile_image
                      ? "overflow-hidden"
                      : "bg-[#AAF0FF] text-[#099DBC]",
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
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-700 dark:text-gray-200 truncate">
                      {getDisplayName()}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                      {getDisplayEmail()}
                    </p>
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
