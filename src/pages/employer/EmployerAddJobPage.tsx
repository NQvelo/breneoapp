import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import OptimizedAvatar from "@/components/ui/OptimizedAvatar";
import {
  Loader2,
  MapPin,
  Link2,
  Banknote,
  Briefcase,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  normalizeEmployerProfile,
  type NormalizedEmployerProfile,
} from "@/api/employer/profile";
import {
  fetchEmployerJobForEdit,
  type EmployerJobSource,
} from "@/api/employer/jobsApi";
import {
  deletePublishedEmployerJob,
  type EmployerJobsApiError,
  publishEmployerJob,
  updatePublishedEmployerJob,
  validateHttpUrl,
  type AggregatorWorkMode,
} from "@/api/employer/publishJob";
import { getLocalizedPath } from "@/utils/localeUtils";
import { useLanguage } from "@/contexts/LanguageContext";

const dashedShell =
  "rounded-lg border border-dashed border-gray-300 bg-transparent transition hover:border-breneo-blue focus-within:border-breneo-blue dark:border-[#444444]";

/** Shown in description as "Employment: …" on the aggregator */
const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Temporary",
] as const;

const WORK_MODE_OPTIONS: { value: AggregatorWorkMode; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "on-site", label: "On-site" },
  { value: "onsite", label: "Onsite" },
  { value: "unknown", label: "Not specified" },
];

