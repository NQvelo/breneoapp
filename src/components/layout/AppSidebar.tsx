import React from "react"; // ⛔ Removed useEffect, useState
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  BookOpen,
  Settings,
  HelpCircle,
  User,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface AppSidebarProps {
  collapsed: boolean;
  toggleSidebar: () => void;
}

export function AppSidebar({ collapsed, toggleSidebar }: AppSidebarProps) {
  const location = useLocation();
  // ✅ Get the user object directly from the context
  const { loading, isAcademy, user } = useAuth();

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

  // Navigation items
  const navItems = isAcademy
    ? [{ icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" }]
    : [
        { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
        { icon: Briefcase, label: "Job Offers", href: "/jobs" },
        { icon: BookOpen, label: "Courses", href: "/courses" },
      ];

  const profilePath = isAcademy ? "/academy/profile" : "/profile";

  // Mobile navigation
  const mobileNavItems = [
    ...navItems,
    { icon: User, label: "Profile", href: profilePath },
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center">
            <img
              src="/lovable-uploads/breneo_logo.png" // ✅ Use root path
              alt="Breneo Logo"
              className="h-7"
            />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/notifications"
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Bell size={20} />
            </Link>
            <Link
              to="/settings"
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Settings size={20} />
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
        <nav className="flex justify-around items-center py-2">
          {mobileNavItems.map((item, index) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={index}
                to={item.href}
                className={cn(
                  "flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 min-w-0 flex-1 mx-1",
                  "hover:bg-breneo-blue/10 active:bg-breneo-blue/20",
                  isActive
                    ? "bg-breneo-blue/10 text-breneo-blue"
                    : "text-gray-600 hover:text-breneo-blue"
                )}
              >
                <item.icon
                  size={20}
                  className={cn(
                    "transition-colors duration-200 mb-1",
                    isActive
                      ? "text-breneo-blue"
                      : "group-hover:text-breneo-blue"
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium transition-colors duration-200 text-center",
                    isActive
                      ? "text-breneo-blue"
                      : "group-hover:text-breneo-blue"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Desktop Sidebar */}
      <div
        className={cn(
          "hidden md:flex fixed top-4 left-4 bottom-4 z-40 bg-white border border-gray-200 transition-all duration-300 flex-col shadow-sm rounded-2xl",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-gray-100">
          {!collapsed ? (
            <Link to="/dashboard" className="flex items-center space-x-2">
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
                        : "text-gray-600 hover:bg-gray-50 hover:text-breneo-blue"
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
            <div className="border-t border-gray-200 mb-4"></div>

            <Link
              to="/settings"
              className={cn(
                "flex items-center space-x-4 px-4 py-4 rounded-xl transition-all duration-200 group",
                location.pathname === "/settings"
                  ? "bg-breneo-blue/10 text-breneo-blue"
                  : "text-gray-600 hover:bg-gray-50 hover:text-breneo-blue"
              )}
            >
              <Settings size={22} />
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
                  : "text-gray-600 hover:bg-gray-50 hover:text-breneo-blue"
              )}
            >
              <HelpCircle size={22} />
              {!collapsed && (
                <span className="font-medium text-base">Help Center</span>
              )}
            </Link>

            {/* Profile */}
            <div className="border-t border-gray-200 mt-4 pt-4">
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
