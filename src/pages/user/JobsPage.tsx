import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Bookmark,
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
} from "@/utils/skillTestUtils";
import { jobService, JobFilters, ApiJob } from "@/api/jobs";

// Updated Job interface for the new API
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
    job.description || "",
    job.job_description || "",
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

// Function to calculate match percentage
const calculateMatchPercentage = (
  userSkills: string[],
  jobSkills: string[]
): number => {
  if (jobSkills.length === 0) {
    // If no skills found in job, return a base match (e.g., 50%)
    return 50;
  }

  if (userSkills.length === 0) {
    return 0;
  }

  // Normalize skills for comparison (lowercase, remove spaces)
  const normalizeSkill = (skill: string) =>
    skill.toLowerCase().trim().replace(/\s+/g, " ");

  const normalizedUserSkills = userSkills.map(normalizeSkill);
  const normalizedJobSkills = jobSkills.map(normalizeSkill);

  // Find matching skills
  const matchingSkills = normalizedUserSkills.filter((userSkill) =>
    normalizedJobSkills.some((jobSkill) => {
      // Exact match
      if (userSkill === jobSkill) return true;
      // Partial match (one skill contains the other)
      if (userSkill.includes(jobSkill) || jobSkill.includes(userSkill))
        return true;
      return false;
    })
  );

  // Calculate percentage: (matching skills / job skills) * 100
  const matchPercentage = Math.round(
    (matchingSkills.length / normalizedJobSkills.length) * 100
  );

  // Cap at 100%
  return Math.min(matchPercentage, 100);
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
const fetchInternshipJobs = async (page: number = 1): Promise<{
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
      pageSize: 12, // Fetch 12 jobs per page
    });

    // Validate that we got jobs back
    if (!response || !Array.isArray(response.jobs)) {
      console.warn("Invalid response format from job service:", response);
      return { jobs: [], hasMore: false, total: 0 };
    }

    // Filter out jobs without valid IDs
    const validJobs = response.jobs.filter((job) => {
      const jobId = job.job_id || job.id;
      return jobId && jobId.trim() !== "";
    });

    // Return valid internship jobs with pagination info
    return {
      jobs: validJobs,
      hasMore: response.hasMore ?? false,
      total: validJobs.length,
    };
  } catch (error) {
    console.error("Error fetching internship jobs:", error);
    return { jobs: [], hasMore: false, total: 0 };
  }
};

