import React from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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

interface CvViewNotificationsSectionProps {
  cvViews: ApplicantCvView[];
  isLoading?: boolean;
}

export function CvViewNotificationsSection({
  cvViews,
  isLoading = false,
}: CvViewNotificationsSectionProps) {
  const queryClient = useQueryClient();
  const pending = cvViews.filter(cvViewIsUnacknowledged);

  const acknowledgeMutation = useMutation({
    mutationFn: (cvViewId: string | number) => acknowledgeCvView(cvViewId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MY_CV_VIEWS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: MY_APPLICATIONS_QUERY_KEY });
    },
    onError: () => {
      toast.error("Could not acknowledge CV view.");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground border-b border-gray-200">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading CV view updates…
      </div>
    );
  }

  if (pending.length === 0) {
    return null;
  }

  return (
    <>
      {pending.map((view) => {
        const when = formatCvViewDate(cvViewLastViewedAt(view));
        const viewCount =
          typeof view.view_count === "number" && view.view_count > 1
            ? view.view_count
            : null;

        return (
          <div
            key={String(view.id)}
            className="flex items-start gap-4 p-4 bg-breneo-blue/5 border-b border-gray-200"
          >
            <div className="rounded-full p-2 bg-breneo-blue/10">
              <Eye className="h-5 w-5 text-breneo-blue" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap justify-between gap-2 items-start">
                <h4 className="font-medium text-gray-900">
                  Employer viewed your CV
                </h4>
                {when ? (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {when}
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {cvViewDisplayTitle(view)}
                {viewCount ? ` (${viewCount} views)` : ""}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-breneo-blue hover:text-breneo-blue"
                  disabled={acknowledgeMutation.isPending}
                  onClick={() => acknowledgeMutation.mutate(view.id)}
                >
                  {acknowledgeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-1" />
                  )}
                  Dismiss
                </Button>
                <Link
                  to="/cv-views"
                  className="text-sm font-medium text-breneo-blue hover:underline"
                >
                  View all CV activity
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
