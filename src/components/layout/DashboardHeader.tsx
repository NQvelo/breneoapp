import React from "react";
import { useLocation } from "react-router-dom";
import { LocalizedLink } from "@/components/routing/LocalizedLink";
import { removeLanguagePrefix } from "@/utils/localeUtils";
import { Bell, Moon, Sun, Globe, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { useLanguage, useTranslation } from "@/contexts/LanguageContext";

interface DashboardHeaderProps {
  sidebarCollapsed: boolean;
  isVisible: boolean; // Prop for visibility
}

// Helper function to get the page title from the pathname
const getPageTitle = (pathname: string, username?: string, t?: any) => {
  if (!t) return "Home";
  
  if (pathname.startsWith("/home") || pathname.startsWith("/academy/home")) {
    return (
      <>
        {t.dashboard.welcome}, <span className="font-bold">{username || "User"}</span>!
      </>
    );
  }
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/academy/dashboard")) {
    return (
      <>
        {t.dashboard.welcome}, <span className="font-bold">{username || "User"}</span>!
      </>
    );
  }
  if (pathname.startsWith("/jobs")) return t.jobs.title;
  if (pathname.startsWith("/courses")) return t.courses.title;
  if (pathname.startsWith("/settings") || pathname.startsWith("/academy/settings")) return t.settings.title;
  if (pathname.startsWith("/profile") || pathname.startsWith("/academy/profile")) return t.profile.title;
  if (pathname.startsWith("/notifications")) return t.notifications.title;
  if (pathname.startsWith("/skill-test")) return t.skillTest.title;
  return t.nav.home;
};

export function DashboardHeader({
  sidebarCollapsed,
  isVisible,
}: DashboardHeaderProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const t = useTranslation();
  const [mounted, setMounted] = React.useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = React.useState(false);
  const username = user?.first_name || user?.email?.split("@")[0] || "User";
  const currentPath = removeLanguagePrefix(location.pathname);
  const pageTitle = getPageTitle(currentPath, username, t);

  const currentLanguageText = language === "ka" ? "ქართული" : "English";

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
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <div className="hidden md:flex items-center space-x-3">
          <h1 className="text-2xl font-semibold text-foreground">
            {pageTitle}
          </h1>
        </div>

        {/* This div is a placeholder to balance the flex layout on mobile */}
        <div className="md:hidden"></div>

        {/* Right side icons - hidden on mobile */}
        <div className="hidden md:flex items-center gap-2">
          <DropdownMenu open={languageMenuOpen} onOpenChange={setLanguageMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 px-3 rounded-xl border border-input bg-background shadow-sm
                           text-muted-foreground hover:text-foreground hover:bg-accent active:bg-accent/80
                           text-sm font-medium flex items-center gap-2"
              >
                <Globe className="h-4 w-4" />
                <span>{currentLanguageText}</span>
                <ChevronUp
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    languageMenuOpen ? "rotate-0" : "rotate-180"
                  )}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                {t.settings.language}
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup value={language} onValueChange={(value) => setLanguage(value as "en" | "ka")}>
                <DropdownMenuRadioItem value="ka" className="cursor-pointer">
                  ქართული
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="en" className="cursor-pointer">
                  English
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative h-10 w-10 rounded-xl border border-input bg-background shadow-sm
                       text-muted-foreground hover:text-foreground hover:bg-accent active:bg-accent/80"
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
              variant="ghost" // Start with ghost variant for base styling
              size="icon"
              className="relative h-10 w-10 rounded-xl border border-input bg-background shadow-sm
                         text-muted-foreground hover:text-foreground hover:bg-accent active:bg-accent/80"
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