export default function EmployerAddJobPage() {
  const { jobId } = useParams<{ jobId?: string }>();
  const locationState = useLocation();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const isEdit = Boolean(jobId);
  const editSource = (new URLSearchParams(locationState.search).get("source") ||
    "breneo") as EmployerJobSource;

  const [profile, setProfile] = useState<NormalizedEmployerProfile | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState<string>(
    EMPLOYMENT_TYPES[0],
  );
  const [applyUrl, setApplyUrl] = useState("");
  const [salary, setSalary] = useState("");
  const [workMode, setWorkMode] = useState<AggregatorWorkMode>("on-site");
  const [isActive, setIsActive] = useState(true);
  const [initialSnapshot, setInitialSnapshot] = useState<{
    title: string;
    full_description: string;
    work_mode: AggregatorWorkMode;
    location: string;
    salary: string;
    apply_url: string;
    is_active: boolean;
  } | null>(null);

  const initPage = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await apiClient.get(API_ENDPOINTS.EMPLOYER.PROFILE);
      const n = normalizeEmployerProfile(res.data, user.email);
      setProfile(n);
      const profileObj =
        res.data && typeof res.data === "object"
          ? (res.data as Record<string, unknown>)
          : null;
      const companyId =
        profileObj?.company_id != null ? String(profileObj.company_id) : "";
      const companyName = n?.company_name || "";

      if (isEdit && jobId) {
        const job = await fetchEmployerJobForEdit(jobId, editSource, {
          companyId,
          companyName,
        });
        if (!job) {
          toast.error("Job not found.");
          navigate(getLocalizedPath("/employer/jobs", language));
          return;
        }
        setTitle(job.title);
        setDescription(job.description);
        setLocation(job.location);
        setEmploymentType(
          EMPLOYMENT_TYPES.includes(
            job.employment_type as (typeof EMPLOYMENT_TYPES)[number],
          )
            ? job.employment_type
            : EMPLOYMENT_TYPES[0],
        );
        setApplyUrl(job.apply_url);
        setSalary(job.salary);
        if (
          job.work_mode &&
          ["remote", "hybrid", "onsite", "on-site", "unknown"].includes(
            job.work_mode.toLowerCase(),
          )
        ) {
          setWorkMode(job.work_mode.toLowerCase() as AggregatorWorkMode);
        } else if (
          job.employment_type &&
          ["remote", "hybrid", "onsite", "on-site", "unknown"].includes(
            job.employment_type.toLowerCase(),
          )
        ) {
          setWorkMode(job.employment_type as AggregatorWorkMode);
        } else if (job.remote) {
          setWorkMode("remote");
        }
        setIsActive(job.is_active !== false);
        setInitialSnapshot({
          title: String(job.title ?? "").trim(),
          full_description: String(job.description ?? "").trim(),
          work_mode:
            (job.work_mode?.toLowerCase() as AggregatorWorkMode) || "unknown",
          location: String(job.location ?? "").trim(),
          salary: String(job.salary ?? "").trim(),
          apply_url: String(job.apply_url ?? "").trim(),
          is_active: job.is_active !== false,
        });
      }
    } catch {
      toast.error("Could not load company profile.");
    } finally {
      setLoading(false);
    }
  }, [user, isEdit, jobId, navigate, language, editSource]);

  useEffect(() => {
    initPage();
  }, [initPage]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setFieldErrors({ title: ["Job title is required."] });
      toast.error("Job title is required.");
      return;
    }
    if (!description.trim()) {
      setFieldErrors({ full_description: ["Description is required."] });
      toast.error("Description is required.");
      return;
    }

    const applyCheck = validateHttpUrl(applyUrl);
    if (!applyCheck.ok) {
      setFieldErrors({ apply_url: [applyCheck.error] });
      toast.error(applyCheck.error);
      return;
    }

    setFieldErrors({});
    setSaving(true);
    try {
      if (isEdit && jobId) {
        const nextState = {
          title: title.trim(),
          full_description: description.trim(),
          work_mode: workMode,
          location: location.trim(),
          salary: salary.trim(),
          apply_url: applyCheck.url || "",
          is_active: isActive,
        };
        const patch: Partial<{
          title: string;
          full_description: string;
          work_mode: AggregatorWorkMode;
          location: string;
          salary: string;
          apply_url: string | null;
          is_active: boolean;
          employment_type_note: string;
        }> = {};

        const snap = initialSnapshot;
        if (!snap || nextState.title !== snap.title)
          patch.title = nextState.title;
        if (!snap || nextState.full_description !== snap.full_description) {
          patch.full_description = nextState.full_description;
        }
        if (!snap || nextState.work_mode !== snap.work_mode) {
          patch.work_mode = nextState.work_mode;
        }
        if (!snap || nextState.location !== snap.location) {
          patch.location = nextState.location;
        }
        if (!snap || nextState.salary !== snap.salary) {
          patch.salary = nextState.salary;
        }
        if (!snap || nextState.apply_url !== snap.apply_url) {
          patch.apply_url = nextState.apply_url || null;
        }
        if (!snap || nextState.is_active !== snap.is_active) {
          patch.is_active = nextState.is_active;
        }
        if (patch.full_description != null) {
          patch.employment_type_note = employmentType;
        }
        if (Object.keys(patch).length === 0) {
          toast.info("No changes to save.");
          return;
        }

        await updatePublishedEmployerJob(jobId, patch);
        toast.success("Job updated.");
      } else {
        const data = await publishEmployerJob({
          title: title.trim(),
          full_description: description.trim(),
          work_mode: workMode,
          location: location.trim() || undefined,
          salary: salary.trim() || undefined,
          apply_url: applyCheck.url || null,
          is_active: isActive,
          employment_type_note: employmentType,
        });
        const id = data.id ?? data.pk ?? data.job_id;
        toast.success(
          id != null
            ? `Job posted successfully (id: ${String(id)})`
            : "Job posted successfully",
        );
        console.log("[job aggregator] response", data);
      }
      navigate(getLocalizedPath("/employer/jobs", language));
    } catch (e: unknown) {
      const err = e as EmployerJobsApiError;
      if (err.status === 401 || err.status === 403) {
        toast.error("You are not authorized to manage employer jobs.");
      } else if (err.status === 404) {
        toast.error("Job not found (possibly already deleted).");
      } else if (err.status === 400 && err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
        toast.error("Please fix the highlighted fields.");
      } else {
        toast.error(err.message || "Could not save job.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit || !jobId) return;
    const ok = window.confirm("Delete this job? This action cannot be undone.");
    if (!ok) return;

    setDeleting(true);
    try {
      await deletePublishedEmployerJob(jobId);
      toast.success("Job deleted.");
      navigate(getLocalizedPath("/employer/jobs", language));
    } catch (e: unknown) {
      const err = e as EmployerJobsApiError;
      if (err.status === 401 || err.status === 403) {
        toast.error("You are not authorized to manage employer jobs.");
      } else if (err.status === 404) {
        toast.error("Job not found (possibly already deleted).");
      } else {
        toast.error(err.message || "Could not delete job.");
      }
    } finally {
      setDeleting(false);
    }
  };

  const companyName =
    profile?.company_name || user?.first_name || user?.email || "Company";

  if (loading) {
    return (
      <DashboardLayout containMainScroll={false}>
        <div className="flex justify-center py-24 text-muted-foreground">
          Loading…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout containMainScroll={false}>
      <div className="max-w-4xl mx-auto pb-24 space-y-6">
        <Card className="rounded-3xl border-0 shadow-none bg-white dark:bg-card">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-border/60">
              <OptimizedAvatar
                src={profile?.logo_url || undefined}
                alt={companyName}
                fallback={companyName.charAt(0).toUpperCase()}
                size="sm"
                className="flex-shrink-0 !h-10 !w-10 !rounded-sm"
              />
              <span className="text-muted-foreground text-base font-medium">
                {companyName}
              </span>
            </div>

            <div className={cn(dashedShell)}>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-auto min-h-[4rem] w-full rounded-lg border-0 bg-transparent px-3 py-3 text-2xl md:text-2xl font-bold leading-tight shadow-none outline-none focus-visible:ring-0 placeholder:text-xl md:placeholder:text-3xl dark:text-white"
                placeholder="Job title"
              />
            </div>
            {fieldErrors.title?.[0] ? (
              <p className="text-sm text-destructive">{fieldErrors.title[0]}</p>
            ) : null}

            <div className={cn(dashedShell)}>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[200px] w-full rounded-lg border-0 bg-transparent px-3 py-3 text-base shadow-none resize-y focus-visible:ring-0 dark:text-white"
                placeholder="Describe the role, requirements, and benefits…"
              />
            </div>
            {fieldErrors.full_description?.[0] ? (
              <p className="text-sm text-destructive">
                {fieldErrors.full_description[0]}
              </p>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50/90 dark:bg-white/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-breneo-blue" />
                  Location
                </div>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Tbilisi, Georgia"
                  className="bg-white dark:bg-background"
                />
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/90 dark:bg-white/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="h-4 w-4 text-breneo-blue" />
                  Work mode
                </div>
                <Select
                  value={workMode}
                  onValueChange={(v) => setWorkMode(v as AggregatorWorkMode)}
                >
                  <SelectTrigger className="bg-white dark:bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_MODE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/90 dark:bg-white/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="h-4 w-4 text-breneo-blue" />
                  Employment type
                </div>
                <Select
                  value={employmentType}
                  onValueChange={setEmploymentType}
                >
                  <SelectTrigger className="bg-white dark:bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/90 dark:bg-white/5 p-4 space-y-2 sm:col-span-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Link2 className="h-4 w-4 text-breneo-blue" />
                  Application URL
                </div>
                <Input
                  value={applyUrl}
                  onChange={(e) => setApplyUrl(e.target.value)}
                  placeholder="https://…"
                  className="bg-white dark:bg-background"
                />
                {fieldErrors.apply_url?.[0] ? (
                  <p className="text-sm text-destructive">
                    {fieldErrors.apply_url[0]}
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/90 dark:bg-white/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Banknote className="h-4 w-4 text-breneo-blue" />
                  Salary (optional)
                </div>
                <Input
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="e.g. 3000–5000 GEL"
                  className="bg-white dark:bg-background"
                />
              </div>
            </div>

            {isEdit ? (
              <div className="flex items-center space-x-3 pt-2">
                <Checkbox
                  id="active"
                  checked={isActive}
                  onCheckedChange={(c) => setIsActive(c === true)}
                />
                <Label htmlFor="active" className="cursor-pointer">
                  Listing is active (visible to candidates)
                </Label>
              </div>
            ) : null}

            <div className="pt-4 flex items-center justify-between gap-3">
              <div>
                {isEdit ? (
                  <Button
                    variant="outline"
                    onClick={handleDelete}
                    disabled={saving || deleting}
                    className="h-10 w-10 p-0 border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-500/70 dark:text-red-400 dark:hover:bg-red-950/20"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete job</span>
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate(getLocalizedPath("/employer/jobs", language))
                  }
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={saving || deleting}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving…
                    </>
                  ) : isEdit ? (
                    "Save changes"
                  ) : (
                    "Publish job"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
