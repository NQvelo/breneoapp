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
  fetchEmployerJobs,
  type EmployerJob,
} from "@/api/employer/jobsApi";
import { getLocalizedPath } from "@/utils/localeUtils";
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
      const normalized = normalizeEmployerProfile(
        response.data,
        user.email,
      );
      if (normalized) {
        setProfile(normalized);
        updateEmployerDisplay({
          name: normalized.company_name || user.first_name || user.email,
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
      const list = await fetchEmployerJobs();
      setJobs(list);
    } catch {
      setJobsError(true);
      setJobs([]);
    }
  }, []);

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
    profile.company_name || user?.first_name || user?.email || "Your company";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-6">
          <Card className="min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium truncate">
                Total jobs
              </CardTitle>
              <Briefcase className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-lg md:text-2xl font-bold">{jobs.length}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground hidden md:block">
                Jobs you have posted
              </p>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium truncate">
                Active
              </CardTitle>
              <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-lg md:text-2xl font-bold">
                {activeJobs.length}
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground hidden md:block">
                Open listings
              </p>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium truncate">
                Locations
              </CardTitle>
              <MapPin className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-lg md:text-2xl font-bold">
                {locationsCount}
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground hidden md:block">
                From company profile
              </p>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium truncate">
                Status
              </CardTitle>
              <Building2 className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-lg md:text-2xl font-bold">
                <Badge className="bg-green-500 text-[10px] md:text-xs">
                  Active
                </Badge>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground hidden md:block">
                Employer account
              </p>
            </CardContent>
          </Card>
        </div>

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
                    onClick={() => {
                      const w = profile.website.startsWith("http")
                        ? profile.website
                        : `https://${profile.website}`;
                      window.open(w, "_blank");
                    }}
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
                  Job listings could not be loaded. If this persists, your API
                  may not expose{" "}
                  <code className="text-xs">GET /api/employer/jobs/</code> yet.
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
                      key={job.id || job.title}
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
