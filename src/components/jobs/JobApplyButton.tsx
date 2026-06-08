import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { toast } from "sonner";
import { TokenManager } from "@/api/auth/tokenManager";
import {
  applyToJob,
  AlreadyAppliedError,
  AppBffAuthError,
} from "@/api/jobs/jobApplicationsApi";
import {
  MY_APPLICATIONS_QUERY_KEY,
  useMyApplications,
} from "@/hooks/useMyApplications";
import { useTranslation } from "@/contexts/LanguageContext";

function jobIdIsApplied(
  jobId: string,
  appliedJobIds: ReadonlySet<string> | readonly string[] | undefined,
): boolean {
  if (!jobId || !appliedJobIds) return false;
  const key = String(jobId);
  if (appliedJobIds instanceof Set) return appliedJobIds.has(key);
  return appliedJobIds.some((id) => String(id) === key);
}

export interface JobApplyButtonProps {
  jobId: string;
  supportsInAppApply: boolean;
  appliedJobIds?: ReadonlySet<string> | readonly string[];
  externalApplyUrl?: string;
  userLoggedIn: boolean;
  className?: string;
  size?: ButtonProps["size"];
}

export function JobApplyButton({
  jobId,
  supportsInAppApply,
  appliedJobIds: appliedJobIdsProp,
  externalApplyUrl,
  userLoggedIn,
  className,
  size = "sm",
}: JobApplyButtonProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const t = useTranslation();

  const hasToken = userLoggedIn && Boolean(TokenManager.getAccessToken());

  const { data: myApps } = useMyApplications(
    supportsInAppApply && hasToken && !appliedJobIdsProp,
  );

  const appliedJobIds = appliedJobIdsProp ?? myApps?.appliedJobIds;
  const isApplied = useMemo(
    () => jobIdIsApplied(jobId, appliedJobIds),
    [jobId, appliedJobIds],
  );

  const invalidateApps = () => {
    void queryClient.invalidateQueries({ queryKey: MY_APPLICATIONS_QUERY_KEY });
  };

  const applyMutation = useMutation({
    mutationFn: () => applyToJob(jobId),
    onSuccess: () => {
      toast.success(t.jobs.applied);
      invalidateApps();
    },
    onError: (err: Error) => {
      if (err instanceof AlreadyAppliedError) {
        invalidateApps();
        return;
      }
      if (err instanceof AppBffAuthError) {
        navigate("/auth/login");
        return;
      }
      toast.error(err.message || "Could not apply");
    },
  });

  const handleInAppApply = () => {
    if (!userLoggedIn || !TokenManager.getAccessToken()) {
      navigate("/auth/login");
      return;
    }
    applyMutation.mutate();
  };

  const externalUrl = (externalApplyUrl ?? "").trim();

  if (externalUrl) {
    return (
      <Button size={size} className={className} asChild>
        <a href={externalUrl} target="_blank" rel="noopener noreferrer">
          {t.jobs.apply}
          <ExternalLink className="ml-1 h-3.5 w-3.5" aria-hidden />
        </a>
      </Button>
    );
  }

  if (!supportsInAppApply) {
    return (
      <Button size={size} disabled className={className}>
        {t.jobs.apply}
      </Button>
    );
  }

  if (!userLoggedIn) {
    return (
      <Button
        size={size}
        className={className}
        onClick={() => navigate("/auth/login")}
      >
        {t.jobs.apply}
      </Button>
    );
  }

  if (isApplied) {
    return (
      <Button
        size={size}
        variant="secondary"
        disabled
        className={className}
      >
        {t.jobs.applied}
      </Button>
    );
  }

  return (
    <Button
      size={size}
      className={className}
      disabled={applyMutation.isPending}
      onClick={handleInAppApply}
    >
      {applyMutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        t.jobs.apply
      )}
    </Button>
  );
}
