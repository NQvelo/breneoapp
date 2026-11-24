import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMobile } from "@/hooks/use-mobile";
import { useMyApplications } from "@/hooks/useMyApplications";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { fetchJobDetail } from "@/api/jobs/jobService";
import {
  jobIdFromApplication,
  type JobApplicationItem,
} from "@/api/jobs/jobApplicationsApi";
import { Briefcase, Loader2 } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useLongPressDrag } from "@/hooks/useLongPressDrag";

type JobStatus = "saved" | "applied" | "review" | "interview" | "done";

interface ManagementJob {
  id: string;
  title: string;
  company: string;
  location: string;
  logo?: string;
  appliedAt?: string;
  employerViewedCv?: boolean;
  employerCvViewCount?: number;
  status: JobStatus;
}

const columns: Array<{ id: JobStatus; label: string; dot: string; card: string }> = [
  { id: "saved", label: "Saved", dot: "bg-gray-400", card: "bg-gray-100 dark:bg-[#303030]" },
  { id: "applied", label: "Applied", dot: "bg-sky-500", card: "bg-sky-50 dark:bg-sky-950/40" },
  { id: "review", label: "Review", dot: "bg-violet-500", card: "bg-violet-50 dark:bg-violet-950/40" },
  { id: "interview", label: "Interview", dot: "bg-amber-500", card: "bg-amber-50 dark:bg-amber-950/40" },
  { id: "done", label: "Done", dot: "bg-emerald-500", card: "bg-emerald-50 dark:bg-emerald-950/40" },
];

function formatAppliedDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ProfileJobManagementView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMobile();
  const { data: myApps, isLoading: loadingApplications } = useMyApplications(
    Boolean(user?.id),
  );
  const [savedJobs, setSavedJobs] = useState<ManagementJob[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [manualStatuses, setManualStatuses] = useState<Record<string, JobStatus>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const storageKey = `job-management-statuses:${user?.id ?? "guest"}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      setManualStatuses(stored ? (JSON.parse(stored) as Record<string, JobStatus>) : {});
    } catch {
      setManualStatuses({});
    }
  }, [storageKey]);

  useEffect(() => {
    let cancelled = false;
    async function loadSavedJobs() {
      setLoadingSaved(true);
      if (!user?.id) {
        setSavedJobs([]);
        setLoadingSaved(false);
        return;
      }
      try {
        const profile = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
        const rawIds = (profile.data as { saved_jobs?: unknown[] } | undefined)?.saved_jobs;
        const ids = Array.isArray(rawIds)
          ? rawIds
              .map((item) => {
                if (typeof item === "string" || typeof item === "number") return String(item);
                if (item && typeof item === "object") {
                  const object = item as Record<string, unknown>;
                  return object.id != null
                    ? String(object.id)
                    : object.job_id != null
                      ? String(object.job_id)
                      : null;
                }
                return null;
              })
              .filter((id): id is string => Boolean(id))
          : [];

        const jobs = await Promise.all(
          ids.map(async (id): Promise<ManagementJob | null> => {
            try {
              const detail = await fetchJobDetail(id);
              if (!detail) return null;
              const title = String(detail.title || detail.job_title || detail.position || "Untitled Position");
              const company =
                String(
                  detail.company_name ||
                    detail.employer_name ||
                    (typeof detail.company === "string" ? detail.company : "") ||
                    "Unknown Company",
                );
              const location = String(
                detail.job_location ||
                  detail.location ||
                  [detail.job_city, detail.job_state, detail.job_country].filter(Boolean).join(", ") ||
                  "Location not specified",
              );
              const logo =
                (detail.employer_logo as string | undefined) ||
                (detail.company_logo as string | undefined) ||
                (detail.logo_url as string | undefined);
              return { id, title, company, location, logo, status: "saved" };
            } catch {
              return null;
            }
          }),
        );
        if (!cancelled) setSavedJobs(jobs.filter((job): job is ManagementJob => Boolean(job)));
      } catch {
        if (!cancelled) setSavedJobs([]);
      } finally {
        if (!cancelled) setLoadingSaved(false);
      }
    }
    loadSavedJobs();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const appliedJobs = useMemo(() => {
    return (myApps?.applications ?? []).map((application: JobApplicationItem) => {
      const id = jobIdFromApplication(application);
      const job = application.job;
      return {
        id,
        title: String(job?.title || "Job application"),
        company: String(job?.company_name || "Unknown Company"),
        location: String(job?.location || "Location not specified"),
        logo:
          (typeof job?.logo === "string" && job.logo) ||
          (typeof job?.logo_upload === "string" && job.logo_upload) ||
          (typeof job?.company_logo === "string" && job.company_logo) ||
          undefined,
        appliedAt: formatAppliedDate(
          typeof application.applied_at === "string" ? application.applied_at : undefined,
        ),
        employerViewedCv: application.employer_viewed_cv === true,
        employerCvViewCount:
          typeof application.employer_cv_view_count === "number"
            ? application.employer_cv_view_count
            : undefined,
        status: application.employer_viewed_cv === true ? ("review" as const) : ("applied" as const),
      } satisfies ManagementJob;
    }).filter((job) => Boolean(job.id));
  }, [myApps]);

  const jobs = useMemo(() => {
    const merged = new Map<string, ManagementJob>();
    for (const job of savedJobs) merged.set(job.id, job);
    for (const job of appliedJobs) {
      const saved = merged.get(job.id);
      merged.set(job.id, { ...saved, ...job });
    }
    return Array.from(merged.values()).map((job) => {
      const manual = manualStatuses[job.id];
      if (manual) return { ...job, status: manual };
      return job;
    });
  }, [savedJobs, appliedJobs, manualStatuses]);

  function moveJob(jobId: string, status: JobStatus) {
    const next = { ...manualStatuses, [jobId]: status };
    setManualStatuses(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Ignore storage restrictions; the board still updates for this session.
    }
  }

  const touchDrag = useLongPressDrag(isMobile, (jobId, columnId) => {
    const column = columns.find((item) => item.id === columnId);
    if (column) moveJob(jobId, column.id);
  });

  if (loadingSaved || loadingApplications) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex overflow-x-auto rounded-3xl bg-white dark:bg-[#242424] scrollbar-hide">
        {columns.map((column) => {
          const columnJobs = jobs.filter((job) => job.status === column.id);
          return (
            <section
              key={column.id}
              data-management-column={column.id}
              className={cn(
                "flex-1 min-h-[360px] bg-white p-3 dark:bg-[#242424]",
                "border-r-[8px] border-breneo-lightgray last:border-r-0 dark:border-r-[#181818]",
                isMobile ? "w-[78vw] min-w-[78vw] max-w-[78vw]" : "min-w-[320px]",
                touchDrag.dropTarget === column.id && "ring-2 ring-inset ring-breneo-blue",
              )}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (draggingId) moveJob(draggingId, column.id);
                setDraggingId(null);
              }}
            >
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className={cn("h-2.5 w-2.5 rounded-full", column.dot)} />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{column.label}</h3>
                <span className="text-sm text-gray-500">{columnJobs.length}</span>
              </div>
              <div className="space-y-3">
                {columnJobs.map((job) => (
                  <article
                    key={job.id}
                    data-long-press-drag
                    draggable={!isMobile}
                    onDragStart={() => setDraggingId(job.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onTouchStart={(event) => touchDrag.onTouchStart(event, job.id)}
                    onTouchMove={touchDrag.onTouchMove}
                    onTouchEnd={touchDrag.onTouchEnd}
                    onTouchCancel={touchDrag.onTouchEnd}
                    onContextMenu={(event) => {
                      if (isMobile) event.preventDefault();
                    }}
                    onClickCapture={touchDrag.onClickCapture}
                    onClick={() => navigate(`/jobs/${encodeURIComponent(job.id)}`)}
                    className={cn(
                      "cursor-pointer select-none rounded-2xl p-4 transition-colors",
                      column.card,
                      (draggingId === job.id || touchDrag.draggingId === job.id) && "opacity-60",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-breneo-blue/10">
                        {job.logo ? (
                          <img src={job.logo} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Briefcase className="h-5 w-5 text-breneo-blue" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {job.company}
                        </p>
                        <p className="truncate text-xs text-gray-500">{job.location}</p>
                      </div>
                    </div>
                    <h4 className="mt-3 line-clamp-2 font-bold text-gray-900 dark:text-gray-100">
                      {job.title}
                    </h4>
                    {(job.appliedAt || job.employerViewedCv) ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {job.appliedAt ? (
                          <span className="rounded-[10px] bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                            Applied: {job.appliedAt}
                          </span>
                        ) : null}
                        {job.employerViewedCv ? (
                          <span className="rounded-[10px] bg-breneo-blue/10 px-2.5 py-1 text-xs font-medium text-breneo-blue">
                            CV view: {Math.max(job.employerCvViewCount ?? 1, 1)}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
