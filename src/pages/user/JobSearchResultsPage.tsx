import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RadialProgress } from "@/components/ui/radial-progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  Search,
  Filter,
  Heart,
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
  SlidersHorizontal,
  ExternalLink,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { JobFilterModal } from "@/components/jobs/JobFilterModal";
import { LocationDropdown } from "@/components/jobs/LocationDropdown";
import { WorkTypeDropdown } from "@/components/jobs/WorkTypeDropdown";
import { useMobile } from "@/hooks/use-mobile";
import { countries } from "@/data/countries";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import {
  getUserTestAnswers,
  calculateSkillScores,
  getTopSkills,
} from "@/utils/skillTestUtils";
import { jobService, JobFilters, ApiJob } from "@/api/jobs";
import { useTranslation } from "@/contexts/LanguageContext";
import { filterTechJobs, filterATSJobs } from "@/utils/jobFilterUtils";
import { cn } from "@/lib/utils";

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
  jobSkills?: string[];
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
    javascript: [
      "javascript",
      "js",
      "node.js",
      "nodejs",
      "react",
      "vue",
      "angular",
    ],
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
    "machine learning": [
      "machine learning",
      "ml",
      "deep learning",
      "neural network",
    ],
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
      if (userSkill.includes(jobSkill) || jobSkill.includes(userSkill))
        return true;
      return false;
    })
  );

  const matchPercentage = Math.round(
    (matchingSkills.length / normalizedJobSkills.length) * 100
  );

  return Math.min(matchPercentage, 100);
};

// Get textual label for match quality (same as JobsPage)
const getMatchQualityLabel = (value?: number): string => {
  if (value === undefined || value <= 0) return "";
  if (value >= 85) return "Best match";
  if (value >= 70) return "Good match";
  if (value >= 50) return "Fair match";
  return "Poor match";
};

