import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  EMPLOYER_ACCESS_POLL_MS,
  EMPLOYER_ACTIVE_LANDING_PATH,
  resolveEmployerDashboardAccess,
} from "@/api/employer/employerAccessResolver";
import { getLocalizedPath } from "@/utils/localeUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, ChevronDown, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import OptimizedAvatar from "@/components/ui/OptimizedAvatar";

export default function EmployerJoinCompanyPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, employerDisplay, loading: authLoading, logout } = useAuth();

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const access = await resolveEmployerDashboardAccess();
        if (cancelled) return;
        if (access.state === "active") {
          window.location.assign(
            getLocalizedPath(EMPLOYER_ACTIVE_LANDING_PATH, language),
          );
          return;
        }
        if (access.state === "pending") {
          navigate(getLocalizedPath("/employer/pending-approval", language), {
            replace: true,
          });
        }
      } catch {
        /* stay on join-company */
      }
    };
    void check();
    const id = window.setInterval(check, EMPLOYER_ACCESS_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [language, navigate]);

  const accountName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
    user?.username ||
    employerDisplay?.name ||
    user?.email ||
    "";
  const accountEmail = user?.email || employerDisplay?.email || "";
  const accountAvatar =
    (typeof user?.profile_image === "string" && user.profile_image.trim()) ||
    employerDisplay?.logo_url ||
    null;
  const avatarFallback = (accountName.charAt(0) || "U").toUpperCase();
  return (
    <DashboardLayout showSidebar={false} showHeader={false}>
      <div className="flex min-h-screen flex-col px-4 py-10">
        <div className="flex flex-1 items-center justify-center">
          <Card className="w-full max-w-md border-0 rounded-3xl shadow-sm">
            <CardContent className="pt-10 pb-10 px-6 text-center space-y-5">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-950/50">
                <Building2 className="h-8 w-8 text-breneo-blue" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-foreground">
                  Company access required
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You should be joined to the company.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 flex items-center justify-center">
          <div className="w-full max-w-md">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={authLoading || !accountName}
                  className="w-full flex items-center gap-3 rounded-2xl bg-white dark:bg-card border border-border/60 px-4 py-3 shadow-sm hover:bg-muted/20 transition-colors"
                  aria-label="Account menu"
                >
                  <div className="h-10 w-10 shrink-0">
                    <OptimizedAvatar
                      src={accountAvatar}
                      fallback={avatarFallback}
                      size="md"
                      className="h-10 w-10"
                    />
                  </div>
                  {accountName || accountEmail ? (
                    <div className="min-w-0 flex-1 text-left">
                      {accountName ? (
                        <div className="truncate text-sm font-semibold text-foreground">
                          {accountName}
                        </div>
                      ) : null}
                      {accountEmail ? (
                        <div className="truncate text-sm text-muted-foreground">
                          {accountEmail}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={logout} className="cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
