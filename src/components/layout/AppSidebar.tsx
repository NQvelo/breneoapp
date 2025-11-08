import React from "react"; // ⛔ Removed useEffect, useState
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  BookOpen,
  Library,
  Home,
  Settings,
  HelpCircle,
  CircleUserRound,
  Bell,
  Moon,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";

interface AppSidebarProps {
  collapsed: boolean;
  toggleSidebar: () => void;
}

export function AppSidebar({ collapsed, toggleSidebar }: AppSidebarProps) {
  const location = useLocation();
  // ✅ Get the user object directly from the context
  const { loading, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

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
          label: "Home",
          href: "/academy/home",
        },
      ]
    : [
        { icon: Home, label: "Home", href: "/home" },
        { icon: Briefcase, label: "Jobs", href: "/jobs" },
        { icon: Library, label: "Courses", href: "/courses" },
      ];

  const profilePath = isAcademy ? "/academy/profile" : "/profile";
  const settingsPath = isAcademy ? "/academy/settings" : "/settings";
  const homePath = isAcademy ? "/academy/home" : "/home";

  // Mobile navigation
  const mobileNavItems = [
    ...navItems,
    { icon: CircleUserRound, label: "Profile", href: profilePath },
  ];

  return (
    <>
      {/* Mobile Header */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-50 px-4 pt-safe"
        style={{
          background:
            mounted && theme === "dark"
              ? "linear-gradient(to bottom, #181818, rgba(24, 24, 24, 0.4), transparent)"
              : "linear-gradient(to bottom, #F8F9FA, rgba(248, 249, 250, 0.4), transparent)",
        }}
      >
        <div className="py-5">
          <div className="flex items-center justify-between">
            <Link to={homePath} className="flex items-center">
              <img
                src="/lovable-uploads/breneo_logo.png" // ✅ Use root path
                alt="Breneo Logo"
                className="h-8"
              />
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className={cn(
                  "w-9 h-9 rounded-full backdrop-blur-md border border-gray-200 dark:border-border flex items-center justify-center transition-all",
                  mounted && theme === "dark"
                    ? "text-gray-300 hover:text-gray-100"
                    : "text-gray-600 hover:text-gray-800"
                )}
                style={{
                  background:
                    mounted && theme === "dark"
                      ? "rgba(36, 36, 36, 0.5)"
                      : "rgba(255, 255, 255, 0.5)",
                }}
              >
                {mounted && theme === "dark" ? (
                  <Moon size={16} />
                ) : (
                  <Sun size={16} />
                )}
              </button>
              <Link
                to="/notifications"
                className={cn(
                  "w-9 h-9 rounded-full backdrop-blur-md border border-gray-200 dark:border-border flex items-center justify-center transition-all",
                  mounted && theme === "dark"
                    ? "text-gray-300 hover:text-gray-100"
                    : "text-gray-600 hover:text-gray-800"
                )}
                style={{
                  background:
                    mounted && theme === "dark"
                      ? "rgba(36, 36, 36, 0.5)"
                      : "rgba(255, 255, 255, 0.5)",
                }}
              >
                <Bell size={16} />
              </Link>
              <Link
                to={settingsPath}
                className={cn(
                  "w-9 h-9 rounded-full backdrop-blur-md border border-gray-200 dark:border-border flex items-center justify-center transition-all",
                  mounted && theme === "dark"
                    ? "text-gray-300 hover:text-gray-100"
                    : "text-gray-600 hover:text-gray-800"
                )}
                style={{
                  background:
                    mounted && theme === "dark"
                      ? "rgba(36, 36, 36, 0.5)"
                      : "rgba(255, 255, 255, 0.5)",
                }}
              >
                <Settings size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation - iOS Style Floating Toolbar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-safe">
        <div className="px-6 pb-3">
          <div
            className={cn(
              "rounded-[100px] shadow-2xl",
              "backdrop-blur-sm backdrop-saturate-150",
              "pointer-events-auto overflow-hidden"
            )}
            style={{
              // Theme-aware navbar background with blur
              background:
                mounted && theme === "dark"
                  ? "rgba(36, 36, 36, 0.85)"
                  : "rgba(255, 255, 255, 0.85)",
              WebkitBackdropFilter: "blur(10px) saturate(180%)",
              backdropFilter: "blur(10px) saturate(180%)",
              border:
                mounted && theme === "dark"
                  ? "0.5px solid rgba(255, 255, 255, 0.1)"
                  : "0.5px solid rgba(0, 0, 0, 0.1)",
              boxShadow:
                mounted && theme === "dark"
                  ? "0 8px 32px 0 rgba(0, 0, 0, 0.6), 0 0 0 0.5px rgba(255, 255, 255, 0.08)"
                  : "0 8px 32px 0 rgba(0, 0, 0, 0.12), 0 0 0 0.5px rgba(0, 0, 0, 0.08)",
            }}
          >
            <nav className="flex justify-around items-center py-2 px-1">
              {mobileNavItems.map((item, index) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={index}
                    to={item.href}
                    className={cn(
                      "flex flex-col items-center justify-center py-1.5 px-2.5 rounded-full transition-all duration-300 min-w-0 flex-1 mx-0.5 relative",
                      "active:scale-95 active:opacity-80"
                    )}
                  >
                    {/* Active state background - theme-aware pill */}
                    {isActive && (
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          background:
                            mounted && theme === "dark"
                              ? "rgba(75, 75, 75, 0.8)"
                              : "rgba(0, 0, 0, 0.08)",
                        }}
                      />
                    )}
                    <item.icon
                      size={20}
                      className={cn(
                        "transition-all duration-300 mb-0.5 relative z-10",
                        mounted && theme === "dark"
                          ? "text-white"
                          : "text-gray-900"
                      )}
                    />
                    <span
                      className={cn(
                        "text-[11px] font-medium transition-all duration-300 text-center leading-none tracking-tight relative z-10",
                        mounted && theme === "dark"
                          ? "text-white"
                          : "text-gray-900"
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
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
            <Link to={homePath} className="flex items-center space-x-2">
              <img
                src="/lovable-uploads/breneo_logo.png" // ✅ Use root path
                alt="Breneo Logo"
                className="h-8"
              />
            </Link>
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
                const isActive = location.pathname === item.href;
                return (
                  <Link
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
                          : "text-gray-400 group-hover:text-breneo-blue"
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
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom section */}
          <div className="px-4 pb-4">
            <div className="border-t border-gray-200 dark:border-border mb-4"></div>

            {/* Settings, Help Center, Theme Toggle grouped together */}
            <div className="space-y-2 mb-4">
              <Link
                to={settingsPath}
                className={cn(
                  "flex items-center space-x-4 px-4 py-4 rounded-xl transition-all duration-200 group",
                  location.pathname === settingsPath
                    ? "bg-breneo-blue/10 text-breneo-blue"
                    : "text-gray-600 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] hover:text-breneo-blue"
                )}
              >
                <Settings
                  size={22}
                  className={cn(
                    "flex-shrink-0 transition-colors duration-200",
                    location.pathname === settingsPath
                      ? "text-breneo-blue"
                      : "text-gray-400 group-hover:text-breneo-blue"
                  )}
                />
                {!collapsed && (
                  <span className="font-medium text-base">Settings</span>
                )}
              </Link>

              <Link
                to="/help"
                className={cn(
                  "flex items-center space-x-4 px-4 py-4 rounded-xl transition-all duration-200 group",
                  location.pathname === "/help"
                    ? "bg-breneo-blue/10 text-breneo-blue"
                    : "text-gray-600 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] hover:text-breneo-blue"
                )}
              >
                <HelpCircle
                  size={22}
                  className={cn(
                    "flex-shrink-0 transition-colors duration-200",
                    location.pathname === "/help"
                      ? "text-breneo-blue"
                      : "text-gray-400 group-hover:text-breneo-blue"
                  )}
                />
                {!collapsed && (
                  <span className="font-medium text-base">Help Center</span>
                )}
              </Link>

              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className={cn(
                  "flex items-center space-x-4 px-4 py-4 rounded-xl transition-all duration-200 group w-full text-left",
                  "text-gray-600 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] hover:text-breneo-blue"
                )}
              >
                {theme === "dark" ? (
                  <Moon
                    size={22}
                    className="text-gray-400 group-hover:text-breneo-blue transition-colors duration-200 flex-shrink-0"
                  />
                ) : (
                  <Sun
                    size={22}
                    className="text-gray-400 group-hover:text-breneo-blue transition-colors duration-200 flex-shrink-0"
                  />
                )}
                {!collapsed && (
                  <span className="font-medium text-base transition-colors duration-200">
                    {theme === "dark" ? "Dark Mode" : "Light Mode"}
                  </span>
                )}
              </button>
            </div>

            {/* Profile */}
            <div className="border-t border-gray-200 dark:border-border mt-4 pt-4">
              <Link
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
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
