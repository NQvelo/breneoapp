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
import { CompanyLogo } from "@/components/jobs/CompanyLogo";

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

function InsertionMarker() {
  return (
    <div aria-hidden className="relative z-10 my-1 h-1 rounded-full bg-breneo-blue shadow-[0_0_10px_rgba(59,130,246,0.65)]">
      <span className="absolute -left-1 -top-1.5 h-4 w-4 rounded-full border-2 border-white bg-breneo-blue shadow dark:border-[#242424]" />
    </div>
  );
}

const columns: Array<{ id: JobStatus; label: string; dot: string; card: string; chip: string }> = [
  {
    id: "saved",
    label: "Saved",
    dot: "bg-gray-400",
    card: "bg-gray-100 dark:bg-[#303030]",
    chip: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
  },
  {
    id: "applied",
    label: "Applied",
    dot: "bg-sky-500",
    card: "bg-sky-50 dark:bg-sky-950/40",
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-200",
  },
  {
    id: "review",
    label: "Review",
    dot: "bg-violet-500",
    card: "bg-violet-50 dark:bg-violet-950/40",
    chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-200",
  },
  {
    id: "interview",
    label: "Interview",
    dot: "bg-amber-500",
    card: "bg-amber-50 dark:bg-amber-950/40",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200",
  },
  {
    id: "done",
    label: "Done",
    dot: "bg-emerald-500",
    card: "bg-emerald-50 dark:bg-emerald-950/40",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200",
  },
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
  const [manualOrders, setManualOrders] = useState<
    Partial<Record<JobStatus, string[]>>
  >({});
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const storageKey = `job-management-statuses:${user?.id ?? "guest"}`;
  const orderStorageKey = `${storageKey}:order`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      setManualStatuses(stored ? (JSON.parse(stored) as Record<string, JobStatus>) : {});
    } catch {
      setManualStatuses({});
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(orderStorageKey);
      setManualOrders(
        stored ? (JSON.parse(stored) as Partial<Record<JobStatus, string[]>>) : {},
      );
    } catch {
      setManualOrders({});
    }
  }, [orderStorageKey]);

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

  function getOrderedJobs(status: JobStatus) {
    const order = manualOrders[status] ?? [];
    return jobs
      .filter((job) => job.status === status)
      .sort((first, second) => {
        const firstIndex = order.indexOf(first.id);
        const secondIndex = order.indexOf(second.id);
        if (firstIndex < 0 && secondIndex < 0) return 0;
        if (firstIndex < 0) return 1;
        if (secondIndex < 0) return -1;
        return firstIndex - secondIndex;
      });
  }

  function moveJob(jobId: string, status: JobStatus, beforeId: string | null) {
    const nextStatuses = { ...manualStatuses, [jobId]: status };
    const nextOrders = { ...manualOrders };
    for (const column of columns) {
      nextOrders[column.id] = getOrderedJobs(column.id)
        .filter((job) => job.id !== jobId)
        .map((job) => job.id);
    }
    const destinationOrder = [...(nextOrders[status] ?? [])];
    const insertionIndex = beforeId ? destinationOrder.indexOf(beforeId) : -1;
    destinationOrder.splice(
      insertionIndex < 0 ? destinationOrder.length : insertionIndex,
      0,
      jobId,
    );
    nextOrders[status] = destinationOrder;
    setManualStatuses(nextStatuses);
    setManualOrders(nextOrders);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextStatuses));
      localStorage.setItem(orderStorageKey, JSON.stringify(nextOrders));
    } catch {
      // Ignore storage restrictions; the board still updates for this session.
    }
  }

  const touchDrag = useLongPressDrag(isMobile, (jobId, columnId, beforeId) => {
    const column = columns.find((item) => item.id === columnId);
    if (column) moveJob(jobId, column.id, beforeId);
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
          const columnJobs = getOrderedJobs(column.id);
          return (
            <section
              key={column.id}
              data-management-column={column.id}
              className={cn(
                "flex-1 min-h-[360px] bg-white p-3 dark:bg-[#242424]",
                "border-r-[8px] border-breneo-lightgray last:border-r-0 dark:border-r-[#181818]",
                isMobile ? "w-[78vw] min-w-[78vw] max-w-[78vw]" : "min-w-[320px]",
              )}
              onDragOver={(event) => {
                event.preventDefault();
                if (draggingId) touchDrag.onNativeDragOver(event, column.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (draggingId) {
                  const position = touchDrag.dropPosition;
                  moveJob(
                    draggingId,
                    column.id,
                    position?.columnId === column.id
                      ? position.beforeId
                      : null,
                  );
                }
                setDraggingId(null);
                touchDrag.onNativeDragEnd();
              }}
            >
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className={cn("h-2.5 w-2.5 rounded-full", column.dot)} />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{column.label}</h3>
                <span className="text-sm text-gray-500">{columnJobs.length}</span>
              </div>
              <div className="space-y-3">
                {columnJobs.map((job) => {
                  const isTouchDragging = touchDrag.draggingId === job.id;
                  return (
                    <React.Fragment key={job.id}>
                      {touchDrag.dropPosition?.columnId === column.id &&
                      touchDrag.dropPosition.beforeId === job.id ? (
                        <InsertionMarker />
                      ) : null}
                      <article
                        data-long-press-drag
                        data-management-item={job.id}
                        draggable={!isMobile}
                        onDragStart={(event) => {
                          touchDrag.onNativeDragStart(event, job.id);
                          setDraggingId(job.id);
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          touchDrag.onNativeDragEnd();
                        }}
                        onTouchStart={(event) =>
                          touchDrag.onTouchStart(event, job.id)
                        }
                        onTouchMove={touchDrag.onTouchMove}
                        onTouchEnd={touchDrag.onTouchEnd}
                        onTouchCancel={touchDrag.onTouchEnd}
                        onContextMenu={(event) => {
                          if (isMobile) event.preventDefault();
                        }}
                        onClickCapture={touchDrag.onClickCapture}
                        onClick={() =>
                          navigate(`/jobs/${encodeURIComponent(job.id)}`)
                        }
                        style={
                          isTouchDragging && touchDrag.dragPosition
                            ? {
                                position: "fixed",
                                left: touchDrag.dragPosition.left,
                                top: touchDrag.dragPosition.top,
                                width: touchDrag.dragPosition.width,
                                zIndex: 100,
                                pointerEvents: "none",
                              }
                            : undefined
                        }
                        className={cn(
                          "cursor-pointer select-none rounded-2xl p-4 transition-[transform,opacity,box-shadow] duration-200 ease-out",
                          column.card,
                          isTouchDragging &&
                            "cursor-grabbing shadow-2xl ring-2 ring-breneo-blue/50 scale-[1.03] rotate-1 transition-[transform,box-shadow] duration-150 ease-out",
                          (draggingId === job.id || isTouchDragging) &&
                            "opacity-90",
                          touchDrag.nativeDraggingId === job.id &&
                            "cursor-grabbing scale-[0.98] opacity-40 shadow-lg",
                        )}
                      >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-breneo-blue/10">
                          <CompanyLogo
                            src={job.logo}
                            companyName={job.company}
                            className="h-10 w-10 rounded-lg"
                          />
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
                            <span className={cn("rounded-[10px] px-2.5 py-1 text-xs font-medium", column.chip)}>
                              Applied: {job.appliedAt}
                            </span>
                          ) : null}
                          {job.employerViewedCv ? (
                            <span className={cn("rounded-[10px] px-2.5 py-1 text-xs font-medium", column.chip)}>
                              CV view: {Math.max(job.employerCvViewCount ?? 1, 1)}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      </article>
                    </React.Fragment>
                  );
                })}
                {touchDrag.dropPosition?.columnId === column.id &&
                touchDrag.dropPosition.beforeId === null ? (
                  <InsertionMarker />
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
