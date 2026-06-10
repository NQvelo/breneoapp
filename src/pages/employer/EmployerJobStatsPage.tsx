import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Briefcase,
  Loader2,
  MapPin,
  Pencil,
  Clock,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchEmployerJobById,
  type EmployerJob,
  type EmployerJobSource,
} from "@/api/employer/jobsApi";
import { Badge } from "@/components/ui/badge";
import { resolveEmployerJobRequiredSkills } from "@/utils/employerJobToJobDetail";
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

function workModeLabel(job: EmployerJob): string {
  if (job.remote) return "Remote";
  if (job.work_mode?.trim()) {
    const m = job.work_mode.toLowerCase();
    if (m === "remote") return "Remote";
    if (m === "hybrid") return "Hybrid";
    if (m === "on-site" || m === "onsite") return "On-site";
    return job.work_mode;
  }
  if (!job.employment_type || job.employment_type === "—") return "On-site";
  return job.employment_type;
}

export default function EmployerJobStatsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const source = (searchParams.get("source") || "aggregator") as EmployerJobSource;

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
      getLocalizedPath(
        `/employer/jobs/edit/${id}?source=${source}`,
        language,
      ),
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
              <CardHeader className="pb-3">
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
                    <CardTitle className="text-xl md:text-2xl font-bold">
                      {job.title || "Untitled"}
                    </CardTitle>
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
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {job.location || "Location not specified"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 shrink-0" />
                    {workModeLabel(job)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4 shrink-0" />
                    {relativePosted(job.created_at)}
                  </span>
                  {job.salary && job.salary !== "—" ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Banknote className="h-4 w-4 shrink-0" />
                      {job.salary}
                    </span>
                  ) : null}
                </div>
                {job.employment_type && job.employment_type !== "—" ? (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Employment: </span>
                    {job.employment_type}
                  </p>
                ) : null}
                {requiredSkills.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Required skills
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {requiredSkills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="capitalize px-3 py-1.5 text-xs rounded-[10px] bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-700"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
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