// Generate AI text explaining why user is a good match
const generateMatchExplanation = (
  matchPercentage: number,
  userSkills: string[],
  jobTitle: string,
  jobSkills: string[]
): string => {
  const matchingSkills = userSkills.filter((userSkill) =>
    jobSkills.some((jobSkill) => {
      const normalizedUser = userSkill.toLowerCase().trim();
      const normalizedJob = jobSkill.toLowerCase().trim();
      return (
        normalizedUser === normalizedJob ||
        normalizedUser.includes(normalizedJob) ||
        normalizedJob.includes(normalizedUser)
      );
    })
  );

  if (matchPercentage >= 80) {
    if (matchingSkills.length > 0) {
      return `Your strong expertise in ${matchingSkills
        .slice(0, 3)
        .join(
          ", "
        )} aligns perfectly with this ${jobTitle} role. You have the technical foundation to excel in this position.`;
    }
    return `Your skillset demonstrates excellent alignment with this ${jobTitle} position. You're well-positioned to make an immediate impact.`;
  } else if (matchPercentage >= 60) {
    if (matchingSkills.length > 0) {
      return `Your experience with ${matchingSkills[0]} and related technologies provides a solid foundation for this ${jobTitle} role. With your current skills, you can quickly adapt to the requirements.`;
    }
    return `Your background shows good potential for this ${jobTitle} position. Your existing skills provide a strong base for growth in this role.`;
  } else if (matchPercentage >= 40) {
    return `While there's room to expand your skillset, your current experience offers a starting point for this ${jobTitle} role. Consider building on your existing foundation.`;
  } else {
    return `This ${jobTitle} position may require additional skill development, but your willingness to learn and adapt can help bridge the gap.`;
  }
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
    console.log("🔍 JobSearchResultsPage loaded:", {
      searchTerm,
      page,
      searchParams: searchParams.toString(),
    });
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
      countries: countriesParam
        ? countriesParam.split(",").filter(Boolean)
        : [],
      jobTypes: jobTypesParam ? jobTypesParam.split(",").filter(Boolean) : [],
      isRemote: isRemoteParam === "true",
      datePosted: datePostedParam || undefined,
      skills: skillsParam ? skillsParam.split(",").filter(Boolean) : [],
      salaryMin: salaryMinParam ? parseInt(salaryMinParam, 10) : undefined,
      salaryMax: salaryMaxParam ? parseInt(salaryMaxParam, 10) : undefined,
      salaryByAgreement: salaryByAgreementParam === "true",
    };
  });

  // Sync activeFilters when URL params change
  useEffect(() => {
    const countriesParam = searchParams.get("countries");
    const skillsParam = searchParams.get("skills");
    const jobTypesParam = searchParams.get("jobTypes");
    const isRemoteParam = searchParams.get("isRemote");
    const datePostedParam = searchParams.get("datePosted");
    const salaryMinParam = searchParams.get("salaryMin");
    const salaryMaxParam = searchParams.get("salaryMax");
    const salaryByAgreementParam = searchParams.get("salaryByAgreement");

    setActiveFilters({
      country: "Georgia",
      countries: countriesParam
        ? countriesParam.split(",").filter(Boolean)
        : [],
      jobTypes: jobTypesParam ? jobTypesParam.split(",").filter(Boolean) : [],
      isRemote: isRemoteParam === "true",
      datePosted: datePostedParam || undefined,
      skills: skillsParam ? skillsParam.split(",").filter(Boolean) : [],
      salaryMin: salaryMinParam ? parseInt(salaryMinParam, 10) : undefined,
      salaryMax: salaryMaxParam ? parseInt(salaryMaxParam, 10) : undefined,
      salaryByAgreement: salaryByAgreementParam === "true",
    });
  }, [searchParams]);

  const [tempFilters, setTempFilters] = useState<JobFilters>(activeFilters);

  // Helper function to count active filters
  const countActiveFilters = (filters: JobFilters): number => {
    let count = 0;
    if (filters.countries.length > 0) count += filters.countries.length;
    if (filters.jobTypes.length > 0) count += filters.jobTypes.length;
    if (filters.isRemote) count += 1;
    if (filters.datePosted) count += 1;
    if (filters.skills.length > 0) count += filters.skills.length;
    if (filters.salaryMin !== undefined || filters.salaryMax !== undefined)
      count += 1;
    if (filters.salaryByAgreement) count += 1;
    return count;
  };

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
    page: number,
    userTopSkills: string[]
  ): Promise<{ jobs: ApiJob[]; hasMore: boolean; total: number }> => {
    try {
      // If all interests are selected, treat as no filter (load all jobs)
      const allInterestsSelected =
        userTopSkills.length > 0 &&
        filters.skills.length > 0 &&
        userTopSkills.every((skill) => filters.skills.includes(skill)) &&
        filters.skills.length === userTopSkills.length;

      // Prepare filters for API call
      const filtersForAPI: JobFilters = {
        ...filters,
        // If all interests selected, clear skills filter to get all jobs
        skills: allInterestsSelected ? [] : filters.skills,
      };

      const response = await jobService.fetchActiveJobs({
        query: searchTerm || "",
        filters: filtersForAPI,
        page,
        pageSize: 12,
      });

      if (!response || !Array.isArray(response.jobs)) {
        return { jobs: [], hasMore: false, total: 0 };
      }

      let validJobs = response.jobs.filter((job) => {
        const jobId = job.job_id || job.id;
        return jobId && jobId.trim() !== "";
      });

      // Apply client-side salary filtering
      if (
        filters.salaryMin !== undefined ||
        filters.salaryMax !== undefined ||
        filters.salaryByAgreement
      ) {
        validJobs = validJobs.filter((job) => {
          const minSalary = job.job_min_salary || job.min_salary;
          const maxSalary = job.job_max_salary || job.max_salary;

          // If "by agreement" is checked, include jobs without salary info
          if (filters.salaryByAgreement && !minSalary && !maxSalary) {
            return true;
          }

          // If no salary info and "by agreement" is not checked, exclude if salary filters are set
          if (!minSalary && !maxSalary && !filters.salaryByAgreement) {
            // If salary filters are set, exclude jobs without salary
            if (
              filters.salaryMin !== undefined ||
              filters.salaryMax !== undefined
            ) {
              return false;
            }
            return true;
          }

          // Check if job salary matches the range
          if (
            filters.salaryMin !== undefined &&
            maxSalary &&
            maxSalary < filters.salaryMin
          ) {
            return false;
          }
          if (
            filters.salaryMax !== undefined &&
            minSalary &&
            minSalary > filters.salaryMax
          ) {
            return false;
          }

          return true;
        });
      }

      // Apply client-side remote filter if needed (API should handle this, but double-check)
      if (filters.isRemote) {
        validJobs = validJobs.filter((job) => {
          return job.job_is_remote || job.is_remote || job.remote === true;
        });
      }

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
      salaryMin: activeFilters.salaryMin,
      salaryMax: activeFilters.salaryMax,
      salaryByAgreement: activeFilters.salaryByAgreement,
    });
  }, [activeFilters]);

  const {
    data: jobsData = { jobs: [], hasMore: false, total: 0 },
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "job-search",
      searchTerm,
      filtersKey,
      page,
      userTopSkills.join(","),
    ],
    queryFn: () => fetchJobs(searchTerm, activeFilters, page, userTopSkills),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Filter to only tech jobs from allowed ATS platforms
  const jobs = useMemo(() => {
    const allJobs = jobsData.jobs || [];
    const techJobs = filterTechJobs(allJobs);
    return filterATSJobs(techJobs);
  }, [jobsData.jobs]);
  const hasMore = jobsData.hasMore || false;
  const totalJobs = jobs.length; // Update total to reflect filtered count

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
        const location: string =
          (job.job_location as string | undefined) ||
          (job.location as string | undefined) ||
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
        const matchPercentage = calculateMatchPercentage(
          userTopSkills,
          jobSkills
        );

        // Extract date posted - try all possible date fields from API
        // JSearch API typically uses: job_posted_at_datetime_utc, date_posted, or posted_date
        const jobRecord = job as Record<string, unknown>;
        const datePosted =
          (job.job_posted_at_datetime_utc as string | undefined) || // JSearch API primary field
          (job.date_posted as string | undefined) ||
          (job.posted_date as string | undefined) ||
          (job.postedAt as string | undefined) ||
          (job.job_posted_at as string | undefined) ||
          (jobRecord.job_publish_timestamp as string | undefined) ||
          (jobRecord.publish_time as string | undefined) ||
          (job.created_at as string | undefined) ||
          (job.published_at as string | undefined) ||
          undefined;

        // Debug: Log if we found a date (only in development)
        if (process.env.NODE_ENV === "development" && datePosted) {
          console.log("Job date found:", {
            jobId: jobId,
            datePosted,
            title: jobTitle,
          });
        }

        return {
          id: jobId,
          title: jobTitle,
          company: companyName,
          location: String(location),
          url: applyLink,
          company_logo: companyLogo,
          is_saved: savedJobs?.includes(String(jobId)),
          salary,
          employment_type: employmentType,
          work_arrangement: workArrangement,
          matchPercentage,
          datePosted,
          jobSkills,
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
        const endpoint = `${API_ENDPOINTS.JOBS.SAVE_JOB}${jobId}/`;

        // Backend toggles save/unsave on POST
        await apiClient.post(endpoint);
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

  // Handle removing a skill filter
  const handleRemoveSkill = (skillToRemove: string) => {
    const newFilters = {
      ...activeFilters,
      skills: activeFilters.skills.filter((skill) => skill !== skillToRemove),
    };
    setActiveFilters(newFilters);
    setTempFilters(newFilters);
    updateUrlWithFilters(newFilters, searchTerm, 1);
  };

  // Handle removing a country filter
  const handleRemoveCountry = (countryCodeToRemove: string) => {
    const newFilters = {
      ...activeFilters,
      countries: activeFilters.countries.filter(
        (code) => code !== countryCodeToRemove
      ),
    };
    setActiveFilters(newFilters);
    setTempFilters(newFilters);
    updateUrlWithFilters(newFilters, searchTerm, 1);
  };

  // Handle removing job type filter
  const handleRemoveJobType = (jobTypeToRemove: string) => {
    const newJobTypes = activeFilters.jobTypes.filter(
      (type) => type !== jobTypeToRemove
    );
    const newFilters = {
      ...activeFilters,
      jobTypes: newJobTypes,
    };
    setActiveFilters(newFilters);
    setTempFilters(newFilters);
    updateUrlWithFilters(newFilters, searchTerm, 1);
  };

  // Handle removing remote filter
  const handleRemoveRemote = () => {
    const newFilters = {
      ...activeFilters,
      isRemote: false,
    };
    setActiveFilters(newFilters);
    setTempFilters(newFilters);
    updateUrlWithFilters(newFilters, searchTerm, 1);
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

  // Build array of all filter items for active filters display
  const allFilters = useMemo(() => {
    const filters: Array<{
      id: string;
      label: string;
      onRemove: () => void;
      ariaLabel: string;
    }> = [];

    // Skills
    activeFilters.skills.forEach((skill) => {
      filters.push({
        id: `skill-${skill}`,
        label: skill,
        onRemove: () => handleRemoveSkill(skill),
        ariaLabel: `Remove ${skill} filter`,
      });
    });

    // Countries
    activeFilters.countries.forEach((countryCode) => {
      const country = countries.find((c) => c.code === countryCode);
      const countryName = country?.name || countryCode;
      filters.push({
        id: `country-${countryCode}`,
        label: countryName,
        onRemove: () => handleRemoveCountry(countryCode),
        ariaLabel: `Remove ${countryName} filter`,
      });
    });

    // Job Types
    activeFilters.jobTypes.forEach((jobType) => {
      filters.push({
        id: `jobType-${jobType}`,
        label: jobTypeLabels[jobType] || jobType,
        onRemove: () => handleRemoveJobType(jobType),
        ariaLabel: `Remove ${jobTypeLabels[jobType] || jobType} filter`,
      });
    });

    // Remote
    if (activeFilters.isRemote) {
      filters.push({
        id: "remote",
        label: "Remote",
        onRemove: handleRemoveRemote,
        ariaLabel: "Remove Remote filter",
      });
    }

    // Date Posted
    if (activeFilters.datePosted) {
      const dateLabel =
        activeFilters.datePosted === "today"
          ? "Posted Today"
          : activeFilters.datePosted === "week"
          ? "Posted This Week"
          : activeFilters.datePosted === "month"
          ? "Posted This Month"
          : `Posted: ${activeFilters.datePosted}`;
      filters.push({
        id: "datePosted",
        label: dateLabel,
        onRemove: () => {
          const newFilters = {
            ...activeFilters,
            datePosted: undefined,
          };
          setActiveFilters(newFilters);
          setTempFilters(newFilters);
          updateUrlWithFilters(newFilters, searchTerm, 1);
        },
        ariaLabel: "Remove Date Posted filter",
      });
    }

    // Salary Range
    if (
      activeFilters.salaryMin !== undefined ||
      activeFilters.salaryMax !== undefined
    ) {
      const salaryLabel =
        activeFilters.salaryMin !== undefined &&
        activeFilters.salaryMax !== undefined
          ? `$${activeFilters.salaryMin} - $${activeFilters.salaryMax}`
          : activeFilters.salaryMin !== undefined
          ? `Min: $${activeFilters.salaryMin}`
          : `Max: $${activeFilters.salaryMax}`;
      filters.push({
        id: "salaryRange",
        label: salaryLabel,
        onRemove: () => {
          const newFilters = {
            ...activeFilters,
            salaryMin: undefined,
            salaryMax: undefined,
          };
          setActiveFilters(newFilters);
          setTempFilters(newFilters);
          updateUrlWithFilters(newFilters, searchTerm, 1);
        },
        ariaLabel: "Remove Salary filter",
      });
    }

    // Salary By Agreement
    if (activeFilters.salaryByAgreement) {
      filters.push({
        id: "salaryByAgreement",
        label: "Salary By Agreement",
        onRemove: () => {
          const newFilters = {
            ...activeFilters,
            salaryByAgreement: false,
          };
          setActiveFilters(newFilters);
          setTempFilters(newFilters);
          updateUrlWithFilters(newFilters, searchTerm, 1);
        },
        ariaLabel: "Remove Salary By Agreement filter",
      });
    }

    return filters;
  }, [activeFilters, searchTerm]);

  const filtersContainerRef = useRef<HTMLDivElement>(null);
  const [visibleFilterCount, setVisibleFilterCount] = useState(
    allFilters.length
  );
  const [shouldShowCount, setShouldShowCount] = useState(false);

  useEffect(() => {
    if (allFilters.length === 0) {
      setVisibleFilterCount(0);
      setShouldShowCount(false);
      return;
    }

    // First render all filters to measure height
    setVisibleFilterCount(allFilters.length);

    const checkHeight = () => {
      if (!filtersContainerRef.current) return;

      const container = filtersContainerRef.current;
      const height = container.scrollHeight;
      // Two lines threshold: approximately 100px
      // py-2.5 = 20px total (10px top + 10px bottom)
      // gap-2 = 8px
      // So one line is ~42px (20px badge + 8px gap), two lines ~84px
      // Using 100px as threshold for safety
      const twoLineHeightThreshold = 100;

      if (height > twoLineHeightThreshold) {
        // Binary search to find how many filters fit in 2 lines
        let low = 1;
        let high = allFilters.length;
        let maxVisible = allFilters.length;

        // Create a test container to measure
        const testContainer = document.createElement("div");
        testContainer.className = "flex flex-wrap gap-2";
        testContainer.style.position = "absolute";
        testContainer.style.visibility = "hidden";
        testContainer.style.width = container.offsetWidth + "px";
        testContainer.style.top = "-9999px";
        document.body.appendChild(testContainer);

        // Binary search
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          testContainer.innerHTML = allFilters
            .slice(0, mid)
            .map(
              (f) =>
                `<div class="flex items-center gap-2 px-4 py-2.5 rounded-[14px] bg-gray-200 dark:bg-gray-700"><span class="text-sm font-medium whitespace-nowrap">${f.label}</span><button><svg class="h-4 w-4"></svg></button></div>`
            )
            .join("");

          if (testContainer.scrollHeight <= twoLineHeightThreshold) {
            maxVisible = mid;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }

        document.body.removeChild(testContainer);

        if (maxVisible < allFilters.length) {
          setVisibleFilterCount(maxVisible);
          setShouldShowCount(true);
        } else {
          setVisibleFilterCount(allFilters.length);
          setShouldShowCount(false);
        }
      } else {
        setVisibleFilterCount(allFilters.length);
        setShouldShowCount(false);
      }
    };

    // Use requestAnimationFrame to ensure DOM is rendered
    const rafId = requestAnimationFrame(() => {
      setTimeout(checkHeight, 0);
    });

    window.addEventListener("resize", checkHeight);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", checkHeight);
    };
  }, [allFilters]);
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
        <div className="mb-8 relative max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-600 rounded-xl pl-3 md:pl-4 pr-2 md:pr-2.5 py-3 md:py-4 overflow-visible min-h-[3.5rem] flex-1">
              {/* Briefcase Icon - At the start */}
              <Briefcase
                className="h-5 w-5 text-breneo-accent dark:text-breneo-blue flex-shrink-0 mr-2"
                strokeWidth={2}
              />

              {/* Search Input Field */}
              <Input
                type="text"
                placeholder={t.jobs.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm text-gray-900 dark:text-gray-100 flex-1 min-w-0 bg-transparent h-auto py-0"
              />

              {/* Work Types Field - Hidden on mobile, shown on desktop */}
              {!isMobile && (
                <>
                  <div className="w-px bg-gray-300 dark:bg-gray-600 ml-2 mr-4 flex-shrink-0 h-6 my-auto" />
                  <div className="flex items-center flex-1 min-w-0 relative">
                    <WorkTypeDropdown
                      selectedWorkTypes={activeFilters.jobTypes}
                      onWorkTypesChange={(types) => {
                        const newFilters = {
                          ...activeFilters,
                          jobTypes: types,
                        };
                        setActiveFilters(newFilters);
                        setTempFilters(newFilters);
                        updateUrlWithFilters(newFilters, searchTerm, 1);
                      }}
                      isRemote={activeFilters.isRemote}
                      onRemoteChange={(isRemote) => {
                        const newFilters = {
                          ...activeFilters,
                          isRemote: isRemote,
                        };
                        setActiveFilters(newFilters);
                        setTempFilters(newFilters);
                        updateUrlWithFilters(newFilters, searchTerm, 1);
                      }}
                    />
                  </div>
                  <div className="w-px bg-gray-300 dark:bg-gray-600 ml-2 mr-4 flex-shrink-0 h-6 my-auto" />
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

            {/* Filter Button - Outside search bar */}
            {(() => {
              const activeFilterCount = countActiveFilters(activeFilters);
              return (
                <Button
                  variant="outline"
                  onClick={() => setFilterModalOpen(true)}
                  className="group flex items-center gap-2 bg-transparent border border-breneo-blue rounded-xl px-4 py-3 md:py-4 hover:bg-breneo-blue hover:text-white text-gray-900 dark:text-gray-100 whitespace-nowrap h-auto relative min-h-[3.5rem] transition-colors"
                  aria-label="Filter jobs"
                >
                  <SlidersHorizontal
                    className="h-4 w-4 group-hover:text-white"
                    strokeWidth={2}
                  />
                  <span className="hidden md:inline text-sm font-medium">
                    {t.jobs.filters}
                  </span>
                  {activeFilterCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-breneo-blue text-white text-xs rounded-full">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              );
            })()}
          </div>
        </div>

        {/* Active Filters Section */}
        {allFilters.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4">Active Filters</h2>
            <div ref={filtersContainerRef} className="flex flex-wrap gap-2">
              {allFilters.slice(0, visibleFilterCount).map((filter) => (
                <div
                  key={filter.id}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-[14px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <span className="text-sm font-medium whitespace-nowrap">
                    {filter.label}
                  </span>
                  <button
                    onClick={filter.onRemove}
                    className="flex-shrink-0 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5 transition-colors"
                    aria-label={filter.ariaLabel}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            {shouldShowCount && allFilters.length > visibleFilterCount && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {allFilters.length - visibleFilterCount}+ filters
              </div>
            )}
          </div>
        )}

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
          <div className="text-center p-10 border border-dashed rounded-3xl text-muted-foreground">
            <img
              src="/lovable-uploads/3dicons-travel-front-color.png"
              alt="No data found"
              className="mx-auto h-48 w-48 mb-4 object-contain"
            />
            <h4 className="text-lg font-semibold mb-2">{t.jobs.noJobs}</h4>
            <p className="text-sm">{t.jobs.tryAdjustingFilters}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {regularJobs.map((job) => (
              <div
                key={job.id}
                className="group cursor-pointer"
                onClick={() => navigate(`/jobs/${encodeURIComponent(job.id)}`)}
              >
                <Card className="border border-gray-200 hover:shadow-md transition-shadow overflow-hidden rounded-lg">
                  <CardContent
                    className={
                      isMobile
                        ? "px-5 pt-5 pb-4 flex flex-col flex-grow"
                        : "p-0"
                    }
                  >
                    {isMobile ? (
                      <>
                        {/* Company Logo and Info (same as JobsPage) */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-shrink-0 relative w-10 h-10">
                            {job.company_logo ? (
                              <img
                                src={job.company_logo}
                                alt={`${job.company} logo`}
                                className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-breneo-accent flex items-center justify-center">
                                <Briefcase className="h-5 w-5 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">
                              {job.company}
                            </h3>
                            <p className="mt-0.5 text-xs text-gray-500 truncate">
                              {job.location}
                            </p>
                          </div>
                        </div>

                        {/* Job Title (same as JobsPage) */}
                        <h4 className="font-bold text-base mb-2 line-clamp-2 min-h-[2.5rem]">
                          {job.title}
                        </h4>

                        {/* Job Details as chips (same as JobsPage, without salary) */}
                        <div className="mt-1 flex flex-wrap gap-2">
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

                        {/* Match percentage & Save button (same layout as JobsPage) */}
                        <div className="mt-7 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <RadialProgress
                              value={job.matchPercentage ?? 0}
                              size={44}
                              strokeWidth={5}
                              showLabel={false}
                              percentageTextSize="sm"
                              className="text-breneo-blue"
                            />
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-100">
                              {getMatchQualityLabel(job.matchPercentage)}
                            </span>
                          </div>
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
                            className={cn(
                              "bg-[#E6E7EB] hover:bg-[#E6E7EB]/90 dark:bg-[#3A3A3A] dark:hover:bg-[#4A4A4A] h-10 w-10",
                              job.is_saved
                                ? "text-red-500 bg-red-50 hover:bg-red-50/90 dark:bg-red-900/40 dark:hover:bg-red-900/60"
                                : "text-black dark:text-white"
                            )}
                          >
                            <Heart
                              className={cn(
                                "h-4 w-4 transition-colors",
                                job.is_saved
                                  ? "text-red-500 fill-red-500 animate-heart-pop"
                                  : "text-black dark:text-white"
                              )}
                            />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex gap-4">
                        {/* Left Section - Job Details (desktop) */}
                        <div className="flex-1 p-4 pr-2 rounded-l-lg">
                          <div className="flex items-start gap-4">
                            {/* Company Logo */}
                            <div className="flex-shrink-0 relative w-12 h-12">
                              {job.company_logo ? (
                                <img
                                  src={job.company_logo}
                                  alt={job.company}
                                  className="w-12 h-12 rounded-md object-cover border border-gray-300 absolute inset-0 z-10"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                    const fallback =
                                      target.parentElement?.querySelector(
                                        ".logo-fallback"
                                      ) as HTMLElement;
                                    if (fallback) {
                                      fallback.style.display = "flex";
                                      fallback.style.zIndex = "10";
                                    }
                                  }}
                                />
                              ) : null}
                              <div
                                className={`w-12 h-12 rounded-md bg-breneo-blue/10 flex items-center justify-center border border-gray-300 logo-fallback absolute inset-0 ${
                                  job.company_logo ? "z-0" : "z-10"
                                }`}
                                style={{
                                  display: job.company_logo ? "none" : "flex",
                                }}
                              >
                                <Briefcase className="h-6 w-6 text-breneo-blue" />
                              </div>
                            </div>

                            {/* Job Info */}
                            <div className="flex-1 min-w-0">
                              <div className="mb-1 md:mb-2">
                                <h3 className="font-normal text-sm text-gray-600 mb-1 line-clamp-1">
                                  {job.company}
                                </h3>
                                <h4 className="font-bold text-base md:text-lg mb-1 md:mb-2 line-clamp-2 md:line-clamp-3">
                                  {job.title}
                                </h4>
                              </div>

                              {/* Desktop: All details in one row */}
                              <div className="space-y-2">
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
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">
                                    {formatJobDate(job.datePosted)}
                                  </span>
                                  <div className="flex items-center gap-2">
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
                                      className={cn(
                                        "bg-[#E6E7EB] hover:bg-[#E6E7EB]/90 dark:bg-[#3A3A3A] dark:hover:bg-[#4A4A4A] h-10 w-10",
                                        job.is_saved
                                          ? "text-red-500 bg-red-50 hover:bg-red-50/90 dark:bg-red-900/40 dark:hover:bg-red-900/60"
                                          : "text-black dark:text-white"
                                      )}
                                    >
                                      <Heart
                                        className={cn(
                                          "h-4 w-4 transition-colors",
                                          job.is_saved
                                            ? "text-red-500 fill-red-500 animate-heart-pop"
                                            : "text-black dark:text-white"
                                        )}
                                      />
                                    </Button>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (job.url) {
                                          window.open(job.url, "_blank");
                                        } else {
                                          navigate(
                                            `/jobs/${encodeURIComponent(
                                              job.id
                                            )}`
                                          );
                                        }
                                      }}
                                    >
                                      Apply Now
                                      {/* <ExternalLink className="h-4 w-4 ml-2" /> */}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right Section - Match Score (desktop only) */}
                        {job.matchPercentage !== undefined &&
                          job.matchPercentage > 0 && (
                            <div className="w-56 flex-shrink-0 p-4 flex flex-col items-center justify-center relative rounded-2xl bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100">
                              {/* Overflow Menu (optional) */}
                              <div className="absolute top-3 right-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                                >
                                  <span className="text-lg">⋯</span>
                                </button>
                              </div>

                              {/* Radial Progress Bar */}
                              <div className="mb-3">
                                <RadialProgress
                                  value={job.matchPercentage}
                                  size={60}
                                  strokeWidth={3}
                                  showLabel={false}
                                  percentageTextSize="lg"
                                  className="justify-center text-green-600"
                                />
                              </div>

                              {/* Match Label */}
                              <div>
                                <p className="text-base font-bold text-center text-gray-800 dark:text-gray-200">
                                  {job.matchPercentage >= 70
                                    ? "GOOD MATCH"
                                    : job.matchPercentage >= 40
                                    ? "FAIR MATCH"
                                    : "POOR MATCH"}
                                </p>
                              </div>
                            </div>
                          )}
                      </div>
                    )}
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
                  {t.jobs.showing} {startIndex}-{Math.min(endIndex, totalJobs)}{" "}
                  {t.jobs.of} {totalJobs} {t.jobs.vacancies}
                </>
              ) : (
                <>
                  {t.jobs.showing} {transformedJobs.length} {t.jobs.vacancies}
                </>
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
                <span className="text-sm text-gray-600 font-medium">
                  {t.jobs.page} {page}
                </span>
                {estimatedTotalPages && (
                  <span className="text-sm text-gray-400">
                    / {estimatedTotalPages}
                  </span>
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