// Fetch latest regular jobs without any filtering
const fetchLatestJobs = async (page: number = 1): Promise<{
  jobs: ApiJob[];
  hasMore: boolean;
  total: number;
}> => {
  try {
    console.log(
      `🚀 fetchLatestJobs called - fetching regular jobs page ${page}`
    );

    const response = await jobService.fetchActiveJobs({
      query: "", // No search term
      filters: {
        country: undefined,
        countries: [], // No country filtering
        jobTypes: [], // No job type filtering (will exclude interns client-side)
        isRemote: undefined,
        datePosted: undefined,
        skills: [], // No skill filtering
        salaryMin: undefined,
        salaryMax: undefined,
        salaryByAgreement: undefined,
      },
      page: page,
      pageSize: 12, // Fetch 12 jobs per page
    });

    // Validate that we got jobs back
    if (!response || !Array.isArray(response.jobs)) {
      console.warn("Invalid response format from job service:", response);
      return { jobs: [], hasMore: false, total: 0 };
    }

    // Filter out jobs without valid IDs
    const validJobs = response.jobs.filter((job) => {
      const jobId = job.job_id || job.id;
      return jobId && jobId.trim() !== "";
    });

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
  // The jobs displayed here are always latest jobs without any filters

  const [tempFilters, setTempFilters] = useState<JobFilters>(activeFilters);

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
          const topSkillsData = getTopSkills(skillScores, 5);
          const topSkills = topSkillsData.map((s) => s.skill);

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

  // Fetch latest regular jobs without any filtering
  const {
    data: jobsData = { jobs: [], hasMore: false, total: 0 },
    isLoading,
    error,
  } = useQuery({
    queryKey: ["latestJobs", regularJobsPage],
    queryFn: () => fetchLatestJobs(regularJobsPage),
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

  // Update all regular jobs when new data arrives
  useEffect(() => {
    if (jobsData.jobs && jobsData.jobs.length > 0) {
      if (regularJobsPage === 1) {
        // First page - replace all jobs
        setAllRegularJobs(jobsData.jobs);
      } else {
        // Subsequent pages - append new jobs (avoid duplicates)
        setAllRegularJobs((prev) => {
          const existingIds = new Set(prev.map((j) => j.job_id || j.id));
          const newJobs = jobsData.jobs.filter(
            (j) => !existingIds.has(j.job_id || j.id)
          );
          return [...prev, ...newJobs];
        });
      }
      setHasMoreRegularJobs(jobsData.hasMore);
      setIsLoadingMoreRegular(false);
    } else if (regularJobsPage === 1) {
      // No jobs on first page
      setAllRegularJobs([]);
      setHasMoreRegularJobs(false);
    }
  }, [jobsData, regularJobsPage]);

  // Update all internship jobs when new data arrives
  useEffect(() => {
    if (internshipJobsData.jobs && internshipJobsData.jobs.length > 0) {
      if (internshipJobsPage === 1) {
        // First page - replace all jobs
        setAllInternshipJobs(internshipJobsData.jobs);
      } else {
        // Subsequent pages - append new jobs (avoid duplicates)
        setAllInternshipJobs((prev) => {
          const existingIds = new Set(prev.map((j) => j.job_id || j.id));
          const newJobs = internshipJobsData.jobs.filter(
            (j) => !existingIds.has(j.job_id || j.id)
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
        // Fetch current profile to get existing saved_jobs array
        const profileResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
        const currentSavedJobs = profileResponse.data?.saved_jobs || [];

        let updatedSavedJobs: string[];

        const jobIdString = String(job.id);
        if (isSaved) {
          // Unsave: Remove job ID from array
          updatedSavedJobs = currentSavedJobs.filter(
            (id: string | number) => String(id) !== jobIdString
          );
        } else {
          // Save: Add job ID to array if not already present
          if (
            currentSavedJobs.some(
              (id: string | number) => String(id) === jobIdString
            )
          ) {
            // Already saved, treat as success
            return;
          }
          updatedSavedJobs = [...currentSavedJobs, jobIdString];
        }

        // Update profile with new saved_jobs array
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
          const jobId = job.job_id || job.id || "";

          // Skip jobs without valid IDs - they can't be opened
          if (!jobId || jobId.trim() === "") {
            console.warn("Skipping job without valid ID:", job);
            return null;
          }

          const jobTitle =
            job.job_title || job.title || job.position || "Untitled Position";
          const companyName =
            (companyObj?.name as string) ||
            (companyObj?.company_name as string) ||
            job.companyName || // LinkedIn API field
            job.employer_name ||
            job.company_name ||
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
          const locationString =
            job.jobLocation || // LinkedIn API field
            job.location ||
            (companyObj?.location as string) ||
            [jobCity, jobState, jobCountry].filter(Boolean).join(", ") ||
            "Location not specified";
          const applyLink =
            job.applyUrl || // LinkedIn API field
            job.jobUrl || // LinkedIn API field
            job.job_apply_link ||
            job.apply_link ||
            job.url ||
            job.apply_url ||
            job.company_url ||
            (companyObj?.url as string) ||
            "";
          // Extract company logo - check all possible fields
          let companyLogo: string | undefined = undefined;

          // Check root level fields first
          if (job.companyLogo) companyLogo = job.companyLogo; // LinkedIn API field
          if (!companyLogo && job.employer_logo)
            companyLogo = job.employer_logo;
          if (!companyLogo && job.company_logo) companyLogo = job.company_logo;
          if (!companyLogo && job.logo) companyLogo = job.logo;
          if (!companyLogo && job.logo_url) companyLogo = job.logo_url;

          // Check nested company object
          if (!companyLogo && companyObj) {
            if (companyObj.logo) companyLogo = companyObj.logo as string;
            if (!companyLogo && companyObj.logo_url)
              companyLogo = companyObj.logo_url as string;
            if (!companyLogo && companyObj.company_logo)
              companyLogo = companyObj.company_logo as string;
            if (!companyLogo && companyObj.employer_logo)
              companyLogo = companyObj.employer_logo as string;
          }

          // Check employer object if it exists separately
          if (
            !companyLogo &&
            job.employer &&
            typeof job.employer === "object"
          ) {
            const employerObj = job.employer as Record<string, unknown>;
            if (employerObj.logo) companyLogo = employerObj.logo as string;
            if (!companyLogo && employerObj.logo_url)
              companyLogo = employerObj.logo_url as string;
            if (!companyLogo && employerObj.company_logo)
              companyLogo = employerObj.company_logo as string;
            if (!companyLogo && employerObj.employer_logo)
              companyLogo = employerObj.employer_logo as string;
          }

          // Validate logo URL if found - check if it's a valid URL format
          if (companyLogo) {
            try {
              // Check if it's a valid URL
              const url = new URL(companyLogo);
              // Only allow http/https protocols
              if (!url.protocol.startsWith("http")) {
                companyLogo = undefined;
              }
            } catch {
              // Invalid URL, remove it
              companyLogo = undefined;
            }
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
            jobSkills
          );

          return {
            id: jobId,
            title: jobTitle,
            company: companyName,
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

  // Separate regular jobs from intern jobs (no limit - show all loaded)
  const regularJobs = useMemo(() => {
    return transformedJobs.filter(
        (job) =>
          job.employment_type?.toLowerCase() !== "intern" &&
          job.employment_type?.toLowerCase() !== "internship"
    );
  }, [transformedJobs]);

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
          const jobId = job.job_id || job.id || "";

          // Skip jobs without valid IDs - they can't be opened
          if (!jobId || jobId.trim() === "") {
            console.warn("Skipping internship job without valid ID:", job);
            return null;
          }

          const jobTitle =
            job.job_title || job.title || job.position || "Untitled Position";
          const companyName =
            (companyObj?.name as string) ||
            (companyObj?.company_name as string) ||
            job.companyName ||
            job.employer_name ||
            job.company_name ||
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
          const locationString =
            job.jobLocation || // LinkedIn API field
            job.location ||
            (companyObj?.location as string) ||
            [jobCity, jobState, jobCountry].filter(Boolean).join(", ") ||
            "Location not specified";
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
          if (job.companyLogo) companyLogo = job.companyLogo;
          if (!companyLogo && job.employer_logo)
            companyLogo = job.employer_logo;
          if (!companyLogo && job.company_logo) companyLogo = job.company_logo;
          if (!companyLogo && job.logo) companyLogo = job.logo;
          if (!companyLogo && job.logo_url) companyLogo = job.logo_url;
          if (!companyLogo && companyObj) {
            if (companyObj.logo) companyLogo = companyObj.logo as string;
            if (!companyLogo && companyObj.logo_url)
              companyLogo = companyObj.logo_url as string;
            if (!companyLogo && companyObj.company_logo)
              companyLogo = companyObj.company_logo as string;
            if (!companyLogo && companyObj.employer_logo)
              companyLogo = companyObj.employer_logo as string;
          }
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
            jobSkills
          );

          return {
            id: jobId,
            title: jobTitle,
            company: companyName,
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

  // Debug logging
  useEffect(() => {
    console.log("📊 JobsPage State:", {
      isLoading,
      isLoadingInternships,
      error: error?.message,
      internshipError: internshipError?.message,
      jobsCount: jobs.length,
      internshipJobsRawCount: internshipJobsRaw.length,
      transformedJobsCount: transformedJobs.length,
      transformedInternshipJobsCount: transformedInternshipJobs.length,
      regularJobsCount: regularJobs.length,
      internJobsCount: internJobs.length,
      regularJobsPage,
      internshipJobsPage,
      hasMoreRegularJobs,
      hasMoreInternshipJobs,
      isLoadingMoreRegular,
      isLoadingMoreInternship,
    });
  }, [
    isLoading,
    isLoadingInternships,
    error,
    internshipError,
    jobs.length,
    internshipJobsRaw.length,
    transformedJobs.length,
    transformedInternshipJobs.length,
    regularJobs.length,
    internJobs.length,
    regularJobsPage,
    internshipJobsPage,
    hasMoreRegularJobs,
    hasMoreInternshipJobs,
    isLoadingMoreRegular,
    isLoadingMoreInternship,
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
      <div className="max-w-7xl mx-auto py-6 px-2 sm:px-6 lg:px-8">
        {/* Modern Search Bar */}
        <div className="mb-8 relative max-w-6xl mx-auto">
          <div className="flex items-center bg-white dark:bg-[#242424] border-2 border-breneo-accent dark:border-gray-600 rounded-lg pl-3 md:pl-4 pr-2 md:pr-2.5 py-2.5 md:py-3 overflow-visible min-h-[3rem]">
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
                <div className="h-5 w-px bg-gray-300 dark:bg-gray-600 mx-2 flex-shrink-0 self-stretch" />
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
            <Button
              variant="outline"
              size="icon"
              onClick={() => setFilterModalOpen(true)}
              className="h-10 w-10 flex-shrink-0 bg-gray-100 dark:bg-gray-700 border-0 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md ml-2"
              aria-label="Filter jobs"
            >
              <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
            </Button>

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

        {/* User Skills Section */}
        {loadingSkills ? (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4">Your Skills</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="border border-gray-200">
                  <CardContent className="p-4 flex flex-col items-start">
                    <Skeleton className="h-8 w-8 mb-3 rounded" />
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : userTopSkills.length > 0 ? (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4">Your Skills</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {userTopSkills.map((skill, index) => {
                const IconComponent = getSkillIcon(skill);
                const color = getSkillColor(skill, index);
                const jobCount =
                  skillJobCounts.data?.[skill] !== undefined
                    ? skillJobCounts.data[skill]
                    : null;
                const isLoadingCount = skillJobCounts.isLoading;

                return (
                  <Card
                    key={skill}
                    className="cursor-pointer transition-all duration-200 border border-gray-200 hover:border-gray-400 rounded-2xl"
                    onClick={() => {
                      // Add skill to filters if not already present
                      if (!activeFilters.skills.includes(skill)) {
                        const newFilters = {
                          ...activeFilters,
                          skills: [...activeFilters.skills, skill],
                        };
                        setActiveFilters(newFilters);
                        setTempFilters(newFilters);
                        // Redirect to search results page when skill is clicked
                        redirectToSearchResults(newFilters, searchTerm);
                      }
                    }}
                  >
                    <CardContent className="p-4 flex flex-col items-start">
                      <IconComponent className={`h-8 w-8 ${color} mb-3`} />
                      <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                        {skill}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {isLoadingCount
                          ? "Loading..."
                          : jobCount !== null
                          ? `${jobCount}${jobCount >= 20 ? "+" : ""} Job${
                              jobCount !== 1 ? "s" : ""
                            }`
                          : "Click to filter"}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Latest Vacancies Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Sun className="h-6 w-6 text-yellow-500" />
            <h2 className="text-lg font-bold">Latest Vacancies</h2>
          </div>
        </div>

        {(error || internshipError) && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-center gap-3 mb-6">
            <AlertCircle className="h-5 w-5" />
            <p>
              <strong>Error:</strong>{" "}
              {(error as Error)?.message || (internshipError as Error)?.message}
            </p>
          </div>
        )}

        {(isLoading || isLoadingInternships) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-32 md:pb-16">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading &&
          !isLoadingInternships &&
          regularJobs.length === 0 &&
          internJobs.length === 0 && (
            <div className="text-center p-10 border border-dashed rounded-lg text-muted-foreground">
              <img
                src="/lovable-uploads/no-data-found.png"
                alt="No data found"
                className="mx-auto h-64 w-64 mb-4 object-contain"
              />
              <h4 className="text-lg font-semibold mb-2">No Jobs Found</h4>
              <p className="text-sm">
                Try adjusting your search terms or filters
              </p>
            </div>
          )}

        {/* Regular Job Cards Grid */}
        {regularJobs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
            {regularJobs.map((job) => (
              <Card
                key={job.id}
                className="group flex flex-col transition-all duration-200 border border-gray-200 hover:border-gray-400 overflow-hidden rounded-2xl"
              >
                <CardContent className="p-5 flex flex-col flex-grow relative">
                  {/* Company Logo and Info */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 relative w-12 h-12">
                      {/* Primary: Logo from API - shown first if available */}
                      {job.company_logo ? (
                        <img
                          src={job.company_logo}
                          alt={`${job.company} logo`}
                          className="w-12 h-12 rounded-full object-cover border border-gray-200 absolute inset-0 z-10"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.style.display = "none";
                            // Show Clearbit logo fallback
                            const clearbitLogo =
                              target.parentElement?.querySelector(
                                ".clearbit-logo"
                              ) as HTMLImageElement;
                            if (clearbitLogo) {
                              clearbitLogo.style.display = "block";
                              clearbitLogo.style.zIndex = "10";
                            } else {
                              // Show default icon
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

                      {/* Fallback 1: Clearbit logo API - shown if no API logo and company name exists */}
                      {job.company && !job.company_logo ? (
                        <img
                          src={`https://logo.clearbit.com/${encodeURIComponent(
                            job.company
                          )}`}
                          alt={`${job.company} logo`}
                          className="w-12 h-12 rounded-full object-cover border border-gray-200 absolute inset-0 clearbit-logo"
                          style={{ zIndex: 10 }}
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.style.display = "none";
                            // Show default icon fallback
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

                      {/* Fallback 2: Default icon - always present, shown when all logos fail or no company name */}
                      <div
                        className={`w-12 h-12 rounded-full bg-breneo-accent flex items-center justify-center logo-fallback absolute inset-0 ${
                          job.company_logo || (job.company && !job.company_logo)
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
                        <Briefcase className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-base truncate">
                          {job.company}
                        </h3>
                        {job.matchPercentage !== undefined && (
                          <Badge
                            variant="secondary"
                            className="flex-shrink-0 bg-breneo-blue/10 text-breneo-blue border-breneo-blue/20 text-xs font-semibold"
                          >
                            {job.matchPercentage}% Match
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {job.location}
                      </p>
                    </div>
                  </div>

                  {/* Job Title */}
                  <h4 className="font-bold text-lg mb-4 line-clamp-2">
                    {job.title}
                  </h4>

                  {/* Job Details */}
                  <div className="space-y-2 mb-4 flex-grow">
                    {/* Salary */}
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-700">{job.salary}</span>
                    </div>

                    {/* Employment Type */}
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-700">
                        {job.employment_type}
                      </span>
                    </div>

                    {/* Work Arrangement */}
                    {job.work_arrangement && (
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700">
                          {job.work_arrangement}
                        </span>
                      </div>
                    )}

                    {/* Benefits */}
                    {job.benefits && (
                      <div className="flex items-center gap-2 text-sm">
                        <Tag className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700">{job.benefits}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons - Slide up from bottom on hover, overlapping job details */}
                  <div className="absolute bottom-0 left-0 right-0 p-5 bg-card flex items-center gap-2 transform translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-in-out shadow-lg">
                    <Button
                      variant="default"
                      onClick={() => {
                        if (!job.id || job.id.trim() === "") {
                          toast.error("Cannot open job: Invalid job ID");
                          console.error(
                            "Attempted to navigate to job with invalid ID:",
                            job
                          );
                          return;
                        }
                        // Encode the job ID to handle special characters
                        const encodedId = encodeURIComponent(job.id);
                        navigate(`/jobs/${encodedId}`);
                      }}
                      className="flex-1"
                      disabled={!job.id || job.id.trim() === ""}
                    >
                      View
                    </Button>
                    <Button
                      variant="default"
                      size="icon"
                      onClick={() => saveJobMutation.mutate(job)}
                      aria-label={job.is_saved ? "Unsave job" : "Save job"}
                      className={job.is_saved ? "bg-primary/90" : ""}
                    >
                      <Bookmark
                        className={`h-5 w-5 transition-colors ${
                          job.is_saved ? "fill-white text-white" : "text-white"
                        }`}
                      />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Load More Button for Regular Jobs */}
        {!isLoading &&
          !isLoadingInternships &&
          regularJobs.length > 0 &&
          hasMoreRegularJobs && (
            <div className="flex justify-center mt-6 mb-8">
              <Button
                onClick={handleLoadMoreRegular}
                disabled={isLoadingMoreRegular}
                variant="outline"
                className="min-w-[200px]"
              >
                {isLoadingMoreRegular ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More Jobs"
                )}
              </Button>
          </div>
        )}

        {/* Intern Jobs Section */}
        {!isLoadingInternships && internJobs.length > 0 && (
          <>
            <div className="flex items-center gap-3 mb-6 mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
              <GraduationCap className="h-6 w-6 text-breneo-blue" />
              <h2 className="text-lg font-bold">Internship Opportunities</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
              {internJobs.map((job) => (
                <Card
                  key={job.id}
                  className="group flex flex-col transition-all duration-200 border border-gray-200 hover:border-gray-400 overflow-hidden rounded-2xl"
                >
                  <CardContent className="p-5 flex flex-col flex-grow relative">
                    {/* Company Logo and Info */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex-shrink-0 relative w-12 h-12">
                        {/* Primary: Logo from API - shown first if available */}
                        {job.company_logo ? (
                          <img
                            src={job.company_logo}
                            alt={`${job.company} logo`}
                            className="w-12 h-12 rounded-full object-cover border border-gray-200 absolute inset-0 z-10"
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
                            className="w-12 h-12 rounded-full object-cover border border-gray-200 absolute inset-0 clearbit-logo"
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
                          className={`w-12 h-12 rounded-full bg-breneo-accent flex items-center justify-center logo-fallback absolute inset-0 ${
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
                          <Briefcase className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-base truncate">
                            {job.company}
                          </h3>
                          {job.matchPercentage !== undefined && (
                            <Badge
                              variant="secondary"
                              className="flex-shrink-0 bg-breneo-blue/10 text-breneo-blue border-breneo-blue/20 text-xs font-semibold"
                            >
                              {job.matchPercentage}% Match
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {job.location}
                        </p>
                      </div>
                    </div>

                    {/* Job Title */}
                    <h4 className="font-bold text-lg mb-4 line-clamp-2">
                      {job.title}
                    </h4>

                    {/* Job Details */}
                    <div className="space-y-2 mb-4 flex-grow">
                      {/* Salary */}
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700">{job.salary}</span>
                      </div>

                      {/* Employment Type */}
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700">
                          {job.employment_type}
                        </span>
                      </div>

                      {/* Work Arrangement */}
                      {job.work_arrangement && (
                        <div className="flex items-center gap-2 text-sm">
                          <Briefcase className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700">
                            {job.work_arrangement}
                          </span>
                        </div>
                      )}

                      {/* Benefits */}
                      {job.benefits && (
                        <div className="flex items-center gap-2 text-sm">
                          <Tag className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700">{job.benefits}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons - Slide up from bottom on hover, overlapping job details */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 bg-card flex items-center gap-2 transform translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-in-out shadow-lg">
                      <Button
                        variant="default"
                        onClick={() => {
                          if (!job.id || job.id.trim() === "") {
                            toast.error("Cannot open job: Invalid job ID");
                            console.error(
                              "Attempted to navigate to job with invalid ID:",
                              job
                            );
                            return;
                          }
                          const encodedId = encodeURIComponent(job.id);
                          navigate(`/jobs/${encodedId}`);
                        }}
                        className="flex-1"
                        disabled={!job.id || job.id.trim() === ""}
                      >
                        View
                      </Button>
                      <Button
                        variant="default"
                        size="icon"
                        onClick={() => saveJobMutation.mutate(job)}
                        aria-label={job.is_saved ? "Unsave job" : "Save job"}
                        className={job.is_saved ? "bg-primary/90" : ""}
                      >
                        <Bookmark
                          className={`h-5 w-5 transition-colors ${
                            job.is_saved
                              ? "fill-white text-white"
                              : "text-white"
                          }`}
                        />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Load More Button for Internship Jobs */}
            {hasMoreInternshipJobs && (
              <div className="flex justify-center mt-6 mb-8">
                <Button
                  onClick={handleLoadMoreInternship}
                  disabled={isLoadingMoreInternship}
                  variant="outline"
                  className="min-w-[200px]"
                >
                  {isLoadingMoreInternship ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More Internships"
                  )}
                </Button>
              </div>
            )}
          </>
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
