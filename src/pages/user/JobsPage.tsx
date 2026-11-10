import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardProfileWelcome } from "@/components/home/DashboardProfileWelcome";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { RadialProgress } from "@/components/ui/radial-progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useNeedsProfileForMatching } from "@/hooks/useNeedsProfileForMatching";
import { cn } from "@/lib/utils";
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
  Tag,
  Sun,
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
} from "@/components/icons";
import { toast } from "sonner";
import { JobFilterModal } from "@/components/jobs/JobFilterModal";
import { JobListingMetaBadges } from "@/components/jobs/JobListingMetaBadges";
import { CompanyNameLink } from "@/components/jobs/CompanyNameLink";
import { useLanguage } from "@/contexts/LanguageContext";
import { JobSearchPreferenceChips } from "@/components/jobs/JobSearchPreferenceChips";
import { profileApi } from "@/api/profile";
import {
  matchJobDetailToUser,
  buildUserMatchProfileFromSkillTest,
  normalizeSkillName,
} from "@/services/matching";
import type { JobDetail } from "@/api/jobs/types";
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
import { getMatchQualityLabel } from "@/utils/jobMatchUtils";
import { formatJobSalaryDisplay } from "@/utils/jobSalaryFormat";
import {
  resolveJobEmploymentType,
  resolveJobWorkArrangement,
} from "@/utils/jobEmploymentDisplay";

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

