import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  EMPLOYER_ACCESS_POLL_MS,
  EMPLOYER_ACTIVE_LANDING_PATH,
  resolveEmployerDashboardAccess,
} from "@/api/employer/employerAccessResolver";
import type { EmployerAccessState } from "@/api/employer/employerJoinRequests";
import { getLocalizedPath } from "@/utils/localeUtils";
import { useLanguage } from "@/contexts/LanguageContext";

const ALLOWED_WHEN_PENDING = [
  "/employer/pending-approval",
  "/employer/notifications",
  "/employer/settings",
];

const ALLOWED_WHEN_NEEDS_COMPANY = [
  "/employer/join-company",
  "/employer/accept-invite",
  "/employer/register",
  "/employer/pending-approval",
  "/employer/notifications",
  "/employer/settings",
];

function pathWithoutLocale(pathname: string): string {
  if (pathname.startsWith("/en/")) return pathname.slice(3) || "/";
  if (pathname.startsWith("/ka/")) return pathname.slice(3) || "/";
  return pathname;
}

function isAllowed(path: string, allowed: string[]): boolean {
  return allowed.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function EmployerAccessGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const [access, setAccess] = useState<EmployerAccessState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const path = pathWithoutLocale(location.pathname);
    const skipReload =
      access?.state === "active" &&
      path !== "/employer/pending-approval" &&
      !path.startsWith("/employer/join-company");

    if (skipReload) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      setLoading(true);
      try {
        const state = await resolveEmployerDashboardAccess();
        if (cancelled) return;
        setAccess(state);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, access?.state]);

  useEffect(() => {
    if (access?.state !== "pending") return;
    let cancelled = false;
    const poll = async () => {
      const state = await resolveEmployerDashboardAccess();
      if (cancelled) return;
      setAccess(state);
    };
    const id = window.setInterval(() => void poll(), EMPLOYER_ACCESS_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [access?.state]);

  useEffect(() => {
    if (loading || !access) return;
    const path = pathWithoutLocale(location.pathname);
    const jobsPath = getLocalizedPath(EMPLOYER_ACTIVE_LANDING_PATH, language);

    if (access.state === "active") {
      if (
        path === "/employer/pending-approval" ||
        path === "/employer/join-company"
      ) {
        navigate(jobsPath, { replace: true });
      }
      return;
    }

    if (access.state === "pending") {
      if (!isAllowed(path, ALLOWED_WHEN_PENDING)) {
        navigate(getLocalizedPath("/employer/pending-approval", language), {
          replace: true,
        });
      }
      return;
    }

    if (access.state === "needs_company") {
      if (!isAllowed(path, ALLOWED_WHEN_NEEDS_COMPANY)) {
        navigate(getLocalizedPath("/employer/join-company", language), {
          replace: true,
        });
      }
    }
  }, [access, loading, location.pathname, navigate, language]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
