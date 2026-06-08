import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Clock } from "lucide-react";
import {
  EMPLOYER_ACCESS_POLL_MS,
  EMPLOYER_ACTIVE_LANDING_PATH,
  resolveEmployerDashboardAccess,
} from "@/api/employer/employerAccessResolver";
import {
  fetchMyEmployerJoinRequest,
  type EmployerJoinRequest,
} from "@/api/employer/employerJoinRequests";
import { getLocalizedPath } from "@/utils/localeUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

export default function EmployerPendingApprovalPage() {
  const { language } = useLanguage();
  const [request, setRequest] = useState<EmployerJoinRequest | null>(null);

  useEffect(() => {
    let cancelled = false;

    const goToJobs = () => {
      toast.success("Your company access was approved.");
      window.location.assign(
        getLocalizedPath(EMPLOYER_ACTIVE_LANDING_PATH, language),
      );
    };

    const poll = async () => {
      try {
        const access = await resolveEmployerDashboardAccess();
        if (cancelled) return;

        if (access.state === "active") {
          goToJobs();
          return;
        }

        if (access.state === "pending" && access.request) {
          setRequest(access.request);
          return;
        }

        const row = await fetchMyEmployerJoinRequest();
        if (cancelled) return;
        setRequest(row);
        if (row?.status === "approved") {
          goToJobs();
        }
      } catch {
        /* keep waiting UI */
      }
    };

    void poll();
    const id = window.setInterval(poll, EMPLOYER_ACCESS_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [language]);

  const companyLabel = request?.company_name?.trim() || "your selected company";

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto pt-8 pb-24 px-4">
        <Card className="border-0 rounded-3xl">
          <CardHeader className="p-6 pb-2">
            <div className="flex items-start gap-3">
              <Clock className="h-8 w-8 text-breneo-blue shrink-0" />
              <div>
                <h1 className="text-lg font-bold">Waiting for approval</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Your request to join {companyLabel} was sent to the company
                  admin. You will get access once they approve you.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 text-sm text-muted-foreground">
            <p>
              This page refreshes automatically. You can also check back later
              from your email once an admin accepts your request.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
