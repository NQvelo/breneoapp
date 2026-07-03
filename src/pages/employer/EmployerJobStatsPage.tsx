import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MapPin, Pencil, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  fetchEmployerJobById,
  type EmployerJob,
  type EmployerJobSource,
} from "@/api/employer/jobsApi";
import { JobListingMetaBadges } from "@/components/jobs/JobListingMetaBadges";
import { resolveEmployerJobRequiredSkills } from "@/utils/employerJobToJobDetail";
import { formatJobSalaryWithLari } from "@/utils/jobSalaryFormat";
import {
  resolveJobEmploymentType,
  resolveJobWorkArrangement,
} from "@/utils/jobEmploymentDisplay";
import { EmployerJobApplicantsPanel } from "@/components/employer/EmployerJobApplicantsPanel";
import { getLocalizedPath } from "@/utils/localeUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

function relativePosted(value?: string): string {
  if (!value) return "Posted recently";
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "Posted recently";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return "Posted just now";
  if (hours < 24) return `Posted ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `Posted ${days} day${days === 1 ? "" : "s"} ago`;
}

export default function EmployerJobStatsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const source = (searchParams.get("source") ||
    "aggregator") as EmployerJobSource;

  const [job, setJob] = useState<EmployerJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (authLoading || !user) return;
    const id = String(jobId ?? "").trim();
    if (!id) {
      setLoadError("Missing job id.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const row = await fetchEmployerJobById(id);
      setJob(row);
      setLoadError(null);
    } catch (e: unknown) {
      const msg =
        e instanceof Error && e.message.trim()
          ? e.message.trim()
          : "Could not load job.";
      setLoadError(msg);
      setJob(null);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [authLoading, jobId, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    void load();
  }, [load, authLoading, user]);

  const requiredSkills = useMemo(
    () => (job ? resolveEmployerJobRequiredSkills(job) : []),
    [job],
  );

  const handleEdit = () => {
    const id = String(jobId ?? "").trim();
    if (!id) return;
    navigate(
      getLocalizedPath(`/employer/jobs/edit/${id}?source=${source}`, language),
    );
  };

  return (
    <>
      <div className="space-y-6 px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading job…
          </div>
        ) : loadError ? (
          <Card>
            <CardContent className="py-12 text-center text-destructive">
              {loadError}
            </CardContent>
          </Card>
        ) : job ? (
          <>
            <Card>
              <CardContent className="space-y-3 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p
                      className={
                        job.is_active !== false
                          ? "text-sm font-medium text-green-600 dark:text-green-400"
                          : "text-sm text-muted-foreground"
                      }
                    >
                      {job.is_active !== false ? "Active" : "Inactive"}
                    </p>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                      {job.title || "Untitled"}
                    </h1>
                  </div>
                  <Button
                    onClick={handleEdit}
                    disabled={!jobId}
                    size="sm"
                    className="shrink-0"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit job
                  </Button>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {job.location || "Location not specified"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4 shrink-0" />
                    {relativePosted(job.created_at)}
                  </span>
                </div>
                <JobListingMetaBadges
                  className="mt-0"
                  employmentType={resolveJobEmploymentType(job)}
                  workArrangement={resolveJobWorkArrangement(job)}
                  salary={formatJobSalaryWithLari(job.salary)}
                />
              </CardContent>
            </Card>

            {jobId ? (
              <EmployerJobApplicantsPanel jobId={jobId} job={job} />
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}
