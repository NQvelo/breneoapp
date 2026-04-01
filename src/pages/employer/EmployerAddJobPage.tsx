import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { Loader2, MapPin, Link2, Banknote, Briefcase } from "lucide-react";
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
  createEmployerJob,
  fetchEmployerJob,
  updateEmployerJob,
} from "@/api/employer/jobsApi";
import { getLocalizedPath } from "@/utils/localeUtils";
import { useLanguage } from "@/contexts/LanguageContext";

const dashedShell =
  "rounded-lg border border-dashed border-gray-300 bg-transparent transition hover:border-breneo-blue focus-within:border-breneo-blue dark:border-[#444444]";

const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Temporary",
] as const;

export default function EmployerAddJobPage() {
  const { jobId } = useParams<{ jobId?: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const isEdit = Boolean(jobId);

  const [profile, setProfile] = useState<NormalizedEmployerProfile | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState<string>(
    EMPLOYMENT_TYPES[0],
  );
  const [applyUrl, setApplyUrl] = useState("");
  const [salary, setSalary] = useState("");
  const [remote, setRemote] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const initPage = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await apiClient.get(API_ENDPOINTS.EMPLOYER.PROFILE);
      const n = normalizeEmployerProfile(res.data, user.email);
      setProfile(n);

      if (isEdit && jobId) {
        const job = await fetchEmployerJob(jobId);
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
        setRemote(job.remote);
        setIsActive(job.is_active !== false);
      }
    } catch {
      toast.error("Could not load company profile.");
    } finally {
      setLoading(false);
    }
  }, [user, isEdit, jobId, navigate, language]);

  useEffect(() => {
    initPage();
  }, [initPage]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Job title is required.");
      return;
    }
    if (!description.trim()) {
      toast.error("Description is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        employment_type: employmentType,
        apply_url: applyUrl.trim(),
        salary: salary.trim(),
        remote,
        is_active: isActive,
      };

      if (isEdit && jobId) {
        await updateEmployerJob(jobId, payload);
        toast.success("Job updated.");
      } else {
        await createEmployerJob(payload);
        toast.success("Job posted.");
      }
      navigate(getLocalizedPath("/employer/jobs", language));
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Could not save job. Check the API is available.";
      toast.error(String(msg));
    } finally {
      setSaving(false);
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">
            {isEdit ? "Edit job" : "Post a new job"}
          </h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                navigate(getLocalizedPath("/employer/jobs", language))
              }
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
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
                className="h-auto min-h-[3rem] w-full rounded-lg border-0 bg-transparent px-3 py-3 text-2xl sm:text-3xl font-bold leading-tight shadow-none outline-none focus-visible:ring-0 dark:text-white"
                placeholder="Job title"
              />
            </div>

            <div className={cn(dashedShell)}>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[200px] w-full rounded-lg border-0 bg-transparent px-3 py-3 text-base shadow-none resize-y focus-visible:ring-0 dark:text-white"
                placeholder="Describe the role, requirements, and benefits…"
              />
            </div>

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

              <div className="flex items-center space-x-3 rounded-xl border border-gray-100 bg-gray-50/90 dark:bg-white/5 p-4">
                <Checkbox
                  id="remote"
                  checked={remote}
                  onCheckedChange={(c) => setRemote(c === true)}
                />
                <Label htmlFor="remote" className="cursor-pointer">
                  Remote-friendly
                </Label>
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
