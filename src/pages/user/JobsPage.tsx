import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RadialProgress } from "@/components/ui/radial-progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  Heart,
  AlertCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Users,
  MapPin,
  Search,
  PiggyBank,
  TrendingUp,
  UtensilsCrossed,
  Truck,
  Clock,
  DollarSign,
  Tag,
  Sun,
  X,
  Code,
  Database,
  Globe,
  Palette,
  BarChart3,
  Shield,
  Zap,
  Cpu,
  Network,
  Smartphone,
  Cloud,
  Settings,
  Rocket,
  Target,
  Lightbulb,
  Music,
  Camera,
  Video,
  PenTool,
  Gamepad2,
  GraduationCap,
  Languages,
  MessageSquare,
  ShoppingCart,
  Factory,
  Stethoscope,
  Scale,
  Car,
  Plane,
  Ship,
  Coffee,
  Utensils,
  Hammer,
  Paintbrush,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { JobFilterModal } from "@/components/jobs/JobFilterModal";
import { countries, Country } from "@/data/countries";
import { LocationDropdown } from "@/components/jobs/LocationDropdown";
import { WorkTypeDropdown } from "@/components/jobs/WorkTypeDropdown";
import { useMobile } from "@/hooks/use-mobile";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import {
  getUserTestAnswers,
  calculateSkillScores,
  getTopSkills,
  filterHardSkills,
} from "@/utils/skillTestUtils";
import { jobService, JobFilters, ApiJob } from "@/api/jobs";
// Removed filterTechJobs and filterATSJobs imports - displaying all jobs without filtering
import { BetaVersionModal } from "@/components/common/BetaVersionModal";

// Updated Job interface for the new API
interface Job {
  id: string;
  title: string;
  company: string;
  company_name?: string;
  location: string;
  url: string;
  company_logo?: string;
  is_saved: boolean;
  salary?: string;
  employment_type?: string;
  work_arrangement?: string;
  benefits?: string;
  matchPercentage?: number;
}

const jobTypes = ["FULLTIME", "PARTTIME", "CONTRACTOR", "INTERN"];

const jobTypeLabels: Record<string, string> = {
  FULLTIME: "Full Time",
  PARTTIME: "Part Time",
  CONTRACTOR: "Contractor",
  INTERN: "Intern",
  INTERNSHIP: "Internship",
};

// Function to extract skills from job data
const extractJobSkills = (job: ApiJob): string[] => {
  const skills: string[] = [];
  const textToSearch = [
    job.job_title || job.title || "",
    job.description || job.job_description || "",
    job.job_required_experience || job.required_experience || "",
  ]
    .join(" ")
    .toLowerCase();

  // Common tech skills keywords
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

  // Check for each skill
  Object.keys(skillKeywords).forEach((skill) => {
    const keywords = skillKeywords[skill];
    if (keywords.some((keyword) => textToSearch.includes(keyword))) {
      skills.push(skill);
    }
  });

  return [...new Set(skills)]; // Remove duplicates
};

// Function to calculate match percentage with enhanced job title matching
const calculateMatchPercentage = (
  userSkills: string[],
  jobSkills: string[],
  jobTitle?: string
): number => {
  if (userSkills.length === 0) {
    return 0;
  }

  // Normalize skills for comparison (lowercase, remove spaces)
  const normalizeSkill = (skill: string) =>
    skill.toLowerCase().trim().replace(/\s+/g, " ");

  const normalizedUserSkills = userSkills.map(normalizeSkill);
  const normalizedJobSkills = jobSkills.map(normalizeSkill);
  const normalizedJobTitle = jobTitle ? normalizeSkill(jobTitle) : "";

  // Check if user skills appear directly in job title (high priority match)
  const titleMatches: string[] = [];
  normalizedUserSkills.forEach((userSkill) => {
    // Check if user skill appears in job title
    if (normalizedJobTitle && normalizedJobTitle.includes(userSkill)) {
      titleMatches.push(userSkill);
    }
    // Also check if any word in job title contains the user skill
    const titleWords = normalizedJobTitle.split(/\s+/);
    if (
      titleWords.some(
        (word) => word.includes(userSkill) || userSkill.includes(word)
      )
    ) {
      if (!titleMatches.includes(userSkill)) {
        titleMatches.push(userSkill);
      }
    }
  });

  // Find matching skills in job description/requirements
  const descriptionMatches = normalizedUserSkills.filter((userSkill) =>
    normalizedJobSkills.some((jobSkill) => {
      // Exact match
      if (userSkill === jobSkill) return true;
      // Partial match (one skill contains the other)
      if (userSkill.includes(jobSkill) || jobSkill.includes(userSkill))
        return true;
      return false;
    })
  );

  // Combine matches (title matches are more important)
  const allMatches = new Set([...titleMatches, ...descriptionMatches]);

  // Calculate match percentage with weighted scoring
  // If job has skills extracted, use them as denominator
  // Otherwise, use user skills as denominator
  const denominator =
    normalizedJobSkills.length > 0
      ? normalizedJobSkills.length
      : normalizedUserSkills.length;

  // Base match: (matching skills / denominator) * 100
  let matchPercentage = Math.round(
    (allMatches.size / Math.max(denominator, 1)) * 100
  );

  // Boost match if user skills appear in job title (add up to 30% bonus)
  if (titleMatches.length > 0) {
    const titleMatchBonus = Math.min(
      (titleMatches.length / normalizedUserSkills.length) * 30,
      30
    );
    matchPercentage = Math.min(matchPercentage + titleMatchBonus, 100);
  }

  // If no skills found in job but user has skills, return lower match
  if (normalizedJobSkills.length === 0) {
    // If title matches exist, give some credit
    if (titleMatches.length > 0) {
      matchPercentage = Math.min(
        Math.round((titleMatches.length / normalizedUserSkills.length) * 100),
        70
      );
    } else {
      // No matches at all - return low match
      matchPercentage = 20;
    }
  }

  // Cap at 100%
  return Math.min(matchPercentage, 100);
};

// Get textual label for match quality
const getMatchQualityLabel = (value?: number): string => {
  if (value === undefined || value <= 0) return "";
  if (value >= 85) return "Best match";
  if (value >= 70) return "Good match";
  if (value >= 50) return "Fair match";
  return "Poor match";
};

// Skill icon mapping - maps skill names to appropriate icons
const getSkillIcon = (
  skill: string
): React.ComponentType<{ className?: string }> => {
  const skillLower = skill.toLowerCase();

  // Programming & Tech
  if (
    skillLower.includes("javascript") ||
    skillLower.includes("js") ||
    skillLower.includes("react") ||
    skillLower.includes("node")
  )
    return Code;
  if (
    skillLower.includes("python") ||
    skillLower.includes("django") ||
    skillLower.includes("flask")
  )
    return Code;
  if (skillLower.includes("java") || skillLower.includes("kotlin")) return Code;
  if (
    skillLower.includes("c++") ||
    skillLower.includes("c#") ||
    skillLower.includes("csharp")
  )
    return Code;
  if (
    skillLower.includes("php") ||
    skillLower.includes("ruby") ||
    skillLower.includes("go") ||
    skillLower.includes("rust")
  )
    return Code;
  if (
    skillLower.includes("database") ||
    skillLower.includes("sql") ||
    skillLower.includes("mysql") ||
    skillLower.includes("postgresql") ||
    skillLower.includes("mongodb")
  )
    return Database;
  if (
    skillLower.includes("cloud") ||
    skillLower.includes("aws") ||
    skillLower.includes("azure") ||
    skillLower.includes("gcp")
  )
    return Cloud;
  if (
    skillLower.includes("network") ||
    skillLower.includes("devops") ||
    skillLower.includes("docker") ||
    skillLower.includes("kubernetes")
  )
    return Network;
  if (
    skillLower.includes("mobile") ||
    skillLower.includes("ios") ||
    skillLower.includes("android") ||
    skillLower.includes("flutter") ||
    skillLower.includes("react native")
  )
    return Smartphone;
  if (
    skillLower.includes("web") ||
    skillLower.includes("html") ||
    skillLower.includes("css")
  )
    return Globe;
  if (
    skillLower.includes("security") ||
    skillLower.includes("cyber") ||
    skillLower.includes("encryption")
  )
    return Shield;
  if (
    skillLower.includes("ai") ||
    skillLower.includes("machine learning") ||
    skillLower.includes("data science") ||
    skillLower.includes("analytics")
  )
    return Cpu;
  if (
    skillLower.includes("ui") ||
    skillLower.includes("ux") ||
    skillLower.includes("design") ||
    skillLower.includes("figma") ||
    skillLower.includes("sketch")
  )
    return Palette;
  if (
    skillLower.includes("graphic") ||
    skillLower.includes("illustration") ||
    skillLower.includes("photoshop") ||
    skillLower.includes("illustrator")
  )
    return Paintbrush;

  // Business & Management
  if (
    skillLower.includes("sales") ||
    skillLower.includes("marketing") ||
    skillLower.includes("business")
  )
    return TrendingUp;
  if (
    skillLower.includes("finance") ||
    skillLower.includes("accounting") ||
    skillLower.includes("banking")
  )
    return PiggyBank;
  if (
    skillLower.includes("management") ||
    skillLower.includes("leadership") ||
    skillLower.includes("project")
  )
    return BarChart3;
  if (
    skillLower.includes("communication") ||
    skillLower.includes("presentation") ||
    skillLower.includes("public speaking")
  )
    return MessageSquare;
  if (skillLower.includes("customer service") || skillLower.includes("support"))
    return Users;

  // Creative & Arts
  if (
    skillLower.includes("music") ||
    skillLower.includes("audio") ||
    skillLower.includes("sound")
  )
    return Music;
  if (
    skillLower.includes("video") ||
    skillLower.includes("editing") ||
    skillLower.includes("film") ||
    skillLower.includes("production")
  )
    return Video;
  if (skillLower.includes("photography") || skillLower.includes("photo"))
    return Camera;
  if (
    skillLower.includes("writing") ||
    skillLower.includes("content") ||
    skillLower.includes("copywriting")
  )
    return PenTool;
  if (skillLower.includes("game") || skillLower.includes("gaming"))
    return Gamepad2;

  // Education & Training
  if (
    skillLower.includes("teaching") ||
    skillLower.includes("education") ||
    skillLower.includes("training") ||
    skillLower.includes("tutor")
  )
    return GraduationCap;
  if (
    skillLower.includes("language") ||
    skillLower.includes("translation") ||
    skillLower.includes("interpreter")
  )
    return Languages;

  // Healthcare & Service
  if (
    skillLower.includes("health") ||
    skillLower.includes("medical") ||
    skillLower.includes("nursing") ||
    skillLower.includes("care")
  )
    return Stethoscope;
  if (
    skillLower.includes("legal") ||
    skillLower.includes("law") ||
    skillLower.includes("attorney")
  )
    return Scale;

  // Hospitality & Food
  if (
    skillLower.includes("hospitality") ||
    skillLower.includes("hotel") ||
    skillLower.includes("restaurant") ||
    skillLower.includes("cooking") ||
    skillLower.includes("chef")
  )
    return Utensils;
  if (skillLower.includes("coffee") || skillLower.includes("barista"))
    return Coffee;

  // Trade & Manual
  if (
    skillLower.includes("construction") ||
    skillLower.includes("carpentry") ||
    skillLower.includes("plumbing") ||
    skillLower.includes("electrician")
  )
    return Hammer;
  if (
    skillLower.includes("automotive") ||
    skillLower.includes("mechanic") ||
    skillLower.includes("car")
  )
    return Car;
  if (
    skillLower.includes("logistics") ||
    skillLower.includes("warehouse") ||
    skillLower.includes("shipping")
  )
    return Truck;
  if (
    skillLower.includes("aviation") ||
    skillLower.includes("pilot") ||
    skillLower.includes("airline")
  )
    return Plane;
  if (
    skillLower.includes("maritime") ||
    skillLower.includes("sailor") ||
    skillLower.includes("ship")
  )
    return Ship;

  // Retail & Commerce
  if (
    skillLower.includes("retail") ||
    skillLower.includes("sales") ||
    skillLower.includes("store")
  )
    return ShoppingCart;

  // Manufacturing & Industry
  if (
    skillLower.includes("manufacturing") ||
    skillLower.includes("production") ||
    skillLower.includes("factory")
  )
    return Factory;
  if (
    skillLower.includes("engineering") ||
    skillLower.includes("mechanical") ||
    skillLower.includes("electrical")
  )
    return Settings;

  // General
  if (
    skillLower.includes("problem solving") ||
    skillLower.includes("analytical") ||
    skillLower.includes("critical thinking")
  )
    return Lightbulb;
  if (skillLower.includes("teamwork") || skillLower.includes("collaboration"))
    return Users;
  if (skillLower.includes("creativity") || skillLower.includes("innovation"))
    return Rocket;
  if (skillLower.includes("organization") || skillLower.includes("planning"))
    return Target;
  if (
    skillLower.includes("time management") ||
    skillLower.includes("efficiency")
  )
    return Zap;

  // Default fallback icons
  return Briefcase;
};

