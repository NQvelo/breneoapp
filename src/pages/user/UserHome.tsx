import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { useMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import {
  Bookmark,
  MoreVertical,
  ChevronRight,
  Clock,
  ChevronLeft,
  GraduationCap,
  Award,
  Play,
  ClipboardCheck,
  Target,
  DollarSign,
  Briefcase,
  Tag,
  MapPin,
} from "lucide-react";
import {
  getUserTestAnswers,
  calculateSkillScores,
  getTopSkills,
} from "@/utils/skillTestUtils";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { jobService, JobFilters, ApiJob } from "@/api/jobs";
import { toast } from "sonner";

// Transformed Job for UI
interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  date: string;
  logo?: string;
  company_logo?: string;
  salary?: string;
  employment_type?: string;
  work_arrangement?: string;
  is_saved: boolean;
}

interface Course {
  id: string;
  title: string;
  provider: string;
  category: string;
  level: string;
  duration: string;
  image: string;
}

// Fetch jobs from job service API without any filters
const fetchJobs = async () => {
  try {
    // No filters - just fetch general jobs
    const filters: JobFilters = {
      country: "",
      countries: [], // No country filter
      jobTypes: [], // No job type filter
      isRemote: false, // No remote filter
      datePosted: undefined, // No date filter
      skills: [], // No skills filter
    };

    // Fetch jobs using the job service
    const response = await jobService.fetchActiveJobs({
      query: "developer", // Simple default query
      filters,
      page: 1,
      pageSize: 10, // Fetch exactly 10 jobs
    });

    return response.jobs || [];
  } catch (error) {
    console.error("Error fetching jobs:", error);
    throw error;
  }
};

