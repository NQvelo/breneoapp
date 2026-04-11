import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Briefcase, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  fetchEmployerJobsFiltered,
  type EmployerJob,
} from "@/api/employer/jobsApi";
import { resolveEmployerJobsCompanyFilter } from "@/api/employer/aggregatorBffApi";
import { getLocalizedPath } from "@/utils/localeUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { normalizeEmployerProfile } from "@/api/employer/profile";
import {
  deletePublishedEmployerJob,
  updatePublishedEmployerJob,
} from "@/api/employer/publishJob";

export default function EmployerJobsPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<EmployerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [linkedCompanyName, setLinkedCompanyName] = useState("");
  const statusFilter = (() => {
    const s = searchParams.get("status");
    if (s === "inactive") return "inactive";
    if (s === "active") return "active";
    return "all";
  })();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const prof = await apiClient
        .get(API_ENDPOINTS.EMPLOYER.PROFILE)
        .catch(() => null);
      const profileObj =
        prof?.data && typeof prof.data === "object"
          ? (prof.data as Record<string, unknown>)
          : null;
      const n = profileObj
        ? normalizeEmployerProfile(prof.data, user?.email)
        : null;
      const companyId =
        profileObj?.company_id != null
          ? String(profileObj.company_id)
          : profileObj?.company &&
              typeof profileObj.company === "object" &&
              (profileObj.company as Record<string, unknown>).id != null
            ? String((profileObj.company as Record<string, unknown>).id)
            : "";
      const companyName = (n?.company_name || "").trim();
      const {
        companyId: resolvedId,
        companyName: resolvedName,
        linkedDirectoryCompanyName,
      } = await resolveEmployerJobsCompanyFilter({
        breneoUserId: user?.id,
        employerProfileRaw: prof?.data,
        profileCompanyId: companyId,
        profileCompanyName: companyName,
      });
      setLinkedCompanyName(linkedDirectoryCompanyName);
      const list = await fetchEmployerJobsFiltered({
        companyId: resolvedId,
        companyName: resolvedName,
      });
      setJobs(list);
      setLoadError(null);
    } catch (e: unknown) {
      const err = e as Error & { status?: number };
      let msg = "Could not load jobs.";
      if (err.status === 403) {
        msg =
          "You are not allowed to view jobs for this company. Contact support if this is unexpected.";
      } else if (err.status === 404) {
        msg = "Jobs not found.";
      } else if (err.message?.trim()) {
        msg = err.message.trim();
      }
      setLoadError(msg);
      toast.error(msg, {
        action: {
          label: "Retry",
          onClick: () => {
            load();
          },
        },
      });
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [user?.email, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const activeJobs = useMemo(
    () => jobs.filter((job) => job.is_active !== false),
    [jobs],
  );
  const closedJobs = useMemo(
    () => jobs.filter((job) => job.is_active === false),
    [jobs],
  );

  const filteredJobs = useMemo(() => {
    const byStatus =
      statusFilter === "active"
        ? activeJobs
        : statusFilter === "inactive"
          ? closedJobs
          : jobs;
    return byStatus;
  }, [statusFilter, activeJobs, closedJobs, jobs]);

  const relativePosted = (value?: string) => {
    if (!value) return "Posted recently";
    const ms = Date.now() - new Date(value).getTime();
    if (!Number.isFinite(ms) || ms < 0) return "Posted recently";
    const hours = Math.floor(ms / (1000 * 60 * 60));
    if (hours < 1) return "Posted just now";
    if (hours < 24) return `Posted ${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    return `Posted ${days} day${days === 1 ? "" : "s"} ago`;
  };

  const modeLabel = (job: EmployerJob) => {
    if (job.remote) return "Remote";
    if (!job.employment_type || job.employment_type === "—") return "Onsite";
    return job.employment_type;
  };

  const handleOpenJobEdit = (job: EmployerJob) => {
    if (!job.id) return;
    navigate(
      getLocalizedPath(
        `/employer/jobs/edit/${job.id}?source=${job.source ?? "aggregator"}`,
        language,
      ),
    );
  };

  const handleSetJobActiveState = async (
    job: EmployerJob,
    isActive: boolean,
  ) => {
    if (!job.id) return;
    const alreadyActive = job.is_active !== false;
    if (alreadyActive === isActive) {
      toast.info(
        isActive
          ? "This job is already active."
          : "This job is already inactive.",
      );
      return;
    }
    try {
      await updatePublishedEmployerJob(String(job.id), { is_active: isActive });
      setJobs((prev) =>
        prev.map((row) =>
          String(row.id) === String(job.id)
            ? { ...row, is_active: isActive }
            : row,
        ),
      );
      toast.success(
        isActive ? "Job marked as active." : "Job marked as inactive.",
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update job.";
      toast.error(message);
    }
  };

  const handleDeleteJob = async (job: EmployerJob) => {
    if (!job.id) return;
    try {
      await deletePublishedEmployerJob(String(job.id));
      setJobs((prev) =>
        prev.filter((row) => String(row.id) !== String(job.id)),
      );
      toast.success("Job deleted.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete job.";
      toast.error(message);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 md:px-6 lg:px-8">
        <div className="flex flex-row items-center gap-2 sm:gap-4">
          <div className="flex min-w-0 flex-1 justify-start overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <motion.div
              layout
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 40,
                mass: 1,
              }}
              className="relative inline-flex h-12 w-max min-w-0 max-w-full flex-nowrap items-stretch justify-center gap-1 bg-white dark:bg-[#242424]/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-3xl p-1 shadow-sm"
            >
              {(
                [
                  {
                    value: "all" as const,
                    label: `All (${jobs.length})`,
                  },
                  {
                    value: "active" as const,
                    label: `Active (${activeJobs.length})`,
                  },
                  {
                    value: "inactive" as const,
                    label: `Inactive (${closedJobs.length})`,
                  },
                ] as const
              ).map((tab) => {
                const isActive = statusFilter === tab.value;
                const pillRadius = "rounded-3xl";
                return (
                  <motion.button
                    key={tab.value}
                    type="button"
                    layout
                    onClick={() =>
                      setSearchParams(
                        (prev) => {
                          const next = new URLSearchParams(prev);
                          if (tab.value === "all") next.delete("status");
                          else next.set("status", tab.value);
                          return next;
                        },
                        { replace: true },
                      )
                    }
                    className={cn(
                      "relative inline-flex h-full min-h-0 shrink-0 items-center justify-center px-3 text-sm transition-colors duration-200 outline-none sm:px-6",
                      pillRadius,
                      isActive
                        ? "text-sky-950 dark:text-gray-100 font-bold"
                        : "text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-200",
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="employer-jobs-status-pill"
                        className={cn(
                          "absolute inset-0 bg-sky-100 dark:bg-gray-700",
                          pillRadius,
                        )}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 40,
                          mass: 1,
                        }}
                      />
                    )}
                    <span className="relative z-10 whitespace-nowrap">
                      {tab.label}
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          </div>
          <div className="relative flex shrink-0">
            <Button
              onClick={() =>
                navigate(getLocalizedPath("/employer/jobs/add", language))
              }
              className="h-12 w-12 shrink-0 rounded-full p-0"
              aria-label="Add new job"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="space-y-0 p-0">
            {loadError ? (
              <p className="text-xs text-destructive pb-3">{loadError}</p>
            ) : null}
            {loading ? (
              <div className="p-12 text-center text-muted-foreground">
                Loading…
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="p-12 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No jobs posted yet</p>
                <Button
                  onClick={() =>
                    navigate(getLocalizedPath("/employer/jobs/add", language))
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Post a new job
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredJobs.map((job) => {
                  const rowCompany =
                    (job.company_name && job.company_name.trim()) ||
                    linkedCompanyName;
                  return (
                    <div
                      key={`${job.source ?? "breneo"}-${job.id || job.title}`}
                      className="group cursor-pointer transition-colors hover:bg-muted/30"
                      onClick={() => handleOpenJobEdit(job)}
                    >
                      <div className="flex gap-4 py-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-normal text-sm text-muted-foreground mb-1 line-clamp-1">
                            {rowCompany || "Company"}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3">
                            <h4 className="font-bold text-base md:text-lg line-clamp-2">
                              {job.title || "Untitled"}
                            </h4>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>{job.location || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{modeLabel(job)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Briefcase className="h-4 w-4" />
                              <span>{relativePosted(job.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex items-center">
                          {job.id ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-8 w-8 bg-[#EDEDEE] hover:bg-[#EDEDEE]/90 dark:bg-[#2D2D30] dark:hover:bg-[#3A3A3E] text-foreground"
                                  aria-label="Job actions"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleSetJobActiveState(
                                      job,
                                      job.is_active === false,
                                    )
                                  }
                                >
                                  {job.is_active === false
                                    ? "Make job active"
                                    : "Make job inactive"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteJob(job)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  Delete job
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