// Skill color mapping
const getSkillColor = (skill: string, index: number): string => {
  const colors = [
    "text-blue-500",
    "text-breneo-accent",
    "text-orange-500",
    "text-teal-500",
    "text-purple-500",
    "text-green-500",
    "text-red-500",
    "text-yellow-500",
    "text-pink-500",
    "text-indigo-500",
  ];
  return colors[index % colors.length];
};

// Fetch all internship jobs without any filtering
const fetchInternshipJobs = async (
  page: number = 1
): Promise<{
  jobs: ApiJob[];
  hasMore: boolean;
  total: number;
}> => {
  try {
    console.log(
      `🚀 fetchInternshipJobs called - fetching internship jobs page ${page}`
    );

    const response = await jobService.fetchActiveJobs({
      query: "intern intern internship", // Search term for internships
      filters: {
        country: undefined,
        countries: [], // No country filtering
        jobTypes: ["INTERN"], // Filter for internship jobs only
        isRemote: undefined,
        datePosted: undefined,
        skills: [], // No skill filtering
        salaryMin: undefined,
        salaryMax: undefined,
        salaryByAgreement: undefined,
      },
      page: page,
      pageSize: 50, // Fetch more jobs per page
    });

    // Validate that we got jobs back
    if (!response || !Array.isArray(response.jobs)) {
      console.warn("Invalid response format from job service:", response);
      return { jobs: [], hasMore: false, total: 0 };
    }

    // Filter out jobs without valid IDs
    const validJobs = response.jobs.filter((job) => {
      const jobId = String(job.id || "");
      return jobId && jobId.trim() !== "";
    });

    // Return valid internship jobs with pagination info
    return {
      jobs: validJobs,
      hasMore: response.hasMore ?? false,
      total: response.total || validJobs.length,
    };
  } catch (error) {
    console.error("Error fetching internship jobs:", error);
    return { jobs: [], hasMore: false, total: 0 };
  }
};

// Fetch latest regular jobs - filtered like JobSearchResultsPage
const fetchLatestJobs = async (
  page: number = 1,
  filters: JobFilters,
  userTopSkills: string[] = []
): Promise<{
  jobs: ApiJob[];
  hasMore: boolean;
  total: number;
}> => {
  try {
    console.log(
      `🚀 fetchLatestJobs called - fetching regular jobs page ${page} with filters:`,
      filters
    );

    // Check if all interests are selected (like JobSearchResultsPage does)
    const allInterestsSelected =
      userTopSkills.length > 0 &&
      filters.skills.length > 0 &&
      userTopSkills.every((skill) => filters.skills.includes(skill)) &&
      filters.skills.length === userTopSkills.length;

    // Prepare filters for API call (same as JobSearchResultsPage)
    const filtersForAPI: JobFilters = {
      ...filters,
      // If all interests selected, clear skills filter to get all jobs
      skills: allInterestsSelected ? [] : filters.skills,
    };

    const response = await jobService.fetchActiveJobs({
      query: "", // No search term - will use "jobs" as default in jobService
      filters: filtersForAPI,
      page: page,
      pageSize: 12, // Fetch 12 jobs per page
    });

    // Validate that we got jobs back
    if (!response || !Array.isArray(response.jobs)) {
      console.warn("Invalid response format from job service:", response);
      return { jobs: [], hasMore: false, total: 0 };
    }

    // Filter out jobs without valid IDs
    let validJobs = response.jobs.filter((job) => {
      const jobId = job.id || "";
      return jobId && jobId.trim() !== "";
    });

    // Apply client-side salary filtering (same as JobSearchResultsPage)
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

    // Apply client-side remote filter if needed (same as JobSearchResultsPage)
    if (filters.isRemote) {
      validJobs = validJobs.filter((job) => {
        return job.job_is_remote || job.is_remote || job.remote === true;
      });
    }

    console.log(
      `✅ fetchLatestJobs: ${validJobs.length} jobs found after filtering`
    );

    // Return valid jobs with pagination info
    return {
      jobs: validJobs,
      hasMore: response.hasMore ?? false,
      total: validJobs.length,
    };
  } catch (error) {
    console.error("Error fetching latest jobs:", error);
    return { jobs: [], hasMore: false, total: 0 };
  }
};

// Fetch remote jobs filtered by user skills
const fetchRemoteJobs = async (
  page: number = 1,
  userTopSkills: string[] = []
): Promise<{
  jobs: ApiJob[];
  hasMore: boolean;
  total: number;
}> => {
  try {
    console.log(
      `🚀 fetchRemoteJobs called - fetching remote jobs page ${page} with skills:`,
      userTopSkills
    );

    // Use "remote" as search term
    const response = await jobService.fetchActiveJobs({
      query: "remote", // Search for remote jobs
      filters: {
        country: undefined, // No single country filter
        countries: [], // No country filtering - show remote jobs from all countries
        jobTypes: [], // No job type filtering (will exclude interns client-side)
        isRemote: true, // Filter for remote jobs only
        datePosted: undefined,
        skills: [], // No skills filter
        salaryMin: undefined,
        salaryMax: undefined,
        salaryByAgreement: undefined,
      },
      page: page,
      pageSize: 50, // Fetch more jobs per page
    });

    console.log(`📊 fetchRemoteJobs response:`, {
      totalJobs: response.jobs?.length || 0,
      hasMore: response.hasMore,
      sampleJob: response.jobs?.[0] || null,
    });

    // Validate that we got jobs back
    if (!response || !Array.isArray(response.jobs)) {
      console.warn("Invalid response format from job service:", response);
      return { jobs: [], hasMore: false, total: 0 };
    }

    // Filter out jobs without valid IDs
    const validJobs = response.jobs.filter((job) => {
      const jobId = String(job.id || "");
      return jobId && jobId.trim() !== "";
    });

    console.log(
      `✅ fetchRemoteJobs: ${validJobs.length} valid remote jobs found`
    );

    // Return valid remote jobs with pagination info
    return {
      jobs: validJobs,
      hasMore: response.hasMore ?? false,
      total: response.total || validJobs.length,
    };
  } catch (error) {
    console.error("❌ Error fetching remote jobs:", error);
    return { jobs: [], hasMore: false, total: 0 };
  }
};

// Session storage keys
const JOBS_FILTERS_STORAGE_KEY = "jobsFilters";
const COURSES_FILTERS_STORAGE_KEY = "coursesFilters";

// Helper functions for session storage
const saveFiltersToSession = (
  key: string,
  filters: unknown,
  search: string
) => {
  try {
    sessionStorage.setItem(key, JSON.stringify({ filters, search }));
  } catch (error) {
    console.error("Error saving filters to session storage:", error);
  }
};

const loadFiltersFromSession = (
  key: string
): { filters: unknown; search: string } | null => {
  try {
    const stored = sessionStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error loading filters from session storage:", error);
  }
  return null;
};

const JobsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useMobile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterModalOpen, setFilterModalOpen] = useState(false);

  // State for user's top skills from test results
  const [userTopSkills, setUserTopSkills] = useState<string[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const skillsInitializedRef = React.useRef(false);

  // Pagination state for regular jobs
  const [regularJobsPage, setRegularJobsPage] = useState(1);
  const [allRegularJobs, setAllRegularJobs] = useState<ApiJob[]>([]);
  const [hasMoreRegularJobs, setHasMoreRegularJobs] = useState(false);
  const [isLoadingMoreRegular, setIsLoadingMoreRegular] = useState(false);

  // Pagination state for internship jobs
  const [internshipJobsPage, setInternshipJobsPage] = useState(1);
  const [allInternshipJobs, setAllInternshipJobs] = useState<ApiJob[]>([]);
  const [hasMoreInternshipJobs, setHasMoreInternshipJobs] = useState(false);
  const [isLoadingMoreInternship, setIsLoadingMoreInternship] = useState(false);

  // Pagination state for remote jobs
  const [remoteJobsPage, setRemoteJobsPage] = useState(1);
  const [allRemoteJobs, setAllRemoteJobs] = useState<ApiJob[]>([]);
  const [hasMoreRemoteJobs, setHasMoreRemoteJobs] = useState(false);
  const [isLoadingMoreRemote, setIsLoadingMoreRemote] = useState(false);

  // Helper function to update URL with current filters (used for redirecting to search results)
  const updateUrlWithFilters = useCallback(
    (filters: JobFilters, search: string, pageNum: number) => {
      const params = new URLSearchParams();

      if (search) {
        params.set("search", search);
      }
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
      if (filters.datePosted && filters.datePosted !== "all") {
        params.set("datePosted", filters.datePosted);
      }
      // Don't add country param to URL - use countries array instead
      // Country is kept in state for backward compatibility but not in URL
      if (pageNum > 1) {
        params.set("page", String(pageNum));
      }

      // Update URL without page reload
      setSearchParams(params, { replace: true });

      // Save to session storage
      saveFiltersToSession(JOBS_FILTERS_STORAGE_KEY, filters, search);
    },
    [setSearchParams]
  );

  // Initialize filters - always start with cleared filters
  const [activeFilters, setActiveFilters] = useState<JobFilters>(() => {
    // Always return cleared filters - no country, no filters
    return {
      country: "Georgia", // Keep for internal state but not used for filtering
      countries: [], // No country filter
      jobTypes: [], // No job type filter
      isRemote: false, // No remote filter
      datePosted: undefined, // No date filter
      skills: [], // No skill filter (will be populated from userTopSkills for job fetching)
      salaryMin: undefined, // No salary min filter
      salaryMax: undefined, // No salary max filter
      salaryByAgreement: false, // No salary by agreement filter
    };
  });

  const [searchTerm, setSearchTerm] = useState(() => {
    const urlSearch = searchParams.get("search");
    if (urlSearch) return urlSearch;

    const sessionData = loadFiltersFromSession(JOBS_FILTERS_STORAGE_KEY);
    if (sessionData && sessionData.search) {
      return sessionData.search as string;
    }

    return "";
  });

  // Note: Filters and search are only used for redirecting to search results page
  // The jobs displayed here are filtered by user's top skills from skill test

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

  // Sync tempFilters with activeFilters when modal opens to reflect current search bar location
  useEffect(() => {
    if (isFilterModalOpen) {
      setTempFilters(activeFilters);
    }
  }, [isFilterModalOpen, activeFilters]);

  // Clear all filter params from URL on mount - JobsPage should always start with cleared filters
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    // Remove all filter-related params, keep only search if it exists
    params.delete("countries");
    params.delete("country");
    params.delete("skills");
    params.delete("jobTypes");
    params.delete("isRemote");
    params.delete("datePosted");
    params.delete("page");

    // Only update if we removed something
    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Fetch user's top skills from test results
  useEffect(() => {
    const fetchUserSkills = async () => {
      if (!user) {
        setLoadingSkills(false);
        return;
      }

      try {
        setLoadingSkills(true);

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

            // Extract only hard/tech skills (exclude soft skills and interests)
            const allSkills: string[] = [];
            if (skillsJson?.tech) {
              allSkills.push(...Object.keys(skillsJson.tech));
            }
            // Don't include soft skills - only hard/tech skills for filters

            // Filter to only hard skills
            const hardSkillsOnly = filterHardSkills(allSkills);

            // Get top 5 hard skills
            const topSkills = hardSkillsOnly.slice(0, 5);
            setUserTopSkills(topSkills);
            setLoadingSkills(false);
            return;
          }
        } catch (apiError) {
          console.log("API endpoint not available, trying Supabase...");
        }

        // Fallback to Supabase: fetch from usertestanswers
        const answers = await getUserTestAnswers(String(user.id));
        if (answers && answers.length > 0) {
          const skillScores = calculateSkillScores(answers);
          const topSkillsData = getTopSkills(skillScores, 10); // Get more to filter
          const allTopSkills = topSkillsData.map((s) => s.skill);

          // Filter to only hard skills
          const hardSkillsOnly = filterHardSkills(allTopSkills);
          const topSkills = hardSkillsOnly.slice(0, 5); // Get top 5 hard skills

          setUserTopSkills(topSkills);
        }
      } catch (error) {
        console.error("Error fetching user skills:", error);
      } finally {
        setLoadingSkills(false);
      }
    };

    fetchUserSkills();
  }, [user]);

  // Reset initialization flag when user changes
  useEffect(() => {
    skillsInitializedRef.current = false;
  }, [user?.id]);

  // Auto-populate default filters with user's top skills when they're loaded (only once per user)
  useEffect(() => {
    // Only populate on initial load when skills are loaded and haven't been initialized yet
    if (
      !loadingSkills &&
      userTopSkills.length > 0 &&
      !skillsInitializedRef.current
    ) {
      setActiveFilters((prev) => ({
        ...prev,
        skills: [...userTopSkills], // Set all skills as default
      }));
      setTempFilters((prev) => ({
        ...prev,
        skills: [...userTopSkills], // Sync tempFilters too
      }));
      skillsInitializedRef.current = true; // Mark as initialized
    }
  }, [loadingSkills, userTopSkills, user?.id]);

  // Removed location detection - we don't filter by country

  const { data: savedJobs = [] } = useQuery<string[]>({
    queryKey: ["savedJobs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        // Fetch from profile API
        const profileResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
        const savedJobsArray = profileResponse.data?.saved_jobs || [];
        return savedJobsArray.map((id: string | number) => String(id));
      } catch (error) {
        console.error("Error fetching saved jobs from profile API:", error);
        return [];
      }
    },
    enabled: !!user,
  });

  // Get hard skills from activeFilters (filter section) for filtering latest jobs
  const filterHardSkillsList = useMemo(() => {
    // Filter to only hard skills from the skills selected in the filter section
    return filterHardSkills(activeFilters.skills || []);
  }, [activeFilters.skills]);

  // Create filters key for query (same as JobSearchResultsPage)
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

  // Fetch latest regular jobs without filtering - always fetch page 1 for 9 latest jobs
  const {
    data: jobsData = { jobs: [], hasMore: false, total: 0 },
    isLoading,
    error,
  } = useQuery({
    queryKey: ["latestJobs"], // Removed regularJobsPage since we always fetch page 1
    queryFn: async () => {
      // Fetch all jobs without any filters to get the latest jobs
      const response = await jobService.fetchActiveJobs({
        query: "", // No query filter - get all jobs
        filters: {
          country: undefined,
          countries: [], // No country filter
          jobTypes: [], // No job type filter
          isRemote: undefined, // No remote filter
          datePosted: undefined, // No date filter
          skills: [], // No skills filter
          salaryMin: undefined,
          salaryMax: undefined,
          salaryByAgreement: undefined,
        },
        page: 1, // Always fetch first page for latest jobs
        pageSize: 200, // Fetch many jobs to display all available jobs
      });

      if (!response || !Array.isArray(response.jobs)) {
        return { jobs: [], hasMore: false, total: 0 };
      }

      // Filter out jobs without valid IDs
      const validJobs = response.jobs.filter((job) => {
        const jobId = String(job.id || "");
        return jobId && jobId.trim() !== "";
      });

      return {
        jobs: validJobs,
        hasMore: response.hasMore ?? false,
        total: validJobs.length,
      };
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Fetch on mount to ensure jobs are loaded
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // Keep data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 1,
    retryDelay: 1000,
    enabled: true, // Always fetch jobs
  });

  // Fetch all internship jobs without any filtering
  const {
    data: internshipJobsData = { jobs: [], hasMore: false, total: 0 },
    isLoading: isLoadingInternships,
    error: internshipError,
  } = useQuery({
    queryKey: ["internshipJobs", internshipJobsPage],
    queryFn: () => fetchInternshipJobs(internshipJobsPage),
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Fetch on mount to ensure jobs are loaded
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // Keep data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 1,
    retryDelay: 1000,
    enabled: true, // Always fetch jobs
  });

  // Fetch remote jobs
  const {
    data: remoteJobsData = { jobs: [], hasMore: false, total: 0 },
    isLoading: isLoadingRemote,
    error: remoteError,
  } = useQuery({
    queryKey: ["remoteJobs", remoteJobsPage],
    queryFn: () => fetchRemoteJobs(remoteJobsPage, []),
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Fetch on mount to ensure jobs are loaded
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // Keep data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 1,
    retryDelay: 1000,
    enabled: true, // Always fetch remote jobs
  });

  // Update all regular jobs when new data arrives - always replace since we only fetch page 1
  useEffect(() => {
    if (jobsData.jobs && jobsData.jobs.length > 0) {
      // Always replace jobs since we're only fetching page 1 for latest jobs
      setAllRegularJobs(jobsData.jobs);
      setHasMoreRegularJobs(jobsData.hasMore);
      setIsLoadingMoreRegular(false);
    } else {
      // No jobs
      setAllRegularJobs([]);
      setHasMoreRegularJobs(false);
    }
  }, [jobsData]);

  // Update all internship jobs when new data arrives - no filtering
  useEffect(() => {
    if (internshipJobsData.jobs && internshipJobsData.jobs.length > 0) {
      if (internshipJobsPage === 1) {
        // First page - replace all jobs
        setAllInternshipJobs(internshipJobsData.jobs);
      } else {
        // Subsequent pages - append new jobs (avoid duplicates)
        setAllInternshipJobs((prev) => {
          const existingIds = new Set(prev.map((j) => j.id || j.job_id));
          const newJobs = internshipJobsData.jobs.filter(
            (j) => !existingIds.has(j.id || j.job_id)
          );
          return [...prev, ...newJobs];
        });
      }
      setHasMoreInternshipJobs(internshipJobsData.hasMore);
      setIsLoadingMoreInternship(false);
    } else if (internshipJobsPage === 1) {
      // No jobs on first page
      setAllInternshipJobs([]);
      setHasMoreInternshipJobs(false);
    }
  }, [internshipJobsData, internshipJobsPage]);

  // Update all remote jobs when new data arrives - no filtering
  useEffect(() => {
    if (remoteJobsData.jobs && remoteJobsData.jobs.length > 0) {
      if (remoteJobsPage === 1) {
        // First page - replace all jobs
        setAllRemoteJobs(remoteJobsData.jobs);
      } else {
        // Subsequent pages - append new jobs (avoid duplicates)
        setAllRemoteJobs((prev) => {
          const existingIds = new Set(prev.map((j) => j.id || j.job_id));
          const newJobs = remoteJobsData.jobs.filter(
            (j) => !existingIds.has(j.id || j.job_id)
          );
          return [...prev, ...newJobs];
        });
      }
      setHasMoreRemoteJobs(remoteJobsData.hasMore);
      setIsLoadingMoreRemote(false);
    } else if (remoteJobsPage === 1) {
      // No jobs on first page
      setAllRemoteJobs([]);
      setHasMoreRemoteJobs(false);
    }
  }, [remoteJobsData, remoteJobsPage]);

  // Extract jobs from the responses
  const jobs = allRegularJobs;
  const internshipJobsRaw = allInternshipJobs;

  // Load more regular jobs
  const handleLoadMoreRegular = useCallback(() => {
    setIsLoadingMoreRegular(true);
    setRegularJobsPage((prev) => prev + 1);
  }, []);

  // Load more internship jobs
  const handleLoadMoreInternship = useCallback(() => {
    setIsLoadingMoreInternship(true);
    setInternshipJobsPage((prev) => prev + 1);
  }, []);

  // Load more remote jobs
  const handleLoadMoreRemote = useCallback(() => {
    setIsLoadingMoreRemote(true);
    setRemoteJobsPage((prev) => prev + 1);
  }, []);

  // Immediate search (when user presses Enter or clicks Search button)
  const handleSearch = useCallback(() => {
    // Always redirect to search results page with filters
    const params = new URLSearchParams();
    if (searchTerm.trim()) {
      params.set("search", searchTerm.trim());
    }
    if (activeFilters.countries.length > 0) {
      params.set("countries", activeFilters.countries.join(","));
    }
    if (activeFilters.skills.length > 0) {
      params.set("skills", activeFilters.skills.join(","));
    }
    if (activeFilters.jobTypes.length > 0) {
      params.set("jobTypes", activeFilters.jobTypes.join(","));
    }
    if (activeFilters.isRemote) {
      params.set("isRemote", "true");
    }
    if (activeFilters.datePosted) {
      params.set("datePosted", activeFilters.datePosted);
    }
    if (activeFilters.salaryMin !== undefined) {
      params.set("salaryMin", String(activeFilters.salaryMin));
    }
    if (activeFilters.salaryMax !== undefined) {
      params.set("salaryMax", String(activeFilters.salaryMax));
    }
    if (activeFilters.salaryByAgreement) {
      params.set("salaryByAgreement", "true");
    }

    navigate(`/jobs/search?${params.toString()}`);
  }, [searchTerm, activeFilters, navigate]);

  // Note: Search and filter changes don't affect the displayed jobs here
  // They only redirect to the search results page when user clicks search button

  // Handle search term change
  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value);
  };

  // Handle key press for search (Enter) - immediate search
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

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

  const transformedJobs = React.useMemo(() => {
    if (!jobs || jobs.length === 0) {
      return [];
    }

    try {
      return (jobs || [])
        .map((job: ApiJob): Job | null => {
          // Handle nested company object if it exists
          const companyObj =
            job.company && typeof job.company === "object"
              ? (job.company as Record<string, unknown>)
              : null;

          // Extract fields with fallbacks for different API formats
          // Ensure jobId is always a string - use only id field (not job_id or external_job_id)
          const jobId = String(job.id || "");

          // Skip jobs without valid IDs - they can't be opened
          if (!jobId || jobId.trim() === "") {
            console.warn("Skipping job without valid ID:", job);
            return null;
          }

          const jobTitle = String(
            job.title || job.job_title || job.position || "Untitled Position"
          );
          const companyName = String(
            job.company_name ||
              (companyObj?.company_name &&
              typeof companyObj.company_name === "string"
                ? companyObj.company_name
                : null) ||
              (companyObj?.name && typeof companyObj.name === "string"
                ? companyObj.name
                : null) ||
              (job.companyName && typeof job.companyName === "string"
                ? job.companyName
                : null) ||
              (job.employer_name && typeof job.employer_name === "string"
                ? job.employer_name
                : null) ||
              (typeof job.company === "string" ? job.company : null) ||
              "Unknown Company"
          );
          const jobCity =
            job.job_city || job.city || (companyObj?.city as string) || "";
          const jobState =
            job.job_state || job.state || (companyObj?.state as string) || "";
          const jobCountry =
            job.job_country ||
            job.country ||
            (companyObj?.country as string) ||
            "";

          // Robust location extraction: handle strings, objects, arrays, and nested fields
          const getLocationStringFromJob = (
            j: Record<string, any>,
            co: Record<string, any> | null
          ): string => {
            // Remote override
            if (j?.job_is_remote || j?.is_remote || j?.remote === true) {
              return "Remote";
            }

            const tryString = (v: any) =>
              v && typeof v === "string" && v.trim() ? v.trim() : null;

            const tryObjectName = (obj: any) => {
              if (!obj || typeof obj !== "object") return null;
              if (tryString(obj.display_name)) return obj.display_name;
              if (tryString(obj.name)) return obj.name;
              if (tryString(obj.location)) return obj.location;
              if (tryString(obj.address)) return obj.address;
              // Try common city/state/country combination
              const parts = [
                obj.city || obj.town || obj.region || obj.state,
                obj.country,
              ]
                .filter(Boolean)
                .map((s) => String(s));
              if (parts.length) return parts.join(", ");
              return null;
            };

            // locations array (some APIs return multiple locations)
            if (Array.isArray(j.locations) && j.locations.length > 0) {
              for (const loc of j.locations) {
                const s = tryString(loc) || tryObjectName(loc);
                if (s) return s;
              }
            }

            // Try common string fields first
            const candidates = [
              j.jobLocation,
              j.location,
              j.location_name,
              j.job_location,
              j.work_location,
              j.address,
            ];
            for (const c of candidates) {
              const s = tryString(c);
              if (s) return s;
            }

            // Try location object shapes
            const objLocation =
              tryObjectName(j.location) ||
              tryObjectName(j.locationData) ||
              tryObjectName(j.job_location) ||
              null;
            if (objLocation) return objLocation;

            // Company object location
            if (co) {
              const compLoc =
                tryString(co.location) ||
                tryString(co.address) ||
                tryObjectName(co.location) ||
                null;
              if (compLoc) return compLoc;
            }

            // Fallback to city/state/country fields
            const fallback = [jobCity, jobState, jobCountry]
              .filter(Boolean)
              .map((s) => String(s))
              .join(", ");
            if (fallback) return fallback;

            return "Location not specified";
          };

          const locationString = String(
            getLocationStringFromJob(job as Record<string, any>, companyObj)
          );
          const applyLink =
            job.apply_url ||
            job.job_apply_link ||
            job.apply_link ||
            job.url ||
            job.applyUrl ||
            job.jobUrl ||
            job.company_url ||
            (companyObj?.url as string) ||
            "";
          // Extract company logo - check all possible fields
          let companyLogo: string | undefined = undefined;

          // Prefer top-level `company_logo` if present (many APIs provide this)
          if (
            !companyLogo &&
            typeof job.company_logo === "string" &&
            job.company_logo.trim()
          ) {
            companyLogo = job.company_logo.trim();
          }

          // Helper function to validate and set logo URL
          const setLogoIfValid = (logoValue: unknown): boolean => {
            if (!logoValue) return false;

            // If array, try each item
            if (Array.isArray(logoValue)) {
              for (const v of logoValue) {
                if (setLogoIfValid(v)) return true;
              }
              return false;
            }

            // If object, probe common fields
            if (typeof logoValue === "object") {
              const obj = logoValue as Record<string, any>;
              const candidates = [
                obj.url,
                obj.src,
                obj.href,
                obj.logo,
                obj.image,
                obj.path,
                obj.file,
                obj.thumbnail,
              ];
              for (const c of candidates) {
                if (setLogoIfValid(c)) return true;
              }
              return false;
            }

            // Treat as string
            const logoUrl = String(logoValue).trim();
            if (!logoUrl) {
              if (process.env.NODE_ENV === "development")
                console.debug("Logo candidate empty string, skipping");
              return false;
            }

            if (process.env.NODE_ENV === "development")
              console.debug("Trying logo candidate:", logoUrl);

            // Accept data URIs and blob URLs
            if (logoUrl.startsWith("data:") || logoUrl.startsWith("blob:")) {
              companyLogo = logoUrl;
              if (process.env.NODE_ENV === "development")
                console.debug("Accepted data/blob logo for job", jobId);
              return true;
            }

            // Protocol-relative URLs
            if (logoUrl.startsWith("//")) {
              companyLogo = `https:${logoUrl}`;
              if (process.env.NODE_ENV === "development")
                console.debug(
                  "Accepted protocol-relative logo for job",
                  jobId,
                  logoUrl
                );
              return true;
            }

            // Absolute http(s)
            if (
              logoUrl.startsWith("http://") ||
              logoUrl.startsWith("https://")
            ) {
              companyLogo = logoUrl;
              if (process.env.NODE_ENV === "development")
                console.debug("Accepted http(s) logo for job", jobId, logoUrl);
              return true;
            }

            // Relative path - accept and leave resolution to browser/app
            if (
              logoUrl.startsWith("/") ||
              logoUrl.startsWith("./") ||
              logoUrl.startsWith("../")
            ) {
              companyLogo = logoUrl;
              if (process.env.NODE_ENV === "development")
                console.debug(
                  "Accepted relative-path logo for job",
                  jobId,
                  logoUrl
                );
              return true;
            }

            if (process.env.NODE_ENV === "development")
              console.debug(
                "Rejected logo candidate (unsupported format)",
                logoUrl
              );

            return false;
          };

          // Check root level fields first - prioritize company_logo field
          // Use Record type to access fields that might not be in the type definition
          const jobAny = job as Record<string, unknown>;

          // Debug: Log available logo fields in development
          if (process.env.NODE_ENV === "development" && !companyLogo) {
            const logoFields = Object.keys(jobAny).filter(
              (key) =>
                key.toLowerCase().includes("logo") ||
                key.toLowerCase().includes("company")
            );
            if (logoFields.length > 0) {
              console.log(
                "🔍 Checking logo fields for job:",
                jobId,
                logoFields
              );
              logoFields.forEach((field) => {
                console.log(`  - ${field}:`, jobAny[field]);
              });
            }
          }

          // Check company_logo first (most common field name)
          if (!companyLogo && jobAny.company_logo) {
            setLogoIfValid(jobAny.company_logo);
          }
          if (!companyLogo && job.company_logo) {
            setLogoIfValid(job.company_logo);
          }
          if (!companyLogo && jobAny.companyLogo) {
            setLogoIfValid(jobAny.companyLogo);
          }
          if (!companyLogo && job.companyLogo) {
            setLogoIfValid(job.companyLogo);
          }
          if (!companyLogo && jobAny.employer_logo) {
            setLogoIfValid(jobAny.employer_logo);
          }
          if (!companyLogo && job.employer_logo) {
            setLogoIfValid(job.employer_logo);
          }
          if (!companyLogo && jobAny.logo) {
            setLogoIfValid(jobAny.logo);
          }
          if (!companyLogo && job.logo) {
            setLogoIfValid(job.logo);
          }
          if (!companyLogo && jobAny.logo_url) {
            setLogoIfValid(jobAny.logo_url);
          }
          if (!companyLogo && job.logo_url) {
            setLogoIfValid(job.logo_url);
          }
          // Check additional possible field variations
          if (!companyLogo && jobAny.employerLogo) {
            setLogoIfValid(jobAny.employerLogo);
          }
          if (!companyLogo && jobAny.companyLogoUrl) {
            setLogoIfValid(jobAny.companyLogoUrl);
          }
          if (!companyLogo && jobAny.logoUrl) {
            setLogoIfValid(jobAny.logoUrl);
          }

          // Check nested company object
          if (!companyLogo && companyObj) {
            if (companyObj.logo) setLogoIfValid(companyObj.logo);
            if (!companyLogo && companyObj.logo_url)
              setLogoIfValid(companyObj.logo_url);
            if (!companyLogo && companyObj.company_logo)
              setLogoIfValid(companyObj.company_logo);
            if (!companyLogo && companyObj.employer_logo)
              setLogoIfValid(companyObj.employer_logo);
          }

          // Check employer object if it exists separately
          if (
            !companyLogo &&
            job.employer &&
            typeof job.employer === "object"
          ) {
            const employerObj = job.employer as Record<string, unknown>;
            if (employerObj.logo) setLogoIfValid(employerObj.logo);
            if (!companyLogo && employerObj.logo_url)
              setLogoIfValid(employerObj.logo_url);
            if (!companyLogo && employerObj.company_logo)
              setLogoIfValid(employerObj.company_logo);
            if (!companyLogo && employerObj.employer_logo)
              setLogoIfValid(employerObj.employer_logo);
          }

          // Format salary - handle both numeric and string formats
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
          // Handle case-insensitive matching
          const employmentTypeRawUpper = employmentTypeRaw.toUpperCase();
          const employmentType =
            jobTypeLabels[employmentTypeRawUpper] ||
            jobTypeLabels[employmentTypeRaw] ||
            employmentTypeRaw ||
            "Full time";

          // Determine work arrangement
          let workArrangement = "On-site";
          const isRemote =
            job.job_is_remote || job.is_remote || job.remote === true;
          if (isRemote) {
            workArrangement = "Remote";
          } else if (jobTitle?.toLowerCase().includes("hybrid")) {
            workArrangement = "Hybrid";
          }

          // Calculate match percentage
          const jobSkills = extractJobSkills(job);
          const matchPercentage = calculateMatchPercentage(
            userTopSkills,
            jobSkills,
            jobTitle
          );

          return {
            id: jobId,
            title: jobTitle,
            company: companyName,
            company_name:
              (job as Record<string, any>).company_name ||
              (job as Record<string, any>).employer_name ||
              (typeof job.company === "string" ? job.company : undefined),
            location: locationString,
            url: applyLink,
            company_logo: companyLogo,
            is_saved: savedJobs?.includes(String(jobId)),
            salary,
            employment_type: employmentType,
            work_arrangement: workArrangement,
            matchPercentage,
          };
        })
        .filter((job): job is Job => job !== null); // Filter out null jobs
    } catch (error) {
      console.error("Error transforming jobs:", error);
      // Return empty array on error to prevent crashes
      return [];
    }
  }, [jobs, savedJobs, userTopSkills]);

  // Sort by match percentage (highest first) - display top 9 jobs
  const regularJobs = useMemo(() => {
    console.log(
      "📅 Processing latest jobs - total jobs:",
      transformedJobs.length
    );

    // Get all transformed jobs
    const allJobs = transformedJobs;

    // Sort by match percentage (highest first), then by date posted (newest first) as tiebreaker
    const sorted = [...allJobs].sort((a, b) => {
      // First, sort by match percentage (highest first)
      const matchA = a.matchPercentage ?? 0;
      const matchB = b.matchPercentage ?? 0;

      if (matchA !== matchB) {
        return matchB - matchA; // Higher match percentage first
      }

      // If match percentages are equal, sort by date posted (newest first)
      const jobA = allRegularJobs.find((j) => (j.id || j.job_id) === a.id);
      const jobB = allRegularJobs.find((j) => (j.id || j.job_id) === b.id);

      const dateA =
        jobA?.posted_at || jobA?.fetched_at || jobA?.date_posted || "";
      const dateB =
        jobB?.posted_at || jobB?.fetched_at || jobB?.date_posted || "";

      // If both have dates, compare them
      if (dateA && dateB) {
        try {
          const timeA = new Date(dateA as string).getTime();
          const timeB = new Date(dateB as string).getTime();
          return timeB - timeA; // Newest first (descending)
        } catch (e) {
          // If date parsing fails, keep original order
          return 0;
        }
      }

      // If one doesn't have a date, put it at the end
      if (!dateA && dateB) return 1;
      if (dateA && !dateB) return -1;

      // If neither has a date, keep original order
      return 0;
    });

    // Return top 9 jobs (sorted by match percentage, highest first)
    const top9Jobs = sorted.slice(0, 9);
    console.log(
      `✅ Displaying ${top9Jobs.length} jobs (sorted by match percentage, highest first)`
    );

    return top9Jobs;
  }, [transformedJobs, allRegularJobs]);

  // Transform internship jobs separately - same transformation logic as regular jobs
  const transformedInternshipJobs = React.useMemo(() => {
    if (!internshipJobsRaw || internshipJobsRaw.length === 0) {
      return [];
    }

    try {
      return (internshipJobsRaw || [])
        .map((job: ApiJob): Job | null => {
          // Use the same transformation logic as regular jobs
          // Handle nested company object if it exists
          const companyObj =
            job.company && typeof job.company === "object"
              ? (job.company as Record<string, unknown>)
              : null;

          // Extract fields with fallbacks for different API formats
          // Ensure jobId is always a string - use only id field (not job_id or external_job_id)
          const jobId = String(job.id || "");

          // Skip jobs without valid IDs - they can't be opened
          if (!jobId || jobId.trim() === "") {
            console.warn("Skipping internship job without valid ID:", job);
            return null;
          }

          const jobTitle =
            job.title || job.job_title || job.position || "Untitled Position";
          const companyName =
            job.company_name ||
            (companyObj?.company_name as string) ||
            (companyObj?.name as string) ||
            job.companyName ||
            job.employer_name ||
            (typeof job.company === "string" ? job.company : null) ||
            "Unknown Company";
          const jobCity =
            job.job_city || job.city || (companyObj?.city as string) || "";
          const jobState =
            job.job_state || job.state || (companyObj?.state as string) || "";
          const jobCountry =
            job.job_country ||
            job.country ||
            (companyObj?.country as string) ||
            "";
          const locationString = String(
            (job.jobLocation && typeof job.jobLocation === "string"
              ? job.jobLocation
              : null) ||
              (job.location && typeof job.location === "string"
                ? job.location
                : null) ||
              (companyObj?.location && typeof companyObj.location === "string"
                ? companyObj.location
                : null) ||
              [jobCity, jobState, jobCountry]
                .filter(Boolean)
                .map((s) => String(s))
                .join(", ") ||
              "Location not specified"
          );
          const applyLink =
            job.applyUrl ||
            job.jobUrl ||
            job.job_apply_link ||
            job.apply_link ||
            job.url ||
            job.apply_url ||
            job.company_url ||
            (companyObj?.url as string) ||
            "";

          // Extract company logo (same logic as regular jobs)
          let companyLogo: string | undefined = undefined;

          // Prefer top-level `company_logo` if present
          if (
            !companyLogo &&
            typeof job.company_logo === "string" &&
            job.company_logo.trim()
          ) {
            companyLogo = job.company_logo.trim();
          }

          // Prefer top-level `company_logo` if present
          if (
            !companyLogo &&
            typeof job.company_logo === "string" &&
            job.company_logo.trim()
          ) {
            companyLogo = job.company_logo.trim();
          }

          // Helper function to validate and set logo URL
          const setLogoIfValid = (logoValue: unknown): boolean => {
            if (!logoValue) return false;

            if (Array.isArray(logoValue)) {
              for (const v of logoValue) if (setLogoIfValid(v)) return true;
              return false;
            }

            if (typeof logoValue === "object") {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const obj = logoValue as Record<string, any>;
              const candidates = [
                obj.url,
                obj.src,
                obj.href,
                obj.logo,
                obj.image,
                obj.path,
                obj.file,
                obj.thumbnail,
              ];
              for (const c of candidates) if (setLogoIfValid(c)) return true;
              return false;
            }

            const logoUrl = String(logoValue).trim();
            if (!logoUrl) return false;

            if (logoUrl.startsWith("data:") || logoUrl.startsWith("blob:")) {
              companyLogo = logoUrl;
              return true;
            }
            if (logoUrl.startsWith("//")) {
              companyLogo = `https:${logoUrl}`;
              return true;
            }
            if (
              logoUrl.startsWith("http://") ||
              logoUrl.startsWith("https://")
            ) {
              companyLogo = logoUrl;
              return true;
            }
            if (
              logoUrl.startsWith("/") ||
              logoUrl.startsWith("./") ||
              logoUrl.startsWith("../")
            ) {
              companyLogo = logoUrl;
              return true;
            }

            return false;
          };

          // Check root level fields first (check all possible logo field names)
          if (!companyLogo && job.companyLogo) setLogoIfValid(job.companyLogo);
          if (!companyLogo && job.employer_logo)
            setLogoIfValid(job.employer_logo);
          if (!companyLogo && job.company_logo)
            setLogoIfValid(job.company_logo);
          if (!companyLogo && job.logo) setLogoIfValid(job.logo);
          if (!companyLogo && job.logo_url) setLogoIfValid(job.logo_url);
          // Check additional possible fields
          const jobAny = job as Record<string, unknown>;
          if (!companyLogo && jobAny.companyLogo)
            setLogoIfValid(jobAny.companyLogo);
          if (!companyLogo && jobAny.employerLogo)
            setLogoIfValid(jobAny.employerLogo);
          if (!companyLogo && jobAny.companyLogoUrl)
            setLogoIfValid(jobAny.companyLogoUrl);
          if (!companyLogo && jobAny.logoUrl) setLogoIfValid(jobAny.logoUrl);

          // Check nested company object
          if (!companyLogo && companyObj) {
            if (companyObj.logo) setLogoIfValid(companyObj.logo);
            if (!companyLogo && companyObj.logo_url)
              setLogoIfValid(companyObj.logo_url);
            if (!companyLogo && companyObj.company_logo)
              setLogoIfValid(companyObj.company_logo);
            if (!companyLogo && companyObj.employer_logo)
              setLogoIfValid(companyObj.employer_logo);
          }

          // Check employer object if it exists separately
          if (
            !companyLogo &&
            job.employer &&
            typeof job.employer === "object"
          ) {
            const employerObj = job.employer as Record<string, unknown>;
            if (employerObj.logo) setLogoIfValid(employerObj.logo);
            if (!companyLogo && employerObj.logo_url)
              setLogoIfValid(employerObj.logo_url);
            if (!companyLogo && employerObj.company_logo)
              setLogoIfValid(employerObj.company_logo);
            if (!companyLogo && employerObj.employer_logo)
              setLogoIfValid(employerObj.employer_logo);
          }

          // Format salary (same logic as regular jobs)
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
            "INTERN";
          const employmentTypeRawUpper = employmentTypeRaw.toUpperCase();
          const employmentType =
            jobTypeLabels[employmentTypeRawUpper] ||
            jobTypeLabels[employmentTypeRaw] ||
            employmentTypeRaw ||
            "Intern";

          // Determine work arrangement
          let workArrangement = "On-site";
          const isRemote =
            job.job_is_remote || job.is_remote || job.remote === true;
          if (isRemote) {
            workArrangement = "Remote";
          } else if (jobTitle?.toLowerCase().includes("hybrid")) {
            workArrangement = "Hybrid";
          }

          // Calculate match percentage
          const jobSkills = extractJobSkills(job);
          const matchPercentage = calculateMatchPercentage(
            userTopSkills,
            jobSkills,
            jobTitle
          );

          return {
            id: jobId,
            title: jobTitle,
            company: companyName,
            company_name:
              (job as Record<string, any>).company_name ||
              (job as Record<string, any>).employer_name ||
              (typeof job.company === "string" ? job.company : undefined),
            location: locationString,
            url: applyLink,
            company_logo: companyLogo,
            is_saved: savedJobs?.includes(String(jobId)),
            salary,
            employment_type: employmentType,
            work_arrangement: workArrangement,
            matchPercentage,
          };
        })
        .filter((job): job is Job => job !== null);
    } catch (error) {
      console.error("Error transforming internship jobs:", error);
      return [];
    }
  }, [internshipJobsRaw, savedJobs, userTopSkills]);

  // All internship jobs without any limit
  const internJobs = useMemo(() => {
    return transformedInternshipJobs; // Return all internship jobs, no limit
  }, [transformedInternshipJobs]);

  // Transform remote jobs separately - same transformation logic as regular jobs
  const transformedRemoteJobs = React.useMemo(() => {
    if (!allRemoteJobs || allRemoteJobs.length === 0) {
      return [];
    }

    try {
      return (allRemoteJobs || [])
        .map((job: ApiJob): Job | null => {
          // Use the same transformation logic as regular jobs
          // Handle nested company object if it exists
          const companyObj =
            job.company && typeof job.company === "object"
              ? (job.company as Record<string, unknown>)
              : null;

          // Extract fields with fallbacks for different API formats
          // Ensure jobId is always a string - use only id field (not job_id or external_job_id)
          const jobId = String(job.id || "");

          // Skip jobs without valid IDs - they can't be opened
          if (!jobId || jobId.trim() === "") {
            console.warn("Skipping remote job without valid ID:", job);
            return null;
          }

          const jobTitle =
            job.title || job.job_title || job.position || "Untitled Position";
          const companyName =
            job.company_name ||
            (companyObj?.company_name as string) ||
            (companyObj?.name as string) ||
            job.companyName ||
            job.employer_name ||
            (typeof job.company === "string" ? job.company : null) ||
            "Unknown Company";
          const jobCity =
            job.job_city || job.city || (companyObj?.city as string) || "";
          const jobState =
            job.job_state || job.state || (companyObj?.state as string) || "";
          const jobCountry =
            job.job_country ||
            job.country ||
            (companyObj?.country as string) ||
            "";
          const locationString = String(
            (job.jobLocation && typeof job.jobLocation === "string"
              ? job.jobLocation
              : null) ||
              (job.location && typeof job.location === "string"
                ? job.location
                : null) ||
              (companyObj?.location && typeof companyObj.location === "string"
                ? companyObj.location
                : null) ||
              [jobCity, jobState, jobCountry]
                .filter(Boolean)
                .map((s) => String(s))
                .join(", ") ||
              "Remote"
          );
          const applyLink =
            job.applyUrl ||
            job.jobUrl ||
            job.job_apply_link ||
            job.apply_link ||
            job.url ||
            job.apply_url ||
            job.company_url ||
            (companyObj?.url as string) ||
            "";

          // Extract company logo (same logic as regular jobs)
          let companyLogo: string | undefined = undefined;

          // Helper function to validate and set logo URL
          const setLogoIfValid = (logoValue: unknown): boolean => {
            if (!logoValue) return false;

            if (Array.isArray(logoValue)) {
              for (const v of logoValue) if (setLogoIfValid(v)) return true;
              return false;
            }

            if (typeof logoValue === "object") {
              const obj = logoValue as Record<string, any>;
              const candidates = [
                obj.url,
                obj.src,
                obj.href,
                obj.logo,
                obj.image,
                obj.path,
                obj.file,
                obj.thumbnail,
              ];
              for (const c of candidates) if (setLogoIfValid(c)) return true;
              return false;
            }

            const logoUrl = String(logoValue).trim();
            if (!logoUrl) return false;

            if (logoUrl.startsWith("data:") || logoUrl.startsWith("blob:")) {
              companyLogo = logoUrl;
              return true;
            }
            if (logoUrl.startsWith("//")) {
              companyLogo = `https:${logoUrl}`;
              return true;
            }
            if (
              logoUrl.startsWith("http://") ||
              logoUrl.startsWith("https://")
            ) {
              companyLogo = logoUrl;
              return true;
            }
            if (
              logoUrl.startsWith("/") ||
              logoUrl.startsWith("./") ||
              logoUrl.startsWith("../")
            ) {
              companyLogo = logoUrl;
              return true;
            }

            return false;
          };

          // Check root level fields first (check all possible logo field names)
          if (!companyLogo && job.companyLogo) setLogoIfValid(job.companyLogo);
          if (!companyLogo && job.employer_logo)
            setLogoIfValid(job.employer_logo);
          if (!companyLogo && job.company_logo)
            setLogoIfValid(job.company_logo);
          if (!companyLogo && job.logo) setLogoIfValid(job.logo);
          if (!companyLogo && job.logo_url) setLogoIfValid(job.logo_url);
          // Check additional possible fields
          const jobAny = job as Record<string, unknown>;
          if (!companyLogo && jobAny.companyLogo)
            setLogoIfValid(jobAny.companyLogo);
          if (!companyLogo && jobAny.employerLogo)
            setLogoIfValid(jobAny.employerLogo);
          if (!companyLogo && jobAny.companyLogoUrl)
            setLogoIfValid(jobAny.companyLogoUrl);
          if (!companyLogo && jobAny.logoUrl) setLogoIfValid(jobAny.logoUrl);

          // Check nested company object
          if (!companyLogo && companyObj) {
            if (companyObj.logo) setLogoIfValid(companyObj.logo);
            if (!companyLogo && companyObj.logo_url)
              setLogoIfValid(companyObj.logo_url);
            if (!companyLogo && companyObj.company_logo)
              setLogoIfValid(companyObj.company_logo);
            if (!companyLogo && companyObj.employer_logo)
              setLogoIfValid(companyObj.employer_logo);
          }

          // Check employer object if it exists separately
          if (
            !companyLogo &&
            job.employer &&
            typeof job.employer === "object"
          ) {
            const employerObj = job.employer as Record<string, unknown>;
            if (employerObj.logo) setLogoIfValid(employerObj.logo);
            if (!companyLogo && employerObj.logo_url)
              setLogoIfValid(employerObj.logo_url);
            if (!companyLogo && employerObj.company_logo)
              setLogoIfValid(employerObj.company_logo);
            if (!companyLogo && employerObj.employer_logo)
              setLogoIfValid(employerObj.employer_logo);
          }

          // Format salary (same logic as regular jobs)
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
          const employmentTypeRawUpper = employmentTypeRaw.toUpperCase();
          const employmentType =
            jobTypeLabels[employmentTypeRawUpper] ||
            jobTypeLabels[employmentTypeRaw] ||
            employmentTypeRaw ||
            "Full time";

          // Determine work arrangement - always Remote for remote jobs
          const workArrangement = "Remote";

          // Calculate match percentage
          const jobSkills = extractJobSkills(job);
          const matchPercentage = calculateMatchPercentage(
            userTopSkills,
            jobSkills,
            jobTitle
          );

          return {
            id: jobId,
            title: jobTitle,
            company: companyName,
            company_name:
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (job as Record<string, any>).company_name ||
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (job as Record<string, any>).employer_name ||
              (typeof job.company === "string" ? job.company : undefined),
            location: locationString,
            url: applyLink,
            company_logo: companyLogo,
            is_saved: savedJobs?.includes(String(jobId)),
            salary,
            employment_type: employmentType,
            work_arrangement: workArrangement,
            matchPercentage,
          };
        })
        .filter((job): job is Job => job !== null);
    } catch (error) {
      console.error("Error transforming remote jobs:", error);
      return [];
    }
  }, [allRemoteJobs, savedJobs, userTopSkills]);

  // Filter out intern jobs from remote jobs
  const remoteJobs = useMemo(() => {
    return transformedRemoteJobs.filter(
      (job) =>
        job.employment_type?.toLowerCase() !== "intern" &&
        job.employment_type?.toLowerCase() !== "internship"
    );
  }, [transformedRemoteJobs]);

  // Debug logging
  useEffect(() => {
    console.log(
      "🌐 Job API Endpoint: https://breneo-job-aggregator.onrender.com/api/"
    );
    console.log("📊 JobsPage State:", {
      isLoading,
      isLoadingInternships,
      isLoadingRemote,
      error: error?.message,
      internshipError: internshipError?.message,
      remoteError: remoteError?.message,
      jobsCount: jobs.length,
      internshipJobsRawCount: internshipJobsRaw.length,
      transformedJobsCount: transformedJobs.length,
      transformedInternshipJobsCount: transformedInternshipJobs.length,
      transformedRemoteJobsCount: transformedRemoteJobs.length,
      regularJobsCount: regularJobs.length,
      internJobsCount: internJobs.length,
      remoteJobsCount: remoteJobs.length,
      regularJobsPage,
      internshipJobsPage,
      remoteJobsPage,
      hasMoreRegularJobs,
      hasMoreInternshipJobs,
      hasMoreRemoteJobs,
      isLoadingMoreRegular,
      isLoadingMoreInternship,
      isLoadingMoreRemote,
    });
  }, [
    isLoading,
    isLoadingInternships,
    isLoadingRemote,
    error,
    internshipError,
    remoteError,
    jobs.length,
    internshipJobsRaw.length,
    transformedJobs.length,
    transformedInternshipJobs.length,
    transformedRemoteJobs.length,
    regularJobs.length,
    internJobs.length,
    remoteJobs.length,
    regularJobsPage,
    internshipJobsPage,
    remoteJobsPage,
    hasMoreRegularJobs,
    hasMoreInternshipJobs,
    hasMoreRemoteJobs,
    isLoadingMoreRegular,
    isLoadingMoreInternship,
    isLoadingMoreRemote,
  ]);

  // Helper function to redirect to search results with filters
  const redirectToSearchResults = useCallback(
    (filters: JobFilters, search: string) => {
      const params = new URLSearchParams();
      if (search) {
        params.set("search", search);
      }
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
      navigate(`/jobs/search?${params.toString()}`);
    },
    [navigate]
  );

  // Handle work types change - only update filters, don't redirect until search button is clicked
  const handleWorkTypesChange = (workTypes: string[]) => {
    const newFilters = {
      ...activeFilters,
      jobTypes: workTypes,
    };
    setActiveFilters(newFilters);
    setTempFilters(newFilters);
    // Don't redirect - wait for user to click search button
  };

  // Handle remote change - only update filters, don't redirect until search button is clicked
  const handleRemoteChange = (isRemote: boolean) => {
    const newFilters = {
      ...activeFilters,
      isRemote: isRemote,
    };
    setActiveFilters(newFilters);
    setTempFilters(newFilters);
    // Don't redirect - wait for user to click search button
  };

  // Handle countries change - redirect to search results
  const handleCountriesChange = (countryCodes: string[]) => {
    const newFilters = {
      ...activeFilters,
      countries: countryCodes,
    };
    setActiveFilters(newFilters);
    setTempFilters(newFilters);
    // Redirect to search results page when filters change
    redirectToSearchResults(newFilters, searchTerm);
  };

  // Handle removing a skill filter - redirect to search results
  const handleRemoveSkill = (skillToRemove: string) => {
    const newFilters = {
      ...activeFilters,
      skills: activeFilters.skills.filter((skill) => skill !== skillToRemove),
    };
    setActiveFilters(newFilters);
    setTempFilters(newFilters);
    redirectToSearchResults(newFilters, searchTerm);
  };

  // Handle removing a country filter - redirect to search results
  const handleRemoveCountry = (countryCodeToRemove: string) => {
    const newFilters = {
      ...activeFilters,
      countries: activeFilters.countries.filter(
        (code) => code !== countryCodeToRemove
      ),
    };
    setActiveFilters(newFilters);
    setTempFilters(newFilters);
    redirectToSearchResults(newFilters, searchTerm);
  };

  // Handle removing job type filter - redirect to search results
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
    redirectToSearchResults(newFilters, searchTerm);
  };

  // Handle removing remote filter - redirect to search results
  const handleRemoveRemote = () => {
    const newFilters = {
      ...activeFilters,
      isRemote: false,
    };
    setActiveFilters(newFilters);
    setTempFilters(newFilters);
    redirectToSearchResults(newFilters, searchTerm);
  };

  // No need to sync selectedJobType anymore as we use WorkTypeDropdown directly

  const handleApplyFilters = () => {
    console.log("🔧 Applying filters:", tempFilters);
    setActiveFilters(tempFilters);
    setFilterModalOpen(false);
    // Redirect to search results page with filters
    redirectToSearchResults(tempFilters, searchTerm);
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
    setTempFilters(clearedFilters);
    setActiveFilters(clearedFilters);
    setFilterModalOpen(false);
    // Just clear filters in UI, don't redirect since we're showing latest jobs
  };

  // Function to fetch job count for a specific skill
  const fetchJobCountForSkill = async (skill: string): Promise<number> => {
    try {
      const response = await jobService.fetchActiveJobs({
        query: skill,
        filters: {
          country: "Georgia",
          countries: [],
          jobTypes: [],
          isRemote: false,
          datePosted: undefined,
          skills: [skill], // Filter by this skill only
        },
        page: 1,
        pageSize: 50, // Fetch up to 50 jobs to get a better count
      });
      // Return the count (if we get 20, there might be more, but we'll show 20+)
      return response.jobs.length;
    } catch (error) {
      console.error(`Error fetching job count for skill ${skill}:`, error);
      return 0;
    }
  };

  // Fetch job counts for each skill using React Query
  const skillJobCounts = useQuery<Record<string, number>>({
    queryKey: ["skillJobCounts", userTopSkills.join(",")],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      // Fetch counts for all skills in parallel
      await Promise.all(
        userTopSkills.map(async (skill) => {
          counts[skill] = await fetchJobCountForSkill(skill);
        })
      );
      return counts;
    },
    enabled: userTopSkills.length > 0 && !loadingSkills,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  return (
    <DashboardLayout>
      <BetaVersionModal />

      <div className="max-w-7xl mx-auto py-6 px-2 sm:px-6 lg:px-8">
        {/* Modern Search Bar */}
        <div className="mb-8 relative max-w-6xl mx-auto">
          <div className="flex items-center bg-white dark:bg-[#242424] border-2 border-breneo-accent dark:border-gray-600 rounded-3xl pl-3 md:pl-4 pr-2 md:pr-2.5 py-2.5 md:py-3 overflow-visible min-h-[3rem]">
            {/* Briefcase Icon - At the start */}
            <Briefcase
              className="h-5 w-5 text-breneo-accent dark:text-breneo-blue flex-shrink-0 mr-2"
              strokeWidth={2}
            />

            {/* Search Input Field */}
            <Input
              placeholder="ძებნა"
              value={searchTerm}
              onChange={(e) => handleSearchTermChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm text-gray-900 dark:text-gray-100 flex-1 min-w-0 bg-transparent h-auto py-0"
            />

            {/* Work Types Field - Hidden on mobile, shown on desktop */}
            {!isMobile && (
              <>
                <div className="w-px bg-gray-300 dark:bg-gray-600 ml-2 mr-4 flex-shrink-0 h-6 my-auto" />
                <div className="flex items-center flex-1 min-w-0 relative">
                  <WorkTypeDropdown
                    selectedWorkTypes={activeFilters.jobTypes}
                    onWorkTypesChange={handleWorkTypesChange}
                    isRemote={activeFilters.isRemote}
                    onRemoteChange={handleRemoteChange}
                    placeholder="მუშაობის ტიპები"
                  />
                </div>
              </>
            )}

            {/* Filter Button - Inside search bar */}
            {(() => {
              const activeFilterCount = countActiveFilters(activeFilters);
              return (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setFilterModalOpen(true)}
                  className="h-10 w-10 flex-shrink-0 bg-gray-100 dark:bg-gray-700 border-0 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md ml-2 relative"
                  aria-label="Filter jobs"
                >
                  <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
                  {activeFilterCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-breneo-blue text-white text-xs rounded-full">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              );
            })()}

            {/* Search Button - Circular purple button with white magnifying glass */}
            <Button
              variant="default"
              size="icon"
              onClick={handleSearch}
              className="h-10 w-10 flex-shrink-0 bg-breneo-blue hover:bg-breneo-blue/90 rounded-md ml-2"
              aria-label="Search"
            >
              <Search className="h-5 w-5 text-white" />
            </Button>
          </div>
        </div>

        {/* Active Filters Section */}
        {(() => {
          const hasActiveFilters =
            activeFilters.skills.length > 0 ||
            activeFilters.countries.length > 0 ||
            activeFilters.jobTypes.length > 0 ||
            activeFilters.isRemote ||
            activeFilters.datePosted ||
            activeFilters.salaryMin !== undefined ||
            activeFilters.salaryMax !== undefined ||
            activeFilters.salaryByAgreement;

          if (!hasActiveFilters) return null;

          return (
            <div className="mb-8">
              <h2 className="text-lg font-bold mb-4">Active Filters</h2>
              <div className="flex flex-wrap gap-2">
                {/* Skills */}
                {activeFilters.skills.map((skill) => (
                  <div
                    key={`skill-${skill}`}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-[14px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    <span className="text-sm font-medium whitespace-nowrap">
                      {String(skill)}
                    </span>
                    <button
                      onClick={() => handleRemoveSkill(skill)}
                      className="flex-shrink-0 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${skill} filter`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {/* Countries */}
                {activeFilters.countries.map((countryCode) => {
                  const country = countries.find((c) => c.code === countryCode);
                  const countryName = country?.name
                    ? String(country.name)
                    : String(countryCode);
                  return (
                    <div
                      key={`country-${countryCode}`}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-[14px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      <span className="text-sm font-medium whitespace-nowrap">
                        {countryName}
                      </span>
                      <button
                        onClick={() => handleRemoveCountry(countryCode)}
                        className="flex-shrink-0 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5 transition-colors"
                        aria-label={`Remove ${countryName} filter`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}

                {/* Job Types */}
                {activeFilters.jobTypes.map((jobType) => {
                  const jobTypeLabel = jobTypeLabels[jobType]
                    ? String(jobTypeLabels[jobType])
                    : String(jobType);
                  return (
                    <div
                      key={`jobType-${jobType}`}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-[14px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      <span className="text-sm font-medium whitespace-nowrap">
                        {jobTypeLabel}
                      </span>
                      <button
                        onClick={() => handleRemoveJobType(jobType)}
                        className="flex-shrink-0 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5 transition-colors"
                        aria-label={`Remove ${jobTypeLabel} filter`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}

                {/* Remote */}
                {activeFilters.isRemote && (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-[14px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                    <span className="text-sm font-medium whitespace-nowrap">
                      Remote
                    </span>
                    <button
                      onClick={handleRemoveRemote}
                      className="flex-shrink-0 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5 transition-colors"
                      aria-label="Remove Remote filter"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Date Posted */}
                {activeFilters.datePosted && (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-[14px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                    <span className="text-sm font-medium whitespace-nowrap">
                      {activeFilters.datePosted === "today"
                        ? "Posted Today"
                        : activeFilters.datePosted === "week"
                        ? "Posted This Week"
                        : activeFilters.datePosted === "month"
                        ? "Posted This Month"
                        : `Posted: ${activeFilters.datePosted}`}
                    </span>
                    <button
                      onClick={() => {
                        const newFilters = {
                          ...activeFilters,
                          datePosted: undefined,
                        };
                        setActiveFilters(newFilters);
                        setTempFilters(newFilters);
                        redirectToSearchResults(newFilters, searchTerm);
                      }}
                      className="flex-shrink-0 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5 transition-colors"
                      aria-label="Remove Date Posted filter"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Salary Range */}
                {(activeFilters.salaryMin !== undefined ||
                  activeFilters.salaryMax !== undefined) && (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-[14px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                    <span className="text-sm font-medium whitespace-nowrap">
                      {activeFilters.salaryMin !== undefined &&
                      activeFilters.salaryMax !== undefined
                        ? `$${activeFilters.salaryMin} - $${activeFilters.salaryMax}`
                        : activeFilters.salaryMin !== undefined
                        ? `Min: $${activeFilters.salaryMin}`
                        : `Max: $${activeFilters.salaryMax}`}
                    </span>
                    <button
                      onClick={() => {
                        const newFilters = {
                          ...activeFilters,
                          salaryMin: undefined,
                          salaryMax: undefined,
                        };
                        setActiveFilters(newFilters);
                        setTempFilters(newFilters);
                        redirectToSearchResults(newFilters, searchTerm);
                      }}
                      className="flex-shrink-0 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5 transition-colors"
                      aria-label="Remove Salary filter"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Salary By Agreement */}
                {activeFilters.salaryByAgreement && (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-[14px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                    <span className="text-sm font-medium whitespace-nowrap">
                      Salary By Agreement
                    </span>
                    <button
                      onClick={() => {
                        const newFilters = {
                          ...activeFilters,
                          salaryByAgreement: false,
                        };
                        setActiveFilters(newFilters);
                        setTempFilters(newFilters);
                        redirectToSearchResults(newFilters, searchTerm);
                      }}
                      className="flex-shrink-0 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5 transition-colors"
                      aria-label="Remove Salary By Agreement filter"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {(internshipError || remoteError || error) && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-center gap-3 mb-6">
            <AlertCircle className="h-5 w-5" />
            <p>
              <strong>Error:</strong>{" "}
              {(error as Error)?.message ||
                (internshipError as Error)?.message ||
                (remoteError as Error)?.message}
            </p>
          </div>
        )}

        {/* Latest Jobs Section */}
        {!isLoading && regularJobs.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-6 w-6 text-breneo-blue" />
              <h2 className="text-lg font-bold">Latest Jobs</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularJobs.map((job) => (
                <Card
                  key={job.id}
                  className="group flex flex-col transition-all duration-200 border border-gray-200 hover:border-gray-400 overflow-hidden rounded-3xl cursor-pointer"
                  onClick={() => {
                    if (!job.id || String(job.id).trim() === "") return;
                    const encodedId = encodeURIComponent(String(job.id));
                    navigate(`/jobs/${encodedId}`);
                  }}
                >
                  <CardContent className="px-5 pt-5 pb-4 flex flex-col flex-grow">
                    {/* Company Logo and Info */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-shrink-0 relative w-10 h-10">
                        {job.company_logo ? (
                          <img
                            src={job.company_logo}
                            alt={`${job.company_name || job.company} logo`}
                            className="w-10 h-10 rounded-md object-cover flex-shrink-0 border border-gray-200"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              console.warn(
                                "❌ Logo failed to load:",
                                job.company_logo,
                                target.src
                              );
                              target.style.display = "none";
                              const fallback =
                                target.nextElementSibling as HTMLElement;
                              if (fallback) {
                                fallback.style.display = "flex";
                              }
                            }}
                            onLoad={() => {
                              // Logo loaded successfully
                              if (process.env.NODE_ENV === "development") {
                                console.log(
                                  "✅ Logo loaded successfully:",
                                  job.company_logo
                                );
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-10 h-10 rounded-md bg-breneo-accent flex items-center justify-center ${
                            job.company_logo ? "hidden absolute inset-0" : ""
                          }`}
                        >
                          <Briefcase className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">
                          {job.company_name || job.company}
                        </h3>
                        <p className="mt-0.5 text-xs text-gray-500 truncate">
                          {job.location}
                        </p>
                      </div>
                    </div>

                    {/* Job Title */}
                    <h4 className="font-bold text-base mb-2 line-clamp-2 min-h-[2.5rem]">
                      {job.title}
                    </h4>

                    {/* Job Details as chips (without salary) */}
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

                    {/* Match percentage & Save button */}
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
                        aria-label={job.is_saved ? "Unsave job" : "Save job"}
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
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Loading state for latest jobs */}
        {isLoading && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-6 w-6 text-breneo-blue" />
              <h2 className="text-lg font-bold">Latest Jobs</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
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
          </section>
        )}

        {/* Remote Jobs Section */}
        {!isLoadingRemote && remoteJobs.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="h-6 w-6 text-breneo-blue" />
              <h2 className="text-lg font-bold">Remote Jobs</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {remoteJobs.map((job) => (
                <Card
                  key={job.id}
                  className="group flex flex-col transition-all duration-200 border border-gray-200 hover:border-gray-400 overflow-hidden rounded-3xl cursor-pointer"
                  onClick={() => {
                    if (!job.id || String(job.id).trim() === "") return;
                    const encodedId = encodeURIComponent(String(job.id));
                    navigate(`/jobs/${encodedId}`);
                  }}
                >
                  <CardContent className="px-5 pt-5 pb-4 flex flex-col flex-grow">
                    {/* Company Logo and Info */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-shrink-0 relative w-10 h-10">
                        {job.company_logo ? (
                          <img
                            src={job.company_logo}
                            alt={`${job.company_name || job.company} logo`}
                            className="w-10 h-10 rounded-full object-cover border border-gray-200"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              console.warn(
                                "❌ Logo failed to load:",
                                job.company_logo,
                                target.src
                              );
                              target.style.display = "none";
                              const fallback =
                                target.nextElementSibling as HTMLElement;
                              if (fallback) {
                                fallback.style.display = "flex";
                              }
                            }}
                            onLoad={() => {
                              // Logo loaded successfully
                              if (process.env.NODE_ENV === "development") {
                                console.log(
                                  "✅ Logo loaded successfully:",
                                  job.company_logo
                                );
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-10 h-10 rounded-full bg-breneo-accent flex items-center justify-center ${
                            job.company_logo ? "hidden absolute inset-0" : ""
                          }`}
                        >
                          <Briefcase className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">
                          {job.company_name || job.company}
                        </h3>
                        <p className="mt-0.5 text-xs text-gray-500 truncate">
                          {job.location}
                        </p>
                      </div>
                    </div>

                    {/* Job Title */}
                    <h4 className="font-bold text-base mb-2 line-clamp-2 min-h-[2.5rem]">
                      {job.title}
                    </h4>

                    {/* Job Details as chips (without salary) */}
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

                    {/* Match percentage & Save button */}
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
                        <span className="text-xs font-semibold text-gray-700">
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
                        aria-label={job.is_saved ? "Unsave job" : "Save job"}
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
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>

      <JobFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        filters={tempFilters}
        onFiltersChange={setTempFilters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        userTopSkills={userTopSkills}
      />
    </DashboardLayout>
  );
};

export default JobsPage;
