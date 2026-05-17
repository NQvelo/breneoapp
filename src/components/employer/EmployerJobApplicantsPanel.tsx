import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Users } from "lucide-react";
import {
  fetchEmployerJobApplicants,
  type JobApplicant,
} from "@/api/employer/jobApplicantsApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EmployerJobApplicantsPanelProps {
  jobId: string;
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
    <Card className="mt-8 border border-gray-200 dark:border-gray-800">
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
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {applicants.map((a, index) => (
              <ApplicantRow key={applicantKey(a, index)} applicant={a} />
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

function applicantKey(applicant: JobApplicant, index: number): string {
  return String(
    applicant.id ?? applicant.external_user_id ?? applicant.email ?? index,
  );
}

function ApplicantRow({ applicant }: { applicant: JobApplicant }) {
  const label =
    (typeof applicant.name === "string" && applicant.name.trim()) ||
    (typeof applicant.email === "string" && applicant.email.trim()) ||
    (applicant.external_user_id != null
      ? String(applicant.external_user_id)
      : "Applicant");
  const when =
    typeof applicant.applied_at === "string" ? applicant.applied_at : null;

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground">
        {applicant.status ? String(applicant.status) : null}
        {when ? ` · ${when}` : null}
      </span>
    </li>
  );
}