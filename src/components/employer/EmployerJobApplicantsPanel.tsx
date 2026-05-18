import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  fetchEmployerJobApplicants,
  type JobApplicant,
} from "@/api/employer/jobApplicantsApi";
import type { EmployerJob } from "@/api/employer/jobsApi";
import type { PublicUserProfile } from "@/api/profile/publicUserProfileTypes";
import {
  applicationUserAvatarFallback,
  applicationUserDisplayName,
  applicationUserEmail,
  applicationUserProfileImage,
} from "@/api/jobs/applicationUserFields";
import OptimizedAvatar from "@/components/ui/OptimizedAvatar";
import { applicantUserId } from "@/utils/applicantUserId";
import { applicantMatchPercentFromRecord } from "@/utils/applicantJobMatch";
import { ApplicantProfileSheet } from "@/components/profile/public/ApplicantProfileSheet";
import { JobMatchIndicator } from "@/components/jobs/JobMatchIndicator";
import { useApplicantMatchPercents } from "@/hooks/useApplicantMatchPercents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EmployerJobApplicantsPanelProps {
  jobId: string;
  job?: EmployerJob | null;
}

function formatAppliedDate(value: string | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function EmployerJobApplicantsPanel({
  jobId,
  job = null,
}: EmployerJobApplicantsPanelProps) {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedApplicantName, setSelectedApplicantName] = useState("");
  const [selectedMatchPercent, setSelectedMatchPercent] = useState<
    number | null
  >(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["employerJobApplicants", jobId],
    queryFn: () => fetchEmployerJobApplicants(jobId),
    enabled: Boolean(jobId),
  });

  const applicants = data ?? [];
  const { matchByUserId, profileByUserId, isLoading: matchPercentsLoading } =
    useApplicantMatchPercents(job, applicants);

  const openApplicantProfile = (applicant: JobApplicant) => {
    const userId = applicantUserId(applicant);
    if (userId == null) {
      toast.error("This applicant has no linked Breneo profile id.");
      return;
    }
    setSelectedUserId(userId);
    setSelectedApplicantName(applicationUserDisplayName(applicant));
    setSelectedMatchPercent(resolveListMatchPercent(applicant, matchByUserId));
    setProfileOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="px-4 py-3 my-0 border-b-0">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            Applicants
            {!isLoading ? (
              <span className="text-sm font-normal text-muted-foreground">
                ({applicants.length})
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading applicants…
            </div>
          ) : null}
          {error ? (
            <p className="text-sm text-destructive px-1">
              {(error as Error).message}
            </p>
          ) : null}
          {!isLoading && !error && applicants.length === 0 ? (
            <p className="text-sm text-muted-foreground px-1">
              No applicants yet.
            </p>
          ) : null}
          {!isLoading && !error && applicants.length > 0 ? (
            <ul className="space-y-1">
              {applicants.map((a, index) => (
                <ApplicantListItem
                  key={applicantKey(a, index)}
                  applicant={a}
                  profileImage={resolveApplicantProfileImage(a, profileByUserId)}
                  matchPercentage={resolveListMatchPercent(a, matchByUserId)}
                  matchLoading={
                    matchPercentsLoading &&
                    applicantMatchPercentFromRecord(a) == null &&
                    applicantUserId(a) != null
                  }
                  onOpenProfile={() => openApplicantProfile(a)}
                />
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <ApplicantProfileSheet
        userId={selectedUserId}
        job={job}
        open={profileOpen}
        onOpenChange={setProfileOpen}
        applicantName={selectedApplicantName}
        matchPercentage={selectedMatchPercent}
        matchLoading={
          matchPercentsLoading &&
          selectedMatchPercent == null &&
          selectedUserId != null
        }
      />
    </>
  );
}

function resolveApplicantProfileImage(
  applicant: JobApplicant,
  profileByUserId: Map<number, PublicUserProfile>,
): string {
  const fromRecord = applicationUserProfileImage(applicant);
  if (fromRecord) return fromRecord;
  const userId = applicantUserId(applicant);
  if (userId == null) return "";
  const fromProfile = profileByUserId.get(userId)?.profile_image;
  return typeof fromProfile === "string" ? fromProfile.trim() : "";
}

function resolveListMatchPercent(
  applicant: JobApplicant,
  matchByUserId: Map<number, number | null>,
): number | null {
  const fromApi = applicantMatchPercentFromRecord(applicant);
  if (fromApi != null) return fromApi;
  const userId = applicantUserId(applicant);
  if (userId == null) return null;
  return matchByUserId.get(userId) ?? null;
}

function applicantKey(applicant: JobApplicant, index: number): string {
  return String(
    applicant.id ??
      applicant.external_user_id ??
      applicant.external_user_email ??
      applicant.email ??
      index,
  );
}

function ApplicantListItem({
  applicant,
  profileImage,
  matchPercentage,
  matchLoading,
  onOpenProfile,
}: {
  applicant: JobApplicant;
  profileImage: string;
  matchPercentage: number | null;
  matchLoading: boolean;
  onOpenProfile: () => void;
}) {
  const name = applicationUserDisplayName(applicant);
  const email = applicationUserEmail(applicant);
  const avatarFallback = applicationUserAvatarFallback(applicant);
  const when = formatAppliedDate(
    typeof applicant.applied_at === "string" ? applicant.applied_at : undefined,
  );
  const status =
    typeof applicant.status === "string" && applicant.status.trim()
      ? applicant.status.replace(/_/g, " ")
      : "—";
  const hasProfile = applicantUserId(applicant) != null;

  const matchIndicator = matchLoading ? (
    <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
  ) : (
    <JobMatchIndicator
      matchPercentage={matchPercentage ?? undefined}
      size={40}
    />
  );

  const dateStatus = (
    <>
      <span className="shrink-0">{when}</span>
      <span className="capitalize shrink-0">{status}</span>
    </>
  );

  return (
    <li>
      <button
        type="button"
        disabled={!hasProfile}
        onClick={hasProfile ? onOpenProfile : undefined}
        className={cn(
          "w-full text-left rounded-xl px-3 py-3 transition-colors",
          "bg-gray-50 dark:bg-gray-800/40",
          hasProfile &&
            "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/55",
          !hasProfile && "cursor-default opacity-90",
        )}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <OptimizedAvatar
              src={profileImage.trim() || undefined}
              alt={name || "Applicant"}
              fallback={avatarFallback}
              size="md"
              className="h-10 w-10 shrink-0 rounded-full"
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {name ||
                  (applicant.external_user_id != null
                    ? String(applicant.external_user_id)
                    : "—")}
              </p>
              {email ? (
                <p className="text-sm text-muted-foreground truncate">
                  {email}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 sm:hidden">
            {matchIndicator}
            <div className="flex items-center gap-x-3 text-sm text-muted-foreground">
              {dateStatus}
            </div>
          </div>
          <div className="hidden sm:flex flex-1 items-center justify-center gap-x-3 text-sm text-muted-foreground min-w-0">
            {dateStatus}
          </div>
          <div className="hidden sm:flex shrink-0 items-center">
            {matchIndicator}
          </div>
        </div>
      </button>
    </li>
  );
}
