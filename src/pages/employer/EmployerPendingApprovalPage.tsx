import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";
import { BreneoLogo } from "@/components/common/BreneoLogo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { getLocalizedPath } from "@/utils/localeUtils";
import { resolveEmployerAccessFromSession } from "@/api/employer/employerAccess";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";

const POLL_MS = 10_000;

export default function EmployerPendingApprovalPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const check = async () => {
      try {
        let profileRaw: unknown;
        try {
          const res = await apiClient.get(API_ENDPOINTS.EMPLOYER.PROFILE);
          profileRaw = res.data;
        } catch {
          profileRaw = undefined;
        }
        const access = await resolveEmployerAccessFromSession(
          profileRaw,
          user?.email,
        );
        if (cancelled) return;

        if (access.state === "active") {
          navigate(getLocalizedPath("/employer/jobs", language), {
            replace: true,
          });
          return;
        }
        if (access.state === "needs_company") {
          navigate(getLocalizedPath("/employer/join-company", language), {
            replace: true,
          });
          return;
        }

        setCompanyName(
          access.pendingRequest?.company_name ||
            access.companyName ||
            "your company",
        );
        setChecking(false);
      } catch {
        if (!cancelled) setChecking(false);
      }
    };

    void check();
    timer = setInterval(() => void check(), POLL_MS);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [language, navigate, user?.email]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <BreneoLogo className="h-6" />
        <ThemeToggle />
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center max-w-md mx-auto">
        <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Clock className="h-14 w-14" strokeWidth={1.25} />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Waiting for approval</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Your request to join{" "}
          <span className="font-medium text-foreground">{companyName}</span>{" "}
          was sent to the company admin. You will get access once they approve
          you.
        </p>
        <p className="text-xs text-muted-foreground mb-8">
          This page refreshes automatically. You can also check back later.
        </p>
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={() =>
            navigate(getLocalizedPath("/employer/join-company", language))
          }
        >
          Choose a different company
        </Button>
      </main>
    </div>
  );
}
