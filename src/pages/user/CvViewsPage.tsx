import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useMyCvViews } from "@/hooks/useMyCvViews";
import { useMyApplications } from "@/hooks/useMyApplications";
import {
  acknowledgeCvView,
  cvViewDisplayTitle,
  cvViewIsUnacknowledged,
  cvViewLastViewedAt,
  formatCvViewDate,
  type ApplicantCvView,
} from "@/api/jobs/cvViewsApi";
import { MY_APPLICATIONS_QUERY_KEY } from "@/hooks/useMyApplications";
import { MY_CV_VIEWS_QUERY_KEY } from "@/hooks/useMyCvViews";
import {
  jobIdFromApplication,
  type JobApplicationItem,
} from "@/api/jobs/jobApplicationsApi";
import { Briefcase, CheckCircle, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";

type CvViewListItem =
  | { kind: "view"; view: ApplicantCvView }
  | { kind: "application"; application: JobApplicationItem };

function sortKey(item: CvViewListItem): number {
  if (item.kind === "view") {
    const raw = cvViewLastViewedAt(item.view);
    return raw ? new Date(raw).getTime() : 0;
  }
  const raw =
    typeof item.application.employer_first_viewed_at === "string"
      ? item.application.employer_first_viewed_at
      : typeof item.application.applied_at === "string"
        ? item.application.applied_at
        : "";
  return raw ? new Date(raw).getTime() : 0;
}

function jobIdFromItem(item: CvViewListItem): string {
  if (item.kind === "view") {
    const id = item.view.job_id;
    return id != null ? String(id) : "";
  }
  return jobIdFromApplication(item.application);
}

function mergeCvViewItems(
  cvViews: ApplicantCvView[],
  applications: JobApplicationItem[],
): CvViewListItem[] {
  const seenJobIds = new Set<string>();
  const items: CvViewListItem[] = [];

  for (const view of cvViews) {
    const jobId = view.job_id != null ? String(view.job_id).trim() : "";
    if (jobId) seenJobIds.add(jobId);
    items.push({ kind: "view", view });
  }

  for (const application of applications) {
    if (application.employer_viewed_cv !== true) continue;
    const jobId = jobIdFromApplication(application);
    if (!jobId || seenJobIds.has(jobId)) continue;
    seenJobIds.add(jobId);
    items.push({ kind: "application", application });
  }

  return items.sort((a, b) => sortKey(b) - sortKey(a));
}

export default function CvViewsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const enabled = Boolean(user?.id);

  const {
    data: cvViews = [],
    isLoading: loadingViews,
    error: viewsError,
  } = useMyCvViews(enabled);
  const { data: myApps, isLoading: loadingApps } = useMyApplications(enabled);

  const items = useMemo(
    () => mergeCvViewItems(cvViews, myApps?.applications ?? []),
    [cvViews, myApps?.applications],
  );

  const unacknowledgedCount = cvViews.filter(cvViewIsUnacknowledged).length;

  const acknowledgeMutation = useMutation({
    mutationFn: (cvViewId: string | number) => acknowledgeCvView(cvViewId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MY_CV_VIEWS_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: MY_APPLICATIONS_QUERY_KEY,
      });
    },
    onError: () => toast.error("Could not dismiss this update."),
  });

  const isLoading = loadingViews || loadingApps;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white dark:bg-[#242424] overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  CV views
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  See when employers opened your CV for jobs you applied to.
                </p>
              </div>
              {unacknowledgedCount > 0 ? (
                <Badge className="rounded-[10px] border-0 bg-breneo-blue/10 text-breneo-blue">
                  {unacknowledgedCount} new
                </Badge>
              ) : null}
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
              <p className="text-sm text-gray-500">Loading CV activity…</p>
            </div>
          ) : viewsError ? (
            <div className="p-8 text-center text-sm text-destructive">
              {(viewsError as Error).message || "Could not load CV views."}
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <Eye className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">No CV views yet</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                When an employer opens your profile for a job application, it
                will show up here.
              </p>
              <Button onClick={() => navigate("/jobs")} variant="default">
                Browse jobs
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {items.map((item) => (
                <CvViewRow
                  key={
                    item.kind === "view"
                      ? `view-${String(item.view.id)}`
                      : `app-${jobIdFromItem(item)}`
                  }
                  item={item}
                  onOpenJob={(jobId) =>
                    navigate(`/jobs/${encodeURIComponent(jobId)}`)
                  }
                  onAcknowledge={(id) => acknowledgeMutation.mutate(id)}
                  acknowledging={acknowledgeMutation.isPending}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function CvViewRow({
  item,
  onOpenJob,
  onAcknowledge,
  acknowledging,
}: {
  item: CvViewListItem;
  onOpenJob: (jobId: string) => void;
  onAcknowledge: (cvViewId: string | number) => void;
  acknowledging: boolean;
}) {
  const jobId = jobIdFromItem(item);

  if (item.kind === "view") {
    const view = item.view;
    const title = cvViewDisplayTitle(view);
    const lastViewed = formatCvViewDate(cvViewLastViewedAt(view));
    const firstViewed = formatCvViewDate(
      typeof view.first_viewed_at === "string"
        ? view.first_viewed_at
        : undefined,
    );
    const viewCount =
      typeof view.view_count === "number" && view.view_count > 0
        ? view.view_count
        : 1;
    const isNew = cvViewIsUnacknowledged(view);

    return (
      <li>
        <button
          type="button"
          className="w-full text-left px-4 md:px-6 py-4 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
          onClick={() => {
            if (jobId) onOpenJob(jobId);
          }}
          disabled={!jobId}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full p-2 bg-breneo-blue/10 shrink-0">
              <Eye className="h-5 w-5 text-breneo-blue" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {title}
                </p>
                {isNew ? (
                  <Badge className="rounded-[8px] border-0 bg-breneo-blue/10 text-breneo-blue text-[11px] px-2 py-0">
                    New
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Employer viewed your CV
                {viewCount > 1 ? ` · ${viewCount} times` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {lastViewed ? <span>Last viewed {lastViewed}</span> : null}
                {firstViewed && firstViewed !== lastViewed ? (
                  <span>First viewed {firstViewed}</span>
                ) : null}
              </div>
              {isNew ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-8 px-2 text-breneo-blue hover:text-breneo-blue"
                  disabled={acknowledging}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAcknowledge(view.id);
                  }}
                >
                  {acknowledging ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-1" />
                  )}
                  Mark as seen
                </Button>
              ) : null}
            </div>
          </div>
        </button>
      </li>
    );
  }

  const app = item.application;
  const job = app.job;
  const title =
    (job?.title && String(job.title)) ||
    (job?.company_name && String(job.company_name)) ||
    "Job application";
  const company =
    job?.company_name && String(job.company_name).trim()
      ? String(job.company_name)
      : "";
  const displayTitle = company ? `${company} · ${title}` : title;
  const viewedWhen = formatCvViewDate(
    typeof app.employer_first_viewed_at === "string"
      ? app.employer_first_viewed_at
      : undefined,
  );
  const viewCount =
    typeof app.employer_cv_view_count === "number" &&
    app.employer_cv_view_count > 0
      ? app.employer_cv_view_count
      : 1;

  return (
    <li>
      <button
        type="button"
        className="w-full text-left px-4 md:px-6 py-4 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
        onClick={() => {
          if (jobId) onOpenJob(jobId);
        }}
        disabled={!jobId}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full p-2 bg-breneo-blue/10 shrink-0">
            <Briefcase className="h-5 w-5 text-breneo-blue" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {displayTitle}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Employer viewed your CV
              {viewCount > 1 ? ` · ${viewCount} times` : ""}
            </p>
            {viewedWhen ? (
              <p className="mt-2 text-xs text-muted-foreground">
                First viewed {viewedWhen}
              </p>
            ) : null}
          </div>
        </div>
      </button>
    </li>
  );
}
