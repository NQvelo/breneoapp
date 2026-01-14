import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  GraduationCap,
  Briefcase,
  Heart,
  ExternalLink,
  MapPin,
  Loader2,
} from "lucide-react";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { supabase } from "@/integrations/supabase/client";
import { fetchJobDetail } from "@/api/jobs/jobService";

interface SavedCourse {
  id: string;
  title: string;
  provider: string;
  category: string;
  level: string;
  duration: string;
  image: string;
  description: string;
  academy_id?: string | null;
  academy_logo?: string | null;
}

interface SavedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  company_logo?: string;
  salary?: string;
  employment_type?: string;
  work_arrangement?: string;
}

/**
 * Normalizes image paths to ensure they're absolute
 */
const normalizeImagePath = (imagePath: string | null | undefined): string => {
  if (!imagePath) {
    return "/lovable-uploads/no_photo.png";
  }
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }
  if (imagePath.startsWith("/")) {
    return imagePath;
  }
  return `/${imagePath}`;
};

const SavedPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"courses" | "jobs">("courses");

  // Fetch saved course IDs
  const { data: savedCourseIds = [] } = useQuery<string[]>({
    queryKey: ["savedCourseIds", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const profileResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
        const savedCoursesArray = profileResponse.data?.saved_courses || [];
        return savedCoursesArray.map((id: string | number) => String(id));
      } catch (error) {
        console.error("Error fetching saved course IDs:", error);
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Fetch saved courses with full details
  const { data: savedCourses = [], isLoading: loadingSavedCourses } = useQuery<SavedCourse[]>({
    queryKey: ["savedCoursesDetails", user?.id, savedCourseIds],
    queryFn: async () => {
      if (!user?.id || !savedCourseIds || savedCourseIds.length === 0) return [];

      try {
        // Fetch course details from Supabase
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select(
            "id, title, provider, category, level, duration, image, description, academy_id"
          )
          .in("id", savedCourseIds);

        if (coursesError) {
          console.error("Error fetching saved course details:", coursesError);
          return [];
        }

        // Get unique academy_ids
        const uniqueAcademyIds = [
          ...new Set(
            coursesData
              ?.map((c) => c.academy_id)
              .filter((id): id is string => !!id) || []
          ),
        ];

        // Fetch academy profiles from Django API
        const academyProfilesMap = new Map<string, string | null>();

        if (uniqueAcademyIds.length > 0) {
          await Promise.all(
            uniqueAcademyIds.map(async (academyId) => {
              try {
                const response = await apiClient.get(
                  `${API_ENDPOINTS.ACADEMY.DETAIL}${academyId}/`
                );

                if (response.data) {
                  const responseData = response.data as Record<string, unknown>;
                  const profileData =
                    (responseData.profile_data as Record<string, unknown>) ||
                    responseData;

                  const getStringField = (
                    field: string,
                    source: Record<string, unknown> = profileData
                  ) => {
                    const value = source[field];
                    return typeof value === "string" ? value : undefined;
                  };

                  const logoUrl =
                    getStringField("logo_url", profileData) ||
                    getStringField("logoUrl", profileData) ||
                    getStringField("logo", profileData) ||
                    getStringField("logo_url", responseData) ||
                    getStringField("logoUrl", responseData) ||
                    null;

                  academyProfilesMap.set(academyId, logoUrl);
                }
              } catch (error) {
                console.debug(
                  `Could not fetch academy profile for ${academyId}`
                );
                academyProfilesMap.set(academyId, null);
              }
            })
          );
        }

        return (coursesData || []).map((course) => {
          const academyLogo =
            course.academy_id && academyProfilesMap.has(course.academy_id)
              ? academyProfilesMap.get(course.academy_id) || null
              : null;

          return {
            id: course.id,
            title: course.title || "",
            provider: course.provider || "",
            category: course.category || "",
            level: course.level || "",
            duration: course.duration || "",
            image: normalizeImagePath(course.image),
            description: course.description || "",
            academy_id: course.academy_id || null,
            academy_logo: academyLogo ? normalizeImagePath(academyLogo) : null,
          } as SavedCourse;
        });
      } catch (error) {
        console.error("Error fetching saved courses:", error);
        return [];
      }
    },
    enabled: !!user && savedCourseIds.length > 0,
  });

  // Fetch saved job IDs
  const { data: savedJobIds = [] } = useQuery<string[]>({
    queryKey: ["savedJobIds", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const profileResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
        const savedJobsArray = profileResponse.data?.saved_jobs || [];

        if (!Array.isArray(savedJobsArray)) return [];

        return savedJobsArray
          .map((item: unknown) => {
            if (typeof item === "string" || typeof item === "number") {
              return String(item);
            }
            if (item && typeof item === "object") {
              const obj = item as Record<string, unknown>;
              if (obj.id) return String(obj.id);
              if (obj.job_id) return String(obj.job_id);
              if (obj.jobId) return String(obj.jobId);
            }
            return null;
          })
          .filter((id): id is string => id !== null);
      } catch (error) {
        console.error("Error fetching saved job IDs:", error);
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Fetch saved jobs with full details
  const { data: savedJobs = [], isLoading: loadingSavedJobs } = useQuery<SavedJob[]>({
    queryKey: ["savedJobsDetails", user?.id, savedJobIds],
    queryFn: async () => {
      if (!user?.id || !savedJobIds || savedJobIds.length === 0) return [];

      try {
        const jobPromises = savedJobIds.map(async (jobId) => {
          try {
            const jobDetail = await fetchJobDetail(jobId);
            if (!jobDetail) return null;

            // Extract job data
            const jobTitle = (jobDetail.title ||
              jobDetail.job_title ||
              jobDetail.position ||
              "Untitled Position") as string;

            const companyName =
              jobDetail.company_name ||
              jobDetail.employer_name ||
              (typeof jobDetail.company === "string"
                ? jobDetail.company
                : null) ||
              "Unknown Company";

            const jobCity = jobDetail.job_city || jobDetail.city || "";
            const jobState = jobDetail.job_state || jobDetail.state || "";
            const jobCountry = jobDetail.job_country || jobDetail.country || "";
            const location =
              jobDetail.job_location ||
              jobDetail.location ||
              [jobCity, jobState, jobCountry].filter(Boolean).join(", ") ||
              "Location not specified";

            const logo =
              jobDetail.employer_logo ||
              jobDetail.company_logo ||
              jobDetail.logo_url ||
              (typeof jobDetail.company === "object" && jobDetail.company
                ? (jobDetail.company as { logo?: string; company_logo?: string })
                    .logo ||
                  (jobDetail.company as { company_logo?: string }).company_logo
                : undefined);

            // Format salary
            let salary = "By agreement";
            const minSalary = jobDetail.job_min_salary || jobDetail.min_salary;
            const maxSalary = jobDetail.job_max_salary || jobDetail.max_salary;
            const salaryCurrency = (jobDetail.job_salary_currency || jobDetail.salary_currency || "$") as string;
            const salaryPeriod = (jobDetail.job_salary_period || jobDetail.salary_period || "yearly") as string;

            if (
              minSalary &&
              maxSalary &&
              typeof minSalary === "number" &&
              typeof maxSalary === "number"
            ) {
              const periodLabel = salaryPeriod === "monthly" ? "Monthly" : "";
              const minSalaryFormatted = minSalary.toLocaleString();
              const maxSalaryFormatted = maxSalary.toLocaleString();
              const currencySymbols = ["$", "€", "£", "₾", "₹", "¥"];
              const isCurrencyBefore = currencySymbols.some((sym) =>
                salaryCurrency.includes(sym)
              );
              if (isCurrencyBefore) {
                salary = `${salaryCurrency}${minSalaryFormatted} - ${salaryCurrency}${maxSalaryFormatted}${
                  periodLabel ? `/${periodLabel}` : ""
                }`;
              } else {
                salary = `${minSalaryFormatted} - ${maxSalaryFormatted} ${salaryCurrency}${
                  periodLabel ? `/${periodLabel}` : ""
                }`;
              }
            } else if (minSalary && typeof minSalary === "number") {
              const minSalaryFormatted = minSalary.toLocaleString();
              const currencySymbols = ["$", "€", "£", "₾", "₹", "¥"];
              const isCurrencyBefore = currencySymbols.some((sym) =>
                salaryCurrency.includes(sym)
              );
              salary = isCurrencyBefore
                ? `${salaryCurrency}${minSalaryFormatted}+`
                : `${minSalaryFormatted}+ ${salaryCurrency}`;
            } else if (jobDetail.salary && typeof jobDetail.salary === "string") {
              salary = jobDetail.salary;
            }

            // Format employment type
            const employmentTypeRaw = (jobDetail.job_employment_type ||
              jobDetail.employment_type ||
              jobDetail.type ||
              "FULLTIME") as string;
            const jobTypeLabels: Record<string, string> = {
              FULLTIME: "Full time",
              PARTTIME: "Part time",
              CONTRACTOR: "Contract",
              INTERN: "Internship",
            };
            const employmentType =
              jobTypeLabels[employmentTypeRaw] || employmentTypeRaw || "Full time";

            // Determine work arrangement
            let workArrangement = "On-site";
            const isRemote =
              jobDetail.job_is_remote || jobDetail.is_remote || jobDetail.remote === true;
            if (isRemote) {
              workArrangement = "Remote";
            } else if (jobTitle?.toLowerCase().includes("hybrid")) {
              workArrangement = "Hybrid";
            }

            return {
              id: jobId,
              title: jobTitle,
              company: companyName,
              location: typeof location === "string" ? location : "Location not specified",
              url: jobDetail.url || "",
              company_logo: logo,
              salary,
              employment_type: employmentType,
              work_arrangement: workArrangement,
            } as SavedJob;
          } catch (error) {
            console.error(`Error fetching job ${jobId}:`, error);
            return null;
          }
        });

        const jobs = await Promise.all(jobPromises);
        return jobs.filter((job): job is SavedJob => job !== null);
      } catch (error) {
        console.error("Error fetching saved jobs:", error);
        return [];
      }
    },
    enabled: !!user && savedJobIds.length > 0,
  });

  // Save/unsave course mutation
  const saveCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      if (!user?.id) {
        throw new Error("Please log in to save courses.");
      }
      await apiClient.post(`/api/save-course/${courseId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedCourseIds", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["savedCoursesDetails", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Course removed from saved");
    },
    onError: (error) => {
      console.error("Error updating saved courses:", error);
      toast.error("Failed to update saved courses. Please try again.");
    },
  });

  // Save/unsave job mutation
  const saveJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      if (!user?.id) {
        throw new Error("Please log in to save jobs.");
      }
      await apiClient.post(`${API_ENDPOINTS.JOBS.SAVE_JOB}${jobId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedJobIds", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["savedJobsDetails", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Job removed from saved");
    },
    onError: (error) => {
      console.error("Error updating saved jobs:", error);
      toast.error("Failed to update saved jobs. Please try again.");
    },
  });

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <p>Please log in to view saved items.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Profile/Courses/Jobs Switcher */}
      <div className="fixed bottom-[85px] left-1/2 -translate-x-1/2 z-40 md:static md:translate-x-0 md:left-auto md:flex md:justify-center md:mb-6 md:w-auto">
        <div className="relative inline-flex items-center bg-gray-100/80 dark:bg-[#242424]/80 backdrop-blur-xl border border-gray-200 dark:border-border rounded-full p-1 shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
          <button
            onClick={() => navigate("/profile")}
            className="relative px-6 py-2.5 rounded-full text-sm transition-all duration-200 text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-200"
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab("courses")}
            className={`relative px-6 py-2.5 rounded-full text-sm transition-all duration-200 ${
              activeTab === "courses"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-bold shadow-sm"
                : "text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            Courses
          </button>
          <button
            onClick={() => setActiveTab("jobs")}
            className={`relative px-6 py-2.5 rounded-full text-sm transition-all duration-200 ${
              activeTab === "jobs"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-bold shadow-sm"
                : "text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            Jobs
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pb-20 md:pb-6 px-2 sm:px-6 lg:px-8">
        {/* Saved Courses Tab */}
        {activeTab === "courses" && (
          <div className="space-y-6">
            {loadingSavedCourses ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-0">
                      <Skeleton className="h-40 w-full rounded-t-3xl" />
                      <div className="p-4">
                        <Skeleton className="h-5 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2 mb-3" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : savedCourses.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <GraduationCap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No saved courses</h3>
                  <p className="text-gray-500 mb-4">
                    Start saving courses to view them here!
                  </p>
                  <Button onClick={() => navigate("/courses")} variant="default">
                    Browse Courses
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {savedCourses.map((course) => {
                  const isCourseSaved = savedCourseIds.includes(String(course.id));
                  return (
                    <Link
                      key={course.id}
                      to={`/course/${course.id}`}
                      className="block"
                    >
                      <Card className="relative transition-all duration-200 cursor-pointer group border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 rounded-3xl w-full flex flex-col h-full">
                        <CardContent className="p-0 overflow-hidden rounded-3xl flex flex-col flex-grow relative">
                          <div className="relative w-full h-40 overflow-hidden rounded-t-3xl isolate">
                            <img
                              src={course.image || "/placeholder.svg"}
                              alt={course.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "/placeholder.svg";
                              }}
                            />
                          </div>
                          <div className="p-4 flex flex-col flex-grow min-h-[140px]">
                            <h3 className="font-semibold text-base mb-2 line-clamp-2 group-hover:text-breneo-blue transition-colors">
                              {course.title}
                            </h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                              {course.provider}
                            </p>
                            <div className="flex items-center justify-between gap-3 mt-auto flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                {course.duration && (
                                  <Badge className="rounded-[10px] px-3 py-1 text-[13px] font-medium bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100">
                                    {course.duration}
                                  </Badge>
                                )}
                                {course.level && (
                                  <Badge className="rounded-[10px] px-3 py-1 text-[13px] font-medium bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100">
                                    {course.level}
                                  </Badge>
                                )}
                              </div>
                              <Button
                                variant="secondary"
                                size="icon"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  saveCourseMutation.mutate(String(course.id));
                                }}
                                disabled={saveCourseMutation.isPending}
                                aria-label="Unsave course"
                                className={cn(
                                  "bg-[#E6E7EB] hover:bg-[#E6E7EB]/90 dark:bg-[#3A3A3A] dark:hover:bg-[#4A4A4A] h-10 w-10 flex-shrink-0",
                                  isCourseSaved
                                    ? "text-red-500 bg-red-50 hover:bg-red-50/90 dark:bg-red-900/40 dark:hover:bg-red-900/60"
                                    : "text-black dark:text-white"
                                )}
                              >
                                {saveCourseMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Heart
                                    className={cn(
                                      "h-4 w-4 transition-colors",
                                      isCourseSaved
                                        ? "text-red-500 fill-red-500"
                                        : "text-black dark:text-white"
                                    )}
                                  />
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Saved Jobs Tab */}
        {activeTab === "jobs" && (
          <div className="space-y-6">
            {loadingSavedJobs ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-6 w-3/4 mb-4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : savedJobs.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No saved jobs</h3>
                  <p className="text-gray-500 mb-4">
                    Start saving jobs to view them here!
                  </p>
                  <Button onClick={() => navigate("/jobs")} variant="default">
                    Browse Jobs
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {savedJobs.map((job) => {
                  const isJobSaved = savedJobIds.includes(String(job.id));
                  return (
                    <Card
                      key={job.id}
                      className="relative transition-all duration-200 cursor-pointer group border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 rounded-3xl"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-3 mb-4">
                          {job.company_logo ? (
                            <img
                              src={job.company_logo}
                              alt={`${job.company} logo`}
                              className="w-12 h-12 rounded-3xl object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-3xl bg-breneo-blue/10 flex items-center justify-center flex-shrink-0">
                              <Briefcase className="h-6 w-6 text-breneo-blue" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-gray-600 dark:text-gray-400 mb-1 line-clamp-1">
                              {job.company}
                            </h3>
                            <h4 className="font-bold text-base mb-2 line-clamp-2 group-hover:text-breneo-blue transition-colors">
                              {job.title}
                            </h4>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          {job.location && (
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="line-clamp-1">{job.location}</span>
                            </div>
                          )}
                          {job.salary && (
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {job.salary}
                            </p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            {job.employment_type && (
                              <Badge className="rounded-[10px] px-3 py-1 text-[13px] font-medium bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100">
                                {job.employment_type}
                              </Badge>
                            )}
                            {job.work_arrangement && (
                              <Badge className="rounded-[10px] px-3 py-1 text-[13px] font-medium bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100">
                                {job.work_arrangement}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (job.url) {
                                window.open(job.url, "_blank");
                              } else {
                                navigate(`/jobs/${encodeURIComponent(job.id)}`);
                              }
                            }}
                          >
                            View Job
                            <ExternalLink className="h-3 w-3 ml-2" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveJobMutation.mutate(job.id);
                            }}
                            disabled={saveJobMutation.isPending}
                            aria-label="Unsave job"
                            className={cn(
                              "bg-[#E6E7EB] hover:bg-[#E6E7EB]/90 dark:bg-[#3A3A3A] dark:hover:bg-[#4A4A4A] h-9 w-9",
                              isJobSaved
                                ? "text-red-500 bg-red-50 hover:bg-red-50/90 dark:bg-red-900/40 dark:hover:bg-red-900/60"
                                : "text-black dark:text-white"
                            )}
                          >
                            {saveJobMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Heart
                                className={cn(
                                  "h-4 w-4 transition-colors",
                                  isJobSaved
                                    ? "text-red-500 fill-red-500"
                                    : "text-black dark:text-white"
                                )}
                              />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SavedPage;
