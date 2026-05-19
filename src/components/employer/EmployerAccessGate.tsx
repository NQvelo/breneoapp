import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  resolveEmployerAccessFromSession,
  type EmployerAccessSnapshot,
} from "@/api/employer/employerAccess";
import { getLocalizedPath } from "@/utils/localeUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";

type Props = { children: React.ReactNode };

/**
 * Redirects employers without company membership to join / pending flows.
 */
export function EmployerAccessGate({ children }: Props) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const location = useLocation();
  const [snapshot, setSnapshot] = useState<EmployerAccessSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
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
        if (!cancelled) setSnapshot(access);
      } catch {
        if (!cancelled) {
          setSnapshot({
            state: "needs_company",
            companyName: "",
            pendingRequest: null,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.email, user?.id, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  const joinPath = getLocalizedPath("/employer/join-company", language);
  const pendingPath = getLocalizedPath("/employer/pending-approval", language);

  if (snapshot?.state === "needs_company") {
    return <Navigate to={joinPath} replace />;
  }
  if (snapshot?.state === "pending_approval") {
    return <Navigate to={pendingPath} replace />;
  }

  return <>{children}</>;
}
