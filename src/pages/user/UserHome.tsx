import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
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
import { jobService, JobFilters, ApiJob } from "@/api/jobs";

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

interface Webinar {
  id: string;
  title: string;
  company: string;
  time: string;
  date: string;
  logo?: string;
}

// Fetch jobs from job service API with skill-based filtering
const fetchJobs = async (topSkills: string[] = []) => {
  try {
  // Build query based on top skills
  let query = "developer"; // Default fallback
  if (topSkills.length > 0) {
    // Use top 3 skills for the query
    const skillsQuery = topSkills.slice(0, 3).join(" ");
    query = skillsQuery;
  }

    // Create filters with user's skills
    const filters: JobFilters = {
      country: "United States", // Default to US
      countries: ["us"], // Default to US
      jobTypes: [], // No specific job type filter
      isRemote: false, // Show both remote and on-site
      datePosted: undefined, // Show all jobs regardless of date
      skills: topSkills, // Filter by user's top skills
    };

    // Fetch jobs using the job service
    const response = await jobService.fetchActiveJobs({
      query,
      filters,
      page: 1,
      pageSize: 20, // Get more jobs to have better selection
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
  const [userTopSkills, setUserTopSkills] = useState<string[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [hasCompletedTest, setHasCompletedTest] = useState(false);

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
              <p className="text-gray-600">Please wait while we load your dashboard...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
          const response = await apiClient.get(`/api/skilltest/results/?user=${user.id}`);
          console.log("🔍 Checking Django API skill test results:", response.data);
          
          let skillTestData = null;
          if (Array.isArray(response.data) && response.data.length > 0) {
            skillTestData = response.data[0];
          } else if (response.data && typeof response.data === "object") {
            skillTestData = response.data;
          }
          
          if (skillTestData && (skillTestData.final_role || skillTestData.skills_json)) {
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
          console.log("Django API endpoint not available, trying other methods...");
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
          console.log("User skills API endpoint not available, trying Supabase...");
        }

        // Method 3: Fallback to Supabase: fetch from usertestanswers
        const answers = await getUserTestAnswers(String(user.id));
        console.log("🔍 Checking test completion:", {
          userId: user.id,
          answersCount: answers?.length || 0,
          hasAnswers: answers && answers.length > 0
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

  // Fetch jobs based on user's top skills
  const { data: jobs = [], isLoading: jobsLoading, error: jobsError } = useQuery({
    queryKey: ["home-jobs", userTopSkills.join(",")],
    queryFn: () => fetchJobs(userTopSkills),
    enabled: !!user && !loadingSkills,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    onError: (error) => {
      console.error("Error fetching jobs:", error);
    },
  });

  // Fetch courses
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["home-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) {
        console.error("Error fetching courses:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!user,
  });

  // Mock webinars data (since we don't have a webinars table yet)
  const mockWebinars: Webinar[] = [
    {
      id: "1",
      title: "Career Growth Strategies",
      company: "Breneo Academy",
      time: "14:00 - 15:00",
      date: "15 Dec",
    },
    {
      id: "2",
      title: "Tech Skills Workshop",
      company: "Tech Experts",
      time: "16:00 - 17:00",
      date: "15 Dec",
    },
    {
      id: "3",
      title: "Digital Marketing Bootcamp",
      company: "Marketing Pro",
      time: "18:00 - 19:00",
      date: "15 Dec",
    },
  ];

  // Transform jobs - handle empty or undefined arrays
  const transformedJobs: Job[] = (jobs || [])
    .slice(0, 6)
    .map((job: ApiJob) => {
      // Extract job ID - check all possible fields
      const jobId = job.job_id || job.id || "";
      if (!jobId) {
        console.warn("Skipping job without valid ID:", job);
        return null;
      }

      // Extract job title - check all possible fields
      const jobTitle =
        job.job_title ||
        job.title ||
        job.position ||
        "Untitled Position";

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
          ? (job.company as { logo?: string; company_logo?: string })
              .logo ||
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

    return {
        id: jobId,
        title: jobTitle,
        company: companyName,
      location,
        logo,
        company_logo: logo,
        salary,
        employment_type: employmentType,
        work_arrangement: workArrangement,
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
    })
    .filter((job): job is Job => job !== null); // Filter out null jobs

  // Show all jobs in horizontal scroll (limit to 10 for performance)
  const displayJobs = transformedJobs.slice(0, 10);

  // Debug logging
  console.log("🏠 UserHome render:", {
    user: !!user,
    userId: user?.id,
    loadingSkills,
    hasCompletedTest,
    jobsCount: displayJobs.length,
    coursesCount: courses.length,
  });

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto pt-2 pb-20 md:pb-6 px-2 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Top Section - Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Skill Test CTA Widget - Only show if user hasn't completed the test */}
            {!hasCompletedTest && !loadingSkills && (
              <Card className="bg-white hover:shadow-md transition-shadow border border-gray-200">
                <CardContent className="p-4">
                  <Link to="/skill-test" className="block cursor-pointer group">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-breneo-blue/10 flex items-center justify-center">
                        <ClipboardCheck className="h-6 w-6 text-breneo-blue" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-gray-900 mb-1 group-hover:text-breneo-blue transition-colors">
                          Discover Your Skills
                        </h3>
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                          Take our skill assessment to unlock personalized recommendations.
                        </p>
                        <Button size="sm" className="bg-breneo-blue hover:bg-breneo-blue/90 text-xs h-7 px-3">
                          <Play className="h-3 w-3 mr-1" />
                          Start Test
                        </Button>
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Skill Path CTA Widget - Only show if user has completed the test */}
            {hasCompletedTest && !loadingSkills && (
              <Card className="bg-white hover:shadow-md transition-shadow border border-gray-200">
                <CardContent className="p-4">
                  <Link to="/skill-path" className="block cursor-pointer group">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-breneo-blue/10 flex items-center justify-center">
                        <Target className="h-6 w-6 text-breneo-blue" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-gray-900 mb-1 group-hover:text-breneo-blue transition-colors">
                          Your Skill Path
                        </h3>
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                          Explore your personalized career path with recommendations.
                        </p>
                        <Button size="sm" className="bg-breneo-blue hover:bg-breneo-blue/90 text-xs h-7 px-3">
                          <Target className="h-3 w-3 mr-1" />
                          View Path
                        </Button>
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Webinars Widget */}
            <Card className="bg-white hover:shadow-md transition-shadow border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-breneo-blue/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-breneo-blue" />
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900">
                    Webinars
                  </h3>
                </div>

                {/* Webinar List - Compact */}
                <div className="space-y-2">
                  {mockWebinars.slice(0, 2).map((webinar) => (
                    <div
                      key={webinar.id}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className="w-6 h-6 rounded-full bg-breneo-blue/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-breneo-blue font-semibold text-xs">
                          {webinar.company.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-xs text-gray-900 line-clamp-1">
                          {webinar.title}
                        </h4>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{webinar.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Top Jobs and Courses */}
          <div className="space-y-6">
            {/* Top Job Picks Section */}
            <div>
              <div className="mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    Top job picks for you
                  </h2>
                  {userTopSkills.length > 0 && (
                    <p className="text-sm text-gray-500">
                      Matched based on your skills:{" "}
                      <span className="font-medium text-breneo-blue">
                        {userTopSkills.slice(0, 3).join(", ")}
                      </span>
                    </p>
                  )}
              </div>

              {jobsLoading ? (
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="relative flex-shrink-0 w-72">
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
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
                  {displayJobs.map((job) => (
                    <Card
                      key={job.id}
                      className="group flex flex-col hover:shadow-lg transition-all duration-200 border border-gray-200 overflow-hidden flex-shrink-0 w-72 cursor-pointer"
                      onClick={() => {
                        if (job.id) {
                          navigate(`/jobs/${encodeURIComponent(job.id)}`);
                        }
                      }}
                    >
                      <CardContent className="p-4 flex flex-col flex-grow relative">
                        {/* Company Logo and Info */}
                        <div className="flex items-start gap-2 mb-3">
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

                        {/* Job Title */}
                        <h4 className="font-bold text-base mb-3 line-clamp-2">
                          {job.title}
                        </h4>

                        {/* Job Details */}
                        <div className="space-y-1.5 mb-3 flex-grow">
                          {/* Salary */}
                          {job.salary && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <DollarSign className="h-3 w-3 text-gray-400 flex-shrink-0" />
                              <span className="text-gray-700 truncate">
                                {job.salary}
                              </span>
                            </div>
                          )}

                          {/* Employment Type */}
                          {job.employment_type && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
                              <span className="text-gray-700">
                                {job.employment_type}
                              </span>
                            </div>
                          )}

                          {/* Work Arrangement */}
                          {job.work_arrangement && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Briefcase className="h-3 w-3 text-gray-400 flex-shrink-0" />
                              <span className="text-gray-700">
                                {job.work_arrangement}
                          </span>
                            </div>
                          )}
                        </div>

                        {/* Action Button - Slide up on hover */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-card flex items-center gap-2 transform translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-in-out shadow-lg">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (job.id) {
                                navigate(`/jobs/${encodeURIComponent(job.id)}`);
                              }
                            }}
                            className="flex-1 bg-gray-800 dark:bg-gray-700 text-white hover:bg-gray-900 dark:hover:bg-gray-600 rounded-lg text-xs py-1.5 h-auto"
                          >
                            View Details
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
                  <GraduationCap className="h-6 w-6 text-breneo-blue" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    Top courses picked for you
                  </h2>
                </div>
                {userTopSkills.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Based on:</span>
                    <div className="flex gap-1">
                      {userTopSkills.slice(0, 2).map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="text-xs bg-breneo-blue/10 text-breneo-blue border-0"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {coursesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="relative">
                      <CardContent className="p-0">
                        <Skeleton className="h-40 w-full rounded-t-lg" />
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
                    <p className="text-gray-500">No courses available at the moment.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {courses.slice(0, 3).map((course) => (
                    <Link key={course.id} to={`/course/${course.id}`}>
                      <Card className="relative hover:shadow-lg transition-all duration-200 cursor-pointer group border border-gray-200 hover:border-breneo-blue/30">
                        <CardContent className="p-0 overflow-hidden">
                          <div className="relative">
                            <img
                              src={course.image || "/placeholder.svg"}
                              alt={course.title}
                              className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-200"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/placeholder.svg";
                              }}
                            />
                            <div className="absolute top-4 right-4">
                              <div className="bg-white/90 backdrop-blur-sm rounded-full p-1.5">
                                <Bookmark className="h-4 w-4 text-gray-600" />
                              </div>
                            </div>
                            {course.category && (
                              <div className="absolute top-4 left-4">
                                <Badge className="bg-breneo-blue text-white text-xs">
                                  {course.category}
                                </Badge>
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold text-base mb-2 line-clamp-2 group-hover:text-breneo-blue transition-colors">
                              {course.title}
                            </h3>

                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-6 h-6 rounded-full bg-breneo-blue/10 flex items-center justify-center flex-shrink-0">
                                <GraduationCap className="h-3 w-3 text-breneo-blue" />
                              </div>
                              <span className="text-xs text-gray-600 font-medium">
                                {course.provider || "Breneo Academy"}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                              {course.duration && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  <span>{course.duration}</span>
                                </div>
                              )}
                              {course.level && (
                                <Badge
                                  variant="outline"
                                  className="text-xs border-gray-300"
                                >
                                  <Award className="h-3 w-3 mr-1" />
                                  {course.level}
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                              <span className="text-xs text-gray-500">
                                View details
                              </span>
                              <button className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-breneo-blue group-hover:text-white flex items-center justify-center transition-colors">
                                <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-white transition-colors" />
                              </button>
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
