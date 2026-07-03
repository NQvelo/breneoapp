import React, { useEffect, useRef } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import type { EmployerJob } from "@/api/employer/jobsApi";
import { recordApplicantCvView } from "@/api/employer/jobApplicantsApi";
import { computeApplicantMatchPercent } from "@/utils/applicantJobMatch";
import { employerJobToJobDetail } from "@/utils/employerJobToJobDetail";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetHeaderCloseButton,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PublicUserProfileError,
  usePublicUserProfile,
} from "@/hooks/usePublicUserProfile";
import { PublicUserProfileView } from "@/components/profile/public/PublicUserProfileView";

interface ApplicantProfileSheetProps {
  userId: number | null;
  jobId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicantName?: string;
  job?: EmployerJob | null;
  matchPercentage?: number | null;
  matchLoading?: boolean;
  onCvViewRecorded?: () => void;
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-3xl" />
      <Skeleton className="h-32 w-full rounded-3xl" />
      <Skeleton className="h-32 w-full rounded-3xl" />
    </div>
  );
}

export function ApplicantProfileSheet({
  userId,
  jobId = null,
  open,
  onOpenChange,
  applicantName,
  job = null,
  matchPercentage: matchPercentageProp = null,
  matchLoading = false,
  onCvViewRecorded,
}: ApplicantProfileSheetProps) {
  const recordedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      recordedKeyRef.current = null;
      return;
    }
    const jid = String(jobId ?? job?.id ?? "").trim();
    if (!jid || userId == null) return;

    const sessionKey = `${jid}:${userId}`;
    if (recordedKeyRef.current === sessionKey) return;
    recordedKeyRef.current = sessionKey;

    let cancelled = false;
    void (async () => {
      try {
        await recordApplicantCvView(jid, userId);
        if (!cancelled) onCvViewRecorded?.();
      } catch (err) {
        console.warn("[ApplicantProfileSheet] CV view record failed:", err);
        if (!cancelled) recordedKeyRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, jobId, job?.id, userId, onCvViewRecorded]);

  const { data, isLoading, isError, error, refetch, isFetching } =
    usePublicUserProfile(open ? userId : null);

  const jobDetail = job ? employerJobToJobDetail(job) : null;
  const resolvedMatchPercent = React.useMemo(() => {
    if (matchPercentageProp != null) return matchPercentageProp;
    if (!data || !jobDetail) return null;
    try {
      return computeApplicantMatchPercent(jobDetail, data);
    } catch {
      return null;
    }
  }, [matchPercentageProp, data, jobDetail]);

  const showMatchLoading =
    matchLoading && resolvedMatchPercent == null && jobDetail != null;

  const is404 =
    error instanceof PublicUserProfileError && error.status === 404;

  const title =
    data != null
      ? `${data.first_name} ${data.last_name}`.trim() || "Applicant profile"
      : applicantName?.trim() || "Applicant profile";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="rightProfile"
        overlayClassName="backdrop-blur-sm bg-black/20 dark:bg-black/40"
        className="flex flex-col h-full overflow-hidden px-4 py-6 md:p-8 bg-white dark:bg-[#181818] w-full sm:max-w-none"
      >
        <SheetHeader className="bg-white dark:bg-[#181818] pb-3 shrink-0 border-b border-gray-200 dark:border-gray-700">
          <SheetTitle className="flex-1 min-w-0 text-left">{title}</SheetTitle>
          <SheetHeaderCloseButton onClose={() => onOpenChange(false)} />
        </SheetHeader>
        <div className="flex-1 overflow-y-auto min-h-0 -mx-1 px-1">
          {userId == null ? (
            <p className="text-sm text-muted-foreground">
              This applicant does not have a linked Breneo user id.
            </p>
          ) : isLoading ? (
            <ProfileSkeleton />
          ) : is404 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <AlertCircle className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">Applicant profile not found</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-sm text-destructive">
                {error?.message ?? "Could not load profile."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
                disabled={isFetching}
              >
                {isFetching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Retrying…
                  </>
                ) : (
                  "Retry"
                )}
              </Button>
            </div>
          ) : data ? (
            <PublicUserProfileView
              profile={data}
              matchPercentage={resolvedMatchPercent}
              matchLoading={showMatchLoading}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

