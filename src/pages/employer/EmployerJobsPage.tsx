import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { fetchEmployerJobs, type EmployerJob } from "@/api/employer/jobsApi";
import { getLocalizedPath } from "@/utils/localeUtils";
import { useLanguage } from "@/contexts/LanguageContext";

export default function EmployerJobsPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<EmployerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const statusFilter =
    searchParams.get("status") === "closed" ? "closed" : "active";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchEmployerJobs();
      setJobs(list);
    } catch {
      toast.error("Could not load jobs.");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
    const byStatus = statusFilter === "active" ? activeJobs : closedJobs;
    const q = query.trim().toLowerCase();
    if (!q) return byStatus;
    return byStatus.filter((job) => {
      const title = (job.title || "").toLowerCase();
      const location = (job.location || "").toLowerCase();
      return title.includes(q) || location.includes(q);
    });
  }, [statusFilter, activeJobs, closedJobs, query]);

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Your jobs
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage job postings for your company
            </p>
          </div>
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

        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
              <Tabs
                value={statusFilter}
                onValueChange={(value) =>
                  setSearchParams(
                    (prev) => {
                      const next = new URLSearchParams(prev);
                      next.set(
                        "status",
                        value === "closed" ? "closed" : "active",
                      );
                      return next;
                    },
                    { replace: true },
                  )
                }
              >
                <TabsList>
                  <TabsTrigger value="active">
                    Active ({activeJobs.length})
                  </TabsTrigger>
                  <TabsTrigger value="closed">
                    Closed ({closedJobs.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative w-full md:max-w-sm">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by title or location"
                  className="pl-9"
                />
              </div>
            </div>
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
                {filteredJobs.map((job) => (
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
                        <Badge
                          variant={job.is_active ? "default" : "secondary"}
                          className="font-normal"
                        >
                          {job.is_active ? "Active" : "Closed"}
                        </Badge>
                        {job.id ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate(
                                getLocalizedPath(
                                  `/employer/jobs/edit/${job.id}?source=${job.source ?? "breneo"}`,
                                  language,
                                ),
                              )
                            }
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
