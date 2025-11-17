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
}

const jobTypes = ["FULLTIME", "PARTTIME", "CONTRACTOR", "INTERN"];

const jobTypeLabels: Record<string, string> = {
  FULLTIME: "Full Time",
  PARTTIME: "Part Time",
  CONTRACTOR: "Contractor",
  INTERN: "Intern",
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

// Updated fetchJobs to use the new job service
const fetchJobs = async (
  searchTerm: string,
  filters: JobFilters,
  page: number
): Promise<ApiJob[]> => {
  try {
    const response = await jobService.fetchActiveJobs({
      query: searchTerm,
      filters,
      page,
      pageSize: 20,
    });

    return response.jobs;
  } catch (error) {
    console.error("Error fetching jobs:", error);
    throw error;
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

  // Helper function to update URL with current filters
  const updateUrlWithFilters = useCallback(
    (filters: JobFilters, search: string, pageNum: number) => {
      // Don't update URL if we're currently syncing from URL (prevents circular updates)
      if (isUpdatingFromUrl.current) {
        return;
      }

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

  // Initialize filters from URL, session storage, or defaults
  const [activeFilters, setActiveFilters] = useState<JobFilters>(() => {
    // Try URL params first
    const countriesParam = searchParams.get("countries");
    const skillsParam = searchParams.get("skills");
    const jobTypesParam = searchParams.get("jobTypes");
    const isRemoteParam = searchParams.get("isRemote");
    const datePostedParam = searchParams.get("datePosted");
    const countryParam = searchParams.get("country");

    if (
      countriesParam ||
      skillsParam ||
      jobTypesParam ||
      isRemoteParam ||
      datePostedParam ||
      countryParam
    ) {
      // URL params exist, use them
      return {
        country: countryParam || "Georgia",
        countries: countriesParam
          ? countriesParam.split(",").filter(Boolean)
          : [],
        jobTypes: jobTypesParam ? jobTypesParam.split(",").filter(Boolean) : [],
        isRemote: isRemoteParam === "true",
        datePosted: datePostedParam || "week", // Default to week for active jobs
        skills: skillsParam ? skillsParam.split(",").filter(Boolean) : [],
      };
    }

    // Try session storage
    const sessionData = loadFiltersFromSession(JOBS_FILTERS_STORAGE_KEY);
    if (sessionData && sessionData.filters) {
      return sessionData.filters as JobFilters;
    }

    // Default values - default to "week" to show only active jobs
    return {
      country: "Georgia",
      countries: [],
      jobTypes: [],
      isRemote: false,
      datePosted: "week", // Default to last week for active jobs only (API doesn't support "month")
      skills: [],
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

  // Debounced search term for API calls (reduces unnecessary API requests)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  // Create a stable serialized key for filters to optimize React Query caching
  const filtersKey = useMemo(() => {
    return JSON.stringify({
      countries: activeFilters.countries.sort(),
      skills: activeFilters.skills.sort(),
      jobTypes: activeFilters.jobTypes.sort(),
      isRemote: activeFilters.isRemote,
      datePosted: activeFilters.datePosted,
    });
  }, [activeFilters]);

  const [page, setPage] = useState(() => {
    const pageParam = searchParams.get("page");
    return pageParam ? parseInt(pageParam, 10) : 1;
  });

  const [tempFilters, setTempFilters] = useState<JobFilters>(activeFilters);

  // Ref to track if we're updating from URL (to prevent circular updates)
  const isUpdatingFromUrl = React.useRef(false);

  // Sync filters with URL params when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const countriesParam = searchParams.get("countries");
    const skillsParam = searchParams.get("skills");
    const jobTypesParam = searchParams.get("jobTypes");
    const isRemoteParam = searchParams.get("isRemote");
    const datePostedParam = searchParams.get("datePosted");
    const countryParam = searchParams.get("country");
    const searchParam = searchParams.get("search") || "";
    const pageParam = searchParams.get("page");

    const urlFilters: JobFilters = {
      country: countryParam || "Georgia",
      countries: countriesParam
        ? countriesParam.split(",").filter(Boolean)
        : [],
      jobTypes: jobTypesParam ? jobTypesParam.split(",").filter(Boolean) : [],
      isRemote: isRemoteParam === "true",
      datePosted: datePostedParam || "all",
      skills: skillsParam ? skillsParam.split(",").filter(Boolean) : [],
    };

    const urlPage = pageParam ? parseInt(pageParam, 10) : 1;

    // Check if URL params differ from current state
    const filtersChanged =
      JSON.stringify(urlFilters) !== JSON.stringify(activeFilters);
    const searchChanged = searchParam !== searchTerm;
    const pageChanged = urlPage !== page;

    if (filtersChanged || searchChanged || pageChanged) {
      isUpdatingFromUrl.current = true;
      setActiveFilters(urlFilters);
      setTempFilters(urlFilters);
      if (searchChanged) {
        setSearchTerm(searchParam);
      }
      if (pageChanged) {
        setPage(urlPage);
      }
      // Reset flag after state updates
      setTimeout(() => {
        isUpdatingFromUrl.current = false;
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Only depend on searchParams, not on state

  // Clean up URL on initial load - remove country param if it exists
  useEffect(() => {
    const countryParam = searchParams.get("country");
    const countriesParam = searchParams.get("countries");

    // If country param exists but countries param doesn't, remove country from URL
    // The country is stored in state but doesn't need to be in URL
    if (countryParam && !countriesParam) {
      const params = new URLSearchParams(searchParams);
      params.delete("country");
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

            // Auto-populate filters with top skills if not already set and no URL params
            const hasSkillsInUrl = searchParams.get("skills") !== null;
            if (!hasSkillsInUrl) {
              setActiveFilters((prev) => {
                const newFilters = {
                  ...prev,
                  skills: prev.skills.length === 0 ? topSkills : prev.skills,
                };
                // Save to session storage
                saveFiltersToSession(
                  JOBS_FILTERS_STORAGE_KEY,
                  newFilters,
                  searchTerm
                );
                return newFilters;
              });
              setTempFilters((prev) => ({
                ...prev,
                skills: prev.skills.length === 0 ? topSkills : prev.skills,
              }));
            }

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

          // Auto-populate filters with top skills if not already set and no URL params
          const hasSkillsInUrl = searchParams.get("skills") !== null;
          if (!hasSkillsInUrl) {
            setActiveFilters((prev) => {
              const newFilters = {
                ...prev,
                skills: prev.skills.length === 0 ? topSkills : prev.skills,
              };
              // Save to session storage
              saveFiltersToSession(
                JOBS_FILTERS_STORAGE_KEY,
                newFilters,
                searchTerm
              );
              return newFilters;
            });
            setTempFilters((prev) => ({
              ...prev,
              skills: prev.skills.length === 0 ? topSkills : prev.skills,
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching user skills:", error);
      } finally {
        setLoadingSkills(false);
      }
    };

    fetchUserSkills();
  }, [user]);

  // Removed selectedJobType state as we now use WorkTypeDropdown with multi-select

  // Effect to detect user's location on page load
  useEffect(() => {
    // Check if location toast has already been shown in this session
    const locationToastShown = sessionStorage.getItem("locationToastShown");

    // Don't detect location if countries are already set in URL
    if (searchParams.get("countries")) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const data = await response.json();
          if (data.countryName) {
            // Find country code from countries data
            const country = countries.find((c) => c.name === data.countryName);
            setActiveFilters((prev) => {
              const newFilters = {
                ...prev,
                country: data.countryName,
                countries: country ? [country.code] : prev.countries,
              };
              // Update URL and save to session storage
              setTimeout(() => {
                if (!isUpdatingFromUrl.current) {
                  const currentPage = parseInt(
                    searchParams.get("page") || "1",
                    10
                  );
                  updateUrlWithFilters(newFilters, searchTerm, currentPage);
                }
              }, 0);
              return newFilters;
            });
            setTempFilters((prev) => ({
              ...prev,
              country: data.countryName,
              countries: country ? [country.code] : prev.countries,
            }));

            // Only show toast if not shown in this session
            if (!locationToastShown) {
              toast.info(`Showing jobs in ${data.countryName}.`);
              sessionStorage.setItem("locationToastShown", "true");
            }
          }
        } catch (error) {
          // Only show error toast if not shown in this session
          if (!locationToastShown) {
            toast.error("Could not determine your location.");
            sessionStorage.setItem("locationToastShown", "true");
          }
        }
      },
      () => {
        // Only show permission denied toast if not shown in this session
        if (!locationToastShown) {
          toast.info("Location permission denied. Defaulting to Georgia.");
          sessionStorage.setItem("locationToastShown", "true");
        }
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const { data: savedJobs = [] } = useQuery<string[]>({
    queryKey: ["savedJobs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      // saved_jobs table exists but is not in generated types
      const { data } = await supabase
        .from("saved_jobs" as never)
        .select("job_id")
        .eq("user_id", user.id);
      return data?.map((item: { job_id: string }) => item.job_id) || [];
    },
    enabled: !!user,
  });

  const {
    data: jobs = [],
    isLoading,
    error,
  } = useQuery({
    // Use debounced search term and serialized filters for better caching
    queryKey: ["jobs", debouncedSearchTerm, filtersKey, page],
    // Pass the debounced search term to the fetching function
    queryFn: () => fetchJobs(debouncedSearchTerm, activeFilters, page),
    // Optimize caching and refetching behavior
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // Keep data fresh for 5 minutes (increased to reduce requests)
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    // Prevent duplicate requests
    enabled: debouncedSearchTerm !== undefined && debouncedSearchTerm !== null, // Only fetch when search term is ready
    retry: 1, // Only retry once on failure
    retryDelay: 1000, // Wait 1 second before retry
  });

  // Immediate search (when user presses Enter or clicks Search button)
  const handleSearch = useCallback(() => {
    const newPage = 1;
    setPage(newPage);
    setDebouncedSearchTerm(searchTerm); // Update immediately
    updateUrlWithFilters(activeFilters, searchTerm, newPage);
    // Don't invalidate queries - React Query will refetch automatically when queryKey changes
  }, [searchTerm, activeFilters, updateUrlWithFilters]);

  // Debounce search term updates (500ms delay) - only for typing, not for Enter key
  // Increased delay to reduce API calls
  useEffect(() => {
    // Skip debouncing if searchTerm matches debouncedSearchTerm (already synced)
    if (searchTerm === debouncedSearchTerm) {
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      const newPage = 1;
      setPage(newPage);
      updateUrlWithFilters(activeFilters, searchTerm, newPage);
      // Don't invalidate queries here - React Query will refetch automatically when queryKey changes
    }, 500); // Increased from 300ms to 500ms to reduce requests

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm, activeFilters, updateUrlWithFilters, debouncedSearchTerm]);

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

      // Job IDs from external APIs are often base64 strings (e.g., "MTY3OTc3NDM5NS5SZXRybw==")
      // The backend endpoint expects <int:job_id> but we have base64 strings
      // Try to extract numeric ID or use the string as-is
      const jobId = String(job.id);

      // Try to parse as integer if it's numeric
      const jobIdInt = parseInt(jobId, 10);
      const isNumeric = !isNaN(jobIdInt) && jobIdInt.toString() === jobId;

      // If it's a base64 string, try to decode it to see if there's a numeric ID inside
      // Otherwise, we'll need to handle it as a string
      let urlJobId: string | number = jobId;
      if (isNumeric) {
        urlJobId = jobIdInt;
      } else {
        // For base64 strings, try URL-encoding it
        // But Django <int:job_id> won't accept it, so we might need backend change
        // For now, try sending as string parameter
        urlJobId = encodeURIComponent(jobId);
      }

      // Try the endpoint with job_id in URL first (for numeric IDs)
      // If that fails, the backend might need to accept strings
      const endpointUrl = isNumeric
        ? `${API_ENDPOINTS.JOBS.SAVE_JOB}${jobIdInt}/`
        : `${API_ENDPOINTS.JOBS.SAVE_JOB}${urlJobId}/`;

      console.log("Saving job:", {
        originalJobId: job.id,
        jobId,
        isNumeric,
        urlJobId,
        endpointUrl,
        jobTitle: job.title,
      });

      // Call the API endpoint to save/unsave the job
      // Send job_id in the request body for the saved_jobs table
      // The backend should store the original job_id string in saved_jobs table
      try {
        await apiClient.post(endpointUrl, {
          job_id: jobId, // Always send original job_id in body
        });
      } catch (error: unknown) {
        // If 404 and it's a base64 string, try without job_id in URL
        const axiosError = error as { response?: { status?: number } };
        if (axiosError?.response?.status === 404 && !isNumeric) {
          console.log("Retrying with job_id only in body (no URL param)");
          await apiClient.post(API_ENDPOINTS.JOBS.SAVE_JOB, {
            job_id: jobId,
          });
        } else {
          throw error;
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["savedJobs", user?.id] });
      toast.success(variables.is_saved ? "Job Unsaved" : "Job Saved");
    },
    onError: (
      error: Error & {
        response?: { data?: { message?: string }; status?: number };
        config?: { url?: string };
      }
    ) => {
      console.error("Error saving job:", {
        error,
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        url: error?.config?.url,
      });
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to save job";
      toast.error(errorMessage);
    },
  });

  const transformedJobs = React.useMemo(() => {
    return (jobs || []).map((job: ApiJob): Job => {
      // Handle nested company object if it exists
      const companyObj =
        job.company && typeof job.company === "object"
          ? (job.company as Record<string, unknown>)
          : null;

      // Extract fields with fallbacks for different API formats
      const jobId = job.job_id || job.id || "";
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
        job.job_country || job.country || (companyObj?.country as string) || "";
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
      if (!companyLogo && job.employer_logo) companyLogo = job.employer_logo;
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
      if (!companyLogo && job.employer && typeof job.employer === "object") {
        const employerObj = job.employer as Record<string, unknown>;
        if (employerObj.logo) companyLogo = employerObj.logo as string;
        if (!companyLogo && employerObj.logo_url)
          companyLogo = employerObj.logo_url as string;
        if (!companyLogo && employerObj.company_logo)
          companyLogo = employerObj.company_logo as string;
        if (!companyLogo && employerObj.employer_logo)
          companyLogo = employerObj.employer_logo as string;
      }

      // If no logo found, the UI will handle fallback to Clearbit API or default icon

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
        location: locationString,
        url: applyLink,
        company_logo: companyLogo,
        is_saved: savedJobs.includes(jobId),
        salary,
        employment_type: employmentType,
        work_arrangement: workArrangement,
      };
    });
  }, [jobs, savedJobs]);

  // Handle work types change
  const handleWorkTypesChange = (workTypes: string[]) => {
    const newFilters = {
      ...activeFilters,
      jobTypes: workTypes,
    };
    const newPage = 1;
    setActiveFilters(newFilters);
    setTempFilters(newFilters);
    setPage(newPage);
    updateUrlWithFilters(newFilters, searchTerm, newPage);
    // React Query will automatically refetch when filtersKey changes
  };

  // Handle remote change
  const handleRemoteChange = (isRemote: boolean) => {
    const newFilters = {
      ...activeFilters,
      isRemote: isRemote,
    };
    const newPage = 1;
    setActiveFilters(newFilters);
    setTempFilters(newFilters);
    setPage(newPage);
    updateUrlWithFilters(newFilters, searchTerm, newPage);
    // React Query will automatically refetch when filtersKey changes
  };

  // Handle countries change
  const handleCountriesChange = (countryCodes: string[]) => {
    const newFilters = {
      ...activeFilters,
      countries: countryCodes,
    };
    const newPage = 1;
    setActiveFilters(newFilters);
    setTempFilters(newFilters);
    setPage(newPage);
    updateUrlWithFilters(newFilters, searchTerm, newPage);
    // React Query will automatically refetch when filtersKey changes
  };

  // Handle removing a skill filter
  const handleRemoveSkill = (skillToRemove: string) => {
    const newFilters = {
      ...activeFilters,
      skills: activeFilters.skills.filter((skill) => skill !== skillToRemove),
    };
    const newPage = 1;
    setActiveFilters(newFilters);
    setTempFilters(newFilters);
    setPage(newPage);
    updateUrlWithFilters(newFilters, searchTerm, newPage);
    // React Query will automatically refetch when filtersKey changes
  };

  // Handle removing a country filter
  const handleRemoveCountry = (countryCodeToRemove: string) => {
    const newFilters = {
      ...activeFilters,
      countries: activeFilters.countries.filter(
        (code) => code !== countryCodeToRemove
      ),
    };
    const newPage = 1;
    setActiveFilters(newFilters);
    setTempFilters(newFilters);
    setPage(newPage);
    updateUrlWithFilters(newFilters, searchTerm, newPage);
    // React Query will automatically refetch when filtersKey changes
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
    const newPage = 1;
    setActiveFilters(newFilters);
    setTempFilters(newFilters);
    setPage(newPage);
    updateUrlWithFilters(newFilters, searchTerm, newPage);
    // React Query will automatically refetch when filtersKey changes
  };

  // Handle removing remote filter
  const handleRemoveRemote = () => {
    const newFilters = {
      ...activeFilters,
      isRemote: false,
    };
    const newPage = 1;
    setActiveFilters(newFilters);
    setTempFilters(newFilters);
    setPage(newPage);
    updateUrlWithFilters(newFilters, searchTerm, newPage);
    // React Query will automatically refetch when filtersKey changes
  };

  // No need to sync selectedJobType anymore as we use WorkTypeDropdown directly

  const handleApplyFilters = () => {
    const newPage = 1;
    setActiveFilters(tempFilters);
    setPage(newPage);
    updateUrlWithFilters(tempFilters, searchTerm, newPage);
    setFilterModalOpen(false);
    // React Query will automatically refetch when filtersKey changes
  };

  const handleClearFilters = () => {
    const clearedFilters: JobFilters = {
      country: "Georgia", // Default for internal state
      countries: [],
      jobTypes: [],
      isRemote: false,
      datePosted: "week", // Default to last week for active jobs only (API doesn't support "month")
      skills: [],
    };
    const newPage = 1;
    setTempFilters(clearedFilters);
    setActiveFilters(clearedFilters);
    setPage(newPage);

    // Clear URL params completely when clearing filters
    const params = new URLSearchParams();
    if (searchTerm) {
      params.set("search", searchTerm);
    }
    // Don't add any filter params - this clears them from URL
    setSearchParams(params, { replace: true });

    // Save cleared filters to session storage
    saveFiltersToSession(JOBS_FILTERS_STORAGE_KEY, clearedFilters, searchTerm);

    setFilterModalOpen(false);
    // React Query will automatically refetch when filtersKey changes
  };

  const handleNextPage = () => {
    const newPage = page + 1;
    setPage(newPage);
    updateUrlWithFilters(activeFilters, searchTerm, newPage);
    // Automatically scroll to the top of the job list on page change
    window.scrollTo({ top: 0, behavior: "smooth" });
    // React Query will automatically refetch when page changes
  };

  const handlePrevPage = () => {
    const newPage = Math.max(1, page - 1);
    setPage(newPage);
    updateUrlWithFilters(activeFilters, searchTerm, newPage);
    // Automatically scroll to the top of the job list on page change
    window.scrollTo({ top: 0, behavior: "smooth" });
    // React Query will automatically refetch when page changes
  };

  // Function to fetch job count for a specific skill
  const fetchJobCountForSkill = async (skill: string): Promise<number> => {
    try {
      const response = await jobService.fetchActiveJobs({
        query: skill,
        filters: {
          ...activeFilters,
          skills: [skill], // Filter by this skill only
        },
        page: 1,
        pageSize: 20, // Fetch up to 20 jobs to get a better count
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
    queryKey: ["skillJobCounts", userTopSkills.join(","), filtersKey],
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

  // Determine if there are enough jobs to assume a next page might exist
  // JSearch API returns a max of 20 results per page, so if we get exactly 20, we assume there's a next page.
  const isNextPagePossible =
    transformedJobs.length > 0 && transformedJobs.length === 20;
  const isPrevPagePossible = page > 1;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 px-2 sm:px-6 lg:px-8">
        {/* Modern Search Bar */}
        <div className="mb-8 relative">
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white dark:bg-[#242424] border border-breneo-accent dark:border-gray-600 rounded-lg pl-3 md:pl-4 pr-2.5 md:pr-3 py-[1rem] overflow-visible flex-1">
              {/* Search Icon - Purple outline */}
              <Search
                className="h-4 w-4 text-breneo-accent dark:text-breneo-blue flex-shrink-0 mr-2"
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
                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-2 flex-shrink-0" />
                  <div className="flex items-center flex-1 min-w-0 relative">
                    <WorkTypeDropdown
                      selectedWorkTypes={activeFilters.jobTypes}
                      onWorkTypesChange={handleWorkTypesChange}
                      isRemote={activeFilters.isRemote}
                      onRemoteChange={handleRemoteChange}
                    />
                  </div>
                </>
              )}

              {/* Location Field - Hidden on mobile, shown on desktop */}
              {!isMobile && (
                <>
                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-2 flex-shrink-0" />
                  <div className="flex items-center flex-1 min-w-0 relative">
                    <LocationDropdown
                      selectedLocations={activeFilters.countries}
                      onLocationsChange={handleCountriesChange}
                      placeholder="Location"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Filter Button - Outside search bar, on the right */}
            <Button
              variant="outline"
              onClick={() => setFilterModalOpen(true)}
              className="flex items-center gap-2 bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-[1rem] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 whitespace-nowrap h-auto"
              aria-label="Filter jobs"
            >
              <Filter className="h-4 w-4" strokeWidth={2} />
              <span className="hidden md:inline text-sm font-medium">
                ფილტრები
              </span>
            </Button>
          </div>
        </div>

        {/* User Skills Section */}
        {loadingSkills ? (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Your Skills</h2>
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
            <h2 className="text-2xl font-bold mb-4">Your Skills</h2>
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
                    className="cursor-pointer hover:shadow-md transition-shadow duration-200 border border-gray-200"
                    onClick={() => {
                      // Add skill to filters if not already present
                      if (!activeFilters.skills.includes(skill)) {
                        const newFilters = {
                          ...activeFilters,
                          skills: [...activeFilters.skills, skill],
                        };
                        const newPage = 1;
                        setActiveFilters(newFilters);
                        setTempFilters(newFilters);
                        setPage(newPage);
                        updateUrlWithFilters(newFilters, searchTerm, newPage);
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
            <h2 className="text-2xl font-bold">Latest Vacancies</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">All vacancies</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={handlePrevPage}
                disabled={!isPrevPagePossible || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={handleNextPage}
                disabled={!isNextPagePossible || isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-center gap-3 mb-6">
            <AlertCircle className="h-5 w-5" />
            <p>
              <strong>Error:</strong> {(error as Error).message}
            </p>
          </div>
        )}

        {isLoading && (
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

        {!isLoading && transformedJobs.length === 0 && (
          <div className="text-center p-10 border border-dashed rounded-lg text-muted-foreground">
            <img
              src="/lovable-uploads/no-data-found.png"
              alt="No data found"
              className="mx-auto h-64 w-64 mb-4 object-contain"
            />
            <h4 className="text-lg font-semibold">No Jobs Found</h4>
            <p className="text-sm">
              Try adjusting your search terms or filters.
            </p>
          </div>
        )}

        {/* Job Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-32 md:pb-16">
          {transformedJobs.map((job) => (
            <Card
              key={job.id}
              className="group flex flex-col hover:shadow-lg transition-all duration-200 border border-gray-200 overflow-hidden"
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
                    {job.company ? (
                      <img
                        src={`https://logo.clearbit.com/${encodeURIComponent(
                          job.company
                        )}`}
                        alt={`${job.company} logo`}
                        className={`w-12 h-12 rounded-full object-cover border border-gray-200 absolute inset-0 clearbit-logo ${
                          job.company_logo ? "hidden" : "block"
                        }`}
                        style={{ zIndex: job.company_logo ? 0 : 10 }}
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
                        job.company_logo || job.company ? "hidden" : "flex"
                      }`}
                      style={{
                        zIndex: job.company_logo || job.company ? 0 : 10,
                      }}
                    >
                      <Briefcase className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base mb-1 truncate">
                      {job.company}
                    </h3>
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
                    <span className="text-gray-700">{job.employment_type}</span>
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
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    className="flex-1 bg-gray-800 dark:bg-gray-700 text-white hover:bg-gray-900 dark:hover:bg-gray-600 rounded-lg"
                  >
                    View
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-[#242424] hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => saveJobMutation.mutate(job)}
                    aria-label={job.is_saved ? "Unsave job" : "Save job"}
                  >
                    <Bookmark
                      className={`h-5 w-5 transition-colors ${
                        job.is_saved
                          ? "fill-black dark:fill-white text-black dark:text-white"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
