import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { EmployerCompanySearchField } from "@/components/employer/EmployerCompanySearchField";
import {
  parseAggregatorCompanyPk,
  type AggregatorCompany,
} from "@/api/employer/aggregatorBffApi";
import {
  createEmployerJoinRequest,
  fetchEmployerAccessState,
} from "@/api/employer/employerJoinRequests";
import { getLocalizedPath } from "@/utils/localeUtils";
import { useLanguage } from "@/contexts/LanguageContext";

export default function EmployerJoinCompanyPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<AggregatorCompany | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accountError, setAccountError] = useState<string | null>(null);

  const resetModal = useCallback(() => {
    setSelected(null);
    setCompanyName("");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCheckingAccess(true);
      setAccountError(null);
      try {
        const access = await fetchEmployerAccessState();
        if (cancelled) return;
        if (access.state === "active") {
          navigate(getLocalizedPath("/employer/home", language), {
            replace: true,
          });
          return;
        }
        if (access.state === "pending") {
          navigate(getLocalizedPath("/employer/pending-approval", language), {
            replace: true,
          });
        }
      } catch {
        if (!cancelled) {
          setAccountError("Could not load your account. Try signing in again.");
        }
      } finally {
        if (!cancelled) setCheckingAccess(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, language]);

  const handleSubmit = async () => {
    if (!selected?.id) {
      toast.error("Select a company from the directory first.");
      return;
    }
    const pk = parseAggregatorCompanyPk(selected.id);
    if (pk == null) {
      toast.error("Invalid company. Try another listing.");
      return;
    }
    const name =
      String(selected.name ?? companyName).trim() || `Company ${pk}`;
    setSubmitting(true);
    try {
      await createEmployerJoinRequest({ companyId: pk, companyName: name });
      toast.success(
        "Join request sent. Waiting for a company admin to approve.",
      );
      setModalOpen(false);
      resetModal();
      navigate(getLocalizedPath("/employer/pending-approval", language), {
        replace: true,
      });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not submit join request.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-0 rounded-3xl shadow-sm">
          <CardContent className="pt-10 pb-10 px-6 text-center space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-950/50">
              <Building2 className="h-8 w-8 text-breneo-blue" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-foreground">
                Join your company
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Search for your company on the job directory or create a new one
                to start posting jobs.
              </p>
            </div>
            <Button
              type="button"
              className="w-full max-w-xs mx-auto"
              disabled={checkingAccess || Boolean(accountError)}
              onClick={() => setModalOpen(true)}
            >
              Join company
            </Button>
            {accountError ? (
              <p className="text-sm text-destructive">{accountError}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) resetModal();
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Find your company</DialogTitle>
            <DialogDescription>
              Search the job directory and select your employer. A company admin
              must approve your request before you can post jobs.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <EmployerCompanySearchField
              existingCompaniesOnly
              disabled={submitting}
              selected={selected}
              onSelectExisting={(c) => {
                setSelected(c);
                if (c?.name) setCompanyName(String(c.name));
                else setCompanyName("");
              }}
              companyName={companyName}
              onCompanyNameChange={setCompanyName}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={submitting || !selected}
              onClick={() => void handleSubmit()}
            >
              {submitting ? "Sending request…" : "Request to join"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
