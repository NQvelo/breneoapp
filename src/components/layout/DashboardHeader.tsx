import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardHeaderProps {
  sidebarCollapsed: boolean;
  isVisible: boolean; // Prop for visibility
}

// Helper function to get the page title from the pathname
const getPageTitle = (pathname: string, username?: string) => {
  if (pathname.startsWith("/dashboard")) {
    return (
      <>
        Welcome, <span className="font-bold">{username || "User"}</span>!
      </>
    );
  }
  if (pathname.startsWith("/jobs")) return "Job Offers";
  if (pathname.startsWith("/courses")) return "Courses";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/profile")) return "Profile";
  if (pathname.startsWith("/notifications")) return "Notifications";
  if (pathname.startsWith("/skill-test")) return "Skill Test";
  return "Dashboard";
};

export function DashboardHeader({
  sidebarCollapsed,
  isVisible,
}: DashboardHeaderProps) {
  const location = useLocation();
  const { user } = useAuth();
  const username = user?.first_name || user?.email?.split("@")[0] || "User";
  const pageTitle = getPageTitle(location.pathname, username);

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30",
        "bg-gradient-to-b from-[#F8F9FA] dark:from-[#262B36] to-transparent",
        "transition-opacity duration-300 ease-in-out",
        sidebarCollapsed ? "md:left-24" : "md:left-[17rem]",
        "left-0",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <div className="hidden md:flex items-center space-x-3">
          <h1 className="text-2xl font-semibold text-foreground">
            {pageTitle}
          </h1>
        </div>

        {/* This div is a placeholder to balance the flex layout on mobile */}
        <div className="md:hidden"></div>

        {/* Right side icons - hidden on mobile */}
        <div className="hidden md:flex items-center">
          <Link to="/notifications">
            <Button
              variant="ghost" // Start with ghost variant for base styling
              size="icon"
              className="relative h-10 w-10 rounded-xl border border-input bg-background shadow-sm
                         text-muted-foreground hover:text-foreground hover:bg-accent active:bg-accent/80"
            >
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
