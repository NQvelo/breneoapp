import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Building2,
  Globe,
  Mail,
  ExternalLink,
  MapPin,
  Plus,
  CheckCircle2,
} from "lucide-react";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  normalizeEmployerProfile,
  type NormalizedEmployerProfile,
} from "@/api/employer/profile";
import {
  fetchEmployerJobsFiltered,
  type EmployerJob,
} from "@/api/employer/jobsApi";
import { resolveEmployerJobsCompanyFilter } from "@/api/employer/aggregatorBffApi";
import { getLocalizedPath } from "@/utils/localeUtils";
import { openExternalHttpUrl } from "@/utils/externalUrl";
import { useLanguage } from "@/contexts/LanguageContext";

const EmployerHomePage = () => {
  const navigate = useNavigate();
  const { user, updateEmployerDisplay } = useAuth();
  const { language } = useLanguage();
  const [profile, setProfile] = useState<NormalizedEmployerProfile | null>(
    null,
  );
  const [jobs, setJobs] = useState<EmployerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobsError, setJobsError] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    try {
      const response = await apiClient.get(API_ENDPOINTS.EMPLOYER.PROFILE);
      const normalized = normalizeEmployerProfile(response.data, user.email);
      if (normalized) {
        setProfile(normalized);
        updateEmployerDisplay({
          name: normalized.company_name?.trim() || user.email,
          email: normalized.email || user.email,
          logo_url: normalized.logo_url,
        });
      }
    } catch (error: unknown) {
      console.error("Failed to load employer profile:", error);
      toast.error("Failed to load company profile");
    } finally {
      setLoading(false);
    }
  }, [user, updateEmployerDisplay]);

  const loadJobs = useCallback(async () => {
    setJobsError(false);
    try {
      const prof = await apiClient
        .get(API_ENDPOINTS.EMPLOYER.PROFILE)
        .catch(() => null);
      const profile =
        prof?.data && typeof prof.data === "object"
          ? (prof.data as Record<string, unknown>)
          : null;
      const companyId =
        profile?.company_id != null
          ? String(profile.company_id)
          : profile?.company &&
              typeof profile.company === "object" &&
              (profile.company as Record<string, unknown>).id != null
            ? String((profile.company as Record<string, unknown>).id)
            : "";
      const companyName =
        (typeof profile?.company_name === "string" && profile.company_name) ||
        "";
      const { companyId: resolvedId, companyName: resolvedName } =
        await resolveEmployerJobsCompanyFilter({
          breneoUserId: user?.id,
          employerProfileRaw: prof?.data,
          profileCompanyId: companyId,
          profileCompanyName: companyName,
        });
      const list = await fetchEmployerJobsFiltered({
        companyId: resolvedId,
        companyName: resolvedName,
      });
      setJobs(list);
    } catch {
      setJobsError(true);
      setJobs([]);
    }
  }, [user?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (profile) loadJobs();
  }, [profile, loadJobs]);

  const activeJobs = useMemo(
    () => jobs.filter((j) => j.is_active !== false),
    [jobs],
  );
  const locationsCount = profile?.locations?.length ?? 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full min-h-[40vh]">
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh] px-4">
          <Card className="max-w-md w-full border-dashed">
            <CardContent className="pt-10 pb-10 text-center space-y-4">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Company profile</h2>
              <p className="text-sm text-muted-foreground">
                We couldn&apos;t load your employer profile. Try completing your
                company details.
              </p>
              <Button
                onClick={() =>
                  navigate(getLocalizedPath("/employer/profile", language))
                }
              >
                Go to profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const companyName =
    profile.company_name?.trim() || user?.email || "Your company";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card className="border-0 shadow-none bg-white dark:bg-card rounded-3xl">
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground">
                Your Company overview
              </h3>
              {/* <button
                type="button"
                aria-label="Overview details"
                className="h-12 w-12 rounded-2xl bg-muted text-foreground inline-flex items-center justify-center"
              >
                <ExternalLink className="h-5 w-5" />
              </button> */}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible">
              <div className="rounded-2xl bg-[#F2F2F3] dark:bg-[#171717] p-4 space-y-1 min-w-[220px] sm:min-w-0 min-h-[132px]">
                <p className="text-xs text-muted-foreground truncate">
                  Total jobs
                </p>
                <p className="text-2xl leading-none font-bold text-foreground">
                  {jobs.length}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Jobs you have posted
                </p>
              </div>
              <div className="rounded-2xl bg-[#F2F2F3] dark:bg-[#171717] p-4 space-y-1 min-w-[220px] sm:min-w-0 min-h-[132px]">
                <p className="text-xs text-muted-foreground truncate">Active</p>
                <p className="text-2xl leading-none font-bold text-foreground">
                  {activeJobs.length}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Open listings
                </p>
              </div>
              <div className="rounded-2xl bg-[#F2F2F3] dark:bg-[#171717] p-4 space-y-1 min-w-[220px] sm:min-w-0 min-h-[132px]">
                <p className="text-xs text-muted-foreground truncate">
                  Locations
                </p>
                <p className="text-2xl leading-none font-bold text-foreground">
                  {locationsCount}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  From company profile
                </p>
              </div>
              <div className="rounded-2xl bg-[#F2F2F3] dark:bg-[#171717] p-4 space-y-1 min-w-[220px] sm:min-w-0 min-h-[132px]">
                <p className="text-xs text-muted-foreground truncate">Status</p>
                <div className="pt-1">
                  <Badge className="bg-green-500 text-xs">Active</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  Employer account
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Company</p>
                <p className="font-semibold">{companyName}</p>
              </div>
              {profile.description ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Description
                  </p>
                  <p className="text-sm">{profile.description}</p>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {profile.website ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openExternalHttpUrl(profile.website)}
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    Website
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                ) : null}
                {profile.email ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      (window.location.href = `mailto:${profile.email}`)
                    }
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Contact
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Recent jobs
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  navigate(getLocalizedPath("/employer/jobs", language))
                }
              >
                View all
              </Button>
            </CardHeader>
            <CardContent>
              {jobsError ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Job listings could not be loaded. Check your connection and
                  try again.
                </p>
              ) : jobs.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No jobs yet</p>
                  <Button
                    size="sm"
                    onClick={() =>
                      navigate(getLocalizedPath("/employer/jobs/add", language))
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Post your first job
                  </Button>
                </div>
              ) : (
                <ul className="max-h-[min(420px,50vh)] space-y-2 overflow-y-auto pr-1">
                  {jobs.slice(0, 8).map((job) => (
                    <li
                      key={`${job.source ?? "breneo"}-${job.id || job.title}`}
                      className="rounded-lg border p-3 text-sm"
                    >
                      <div className="font-medium">{job.title}</div>
                      {job.location ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          {job.location}
                          {job.remote ? " · Remote" : ""}
                        </p>
                      ) : null}
                      {job.employment_type ? (
                        <Badge variant="secondary" className="mt-2 text-[10px]">
                          {job.employment_type}
                        </Badge>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Quick actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() =>
                  navigate(getLocalizedPath("/employer/jobs/add", language))
                }
                className="h-auto flex-col items-start p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="h-5 w-5" />
                  <span className="font-semibold">Post a new job</span>
                </div>
                <span className="text-sm text-left opacity-80">
                  Create a listing like adding a course
                </span>
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  navigate(getLocalizedPath("/employer/jobs", language))
                }
                className="h-auto flex-col items-start p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-5 w-5" />
                  <span className="font-semibold">Your jobs</span>
                </div>
                <span className="text-sm text-left opacity-80">
                  View and manage all postings
                </span>
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  navigate(getLocalizedPath("/employer/profile", language))
                }
                className="h-auto flex-col items-start p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-5 w-5" />
                  <span className="font-semibold">Company profile</span>
                </div>
                <span className="text-sm text-left opacity-80">
                  Logo, description, and contact details
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default EmployerHomePage;
