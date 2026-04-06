import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Edit,
  Briefcase,
  MapPin,
  Globe,
  GraduationCap,
  Clock3,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchEmployerJobsFiltered,
  type EmployerJob,
} from "@/api/employer/jobsApi";
import { getEmployerJobsApiDebugInfo } from "@/api/employer/employerJobsApiBase";
import { resolveEmployerJobsCompanyFilter } from "@/api/employer/aggregatorBffApi";
import { getLocalizedPath } from "@/utils/localeUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { normalizeEmployerProfile } from "@/api/employer/profile";

export default function EmployerJobsPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<EmployerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [linkedCompanyName, setLinkedCompanyName] = useState("");
  const [query, setQuery] = useState("");
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const shown = window.sessionStorage.getItem(
      "EMPLOYER_API_BASE_DEBUG_TOAST_SHOWN",
    );
    if (shown === "1") return;
    const info = getEmployerJobsApiDebugInfo();
    const modeLabel =
      info.mode === "same-origin-bff" ? "same-origin BFF" : "custom BFF";
    toast.info(`Employer API: ${info.baseUrl} (${modeLabel})`, {
      duration: 9000,
    });
    window.sessionStorage.setItem("EMPLOYER_API_BASE_DEBUG_TOAST_SHOWN", "1");
  }, []);

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
    const q = query.trim().toLowerCase();
    if (!q) return byStatus;
    return byStatus.filter((job) => {
      const title = (job.title || "").toLowerCase();
      const location = (job.location || "").toLowerCase();
      const company = (job.company_name || "").toLowerCase();
      return title.includes(q) || location.includes(q) || company.includes(q);
    });
  }, [statusFilter, activeJobs, closedJobs, jobs, query]);

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          {linkedCompanyName ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0" />
              <span>
                Showing jobs for{" "}
                <span className="text-foreground font-medium">
                  {linkedCompanyName}
                </span>
              </span>
            </p>
          ) : null}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
              <Tabs
                value={statusFilter}
                onValueChange={(value) =>
                  setSearchParams(
                    (prev) => {
                      const next = new URLSearchParams(prev);
                      if (value === "all") next.delete("status");
                      else next.set("status", value);
                      return next;
                    },
                    { replace: true },
                  )
                }
              >
                <TabsList>
                  <TabsTrigger value="all">All ({jobs.length})</TabsTrigger>
                  <TabsTrigger value="active">
                    Active ({activeJobs.length})
                  </TabsTrigger>
                  <TabsTrigger value="inactive">
                    Inactive ({closedJobs.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative w-full md:max-w-sm flex justify-end">
                <Button
                  onClick={() =>
                    navigate(getLocalizedPath("/employer/jobs/add", language))
                  }
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Post a new job
                </Button>
              </div>
            </div>
            {loadError ? (
              <p className="text-xs text-destructive pt-2">{loadError}</p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground">
                Loading…
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="p-12 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  {query.trim()
                    ? "No matching jobs found"
                    : "No jobs posted yet"}
                </p>
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
              <div className="space-y-3">
                {filteredJobs.map((job) => {
                  const rowCompany =
                    (job.company_name && job.company_name.trim()) ||
                    linkedCompanyName;
                  return (
                    <div
                      key={`${job.source ?? "breneo"}-${job.id || job.title}`}
                      className="rounded-xl border bg-card p-4 md:p-5"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-lg leading-none">
                              {job.title || "Untitled"}
                            </h3>
                            <span className="text-xs text-muted-foreground">
                              {relativePosted(job.created_at)}
                            </span>
                          </div>
                          {rowCompany ? (
                            <p className="mt-1.5 text-sm text-muted-foreground inline-flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 shrink-0" />
                              {rowCompany}
                            </p>
                          ) : null}
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                            <span className="inline-flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              {job.location || "N/A"}
                            </span>
                            <span className="inline-flex items-center gap-2 text-muted-foreground">
                              <Briefcase className="h-4 w-4" />
                              {modeLabel(job)}
                            </span>
                            <span className="inline-flex items-center gap-2 text-muted-foreground">
                              <Globe className="h-4 w-4" />
                              {job.salary || "N/A"}
                            </span>
                            <span className="inline-flex items-center gap-2 text-muted-foreground">
                              <Clock3 className="h-4 w-4" />
                              {job.remote ? "Remote" : "Onsite"}
                            </span>
                            <span className="inline-flex items-center gap-2 text-muted-foreground">
                              <GraduationCap className="h-4 w-4" />
                              {job.employment_type || "N/A"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {job.id ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  navigate(
                                    getLocalizedPath(
                                      `/employer/jobs/edit/${job.id}?source=${job.source ?? "aggregator"}`,
                                      language,
                                    ),
                                  )
                                }
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </>
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