// Skill icon mapping - maps skill names to appropriate icons
const getSkillIcon = (
  skill: string,
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
  page: number = 1,
): Promise<{
  jobs: ApiJob[];
  hasMore: boolean;
  total: number;
}> => {
  try {
    console.log(
      `🚀 fetchInternshipJobs called - fetching internship jobs page ${page}`,
    );

    const response = await jobService.fetchActiveJobs({
      query: "",
      filters: {
        country: undefined,
        countries: [], // No country filtering
        jobTypes: ["INTERN"], // Client-side employment type filter after fetch
        isRemote: false,
        datePosted: "week",
        // GET /api/search `title` — keyword OR on job title (intern / internship)
        skills: ["intern", "internship"],
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
  userTopSkills: string[] = [],
): Promise<{
  jobs: ApiJob[];
  hasMore: boolean;
  total: number;
}> => {
  try {
    console.log(
      `🚀 fetchLatestJobs called - fetching regular jobs page ${page} with filters:`,
      filters,
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
      query: "",
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

    console.log(
      `✅ fetchLatestJobs: ${validJobs.length} jobs found after filtering`,
    );

    // Return valid jobs with pagination info
    return {
      jobs: validJobs,
      hasMore: response.hasMore ?? false,
      total: response.total ?? validJobs.length,
    };
  } catch (error) {
    console.error("Error fetching latest jobs:", error);
    return { jobs: [], hasMore: false, total: 0 };
  }
};

// Fetch remote jobs filtered by user skills
const fetchRemoteJobs = async (
  page: number = 1,
  userTopSkills: string[] = [],
): Promise<{
  jobs: ApiJob[];
  hasMore: boolean;
  total: number;
}> => {
  try {
    console.log(
      `🚀 fetchRemoteJobs called - fetching remote jobs page ${page} with skills:`,
      userTopSkills,
    );

    const response = await jobService.fetchActiveJobs({
      query: "",
      filters: {
        country: undefined,
        countries: [],
        jobTypes: [],
        isRemote: true, // GET /api/search work_mode=remote
        datePosted: "week",
        skills: [],
        salaryMin: undefined,
        salaryMax: undefined,
        salaryByAgreement: undefined,
      },
      page: page,
      pageSize: 50,
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
      `✅ fetchRemoteJobs: ${validJobs.length} valid remote jobs found`,
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

// Latest jobs cache: avoid refetch on every reload (only last 1 week jobs)
const LATEST_JOBS_CACHE_KEY = "jobsPage_latestJobs";
const LATEST_JOBS_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface LatestJobsCacheEntry {
  jobs: ApiJob[];
  hasMore: boolean;
  total: number;
  timestamp: number;
}

const getCachedLatestJobs = (): {
  jobs: ApiJob[];
  hasMore: boolean;
  total: number;
} | null => {
  try {
    const raw = sessionStorage.getItem(LATEST_JOBS_CACHE_KEY);
    if (!raw) return null;
    const entry: LatestJobsCacheEntry = JSON.parse(raw);
    if (
      !entry ||
      !Array.isArray(entry.jobs) ||
      Date.now() - entry.timestamp > LATEST_JOBS_CACHE_TTL_MS
    ) {
      return null;
    }
    return {
      jobs: entry.jobs,
      hasMore: entry.hasMore ?? false,
      total: entry.total ?? entry.jobs.length,
    };
  } catch {
    return null;
  }
};

const setCachedLatestJobs = (data: {
  jobs: ApiJob[];
  hasMore: boolean;
  total: number;
}) => {
  try {
    sessionStorage.setItem(
      LATEST_JOBS_CACHE_KEY,
      JSON.stringify({
        ...data,
        timestamp: Date.now(),
      } as LatestJobsCacheEntry),
    );
  } catch {
    // ignore
  }
};

// Helper functions for session storage
const saveFiltersToSession = (
  key: string,
  filters: unknown,
  search: string,
) => {
  try {
    sessionStorage.setItem(key, JSON.stringify({ filters, search }));
  } catch (error) {
    console.error("Error saving filters to session storage:", error);
  }
};

const loadFiltersFromSession = (
  key: string,
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
  const { showProfileWelcome, isCheckingProfile } = useNeedsProfileForMatching(
    user?.id,
  );
  const { t } = useLanguage();
  const isMobile = useMobile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterModalOpen, setFilterModalOpen] = useState(false);

  // State for user's top skills from test results (for filters and match)
  const [userTopSkills, setUserTopSkills] = useState<string[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const skillsInitializedRef = React.useRef(false);

  // Profile skills (same source as JobDetailPage for identical total match)
  const { data: profileSkills = [] } = useQuery({
    queryKey: ["profileSkills", user?.id],
    queryFn: () => profileApi.getMySkills(),
    enabled: !!user,
  });
  const userSkillsForMatch = useMemo(() => {
    const fromProfile = (profileSkills || []).map((s) =>
      normalizeSkillName(s.skill_name),
    );
    const fromTest = (userTopSkills || []).map((s) => normalizeSkillName(s));
    return [...new Set([...fromProfile, ...fromTest])];
  }, [profileSkills, userTopSkills]);

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
    [setSearchParams],
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
      roleCategory: [],
      seniority: [],
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

  // Sync tempFilters with activeFilters when modal opens to reflect current search bar location
  useEffect(() => {
    if (isFilterModalOpen) {
      setTempFilters(activeFilters);
    }
  }, [isFilterModalOpen, activeFilters]);

  // If URL has filter/search params, redirect to job search page so jobs are filtered by URL
  useEffect(() => {
    const hasFilterParams =
      searchParams.get("search") ||
      searchParams.get("countries") ||
      searchParams.get("country") ||
      searchParams.get("skills") ||
      searchParams.get("jobTypes") ||
      searchParams.get("isRemote") ||
      searchParams.get("datePosted") ||
      searchParams.get("page") ||
      searchParams.get("salaryMin") ||
      searchParams.get("salaryMax") ||
      searchParams.get("salaryByAgreement") ||
      searchParams.get("roleCategory") ||
      searchParams.get("seniority");

    if (hasFilterParams) {
      const params = new URLSearchParams(searchParams);
      // Normalize: use "page" (ensure page=1 if missing when other params exist)
      if (!params.get("page") && params.toString()) {
        params.set("page", "1");
      }
      navigate(`/jobs/search?${params.toString()}`, { replace: true });
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
          const response = await apiClient.get(
            `/api/skilltest/results/?user=${user.id}`,
          );
          if (
            response.data &&
            Array.isArray(response.data) &&
            response.data.length > 0
          ) {
            const result = response.data[0];
            const skillsJson = result.skills_json;

            // Extract only tech skills for the Interests/Skills filter (not soft skills)
            const techSkills = Object.keys(skillsJson.tech || {});

            setUserTopSkills(techSkills);
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
          const topSkillsData = getTopSkills(skillScores, 20); // Increase limit for better matching
          const topSkills = topSkillsData.map((s) => s.skill);
          const techSkillsOnly = filterHardSkills(topSkills);
          setUserTopSkills(techSkillsOnly);
        }
      } catch (error) {
        console.error("Error fetching user skills:", error);
        // Set empty skills array so jobs can still be fetched
        setUserTopSkills([]);
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

  // Fetch latest regular jobs: no filters, display latest 9 by date
  const {
    data: jobsData = { jobs: [], hasMore: false, total: 0 },
    isLoading,
    error,
  } = useQuery({
    queryKey: ["latestJobs"],
    queryFn: async () => {
      try {
        // Use sessionStorage cache only when it has jobs (avoid serving stale empty cache)
        const cached = getCachedLatestJobs();
        if (cached && cached.jobs.length > 0) {
          return cached;
        }

        const response = await jobService.fetchActiveJobs({
          query: "",
          filters: {
            country: undefined,
            countries: [],
            jobTypes: [],
            isRemote: false,
            datePosted: undefined, // No date filter - get all jobs, we show latest 9
            skills: [],
            salaryMin: undefined,
            salaryMax: undefined,
            salaryByAgreement: undefined,
          },
          page: 1,
          pageSize: 100,
        });

        if (!response || !Array.isArray(response.jobs)) {
          return { jobs: [], hasMore: false, total: 0 };
        }

        const validJobs = response.jobs.filter((job) => {
          const jobId = String(job.id || job.job_id || "");
          return jobId && jobId.trim() !== "";
        });

        const result = {
          jobs: validJobs,
          hasMore: response.hasMore ?? false,
          total: response.total ?? validJobs.length,
        };
        setCachedLatestJobs(result);
        return result;
      } catch (error) {
        console.error("❌ Error fetching jobs:", error);
        throw error;
      }
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    staleTime: LATEST_JOBS_CACHE_TTL_MS, // 30 min - no refetch while fresh
    gcTime: 60 * 60 * 1000, // 1 hour in memory
    retry: 2,
    retryDelay: 1000,
    enabled: true,
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
            (j) => !existingIds.has(j.id || j.job_id),
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
            (j) => !existingIds.has(j.id || j.job_id),
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

  const goToSearchResults = useCallback(
    (filters: JobFilters, search: string) => {
      const params = new URLSearchParams();
      const trimmed = search.trim();
      if (trimmed) {
        params.set("search", trimmed);
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
      if (filters.salaryMin !== undefined) {
        params.set("salaryMin", String(filters.salaryMin));
      }
      if (filters.salaryMax !== undefined) {
        params.set("salaryMax", String(filters.salaryMax));
      }
      if (filters.salaryByAgreement) {
        params.set("salaryByAgreement", "true");
      }
      if (filters.roleCategory && filters.roleCategory.length > 0) {
        params.set("roleCategory", filters.roleCategory.join(","));
      }
      if (filters.seniority && filters.seniority.length > 0) {
        params.set("seniority", filters.seniority.join(","));
      }

      navigate(`/jobs/search?${params.toString()}`);
    },
    [navigate],
  );

  // Immediate search (when user presses Enter or clicks Search button)
  const handleSearch = useCallback(() => {
    goToSearchResults(activeFilters, searchTerm);
  }, [searchTerm, activeFilters, goToSearchResults]);

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

  // Shared transformer: ApiJob[] -> Job[] (used for both latest and top matched)
  const transformApiJobsToJobList = React.useCallback(
    (apiJobs: ApiJob[]): Job[] => {
      if (!apiJobs || apiJobs.length === 0) return [];
      try {
        return (apiJobs || [])
          .map((job: ApiJob): Job | null => {
            // Handle nested company object if it exists
            const companyObj =
              job.company && typeof job.company === "object"
                ? (job.company as Record<string, unknown>)
                : null;

            // Extract fields with fallbacks for different API formats
            // Ensure jobId is always a string - accept id or job_id (APIs vary)
            const jobId = String(job.id || job.job_id || "");

            // Skip jobs without valid IDs - they can't be opened
            if (!jobId || jobId.trim() === "") {
              console.warn("Skipping job without valid ID:", job);
              return null;
            }

            const jobTitle = String(
              job.title || job.job_title || job.position || "Untitled Position",
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
                "Unknown Company",
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
              co: Record<string, any> | null,
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
              getLocationStringFromJob(job as Record<string, any>, companyObj),
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
                    logoUrl,
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
                  console.debug(
                    "Accepted http(s) logo for job",
                    jobId,
                    logoUrl,
                  );
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
                    logoUrl,
                  );
                return true;
              }

              if (process.env.NODE_ENV === "development")
                console.debug(
                  "Rejected logo candidate (unsupported format)",
                  logoUrl,
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
                  key.toLowerCase().includes("company"),
              );
              if (logoFields.length > 0) {
                console.log(
                  "🔍 Checking logo fields for job:",
                  jobId,
                  logoFields,
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

            const salary = formatJobSalaryDisplay(job);

            const employmentType = resolveJobEmploymentType(job);
            const workArrangement = resolveJobWorkArrangement(job);

            // Total match % (same logic as job detail page)
            const matchPercentage =
              user && userSkillsForMatch.length >= 0
                ? matchJobDetailToUser(
                    job as unknown as JobDetail,
                    buildUserMatchProfileFromSkillTest(userSkillsForMatch),
                  ).overallPercent
                : undefined;

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
        console.error("Error transforming jobs:", error);
        return [];
      }
    },
    [savedJobs, user, userSkillsForMatch],
  );

  const transformedJobs = React.useMemo(
    () => transformApiJobsToJobList(jobs || []),
    [jobs, transformApiJobsToJobList],
  );

  // Top matched jobs: sort by match % descending, show 3 on the home jobs page
  const topMatchedJobs = useMemo(() => {
    const byMatch = [...transformedJobs].sort(
      (a, b) => (b.matchPercentage ?? 0) - (a.matchPercentage ?? 0),
    );
    return byMatch.slice(0, 3);
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
              "Location not specified",
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

          const salary = formatJobSalaryDisplay(job);

          const employmentType = resolveJobEmploymentType(job);
          const workArrangement = resolveJobWorkArrangement(job);

          // Total match % (same logic as job detail page)
          const matchPercentage =
            user && userSkillsForMatch.length >= 0
              ? matchJobDetailToUser(
                  job as unknown as JobDetail,
                  buildUserMatchProfileFromSkillTest(userSkillsForMatch),
                ).overallPercent
              : undefined;

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
  }, [internshipJobsRaw, savedJobs, user, userSkillsForMatch]);

  // All internship jobs - no filtering
  const internJobs = useMemo(() => {
    return transformedInternshipJobs; // Return all internship jobs
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
              "Remote",
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

          const salary = formatJobSalaryDisplay(job);

          const employmentType = resolveJobEmploymentType(job);
          const workArrangement = resolveJobWorkArrangement(job);

          // Total match % (same logic as job detail page)
          const matchPercentage =
            user && userSkillsForMatch.length >= 0
              ? matchJobDetailToUser(
                  job as unknown as JobDetail,
                  buildUserMatchProfileFromSkillTest(userSkillsForMatch),
                ).overallPercent
              : undefined;

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
  }, [allRemoteJobs, savedJobs, user, userSkillsForMatch]);

  const remoteJobs = useMemo(() => {
    return transformedRemoteJobs.slice(0, 3);
  }, [transformedRemoteJobs]);

  // Debug logging
  useEffect(() => {
    console.log(
      "🌐 Job API Endpoint: https://breneo-job-aggregator.up.railway.app/api/search",
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
      topMatchedJobsCount: topMatchedJobs.length,
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
    topMatchedJobs.length,
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

  const patchFilters = (patch: Partial<JobFilters>) => {
    const next = { ...activeFilters, ...patch };
    setActiveFilters(next);
    setTempFilters(next);
  };

  const openFilters = () => {
    setTempFilters(activeFilters);
    setFilterModalOpen(true);
  };

  const handleApplyFilters = () => {
    setActiveFilters(tempFilters);
    setFilterModalOpen(false);
    if (isMobile) {
      goToSearchResults(tempFilters, searchTerm);
    }
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
      roleCategory: [],
      seniority: [],
    };
    setTempFilters(clearedFilters);
    setActiveFilters(clearedFilters);
    setFilterModalOpen(false);
    // Just clear filters in UI, don't redirect since we're showing latest jobs
  };

  if (isCheckingProfile || showProfileWelcome) {
    return (
      <DashboardLayout>
        {showProfileWelcome ? (
          <DashboardProfileWelcome />
        ) : (
          <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-72 w-full rounded-3xl" />
          </div>
        )}
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 px-2 sm:px-6 lg:px-8">
        {/* Modern Search Bar */}
        <div className="mb-8 relative max-w-6xl mx-auto">
          <div className="flex items-center bg-white dark:bg-[#242424] rounded-3xl pl-3 md:pl-4 pr-2 md:pr-2.5 py-2.5 md:py-3 overflow-visible min-h-[3rem]">
            <Briefcase
              className="h-5 w-5 text-breneo-accent dark:text-breneo-blue flex-shrink-0 mr-2"
              strokeWidth={2}
            />

            <Input
              placeholder={t.jobs.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => handleSearchTermChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm text-gray-900 dark:text-gray-100 flex-1 min-w-0 bg-transparent h-auto py-0"
            />

            {isMobile && (
              <Button
                variant="outline"
                size="icon"
                onClick={openFilters}
                className="h-10 w-10 flex-shrink-0 bg-gray-100 dark:bg-gray-700 border-0 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md ml-2 relative"
                aria-label={t.jobs.filters}
              >
                <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
              </Button>
            )}

            <Button
              variant="default"
              size="icon"
              onClick={handleSearch}
              className="h-10 w-10 flex-shrink-0 bg-breneo-blue hover:bg-breneo-blue/90 rounded-md ml-2"
              aria-label={t.jobs.search}
            >
              <Search className="h-5 w-5 text-white" />
            </Button>
          </div>

          <JobSearchPreferenceChips
            jobTypes={activeFilters.jobTypes}
            isRemote={activeFilters.isRemote}
            countries={activeFilters.countries}
            roleCategory={activeFilters.roleCategory ?? []}
            seniority={activeFilters.seniority ?? []}
            salaryMin={activeFilters.salaryMin}
            salaryMax={activeFilters.salaryMax}
            salaryByAgreement={activeFilters.salaryByAgreement}
            onJobTypesChange={(jobTypes) => patchFilters({ jobTypes })}
            onRemoteChange={(isRemote) => patchFilters({ isRemote })}
            onCountriesChange={(countries) => patchFilters({ countries })}
            onRoleCategoryChange={(roleCategory) =>
              patchFilters({ roleCategory })
            }
            onSeniorityChange={(seniority) => patchFilters({ seniority })}
            onSalaryChange={(salaryMin, salaryMax, salaryByAgreement) =>
              patchFilters({ salaryMin, salaryMax, salaryByAgreement })
            }
          />
        </div>


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

        {/* Top Matched Jobs Section */}
        {!isLoading && topMatchedJobs.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold">Top Matched Jobs</h2>
            </div>
            <div className="flex items-stretch gap-4 md:flex-wrap max-md:flex-nowrap max-md:overflow-x-auto max-md:pb-4 max-md:scrollbar-hide max-md:snap-x max-md:snap-mandatory max-md:-mx-2 max-md:px-2 max-md:[&>*]:h-[300px]">
              {topMatchedJobs.map((job) => (
                <Card
                  key={job.id}
                  className="group flex h-full max-md:h-[300px] w-[calc((100%-2rem)/3)] min-w-[280px] snap-start flex-shrink-0 flex-col self-stretch transition-all duration-200 overflow-hidden rounded-3xl cursor-pointer hover:shadow-soft"
                  onClick={() => {
                    if (!job.id || String(job.id).trim() === "") return;
                    const encodedId = encodeURIComponent(String(job.id));
                    navigate(`/jobs/${encodedId}`);
                  }}
                >
                  <CardContent className="flex h-full flex-1 flex-col px-5 pt-5 pb-4">
                    <div className="flex min-h-0 flex-1 flex-col">
                    <div className="flex items-start gap-3 mb-3 min-h-10">
                      {job.company_logo ? (
                        <div className="flex-shrink-0 relative w-10 h-10">
                          <img
                            src={job.company_logo}
                            alt={`${job.company_name || job.company} logo`}
                            className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        </div>
                      ) : null}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">
                          <CompanyNameLink
                            name={job.company_name || job.company}
                            className="font-semibold text-sm"
                          />
                        </h3>
                        <p className="mt-0.5 text-xs text-gray-500 truncate">
                          {job.location}
                        </p>
                      </div>
                    </div>
                    <h4 className="font-bold text-base mb-2 line-clamp-2 leading-6 min-h-[3rem]">
                      {job.title}
                    </h4>
                    <div className="min-h-[1.75rem] max-md:min-h-[4.5rem]">
                      <JobListingMetaBadges
                        employmentType={job.employment_type}
                        workArrangement={job.work_arrangement}
                        salary={job.salary}
                      />
                    </div>
                    </div>
                    <div className="mt-auto flex shrink-0 items-center justify-between gap-4 pt-7">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <RadialProgress
                          value={job.matchPercentage ?? 0}
                          size={44}
                          strokeWidth={5}
                          showLabel={false}
                          percentageTextSize="sm"
                          className="shrink-0 text-breneo-blue"
                        />
                        <span className="line-clamp-2 text-xs font-semibold text-gray-700 dark:text-gray-100">
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
                          "h-10 w-10 shrink-0 bg-[#E6E7EB] hover:bg-[#E6E7EB]/90 dark:bg-[#3A3A3A] dark:hover:bg-[#4A4A4A]",
                          job.is_saved
                            ? "text-breneo-blue bg-breneo-blue/10 hover:bg-breneo-blue/15 dark:bg-breneo-blue/20 dark:hover:bg-breneo-blue/30"
                            : "text-black dark:text-white",
                        )}
                      >
                        <Bookmark
                          className={cn(
                            "h-4 w-4 transition-colors",
                            job.is_saved
                              ? "text-breneo-blue fill-breneo-blue animate-heart-pop"
                              : "text-black dark:text-white",
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

        {isLoading && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold">Top Matched Jobs</h2>
            </div>
            <div className="flex items-stretch gap-4 md:flex-wrap max-md:flex-nowrap max-md:overflow-x-auto max-md:pb-4 max-md:scrollbar-hide max-md:snap-x max-md:snap-mandatory max-md:-mx-2 max-md:px-2 max-md:[&>*]:h-[300px]">
              {[...Array(3)].map((_, i) => (
                <Card
                  key={i}
                  className="h-full max-md:h-[300px] w-[calc((100%-2rem)/3)] min-w-[280px] snap-start flex-shrink-0"
                >
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

            <div className="flex items-stretch gap-4 md:flex-wrap max-md:flex-nowrap max-md:overflow-x-auto max-md:pb-4 max-md:scrollbar-hide max-md:snap-x max-md:snap-mandatory max-md:-mx-2 max-md:px-2 max-md:[&>*]:h-[300px]">
              {remoteJobs.map((job) => (
                <Card
                  key={job.id}
                  className="group flex h-full max-md:h-[300px] w-[calc((100%-2rem)/3)] min-w-[280px] snap-start flex-shrink-0 flex-col self-stretch transition-all duration-200 overflow-hidden rounded-3xl cursor-pointer hover:shadow-soft"
                  onClick={() => {
                    if (!job.id || String(job.id).trim() === "") return;
                    const encodedId = encodeURIComponent(String(job.id));
                    navigate(`/jobs/${encodedId}`);
                  }}
                >
                  <CardContent className="flex h-full flex-1 flex-col px-5 pt-5 pb-4">
                    <div className="flex min-h-0 flex-1 flex-col">
                    {/* Company Logo and Info */}
                    <div className="flex items-start gap-3 mb-3 min-h-10">
                      {job.company_logo ? (
                        <div className="flex-shrink-0 relative w-10 h-10">
                          <img
                            src={job.company_logo}
                            alt={`${job.company_name || job.company} logo`}
                            className="w-10 h-10 rounded-full object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        </div>
                      ) : null}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">
                          <CompanyNameLink
                            name={job.company_name || job.company}
                            className="font-semibold text-sm"
                          />
                        </h3>
                        <p className="mt-0.5 text-xs text-gray-500 truncate">
                          {job.location}
                        </p>
                      </div>
                    </div>

                    {/* Job Title */}
                    <h4 className="font-bold text-base mb-2 line-clamp-2 leading-6 min-h-[3rem]">
                      {job.title}
                    </h4>

                    <div className="min-h-[1.75rem] max-md:min-h-[4.5rem]">
                      <JobListingMetaBadges
                        employmentType={job.employment_type}
                        workArrangement={job.work_arrangement}
                        salary={job.salary}
                      />
                    </div>
                    </div>

                    {/* Match percentage & Save button (same total match as job detail page) */}
                    <div className="mt-auto flex shrink-0 items-center justify-between gap-4 pt-7">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <RadialProgress
                          value={job.matchPercentage ?? 0}
                          size={44}
                          strokeWidth={5}
                          showLabel={false}
                          percentageTextSize="sm"
                          className="shrink-0 text-breneo-blue"
                        />
                        <span className="line-clamp-2 text-xs font-semibold text-gray-700">
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
                          "h-10 w-10 shrink-0 bg-[#E6E7EB] hover:bg-[#E6E7EB]/90 dark:bg-[#3A3A3A] dark:hover:bg-[#4A4A4A]",
                          job.is_saved
                            ? "text-breneo-blue bg-breneo-blue/10 hover:bg-breneo-blue/15 dark:bg-breneo-blue/20 dark:hover:bg-breneo-blue/30"
                            : "text-black dark:text-white",
                        )}
                      >
                        <Bookmark
                          className={cn(
                            "h-4 w-4 transition-colors",
                            job.is_saved
                              ? "text-breneo-blue fill-breneo-blue animate-heart-pop"
                              : "text-black dark:text-white",
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
