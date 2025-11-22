import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  Search,
  Filter,
  Bookmark,
  MapPin,
  Clock,
  Briefcase,
  DollarSign,
  Tag,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { toast } from "sonner";
import { JobFilterModal } from "@/components/jobs/JobFilterModal";
import { LocationDropdown } from "@/components/jobs/LocationDropdown";
import { WorkTypeDropdown } from "@/components/jobs/WorkTypeDropdown";
import { useMobile } from "@/hooks/use-mobile";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import {
  getUserTestAnswers,
  calculateSkillScores,
  getTopSkills,
} from "@/utils/skillTestUtils";
import { jobService, JobFilters, ApiJob } from "@/api/jobs";
import { useTranslation } from "@/contexts/LanguageContext";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  company_logo?: string;
  is_saved: boolean;
  salary?: string;
  employment_type?: string;
  work_arrangement?: string;
  benefits?: string;
  matchPercentage?: number;
  datePosted?: string;
}

const jobTypeLabels: Record<string, string> = {
  FULLTIME: "Full Time",
  PARTTIME: "Part Time",
  CONTRACTOR: "Contractor",
  INTERN: "Intern",
};

// Function to extract skills from job data
const extractJobSkills = (job: ApiJob): string[] => {
  const skills: string[] = [];
  const textToSearch = [
    job.job_title || job.title || "",
    job.description || "",
    job.job_description || "",
    job.job_required_experience || job.required_experience || "",
  ]
    .join(" ")
    .toLowerCase();

  const skillKeywords: Record<string, string[]> = {
    javascript: ["javascript", "js", "node.js", "nodejs", "react", "vue", "angular"],
    python: ["python", "django", "flask", "fastapi"],
    java: ["java", "spring", "spring boot"],
    "c++": ["c++", "cpp", "c plus plus"],
    "c#": ["c#", "csharp", "dotnet", ".net"],
    go: ["go", "golang"],
    rust: ["rust"],
    php: ["php", "laravel", "symfony"],
    ruby: ["ruby", "rails"],
    swift: ["swift", "ios"],
    kotlin: ["kotlin", "android"],
    typescript: ["typescript", "ts"],
    html: ["html", "html5"],
    css: ["css", "css3", "sass", "scss", "tailwind"],
    sql: ["sql", "mysql", "postgresql", "mongodb", "database"],
    react: ["react", "reactjs", "react.js"],
    vue: ["vue", "vuejs", "vue.js"],
    angular: ["angular", "angularjs"],
    "node.js": ["node.js", "nodejs", "node"],
    express: ["express", "express.js"],
    django: ["django"],
    flask: ["flask"],
    spring: ["spring", "spring boot"],
    laravel: ["laravel"],
    rails: ["rails", "ruby on rails"],
    git: ["git", "github", "gitlab"],
    docker: ["docker", "containerization"],
    kubernetes: ["kubernetes", "k8s"],
    aws: ["aws", "amazon web services"],
    azure: ["azure", "microsoft azure"],
    gcp: ["gcp", "google cloud", "google cloud platform"],
    linux: ["linux", "unix"],
    "machine learning": ["machine learning", "ml", "deep learning", "neural network"],
    "data science": ["data science", "data analysis", "data analytics"],
    ai: ["artificial intelligence", "ai", "nlp", "natural language processing"],
    blockchain: ["blockchain", "ethereum", "solidity", "web3"],
    devops: ["devops", "ci/cd", "continuous integration"],
    testing: ["testing", "qa", "quality assurance", "test automation"],
    ui: ["ui", "user interface", "ux", "user experience"],
    design: ["design", "figma", "sketch", "adobe"],
  };

  Object.keys(skillKeywords).forEach((skill) => {
    const keywords = skillKeywords[skill];
    if (keywords.some((keyword) => textToSearch.includes(keyword))) {
      skills.push(skill);
    }
  });

  return [...new Set(skills)];
};

