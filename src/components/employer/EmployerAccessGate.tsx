import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  fetchEmployerStaffMemberships,
} from "@/api/employer/aggregatorBffApi";
import {
  fetchEmployerAccessState,
  type EmployerAccessState,
} from "@/api/employer/employerJoinRequests";
import { resolveEmployerStaffUserId } from "@/api/employer/profile";
import { TokenManager } from "@/api/auth/tokenManager";
import { getLocalizedPath } from "@/utils/localeUtils";
import { useLanguage } from "@/contexts/LanguageContext";

const ALLOWED_WHEN_PENDING = [
  "/employer/pending-approval",
  "/employer/notifications",
  "/employer/settings",
];

const ALLOWED_WHEN_NEEDS_COMPANY = [
  "/employer/join-company",
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

async function userHasStaffMembership(): Promise<boolean> {
  const staffUserId = resolveEmployerStaffUserId({
    accessToken: TokenManager.getAccessToken(),
  });
  if (!staffUserId) return false;
  try {
    const rows = await fetchEmployerStaffMemberships({
      externalUserId: staffUserId,
    });
    return rows.some((m) => m.external_user_id === staffUserId);
  } catch {
    return false;
  }
}

async function loadEmployerAccessState(): Promise<EmployerAccessState> {
  try {
    const state = await fetchEmployerAccessState();
    if (state.state === "needs_company" && (await userHasStaffMembership())) {
      return { state: "active" };
    }
    return state;
  } catch {
    if (await userHasStaffMembership()) {
      return { state: "active" };
    }
    return { state: "needs_company" };
  }
}

export function EmployerAccessGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const [access, setAccess] = useState<EmployerAccessState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const state = await loadEmployerAccessState();
        if (cancelled) return;
        setAccess(state);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  useEffect(() => {
    if (loading || !access) return;
    const path = pathWithoutLocale(location.pathname);

    if (access.state === "active") {
      if (path === "/employer/pending-approval") {
        navigate(getLocalizedPath("/employer/home", language), { replace: true });
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
