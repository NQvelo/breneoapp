import React, { useState, useEffect } from "react";
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

interface AppSidebarProps {
  collapsed: boolean;
  toggleSidebar: () => void;
}

export function AppSidebar({ collapsed, toggleSidebar }: AppSidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>("");

  useEffect(() => {
    const fetchProfilePhoto = async () => {
      if (user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("profile_photo_url")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          setProfilePhotoUrl("");
        } else if (profile && "profile_photo_url" in profile) {
          setProfilePhotoUrl(
            (profile as { profile_photo_url?: string }).profile_photo_url || ""
          );
        } else {
          setProfilePhotoUrl("");
        }
      }
    };

    fetchProfilePhoto();
  }, [user]);
  const navItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/dashboard",
    },
    {
      icon: Briefcase,
      label: "Job Offers",
      href: "/jobs",
    },
    {
      icon: BookOpen,
      label: "Courses",
      href: "/courses",
    },
  ];

  const mobileNavItems = [
    ...navItems,
    {
      icon: User,
      label: "Profile",
      href: "/profile",
    },
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center">
            <img
              src="/lovable-uploads/a27089ec-2666-4c11-a0e0-0d8ea54e1d39.png"
              alt="Breneo Logo"
              className="h-7 "
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

      {/* Desktop Sidebar - Full Height */}
      <div
        className={cn(
          "hidden md:flex fixed top-4 left-4 bottom-4 z-40 bg-white border border-gray-200 transition-all duration-300 flex-col shadow-sm rounded-2xl",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              {!collapsed && (
                <Link to="/dashboard" className="flex items-center space-x-2">
                  <img
                    src="/lovable-uploads/a27089ec-2666-4c11-a0e0-0d8ea54e1d39.png"
                    alt="Breneo Logo"
                    className="h-8"
                  />
                </Link>
              )}
              {collapsed && (
                <img
                  src="/lovable-uploads/a27089ec-2666-4c11-a0e0-0d8ea54e1d39.png"
                  alt="Breneo Logo"
                  className="h-5 w-10"
                  style={{
                    objectFit: "cover",
                    objectPosition: "left",
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col flex-1">
          {/* Main Navigation */}
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
              <Settings
                size={22}
                className={cn(
                  "transition-colors duration-200 flex-shrink-0",
                  location.pathname === "/settings"
                    ? "text-breneo-blue"
                    : "text-gray-400 group-hover:text-breneo-blue"
                )}
              />
              {!collapsed && (
                <span
                  className={cn(
                    "font-medium text-base transition-colors duration-200",
                    location.pathname === "/settings"
                      ? "text-breneo-blue"
                      : "text-gray-600 group-hover:text-breneo-blue"
                  )}
                >
                  Settings
                </span>
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
              <HelpCircle
                size={22}
                className={cn(
                  "transition-colors duration-200 flex-shrink-0",
                  location.pathname === "/help"
                    ? "text-breneo-blue"
                    : "text-gray-400 group-hover:text-breneo-blue"
                )}
              />
              {!collapsed && (
                <span
                  className={cn(
                    "font-medium text-base transition-colors duration-200",
                    location.pathname === "/help"
                      ? "text-breneo-blue"
                      : "text-gray-600 group-hover:text-breneo-blue"
                  )}
                >
                  Help Center
                </span>
              )}
            </Link>

            <div className="border-t border-gray-200 mt-4 pt-4">
              <Link
                to="/profile"
                className={cn(
                  "flex items-center space-x-4 px-4 py-2 rounded-xl transition-all duration-200 group",
                  "hover:bg-gray-50"
                )}
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={profilePhotoUrl} alt="Profile" />
                  <AvatarFallback>
                    <User
                      size={28}
                      className="text-gray-400 group-hover:text-breneo-blue"
                    />
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-gray-700">
                      {user?.user_metadata?.full_name ??
                        user?.email ??
                        "Member"}
                    </div>
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