const calculateMatchPercentage = (
  userSkills: string[],
  jobSkills: string[]
): number => {
  if (jobSkills.length === 0) return 50;
  if (userSkills.length === 0) return 0;

  const normalizeSkill = (skill: string) =>
    skill.toLowerCase().trim().replace(/\s+/g, " ");

  const normalizedUserSkills = userSkills.map(normalizeSkill);
  const normalizedJobSkills = jobSkills.map(normalizeSkill);

  const matchingSkills = normalizedUserSkills.filter((userSkill) =>
    normalizedJobSkills.some((jobSkill) => {
      if (userSkill === jobSkill) return true;
      if (userSkill.includes(jobSkill) || jobSkill.includes(userSkill)) return true;
      return false;
    })
  );

  const matchPercentage = Math.round(
    (matchingSkills.length / normalizedJobSkills.length) * 100
  );

  return Math.min(matchPercentage, 100);
};

// Helper function to format date from API
const formatJobDate = (dateString: string | undefined): string => {
  if (!dateString) {
    return new Date().toLocaleDateString("ka-GE");
  }

  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return new Date().toLocaleDateString("ka-GE");
    }
    return date.toLocaleDateString("ka-GE");
  } catch (error) {
    console.warn("Error parsing date:", dateString, error);
    return new Date().toLocaleDateString("ka-GE");
  }
};

const JobSearchResultsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useMobile();
  const [isFilterModalOpen, setFilterModalOpen] = useState(false);
  const [userTopSkills, setUserTopSkills] = useState<string[]>([]);
  const [dateSortOrder, setDateSortOrder] = useState<"desc" | "asc">("desc");
  const t = useTranslation();

  // Get search term and filters from URL
  const searchTerm = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  // Debug log
  useEffect(() => {
    console.log("🔍 JobSearchResultsPage loaded:", { searchTerm, page, searchParams: searchParams.toString() });
  }, [searchTerm, page, searchParams]);

  const [activeFilters, setActiveFilters] = useState<JobFilters>(() => {
    const countriesParam = searchParams.get("countries");
    const skillsParam = searchParams.get("skills");
    const jobTypesParam = searchParams.get("jobTypes");
    const isRemoteParam = searchParams.get("isRemote");
    const datePostedParam = searchParams.get("datePosted");
    const salaryMinParam = searchParams.get("salaryMin");
    const salaryMaxParam = searchParams.get("salaryMax");
    const salaryByAgreementParam = searchParams.get("salaryByAgreement");

    return {
      country: "Georgia",
      countries: countriesParam ? countriesParam.split(",").filter(Boolean) : [],
      jobTypes: jobTypesParam ? jobTypesParam.split(",").filter(Boolean) : [],
      isRemote: isRemoteParam === "true",
      datePosted: datePostedParam || undefined,
      skills: skillsParam ? skillsParam.split(",").filter(Boolean) : [],
      salaryMin: salaryMinParam ? parseInt(salaryMinParam, 10) : undefined,
      salaryMax: salaryMaxParam ? parseInt(salaryMaxParam, 10) : undefined,
      salaryByAgreement: salaryByAgreementParam === "true",
    };
  });

  const [tempFilters, setTempFilters] = useState<JobFilters>(activeFilters);

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

  // Fetch user skills
  useEffect(() => {
    const fetchUserSkills = async () => {
      if (!user) return;
      try {
        // Try to fetch from API first (skill test results)
        try {
          const response = await apiClient.get("/api/skilltest/results/");
          if (
            response.data &&
            Array.isArray(response.data) &&
            response.data.length > 0
          ) {
            const result = response.data[0];
            const skillsJson = result.skills_json;

            // Extract skills from tech and soft skills
            const allSkills: string[] = [];
            if (skillsJson?.tech) {
              allSkills.push(...Object.keys(skillsJson.tech));
            }
            if (skillsJson?.soft) {
              allSkills.push(...Object.keys(skillsJson.soft));
            }

            // Get top 5 skills
            const topSkills = allSkills.slice(0, 5);
            setUserTopSkills(topSkills);
            return;
          }
        } catch (apiError) {
          console.log("API endpoint not available, trying Supabase...");
        }

        // Fallback to Supabase: fetch from usertestanswers
        const answers = await getUserTestAnswers(String(user.id));
        if (answers && answers.length > 0) {
          const skillScores = calculateSkillScores(answers);
          const topSkillsData = getTopSkills(skillScores, 5);
          const topSkills = topSkillsData.map((s) => s.skill);
          setUserTopSkills(topSkills);
        }
      } catch (error) {
        console.error("Error fetching user skills:", error);
      }
    };
    fetchUserSkills();
  }, [user]);

  // Fetch jobs
  const fetchJobs = async (
    searchTerm: string,
    filters: JobFilters,
    page: number
  ): Promise<{ jobs: ApiJob[]; hasMore: boolean; total: number }> => {
    try {
      const response = await jobService.fetchActiveJobs({
        query: searchTerm || "",
        filters,
        page,
        pageSize: 12,
      });

      if (!response || !Array.isArray(response.jobs)) {
        return { jobs: [], hasMore: false, total: 0 };
      }

      const validJobs = response.jobs.filter((job) => {
        const jobId = job.job_id || job.id;
        return jobId && jobId.trim() !== "";
      });

      return {
        jobs: validJobs,
        hasMore: response.hasMore ?? false,
        total: response.total ?? validJobs.length,
      };
    } catch (error) {
      console.error("Error fetching jobs:", error);
      throw error;
    }
  };

  const filtersKey = useMemo(() => {
    return JSON.stringify({
      countries: activeFilters.countries.sort(),
      skills: activeFilters.skills.sort(),
      jobTypes: activeFilters.jobTypes.sort(),
      isRemote: activeFilters.isRemote,
      datePosted: activeFilters.datePosted,
    });
  }, [activeFilters]);

  const {
    data: jobsData = { jobs: [], hasMore: false, total: 0 },
    isLoading,
    error,
  } = useQuery({
    queryKey: ["job-search", searchTerm, filtersKey, page],
    queryFn: () => fetchJobs(searchTerm, activeFilters, page),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const jobs = jobsData.jobs || [];
  const hasMore = jobsData.hasMore || false;
  const totalJobs = jobsData.total || 0;

  // Transform jobs
  const transformedJobs: Job[] = useMemo(() => {
    if (!jobs || jobs.length === 0) return [];

    return jobs
      .map((job: ApiJob): Job | null => {
        const jobId = job.job_id || job.id || "";
        if (!jobId || jobId.trim() === "") return null;

        const jobTitle =
          job.job_title || job.title || job.position || "Untitled Position";
        const companyName =
          job.employer_name ||
          job.company_name ||
          (typeof job.company === "string" ? job.company : null) ||
          "Unknown Company";

        const jobCity = job.job_city || job.city || "";
        const jobState = job.job_state || job.state || "";
        const jobCountry = job.job_country || job.country || "";
        const location =
          job.job_location ||
          job.location ||
          [jobCity, jobState, jobCountry].filter(Boolean).join(", ") ||
          "Location not specified";

        const applyLink =
          job.job_apply_link ||
          job.apply_link ||
          job.url ||
          job.apply_url ||
          "";

        let companyLogo: string | undefined =
          job.employer_logo || job.company_logo || job.logo || job.logo_url;

        if (companyLogo) {
          try {
            const url = new URL(companyLogo);
            if (!url.protocol.startsWith("http")) {
              companyLogo = undefined;
            }
          } catch {
            companyLogo = undefined;
          }
        }

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

        const employmentTypeRaw =
          job.job_employment_type ||
          job.employment_type ||
          job.type ||
          "FULLTIME";
        const employmentType =
          jobTypeLabels[employmentTypeRaw] || employmentTypeRaw || "Full time";

        let workArrangement = "On-site";
        const isRemote =
          job.job_is_remote || job.is_remote || job.remote === true;
        if (isRemote) {
          workArrangement = "Remote";
        } else if (jobTitle?.toLowerCase().includes("hybrid")) {
          workArrangement = "Hybrid";
        }

        const jobSkills = extractJobSkills(job);
        const matchPercentage = calculateMatchPercentage(userTopSkills, jobSkills);

        // Extract date posted - try all possible date fields from API
        // JSearch API typically uses: job_posted_at_datetime_utc, date_posted, or posted_date
        const datePosted =
          job.job_posted_at_datetime_utc || // JSearch API primary field
          job.date_posted ||
          job.posted_date ||
          job.postedAt ||
          job.job_posted_at ||
          (job as any).job_publish_timestamp ||
          (job as any).publish_time ||
          job.created_at ||
          job.published_at ||
          undefined;
        
        // Debug: Log if we found a date (only in development)
        if (process.env.NODE_ENV === 'development' && datePosted) {
          console.log('Job date found:', { jobId: jobId, datePosted, title: jobTitle });
        }

        return {
          id: jobId,
          title: jobTitle,
          company: companyName,
          location,
          url: applyLink,
          company_logo: companyLogo,
          is_saved: savedJobs?.includes(String(jobId)),
          salary,
          employment_type: employmentType,
          work_arrangement: workArrangement,
          matchPercentage,
          datePosted,
        };
      })
      .filter((job): job is Job => job !== null);
  }, [jobs, savedJobs, userTopSkills]);

  // Sort jobs by date
  const regularJobs = useMemo(() => {
    const sorted = [...transformedJobs].sort((a, b) => {
      // If no date, put at the end
      if (!a.datePosted && !b.datePosted) return 0;
      if (!a.datePosted) return 1;
      if (!b.datePosted) return -1;

      const dateA = new Date(a.datePosted).getTime();
      const dateB = new Date(b.datePosted).getTime();

      if (dateSortOrder === "desc") {
        // Newest first (descending)
        return dateB - dateA;
      } else {
        // Oldest first (ascending)
        return dateA - dateB;
      }
    });

    return sorted;
  }, [transformedJobs, dateSortOrder]);

  // Save job mutation
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
          if (currentSavedJobs.some((id: string | number) => String(id) === jobId)) {
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

  const updateUrlWithFilters = (
    filters: JobFilters,
    search: string,
    pageNum: number
  ) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (pageNum > 1) params.set("page", String(pageNum));
    if (filters.countries.length > 0) {
      params.set("countries", filters.countries.join(","));
    }
    if (filters.skills.length > 0) {
      params.set("skills", filters.skills.join(","));
    }
    if (filters.jobTypes.length > 0) {
      params.set("jobTypes", filters.jobTypes.join(","));
    }
    if (filters.isRemote) {
      params.set("isRemote", "true");
    }
    if (filters.datePosted) {
      params.set("datePosted", filters.datePosted);
    }
    if (filters.salaryMin !== undefined) {
      params.set("salaryMin", String(filters.salaryMin));
    }
    if (filters.salaryMax !== undefined) {
      params.set("salaryMax", String(filters.salaryMax));
    }
    if (filters.salaryByAgreement) {
      params.set("salaryByAgreement", "true");
    }
    setSearchParams(params, { replace: true });
  };

  const handleSearch = (value: string) => {
    const newPage = 1;
    updateUrlWithFilters(activeFilters, value, newPage);
  };

  const handleApplyFilters = () => {
    const newPage = 1;
    setActiveFilters(tempFilters);
    updateUrlWithFilters(tempFilters, searchTerm, newPage);
    setFilterModalOpen(false);
  };

  const handleClearFilters = () => {
    const clearedFilters: JobFilters = {
      country: "Georgia",
      countries: [],
      jobTypes: [],
      isRemote: false,
      datePosted: undefined,
      skills: [],
      salaryMin: undefined,
      salaryMax: undefined,
      salaryByAgreement: false,
    };
    const newPage = 1;
    setTempFilters(clearedFilters);
    setActiveFilters(clearedFilters);
    updateUrlWithFilters(clearedFilters, searchTerm, newPage);
    setFilterModalOpen(false);
  };

  const handleNextPage = () => {
    const newPage = page + 1;
    updateUrlWithFilters(activeFilters, searchTerm, newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrevPage = () => {
    const newPage = Math.max(1, page - 1);
    updateUrlWithFilters(activeFilters, searchTerm, newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isNextPagePossible = hasMore && transformedJobs.length > 0;
  const isPrevPagePossible = page > 1;

  const actualJobsPerPage = transformedJobs.length;
  let startIndex = 1;
  let endIndex = actualJobsPerPage;

  if (totalJobs > 0 && actualJobsPerPage > 0) {
    const estimatedItemsBefore = (page - 1) * actualJobsPerPage;
    startIndex = Math.min(estimatedItemsBefore + 1, totalJobs);
    endIndex = Math.min(estimatedItemsBefore + actualJobsPerPage, totalJobs);
  } else if (actualJobsPerPage > 0) {
    startIndex = 1;
    endIndex = actualJobsPerPage;
  }

  let estimatedTotalPages: number | null = null;
  if (totalJobs > 0 && actualJobsPerPage > 0) {
    estimatedTotalPages = Math.ceil(totalJobs / actualJobsPerPage);
  } else if (hasMore) {
    estimatedTotalPages = page + 1;
  } else if (transformedJobs.length > 0) {
    estimatedTotalPages = page;
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto pt-2 pb-20 md:pb-6 px-2 sm:px-6 lg:px-8">
        {/* Search Bar */}
        <div className="mb-8 relative">
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white dark:bg-[#242424] border border-breneo-blue dark:border-breneo-blue-dark rounded-lg pl-3 md:pl-4 pr-2.5 md:pr-3 py-[1rem] overflow-visible flex-1">
              <Search
                className="h-5 w-5 text-breneo-blue dark:text-breneo-blue-dark flex-shrink-0 mr-3"
                strokeWidth={2}
              />
              <Input
                type="text"
                placeholder={t.jobs.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm text-gray-900 dark:text-gray-100 flex-1 min-w-0 bg-transparent h-auto py-0 rounded-none"
              />
              {!isMobile && (
                <>
                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-2 flex-shrink-0" />
                  <div className="flex items-center flex-1 min-w-0 relative">
                    <WorkTypeDropdown
                      selectedWorkTypes={activeFilters.jobTypes}
                      onWorkTypesChange={(types) => {
                        const newFilters = { ...activeFilters, jobTypes: types };
                        setActiveFilters(newFilters);
                        setTempFilters(newFilters);
                        updateUrlWithFilters(newFilters, searchTerm, 1);
                      }}
                    />
                  </div>
                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-2 flex-shrink-0" />
                  <div className="flex items-center flex-1 min-w-0 relative">
                    <LocationDropdown
                      selectedLocations={activeFilters.countries}
                      onLocationsChange={(countries) => {
                        const newFilters = { ...activeFilters, countries };
                        setActiveFilters(newFilters);
                        setTempFilters(newFilters);
                        updateUrlWithFilters(newFilters, searchTerm, 1);
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            <Button
              variant="outline"
              onClick={() => setFilterModalOpen(true)}
              className="flex items-center gap-2 bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-[1rem] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 whitespace-nowrap h-auto"
            >
              <Filter className="h-4 w-4" strokeWidth={2} />
              <span className="hidden md:inline text-sm font-medium">
                {t.jobs.filters}
              </span>
            </Button>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {totalJobs > 0 
                ? `${totalJobs} ${t.jobs.vacancies}` 
                : `${transformedJobs.length} ${t.jobs.vacancies}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-2 md:px-3"
              onClick={() => {
                setDateSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
              }}
            >
              <span className="text-xs md:text-sm whitespace-nowrap">
                {isMobile
                  ? dateSortOrder === "desc"
                    ? t.jobs.dateDescending
                    : t.jobs.dateAscending
                  : dateSortOrder === "desc"
                  ? t.jobs.dateDescendingFull
                  : t.jobs.dateAscendingFull}
              </span>
              {dateSortOrder === "desc" ? (
                <ArrowDown className="h-4 w-4 ml-1 md:ml-2" />
              ) : (
                <ArrowUp className="h-4 w-4 ml-1 md:ml-2" />
              )}
            </Button>
          </div>
        </div>

        {/* Job List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="border border-red-200">
            <CardContent className="p-6 text-center">
              <p className="text-red-600">{t.jobs.errorLoading}</p>
            </CardContent>
          </Card>
        ) : transformedJobs.length === 0 ? (
          <div className="text-center p-10 border border-dashed rounded-lg text-muted-foreground">
            <img
              src="/lovable-uploads/no-data-found.png"
              alt="No data found"
              className="mx-auto h-64 w-64 mb-4 object-contain"
            />
            <h4 className="text-lg font-semibold mb-2">{t.jobs.noJobs}</h4>
            <p className="text-sm">
              {t.jobs.tryAdjustingFilters}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {regularJobs.map((job) => (
              <div
                key={job.id}
                className={`group cursor-pointer ${
                  job.matchPercentage !== undefined && job.matchPercentage > 0
                    ? "p-[2px] rounded-lg bg-gradient-to-r from-breneo-blue via-breneo-accent to-breneo-blue"
                    : ""
                }`}
                onClick={() => navigate(`/jobs/${encodeURIComponent(job.id)}`)}
              >
                <Card
                  className={`border ${
                    job.matchPercentage !== undefined && job.matchPercentage > 0
                      ? "border-transparent rounded-lg"
                      : "border-gray-200"
                  } hover:shadow-md transition-shadow`}
                >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Company Logo */}
                    <div className="flex-shrink-0 relative w-12 h-12">
                      {job.company_logo ? (
                        <img
                          src={job.company_logo}
                          alt={job.company}
                          className="w-12 h-12 rounded-full object-cover border border-gray-300 absolute inset-0 z-10"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const fallback = target.parentElement?.querySelector(".logo-fallback") as HTMLElement;
                            if (fallback) {
                              fallback.style.display = "flex";
                              fallback.style.zIndex = "10";
                            }
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-12 h-12 rounded-full bg-breneo-blue/10 flex items-center justify-center border border-gray-300 logo-fallback absolute inset-0 ${job.company_logo ? "z-0" : "z-10"}`}
                        style={{ display: job.company_logo ? "none" : "flex" }}
                      >
                        <Briefcase className="h-6 w-6 text-breneo-blue" />
                      </div>
                    </div>

                    {/* Job Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-1 md:mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-normal text-sm text-gray-600 mb-1 line-clamp-1">
                            {job.company}
                          </h3>
                          <h4 className="font-bold text-base md:text-lg mb-1 md:mb-2 line-clamp-2 md:line-clamp-3">
                            {job.title}
                          </h4>
                        </div>
                        {job.matchPercentage !== undefined && (
                          <Badge className="bg-breneo-blue/10 text-breneo-blue border-breneo-blue/20 flex-shrink-0">
                            {job.matchPercentage}% Match
                          </Badge>
                        )}
                      </div>

                      {/* Mobile: Location, Date, and Save button */}
                      {isMobile ? (
                        <div className="flex items-start justify-between gap-4 mt-1">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm text-gray-600">
                              {job.location}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatJobDate(job.datePosted)}
                            </span>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveJobMutation.mutate(job);
                            }}
                            className="bg-[#E6E7EB] hover:bg-[#E6E7EB]/90 h-9 w-9 p-0 rounded-full flex-shrink-0"
                          >
                            <Bookmark
                              className={`h-4 w-4 ${
                                job.is_saved ? "fill-black text-black" : "text-black"
                              }`}
                            />
                          </Button>
                        </div>
                      ) : (
                        /* Desktop: All details in one row */
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-4 w-4" />
                              <span>{job.location}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4" />
                              <span>{job.employment_type}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Briefcase className="h-4 w-4" />
                              <span>{job.work_arrangement}</span>
                            </div>
                          </div>
                          <div className="flex items-center flex-shrink-0 ml-auto relative h-9">
                            <span className="text-xs text-gray-500 group-hover:opacity-0 transition-opacity duration-200 flex items-center h-9">
                              {formatJobDate(job.datePosted)}
                            </span>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                saveJobMutation.mutate(job);
                              }}
                              className="bg-[#E6E7EB] hover:bg-[#E6E7EB]/90 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-9 w-9 p-0 absolute right-0 rounded-full"
                            >
                              <Bookmark
                                className={`h-4 w-4 ${
                                  job.is_saved ? "fill-black text-black" : "text-black"
                                }`}
                              />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && transformedJobs.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {totalJobs > 0 ? (
                <>
                  {t.jobs.showing} {startIndex}-{Math.min(endIndex, totalJobs)} {t.jobs.of} {totalJobs} {t.jobs.vacancies}
                </>
              ) : (
                <>{t.jobs.showing} {transformedJobs.length} {t.jobs.vacancies}</>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4"
                onClick={handlePrevPage}
                disabled={!isPrevPagePossible || isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t.jobs.previous}
              </Button>
              <div className="flex items-center gap-1 px-2">
                <span className="text-sm text-gray-600 font-medium">{t.jobs.page} {page}</span>
                {estimatedTotalPages && (
                  <span className="text-sm text-gray-400">/ {estimatedTotalPages}</span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4"
                onClick={handleNextPage}
                disabled={!isNextPagePossible || isLoading}
              >
                {t.jobs.next}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        <JobFilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setFilterModalOpen(false)}
          filters={tempFilters}
          onFiltersChange={setTempFilters}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
          userTopSkills={userTopSkills}
        />
      </div>
    </DashboardLayout>
  );
};

export default JobSearchResultsPage;