const UserHome = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useMobile();
  const t = useTranslation();
  const [userTopSkills, setUserTopSkills] = useState<string[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [hasCompletedTest, setHasCompletedTest] = useState(false);
  const jobsScrollRef = useRef<HTMLDivElement>(null);
  const coursesScrollRef = useRef<HTMLDivElement>(null);
  const [isSkillTestPressed, setIsSkillTestPressed] = useState(false);
  const [isSkillPathPressed, setIsSkillPathPressed] = useState(false);

  // Fetch user's top skills from skill test results
  useEffect(() => {
    const fetchUserSkills = async () => {
      if (!user) {
        setLoadingSkills(false);
        setHasCompletedTest(false);
        return;
      }

      try {
        setLoadingSkills(true);

        // Method 1: Try Django backend skill test results API (same as ProfilePage)
        try {
          const response = await apiClient.get(
            `/api/skilltest/results/?user=${user.id}`
          );
          console.log(
            "🔍 Checking Django API skill test results:",
            response.data
          );

          let skillTestData = null;
          if (Array.isArray(response.data) && response.data.length > 0) {
            skillTestData = response.data[0];
          } else if (response.data && typeof response.data === "object") {
            skillTestData = response.data;
          }

          if (
            skillTestData &&
            (skillTestData.final_role || skillTestData.skills_json)
          ) {
            console.log("✅ Found skill test results from Django API");
            setHasCompletedTest(true);

            // Extract skills from skills_json
            const skillsJson = skillTestData.skills_json || {};
            const techSkills = Object.keys(skillsJson.tech || {});
            const softSkills = Object.keys(skillsJson.soft || {});
            const allSkills = [...techSkills, ...softSkills].slice(0, 5);
            setUserTopSkills(allSkills);
            setLoadingSkills(false);
            return;
          }
        } catch (apiError) {
          console.log(
            "Django API endpoint not available, trying other methods..."
          );
        }

        // Method 2: Try user skills API endpoint
        try {
          const response = await apiClient.get(`/api/user/${user.id}/skills`);
          if (response.data && response.data.skills) {
            const topSkills = response.data.skills.slice(0, 5);
            setUserTopSkills(topSkills);
            setHasCompletedTest(topSkills.length > 0);
            setLoadingSkills(false);
            return;
          }
        } catch (apiError) {
          console.log(
            "User skills API endpoint not available, trying Supabase..."
          );
        }

        // Method 3: Fallback to Supabase: fetch from usertestanswers
        const answers = await getUserTestAnswers(String(user.id));
        console.log("🔍 Checking test completion:", {
          userId: user.id,
          answersCount: answers?.length || 0,
          hasAnswers: answers && answers.length > 0,
        });

        if (answers && answers.length > 0) {
          console.log("✅ User has completed skill test (from Supabase)");
          setHasCompletedTest(true);
          const skillScores = calculateSkillScores(answers);
          const topSkillsData = getTopSkills(skillScores, 5);
          const topSkills = topSkillsData.map((s) => s.skill);
          setUserTopSkills(topSkills);
        } else {
          console.log("❌ User has not completed skill test");
          setHasCompletedTest(false);
        }
      } catch (error) {
        console.error("Error fetching user skills:", error);
        setHasCompletedTest(false);
      } finally {
        setLoadingSkills(false);
      }
    };

    fetchUserSkills();
  }, [user]);

  // Fetch saved jobs
  const { data: savedJobs = [] } = useQuery<string[]>({
    queryKey: ["savedJobs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const profileResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
        const savedJobsArray = profileResponse.data?.saved_jobs || [];
        return savedJobsArray.map((id: string | number) => String(id));
      } catch (error) {
        console.error("Error fetching saved jobs:", error);
        return [];
      }
    },
    enabled: !!user,
  });

  // Fetch jobs without any filters
  const {
    data: jobs = [],
    isLoading: jobsLoading,
    error: jobsError,
  } = useQuery({
    queryKey: ["home-jobs"],
    queryFn: () => fetchJobs(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Handle jobs error
  useEffect(() => {
    if (jobsError) {
      console.error("Error fetching jobs:", jobsError);
    }
  }, [jobsError]);

  // Save/unsave job mutation
  const saveJobMutation = useMutation({
    mutationFn: async (job: Job) => {
      if (!user) throw new Error("User not logged in");
      if (!job.id) throw new Error("Job ID is required");

      const jobId = String(job.id);
      const isSaved = job.is_saved;

      try {
        const profileResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
        const currentSavedJobs = profileResponse.data?.saved_jobs || [];

        let updatedSavedJobs: string[];

        if (isSaved) {
          updatedSavedJobs = currentSavedJobs.filter(
            (id: string | number) => String(id) !== jobId
          );
        } else {
          if (
            currentSavedJobs.some((id: string | number) => String(id) === jobId)
          ) {
            return;
          }
          updatedSavedJobs = [...currentSavedJobs, jobId];
        }

        await apiClient.patch(API_ENDPOINTS.AUTH.PROFILE, {
          saved_jobs: updatedSavedJobs,
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to save job. Please try again.";
        throw new Error(errorMessage);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["savedJobs", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success(variables.is_saved ? "Job Unsaved" : "Job Saved");
    },
    onError: (error: Error) => {
      console.error("Error saving job:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save job";
      toast.error(errorMessage);
    },
  });

  // Fetch courses
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["home-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching courses:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!user,
  });

  // Transform jobs - handle empty or undefined arrays
  // Transform all jobs first, then filter out nulls, then take up to 10
  const transformedJobs: Job[] = useMemo(() => {
    return (jobs || [])
      .map((job: ApiJob) => {
        // Extract job ID - check all possible fields
        const jobId = job.job_id || job.id || "";
        if (!jobId) {
          console.warn("Skipping job without valid ID:", job);
          return null;
        }

        // Extract job title - check all possible fields
        const jobTitle =
          job.job_title || job.title || job.position || "Untitled Position";

        // Extract company name - check all possible fields
        const companyName =
          job.employer_name ||
          job.company_name ||
          (typeof job.company === "string" ? job.company : null) ||
          "Unknown Company";

        // Extract location - check all possible fields
        const jobCity = job.job_city || job.city || "";
        const jobState = job.job_state || job.state || "";
        const jobCountry = job.job_country || job.country || "";
        const location =
          job.job_location ||
          job.location ||
          [jobCity, jobState, jobCountry].filter(Boolean).join(", ") ||
          "Location not specified";

        // Extract logo - check all possible fields
        const logo =
          job.employer_logo ||
          job.company_logo ||
          job.logo_url ||
          (typeof job.company === "object" && job.company
            ? (job.company as { logo?: string; company_logo?: string }).logo ||
              (job.company as { company_logo?: string }).company_logo
            : undefined);

        // Extract date posted
        const postedDate =
          job.date_posted ||
          job.posted_date ||
          job.job_posted_at_datetime_utc ||
          undefined;

        // Format salary
        let salary = "By agreement";
        const minSalary = job.job_min_salary || job.min_salary;
        const maxSalary = job.job_max_salary || job.max_salary;
        const salaryCurrency =
          job.job_salary_currency || job.salary_currency || "$";
        const salaryPeriod =
          job.job_salary_period || job.salary_period || "yearly";

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
        } else if (job.salary && typeof job.salary === "string") {
          salary = job.salary;
        }

        // Format employment type
        const employmentTypeRaw =
          job.job_employment_type ||
          job.employment_type ||
          job.type ||
          "FULLTIME";
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
          job.job_is_remote || job.is_remote || job.remote === true;
        if (isRemote) {
          workArrangement = "Remote";
        } else if (jobTitle?.toLowerCase().includes("hybrid")) {
          workArrangement = "Hybrid";
        }

        const transformedJob: Job = {
          id: jobId,
          title: jobTitle,
          company: companyName,
          location:
            typeof location === "string" ? location : "Location not specified",
          logo,
          company_logo: logo,
          salary,
          employment_type: employmentType,
          work_arrangement: workArrangement,
          is_saved: savedJobs?.includes(String(jobId)),
          date: postedDate
            ? new Date(postedDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : new Date().toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }),
        };
        return transformedJob;
      })
      .filter((job): job is Job => job !== null) // Filter out null jobs
      .slice(0, 10); // Take up to 10 jobs
  }, [jobs, savedJobs]);

  // Display up to 10 jobs
  const displayJobs = transformedJobs;

  // Scroll functions for jobs
  const scrollJobs = (direction: "left" | "right") => {
    if (jobsScrollRef.current) {
      const scrollAmount = 400; // Scroll by approximately one card width + gap
      const scrollPosition =
        direction === "left"
          ? jobsScrollRef.current.scrollLeft - scrollAmount
          : jobsScrollRef.current.scrollLeft + scrollAmount;

      jobsScrollRef.current.scrollTo({
        left: scrollPosition,
        behavior: "smooth",
      });
    }
  };

  // Scroll functions for courses
  const scrollCourses = (direction: "left" | "right") => {
    if (coursesScrollRef.current) {
      const scrollAmount = 400;
      const scrollPosition =
        direction === "left"
          ? coursesScrollRef.current.scrollLeft - scrollAmount
          : coursesScrollRef.current.scrollLeft + scrollAmount;

      coursesScrollRef.current.scrollTo({
        left: scrollPosition,
        behavior: "smooth",
      });
    }
  };

  // Debug logging
  console.log("🏠 UserHome render:", {
    user: !!user,
    userId: user?.id,
    loadingSkills,
    hasCompletedTest,
    jobsCount: displayJobs.length,
    coursesCount: courses.length,
  });

  // Show loading state if auth is still loading
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto pt-2 pb-20 md:pb-6 px-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-breneo-blue mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // If user is not available, show a message (shouldn't happen due to ProtectedRoute, but safety check)
  if (!user) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto pt-2 pb-20 md:pb-6 px-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-gray-600">
                Please wait while we load your dashboard...
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Mobile Welcome Message */}
      {isMobile && (
        <div className="mb-4 px-4 md:hidden">
          <h1 className="text-xl font-semibold text-foreground">
            Welcome,{" "}
            <span className="font-bold">
              {user?.first_name || user?.email?.split("@")[0] || "User"}
            </span>
            ! 👋🏻
          </h1>
        </div>
      )}
      <div className="max-w-7xl mx-auto pt-2 pb-20 md:pb-6 px-2 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Top Section - Widgets */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Skill Test CTA Widget - Only show if user hasn't completed the test */}
            {!hasCompletedTest && !loadingSkills && (
              <Card
                className="bg-white transition-all w-auto flex-shrink-0 max-w-sm md:max-w-md rounded-3xl border-0 animate-shrink-in"
                style={{
                  boxShadow: "0 6px 20px 0 rgba(0, 0, 0, 0.04)",
                  transform: isSkillTestPressed ? "scale(0.95)" : "scale(1)",
                  transition: "transform 0.1s ease-in-out",
                }}
                onMouseDown={() => setIsSkillTestPressed(true)}
                onMouseUp={() => setIsSkillTestPressed(false)}
                onMouseLeave={() => setIsSkillTestPressed(false)}
                onTouchStart={() => setIsSkillTestPressed(true)}
                onTouchEnd={() => setIsSkillTestPressed(false)}
              >
                <CardContent className="p-4 md:p-4">
                  <Link to="/skill-test" className="block cursor-pointer group">
                    <div className="flex items-center gap-3 md:gap-4">
                      {/* Left side - Content */}
                      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                        <h3 className="font-bold text-lg md:text-xl text-gray-900 group-hover:text-breneo-blue transition-colors leading-tight line-clamp-2 min-h-[3rem]">
                          {t.home.skillTestTitle}
                        </h3>
                        <p className="text-sm md:text-sm text-gray-900">
                          {t.home.skillTestSubtitle}
                        </p>
                      </div>

                      {/* Right side - Illustration / Icon */}
                      <div className="flex-shrink-0 w-28 h-28 md:w-32 md:h-32 flex items-center justify-center">
                        <img
                          src="/lovable-uploads/3dicons-target-dynamic-color.png"
                          alt="Skill test target"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Skill Path CTA Widget - Only show if user has completed the test */}
            {hasCompletedTest && !loadingSkills && (
              <Card
                className="bg-white transition-all w-auto flex-shrink-0 max-w-sm md:max-w-md rounded-3xl border-0 animate-shrink-in"
                style={{
                  boxShadow: "0 6px 20px 0 rgba(0, 0, 0, 0.04)",
                  transform: isSkillPathPressed ? "scale(0.95)" : "scale(1)",
                  transition: "transform 0.1s ease-in-out",
                }}
                onMouseDown={() => setIsSkillPathPressed(true)}
                onMouseUp={() => setIsSkillPathPressed(false)}
                onMouseLeave={() => setIsSkillPathPressed(false)}
                onTouchStart={() => setIsSkillPathPressed(true)}
                onTouchEnd={() => setIsSkillPathPressed(false)}
              >
                <CardContent className="p-4 md:p-4">
                  <Link to="/skill-path" className="block cursor-pointer group">
                    <div className="flex items-center gap-3 md:gap-4">
                      {/* Left side - Content */}
                      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                        <h3 className="font-bold text-lg md:text-xl text-gray-900 group-hover:text-breneo-blue transition-colors leading-tight line-clamp-2 min-h-[3rem]">
                          {t.home.skillPathTitle}
                        </h3>
                        <p className="text-sm md:text-sm text-gray-900">
                          {t.home.skillPathSubtitle}
                        </p>
                      </div>

                      {/* Right side - Illustration */}
                      <div className="flex-shrink-0 w-28 h-28 md:w-32 md:h-32 flex items-center justify-center">
                        <img
                          src="/lovable-uploads/3dicons-explorer-front-color.png"
                          alt="Coding A Website"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content - Top Jobs and Courses */}
          <div className="space-y-6 pt-6 md:pt-8">
            {/* Top Job Picks Section */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 mb-1">
                  Top job picks for you
                </h2>
                {!jobsLoading && !jobsError && displayJobs.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => scrollJobs("left")}
                      aria-label="Scroll left"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => scrollJobs("right")}
                      aria-label="Scroll right"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {jobsLoading ? (
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                  {[...Array(3)].map((_, i) => (
                    <Card
                      key={i}
                      className="relative flex-shrink-0 snap-start w-[calc((100%-2rem)/3)] min-w-[280px]"
                    >
                      <CardContent className="p-4">
                        <Skeleton className="h-4 w-20 mb-2" />
                        <Skeleton className="h-6 w-3/4 mb-4" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : jobsError ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-500 mb-2">
                      Unable to load jobs at the moment.
                    </p>
                    <p className="text-sm text-gray-400">
                      Please try again later.
                    </p>
                  </CardContent>
                </Card>
              ) : displayJobs.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-500">
                      No jobs found. Try adjusting your search criteria.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div
                  ref={jobsScrollRef}
                  className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-2 px-2"
                >
                  {displayJobs.map((job) => (
                    <Card
                      key={job.id}
                      className="group flex flex-col transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 overflow-hidden flex-shrink-0 snap-start cursor-pointer rounded-3xl w-[calc((100%-2rem)/3)] min-w-[280px]"
                      onClick={() => {
                        if (job.id) {
                          navigate(`/jobs/${encodeURIComponent(job.id)}`);
                        }
                      }}
                    >
                      <CardContent className="p-4 flex flex-col flex-grow relative">
                        {/* Company Logo and Info */}
                        <div className="flex items-start gap-2 mb-2">
                          <div className="flex-shrink-0 relative w-10 h-10">
                            {/* Primary: Logo from API */}
                            {job.company_logo ? (
                              <img
                                src={job.company_logo}
                                alt={`${job.company} logo`}
                                className="w-10 h-10 rounded-full object-cover border border-gray-200 absolute inset-0 z-10"
                                loading="lazy"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.onerror = null;
                                  target.style.display = "none";
                                  const clearbitLogo =
                                    target.parentElement?.querySelector(
                                      ".clearbit-logo"
                                    ) as HTMLImageElement;
                                  if (clearbitLogo) {
                                    clearbitLogo.style.display = "block";
                                    clearbitLogo.style.zIndex = "10";
                                  } else {
                                    const iconFallback =
                                      target.parentElement?.querySelector(
                                        ".logo-fallback"
                                      ) as HTMLElement;
                                    if (iconFallback) {
                                      iconFallback.style.display = "flex";
                                      iconFallback.style.zIndex = "10";
                                    }
                                  }
                                }}
                              />
                            ) : null}

                            {/* Fallback 1: Clearbit logo API */}
                            {job.company && !job.company_logo ? (
                              <img
                                src={`https://logo.clearbit.com/${encodeURIComponent(
                                  job.company
                                )}`}
                                alt={`${job.company} logo`}
                                className="w-10 h-10 rounded-full object-cover border border-gray-200 absolute inset-0 clearbit-logo"
                                style={{ zIndex: 10 }}
                                loading="lazy"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.onerror = null;
                                  target.style.display = "none";
                                  const iconFallback =
                                    target.parentElement?.querySelector(
                                      ".logo-fallback"
                                    ) as HTMLElement;
                                  if (iconFallback) {
                                    iconFallback.style.display = "flex";
                                    iconFallback.style.zIndex = "10";
                                  }
                                }}
                              />
                            ) : null}

                            {/* Fallback 2: Default icon */}
                            <div
                              className={`w-10 h-10 rounded-full bg-breneo-accent flex items-center justify-center logo-fallback absolute inset-0 ${
                                job.company_logo ||
                                (job.company && !job.company_logo)
                                  ? "hidden"
                                  : "flex"
                              }`}
                              style={{
                                zIndex:
                                  job.company_logo ||
                                  (job.company && !job.company_logo)
                                    ? 0
                                    : 10,
                              }}
                            >
                              <Briefcase className="h-5 w-5 text-white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm mb-0.5 truncate">
                              {job.company}
                            </h3>
                            <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {job.location}
                            </p>
                          </div>
                        </div>

                        {/* Divider under company/logo/location */}
                        <div className="border-t border-gray-100 dark:border-gray-200 mt-2 mb-3 -mx-4" />

                        {/* Job Title */}
                        <h4 className="font-bold text-base mb-3 line-clamp-2 min-h-[3rem]">
                          {job.title}
                        </h4>

                        {/* Spacer to push details to bottom */}
                        <div className="flex-grow"></div>

                        {/* Job Details - At the bottom */}
                        <div className="space-y-1.5 mt-auto pb-16 md:pb-0">
                          {/* Salary */}
                          {job.salary && (
                            <div className="flex items-center gap-1.5 text-base">
                              <DollarSign className="h-5 w-5 text-gray-400 flex-shrink-0" />
                              <span className="text-gray-700 break-words font-medium">
                                {job.salary}
                              </span>
                            </div>
                          )}

                          {/* Employment Type and Work Arrangement - Inline */}
                          <div className="flex items-center gap-3 flex-wrap">
                            {/* Employment Type */}
                            {job.employment_type && (
                              <div className="flex items-center gap-1.5 text-sm">
                                <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <span className="text-gray-700">
                                  {job.employment_type}
                                </span>
                              </div>
                            )}

                            {/* Work Arrangement */}
                            {job.work_arrangement && (
                              <div className="flex items-center gap-1.5 text-sm">
                                <Briefcase className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <span className="text-gray-700">
                                  {job.work_arrangement}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons - Slide up on hover and overlap details */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-card/95 backdrop-blur-sm flex items-center gap-2 transform translate-y-0 md:translate-y-full md:group-hover:translate-y-0 transition-transform duration-200 ease-in-out shadow-lg z-10">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (job.id) {
                                navigate(`/jobs/${encodeURIComponent(job.id)}`);
                              }
                            }}
                            variant="default"
                            size="xs"
                            className="flex-1 h-10"
                          >
                            View Details
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveJobMutation.mutate(job);
                            }}
                            aria-label={
                              job.is_saved ? "Unsave job" : "Save job"
                            }
                            className="bg-[#E6E7EB] hover:bg-[#E6E7EB]/90 h-10 w-10"
                          >
                            <Bookmark
                              className={`h-4 w-4 transition-colors ${
                                job.is_saved
                                  ? "fill-black text-black"
                                  : "text-black"
                              }`}
                            />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Top Courses Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {/* <GraduationCap className="h-6 w-6 text-breneo-blue" /> */}
                  <h2 className="text-lg font-bold text-gray-900">
                    Top courses picked for you
                  </h2>
                </div>
                {!coursesLoading && courses.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => scrollCourses("left")}
                      aria-label="Scroll courses left"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => scrollCourses("right")}
                      aria-label="Scroll courses right"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {coursesLoading ? (
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-2 px-2">
                  {[...Array(3)].map((_, i) => (
                    <Card
                      key={i}
                      className="relative flex-shrink-0 snap-start w-[calc((100%-2rem)/3)] min-w-[280px]"
                    >
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
              ) : courses.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">
                      No courses available at the moment.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div
                  ref={coursesScrollRef}
                  className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-2 px-2"
                >
                  {courses.map((course) => (
                    <Link
                      key={course.id}
                      to={`/course/${course.id}`}
                      className="flex-shrink-0 snap-start w-[calc((100%-2rem)/3)] min-w-[280px] block"
                    >
                      <Card className="relative transition-all duration-200 cursor-pointer group border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 rounded-3xl w-full flex flex-col">
                        <CardContent className="p-0 overflow-hidden rounded-3xl flex flex-col flex-grow relative">
                          <div className="relative w-full h-40 overflow-hidden rounded-t-3xl isolate">
                            <img
                              src={course.image || "/placeholder.svg"}
                              alt={course.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 origin-center"
                              style={{ transformOrigin: "center center" }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "/placeholder.svg";
                              }}
                            />
                            <div className="absolute top-4 right-4">
                              <Button
                                variant="secondary"
                                size="icon"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  // TODO: Implement save course functionality
                                  toast.info(
                                    "Save course functionality coming soon"
                                  );
                                }}
                                aria-label="Save course"
                                className="bg-[#E6E7EB]/80 hover:bg-[#E6E7EB]/90 h-9 w-9 backdrop-blur-sm"
                              >
                                <Bookmark className="h-4 w-4 text-black/80" />
                              </Button>
                            </div>
                          </div>
                          <div className="p-4 flex flex-col flex-grow min-h-[140px]">
                            <h3 className="font-semibold text-base mb-2 line-clamp-2 group-hover:text-breneo-blue transition-colors">
                              {course.title}
                            </h3>

                            <div className="flex items-center gap-3 mt-auto flex-wrap">
                              {course.duration && (
                                <Badge
                                  variant="outline"
                                  className="text-sm border-gray-300 dark:border-gray-700 px-2.5 py-1"
                                >
                                  <Clock className="h-4 w-4 mr-1.5" />
                                  {course.duration}
                                </Badge>
                              )}
                              {course.level && (
                                <Badge
                                  variant="outline"
                                  className="text-sm border-gray-300 dark:border-gray-700 px-2.5 py-1"
                                >
                                  <Award className="h-4 w-4 mr-1.5" />
                                  {course.level}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserHome;
