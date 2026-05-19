import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import { BreneoLogo } from "@/components/common/BreneoLogo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { EmployerCompanyJoinPanel } from "@/components/employer/EmployerCompanyJoinPanel";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getLocalizedPath } from "@/utils/localeUtils";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import {
  extractBreneoUserIdFromEmployerProfileRaw,
  extractBreneoUserIdFromJwt,
} from "@/api/employer/profile";
import { resolveEmployerAccessFromSession } from "@/api/employer/employerAccess";

export default function EmployerJoinCompanyPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [breneoUserId, setBreneoUserId] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
        if (access.state === "pending_approval") {
          navigate(getLocalizedPath("/employer/pending-approval", language), {
            replace: true,
          });
          return;
        }
        const uid =
          extractBreneoUserIdFromEmployerProfileRaw(profileRaw) ||
          extractBreneoUserIdFromJwt() ||
          "";
        setBreneoUserId(uid);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [language, navigate, user?.email]);

  const goPending = () => {
    navigate(getLocalizedPath("/employer/pending-approval", language));
  };

  const goJobs = () => {
    navigate(getLocalizedPath("/employer/jobs", language));
  };

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
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Building2 className="h-14 w-14" strokeWidth={1.25} />
        </div>
        <h1 className="text-2xl font-semibold text-center mb-2">
          Join your company
        </h1>
        <p className="text-muted-foreground text-center max-w-sm mb-8 text-sm">
          Search for your company on the job directory or create a new one to
          start posting jobs.
        </p>
        {breneoUserId ? (
          <EmployerCompanyJoinPanel
            breneoUserId={breneoUserId}
            onJoined={goJobs}
            onRequestSubmitted={goPending}
          />
        ) : (
          <p className="text-sm text-destructive text-center">
            Could not load your account. Try signing in again.
          </p>
        )}
      </main>
    </div>
  );
}
