import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Users } from "lucide-react";
import {
  fetchEmployerJobApplicants,
  type JobApplicant,
} from "@/api/employer/jobApplicantsApi";
import {
  applicationUserDisplayName,
  applicationUserEmail,
} from "@/api/jobs/applicationUserFields";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EmployerJobApplicantsPanelProps {
  jobId: string;
}

function formatAppliedDate(value: string | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function EmployerJobApplicantsPanel({
  jobId,
}: EmployerJobApplicantsPanelProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["employerJobApplicants", jobId],
    queryFn: () => fetchEmployerJobApplicants(jobId),
    enabled: Boolean(jobId),
  });

  const applicants = data ?? [];

  return (
    <Card className="border border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Users className="h-5 w-5" />
          Applicants
          {!isLoading ? (
            <span className="text-sm font-normal text-muted-foreground">
              ({applicants.length})
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading applicants…
          </div>
        ) : null}
        {error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : null}
        {!isLoading && !error && applicants.length === 0 ? (
          <p className="text-sm text-muted-foreground">No applicants yet.</p>
        ) : null}
        {!isLoading && !error && applicants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-muted-foreground dark:border-gray-800">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 pr-4 font-medium">Applied</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {applicants.map((a, index) => (
                  <ApplicantTableRow
                    key={applicantKey(a, index)}
                    applicant={a}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
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

function ApplicantTableRow({ applicant }: { applicant: JobApplicant }) {
  const name = applicationUserDisplayName(applicant);
  const email = applicationUserEmail(applicant);
  const when = formatAppliedDate(
    typeof applicant.applied_at === "string" ? applicant.applied_at : undefined,
  );
  const status =
    typeof applicant.status === "string" && applicant.status.trim()
      ? applicant.status.replace(/_/g, " ")
      : "—";

  return (
    <tr>
      <td className="py-3 pr-4 font-medium">
        {name || (applicant.external_user_id != null ? String(applicant.external_user_id) : "—")}
      </td>
      <td className="py-3 pr-4 text-muted-foreground">{email || "—"}</td>
      <td className="py-3 pr-4 text-muted-foreground">{when}</td>
      <td className="py-3 capitalize text-muted-foreground">{status}</td>
    </tr>
  );
}
