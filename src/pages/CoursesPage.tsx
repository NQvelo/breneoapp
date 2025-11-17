import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  calculateSkillScores,
  getTopSkills,
  getUserTestAnswers,
} from "@/utils/skillTestUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  BookmarkCheck,
  Filter,
  Search,
  GraduationCap,
  Clock,
  TrendingUp,
  AlertCircle,
  X,
  Tag,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { createAcademySlug } from "@/utils/academyUtils";
import { CourseFilterModal } from "@/components/courses/CourseFilterModal";
import { countries } from "@/data/countries";
import { LocationDropdown } from "@/components/jobs/LocationDropdown";
import { useMobile } from "@/hooks/use-mobile";

// Session storage keys
const COURSES_FILTERS_STORAGE_KEY = "coursesFilters";
const COURSES_FILTERED_RESULTS_KEY = "coursesFilteredResults";

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

const saveFilteredCoursesToSession = (courses: Course[]) => {
  try {
    sessionStorage.setItem(
      COURSES_FILTERED_RESULTS_KEY,
      JSON.stringify(courses)
    );
  } catch (error) {
    console.error("Error saving filtered courses to session storage:", error);
  }
};

const loadFilteredCoursesFromSession = (): Course[] => {
  try {
    const stored = sessionStorage.getItem(COURSES_FILTERED_RESULTS_KEY);
    if (stored) {
      return JSON.parse(stored) as Course[];
    }
  } catch (error) {
    console.error(
      "Error loading filtered courses from session storage:",
      error
    );
  }
  return [];
};

interface AcademyProfile {
  id: string;
  academy_name: string;
  description: string;
  website_url?: string;
  contact_email?: string;
  logo_url?: string;
  profile_photo_url?: string;
  profile_image_url?: string;
  slug?: string;
}

interface Course {
  id: string;
  title: string;
  provider: string;
  category: string;
  level: string;
  duration: string;
  match: number;
  enrolled: boolean;
  popular: boolean;
  image: string;
  description: string;
  topics: string[];
  required_skills: string[];
  is_saved: boolean;
  academy_id: string | null;
  academy_profiles?: { slug?: string } | null;
  academy_profile_data?: AcademyProfile | null;
}

// Filter state shape
interface CourseFilters {
  country: string;
  countries: string[];
  skills: string[];
}

const CoursesPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useMobile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterModalOpen, setFilterModalOpen] = useState(false);

  // State for user's top skills from test results
  const [userTopSkills, setUserTopSkills] = useState<string[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [sessionFilteredCourses, setSessionFilteredCourses] = useState<
    Course[]
  >(() => loadFilteredCoursesFromSession());

  // Helper function to update URL with current filters
  const updateUrlWithFilters = useCallback(
    (filters: CourseFilters, search: string) => {
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
      // Don't add country param to URL - use countries array instead
      // Country is kept in state for backward compatibility but not in URL

      // Update URL without page reload
      setSearchParams(params, { replace: true });

      // Save to session storage
      saveFiltersToSession(COURSES_FILTERS_STORAGE_KEY, filters, search);
    },
    [setSearchParams]
  );

  // Initialize filters from URL, session storage, or defaults
  const [activeFilters, setActiveFilters] = useState<CourseFilters>(() => {
    // Try URL params first
    const countriesParam = searchParams.get("countries");
    const skillsParam = searchParams.get("skills");
    const countryParam = searchParams.get("country");

    if (countriesParam || skillsParam || countryParam) {
      // URL params exist, use them
      return {
        country: countryParam || "Georgia",
        countries: countriesParam
          ? countriesParam.split(",").filter(Boolean)
          : [],
        skills: skillsParam ? skillsParam.split(",").filter(Boolean) : [],
      };
    }

    // Try session storage
    const sessionData = loadFiltersFromSession(COURSES_FILTERS_STORAGE_KEY);
    if (sessionData && sessionData.filters) {
      return sessionData.filters as CourseFilters;
    }

    // Default values
    return {
      country: "Georgia",
      countries: [],
      skills: [],
    };
  });

  const [searchTerm, setSearchTerm] = useState(() => {
    const urlSearch = searchParams.get("search");
    if (urlSearch) return urlSearch;

    const sessionData = loadFiltersFromSession(COURSES_FILTERS_STORAGE_KEY);
    if (sessionData && sessionData.search) {
      return sessionData.search as string;
    }

    return "";
  });

  // Debounced search term for API calls (reduces unnecessary API requests)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  const [tempFilters, setTempFilters] = useState<CourseFilters>(activeFilters);

  // Create a stable serialized key for filters to optimize React Query caching
  const filtersKey = React.useMemo(() => {
    return JSON.stringify({
      countries: activeFilters.countries.sort(),
      skills: activeFilters.skills.sort(),
    });
  }, [activeFilters]);

  // Ref to track if we're updating from URL (to prevent circular updates)
  const isUpdatingFromUrl = React.useRef(false);

  // Sync filters with URL params when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const countriesParam = searchParams.get("countries");
    const skillsParam = searchParams.get("skills");
    const countryParam = searchParams.get("country");
    const searchParam = searchParams.get("search") || "";

    const urlFilters: CourseFilters = {
      country: countryParam || "Georgia",
      countries: countriesParam
        ? countriesParam.split(",").filter(Boolean)
        : [],
      skills: skillsParam ? skillsParam.split(",").filter(Boolean) : [],
    };

    // Check if URL params differ from current state
    const filtersChanged =
      JSON.stringify(urlFilters) !== JSON.stringify(activeFilters);
    const searchChanged = searchParam !== searchTerm;

    if (filtersChanged || searchChanged) {
      isUpdatingFromUrl.current = true;
      setActiveFilters(urlFilters);
      setTempFilters(urlFilters);
      if (searchChanged) {
        setSearchTerm(searchParam);
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

      // Check if skills are already in URL - if so, don't auto-populate
      const hasSkillsInUrl = searchParams.get("skills") !== null;

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
            if (!hasSkillsInUrl) {
              setActiveFilters((prev) => {
                const newFilters = {
                  ...prev,
                  skills: prev.skills.length === 0 ? topSkills : prev.skills,
                };
                // Save to session storage
                saveFiltersToSession(
                  COURSES_FILTERS_STORAGE_KEY,
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
          if (!hasSkillsInUrl) {
            setActiveFilters((prev) => {
              const newFilters = {
                ...prev,
                skills: prev.skills.length === 0 ? topSkills : prev.skills,
              };
              // Save to session storage
              saveFiltersToSession(
                COURSES_FILTERS_STORAGE_KEY,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
              // Update URL with new filters directly
              setTimeout(() => {
                if (!isUpdatingFromUrl.current) {
                  const params = new URLSearchParams(searchParams);
                  // Preserve existing search and skills
                  if (newFilters.countries.length > 0) {
                    params.set("countries", newFilters.countries.join(","));
                  } else {
                    params.delete("countries");
                  }
                  if (newFilters.country && newFilters.country !== "Georgia") {
                    params.set("country", newFilters.country);
                  } else {
                    params.delete("country");
                  }
                  setSearchParams(params, { replace: true });
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
              toast.info(`Showing courses in ${data.countryName}.`);
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
  }, []); // Only run once on mount, and check searchParams inside

  const isValidUUID = React.useCallback((value: unknown) => {
    if (typeof value !== "string") return false;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }, []);

  const userId = typeof user?.id === "string" ? user.id : null;
  const canUseUserId = React.useMemo(
    () => (userId ? isValidUUID(userId) : false),
    [userId, isValidUUID]
  );

  const { data: savedCourses = [] } = useQuery({
    queryKey: ["savedCourses", userId],
    queryFn: async () => {
      if (!userId || !canUseUserId) return [];

      // Fetch from Supabase (source of truth for saving)
      const { data, error } = await supabase
        .from("saved_courses")
        .select("course_id")
        .eq("user_id", userId);

      if (error) {
        console.error("Error fetching saved courses from Supabase:", error);
        return [];
      }

      return data.map((item) => item.course_id);
    },
    enabled: canUseUserId,
  });

  const { data: courses, isLoading: coursesLoading } = useQuery({
    // Use debounced search term and serialized filters for better caching
    queryKey: ["courses", savedCourses, debouncedSearchTerm, filtersKey],
    queryFn: async () => {
      let query = supabase.from("courses").select("*");

      // Apply search filter using debounced term
      if (debouncedSearchTerm) {
        query = query.or(
          `title.ilike.%${debouncedSearchTerm}%,provider.ilike.%${debouncedSearchTerm}%,category.ilike.%${debouncedSearchTerm}%,description.ilike.%${debouncedSearchTerm}%`
        );
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) {
        console.error("Error fetching courses:", error);
        return [];
      }

      const coursesWithSaved = (data?.map((course) => ({
        ...course,
        match: 0,
        topics: course.topics || [],
        required_skills: course.required_skills || [],
        is_saved: savedCourses.includes(course.id),
      })) || []) as Course[];

      // Get unique academy_ids
      const uniqueAcademyIds = [
        ...new Set(
          coursesWithSaved
            .map((c) => c.academy_id)
            .filter((id): id is string => !!id)
        ),
      ];

      // Fetch academy profiles from Supabase first to get basic data and slugs
      const supabaseAcademyProfilesMap = new Map<string, AcademyProfile>();
      const apiAcademyProfilesMap = new Map<string, AcademyProfile>();

      if (uniqueAcademyIds.length > 0) {
        // Step 1: Fetch academy profiles from Supabase to get basic data
        const { data: academyProfiles, error: academyProfilesError } =
          await supabase
            .from("academy_profiles")
            .select(
              "id, academy_name, description, website_url, contact_email, logo_url"
            )
            .in("id", uniqueAcademyIds);

        if (academyProfilesError) {
          console.warn(
            "Error fetching academy profiles from Supabase:",
            academyProfilesError
          );
        } else if (academyProfiles) {
          academyProfiles.forEach((profile) => {
            const slug = createAcademySlug(profile.academy_name || "");
            supabaseAcademyProfilesMap.set(profile.id, {
              id: profile.id,
              academy_name: profile.academy_name || "",
              description: profile.description || "",
              website_url: profile.website_url || undefined,
              contact_email: profile.contact_email || undefined,
              logo_url: profile.logo_url || undefined,
              profile_photo_url: undefined,
              profile_image_url: undefined,
              slug: slug,
            });
          });
        }

        // Step 2: Fetch academy data from Django API using academy_id
        // Endpoint: /api/academy/<academy_id>/
        await Promise.all(
          uniqueAcademyIds.map(async (academyId) => {
            const supabaseData = supabaseAcademyProfilesMap.get(academyId);

            try {
              // Use the academy detail endpoint: /api/academy/<academy_id>/
              const response = await apiClient.get(
                `${API_ENDPOINTS.ACADEMY.DETAIL}${academyId}/`
              );

              if (response.data) {
                // API returns nested structure: { profile_data: {...}, profile_type: 'academy', ... }
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

                // Debug: Log all available fields from API
                if (process.env.NODE_ENV === "development") {
                  console.log(
                    `[Academy ${academyId}] API Response structure:`,
                    {
                      hasProfileData: !!responseData.profile_data,
                      profileDataKeys: profileData
                        ? Object.keys(profileData)
                        : [],
                      fullResponse: responseData,
                    }
                  );
                }

                // Extract academy ID - check both profile_data and root level
                const academyIdFromApi =
                  getStringField("id", profileData) ||
                  getStringField("academy_id", profileData) ||
                  getStringField("id", responseData) ||
                  getStringField("academy_id", responseData) ||
                  academyId;

                // Extract academy name - 'name' field in profile_data
                const academyNameFromApi =
                  getStringField("academy_name", profileData) ||
                  getStringField("name", profileData) ||
                  getStringField("academy_name", responseData) ||
                  getStringField("name", responseData) ||
                  getStringField("first_name", profileData) ||
                  getStringField("firstName", profileData);

                const descriptionFromApi =
                  getStringField("description", profileData) ||
                  getStringField("description", responseData);
                const websiteFromApi =
                  getStringField("website_url", profileData) ||
                  getStringField("websiteUrl", profileData) ||
                  getStringField("website_url", responseData);
                const contactEmailFromApi =
                  getStringField("contact_email", profileData) ||
                  getStringField("contactEmail", profileData) ||
                  getStringField("email", profileData) ||
                  getStringField("contact_email", responseData);

                // Extract logo - check profile_data first
                const logoFromApi =
                  getStringField("logo_url", profileData) ||
                  getStringField("logoUrl", profileData) ||
                  getStringField("logo", profileData) ||
                  getStringField("logo_url", responseData) ||
                  getStringField("logoUrl", responseData);

                // Extract profile photo
                const profilePhotoFromApi =
                  getStringField("profile_photo_url", profileData) ||
                  getStringField("profilePhotoUrl", profileData) ||
                  getStringField("profile_photo", profileData) ||
                  getStringField("profilePhoto", profileData) ||
                  getStringField("profile_photo_url", responseData);

                // Extract profile image - try multiple variations
                const profileImageFromApi =
                  getStringField("profile_image_url", profileData) ||
                  getStringField("profileImageUrl", profileData) ||
                  getStringField("profile_image", profileData) ||
                  getStringField("profileImage", profileData) ||
                  getStringField("image_url", profileData) ||
                  getStringField("imageUrl", profileData) ||
                  getStringField("profile_image_url", responseData) ||
                  getStringField("profileImageUrl", responseData) ||
                  // Fallback to profile_photo if profile_image not found
                  profilePhotoFromApi;

                const slugFromApi =
                  getStringField("slug", profileData) ||
                  getStringField("slug", responseData);

                // Debug: Log what we found
                if (process.env.NODE_ENV === "development") {
                  console.log(`[Academy ${academyId}] Extracted values:`, {
                    academy_id: academyIdFromApi,
                    academy_name: academyNameFromApi,
                    profile_image_url: profileImageFromApi,
                    profile_photo_url: profilePhotoFromApi,
                    logo_url: logoFromApi,
                    description: descriptionFromApi,
                    email: contactEmailFromApi,
                  });
                }

                apiAcademyProfilesMap.set(academyId, {
                  id: academyIdFromApi || academyId,
                  academy_name:
                    academyNameFromApi || supabaseData?.academy_name || "",
                  description:
                    descriptionFromApi || supabaseData?.description || "",
                  website_url: websiteFromApi || supabaseData?.website_url,
                  contact_email:
                    contactEmailFromApi || supabaseData?.contact_email,
                  logo_url: logoFromApi || supabaseData?.logo_url,
                  profile_photo_url:
                    profilePhotoFromApi || supabaseData?.profile_photo_url,
                  profile_image_url:
                    profileImageFromApi ||
                    supabaseData?.profile_image_url ||
                    supabaseData?.profile_photo_url,
                  slug:
                    slugFromApi ||
                    supabaseData?.slug ||
                    createAcademySlug(
                      academyNameFromApi || supabaseData?.academy_name || ""
                    ),
                });
              }
            } catch (error) {
              console.debug(
                `Could not fetch academy profile for ${academyId} from Django API, using Supabase data`
              );
            }
          })
        );
      }

      // Join academy profile data with courses
      // Match courses to academies by academy_id:
      // - Courses come from Supabase (courses table with academy_id field)
      // - Academy data comes from API endpoint (/api/academy/<academy_id>/)
      // - If academy_id matches, the course belongs to that academy
      return coursesWithSaved.map((course) => {
        // Match course.academy_id with academy data from API
        const apiAcademyData = course.academy_id
          ? apiAcademyProfilesMap.get(course.academy_id)
          : null;
        // Fallback: Match with Supabase academy data if API fetch failed
        const supabaseAcademyData = course.academy_id
          ? supabaseAcademyProfilesMap.get(course.academy_id)
          : null;

        let academyProfileData: AcademyProfile | null = null;

        if (apiAcademyData) {
          // Use API data (enriched with latest info)
          academyProfileData = apiAcademyData;
        } else if (supabaseAcademyData) {
          // Fallback to Supabase data
          academyProfileData = {
            id: supabaseAcademyData.id,
            academy_name:
              supabaseAcademyData.academy_name || course.provider || "",
            description: supabaseAcademyData.description || "",
            website_url: supabaseAcademyData.website_url,
            contact_email: supabaseAcademyData.contact_email,
            logo_url: supabaseAcademyData.logo_url,
            profile_photo_url: supabaseAcademyData.profile_photo_url,
            profile_image_url: supabaseAcademyData.profile_image_url,
            slug: supabaseAcademyData.slug,
          };
        }

        return {
          ...course,
          academy_profile_data: academyProfileData,
        };
      });
    },
    enabled: !!savedCourses,
    // Optimize caching and refetching behavior
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 3 * 60 * 1000, // Keep data fresh for 3 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Filter courses by country (if country filter is applied)
  // Since courses don't have a direct country field, we'll filter by academy/provider name
  // or show all if no country filter is selected
  const coursesWithMatches = React.useMemo(() => {
    if (!courses) return [];

    let filteredCourses = courses;

    // Apply skill filter if skills are selected
    if (activeFilters.skills.length > 0) {
      filteredCourses = courses.filter((course) => {
        // Check if course has any of the selected skills in required_skills
        return course.required_skills.some((courseSkill) =>
          activeFilters.skills.some(
            (selectedSkill) =>
              courseSkill.toLowerCase().includes(selectedSkill.toLowerCase()) ||
              selectedSkill.toLowerCase().includes(courseSkill.toLowerCase())
          )
        );
      });
    }

    // Calculate match percentage
    if (!userTopSkills || userTopSkills.length === 0) {
      return filteredCourses.map((course) => ({
        ...course,
        match: 50, // Default match if no skills
      }));
    }

    return filteredCourses
      .map((course) => {
        const matchingSkills = course.required_skills.filter((skill) =>
          userTopSkills.some(
            (userSkill) =>
              userSkill.toLowerCase().includes(skill.toLowerCase()) ||
              skill.toLowerCase().includes(userSkill.toLowerCase())
          )
        );
        const matchPercentage =
          course.required_skills.length > 0
            ? Math.round(
                (matchingSkills.length / course.required_skills.length) * 100
              )
            : 50;
        return {
          ...course,
          match: Math.max(matchPercentage, 25),
        };
      })
      .sort((a, b) => b.match - a.match);
  }, [userTopSkills, courses, activeFilters.skills]);

  const filteredCourses = React.useMemo(() => {
    let filtered = coursesWithMatches;

    // Apply country filter if countries are selected
    if (activeFilters.countries.length > 0) {
      // Get country names from codes
      const countryNames = activeFilters.countries
        .map((code) => countries.find((c) => c.code === code)?.name)
        .filter(Boolean) as string[];

      // Filter courses where provider/academy name might contain country name
      // This is a best-effort approach since courses don't have explicit country data
      filtered = filtered.filter((course) => {
        const academyName =
          course.academy_profile_data?.academy_name || course.provider || "";
        return countryNames.some((countryName) =>
          academyName.toLowerCase().includes(countryName.toLowerCase())
        );
      });
    }

    return filtered;
  }, [coursesWithMatches, activeFilters.countries]);

  useEffect(() => {
    if (coursesLoading) {
      return;
    }
    saveFilteredCoursesToSession(filteredCourses);
    setSessionFilteredCourses(filteredCourses);
  }, [filteredCourses, coursesLoading]);

  const saveCourseMutation = useMutation({
    mutationFn: async (course: Course) => {
      if (!userId) throw new Error("User not logged in");

      if (course.is_saved) {
        // Unsave: Delete from Supabase
        const { error } = await supabase
          .from("saved_courses")
          .delete()
          .eq("user_id", userId)
          .eq("course_id", course.id);

        if (error) {
          throw new Error(`Failed to unsave course: ${error.message}`);
        }
      } else {
        // Save: Insert into Supabase
        const { error } = await supabase
          .from("saved_courses")
          .insert({ user_id: userId, course_id: course.id });

        if (error) {
          // Handle duplicate entry (course already saved)
          if (error.code === "23505") {
            // Course is already saved, treat as success
            return;
          }
          throw new Error(`Failed to save course: ${error.message}`);
        }
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate queries to refresh the UI in both CoursesPage and ProfilePage
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["savedCourses"] });
      toast.success(
        `"${variables.title}" has been ${
          variables.is_saved ? "unsaved" : "saved"
        } successfully.`
      );
    },
    onError: (error) => {
      console.error("Error saving/unsaving course:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save course. Please try again.";
      toast.error(errorMessage);
    },
  });

  // Handle countries change
  const handleCountriesChange = (countryCodes: string[]) => {
    const newFilters = {
      ...activeFilters,
      countries: countryCodes,
    };
    setActiveFilters(newFilters);
    setTempFilters(newFilters);
    updateUrlWithFilters(newFilters, searchTerm);
    queryClient.invalidateQueries({ queryKey: ["courses"] });
  };

  // Handle removing a skill filter
  const handleRemoveSkill = (skillToRemove: string) => {
    const newFilters = {
      ...activeFilters,
      skills: activeFilters.skills.filter((skill) => skill !== skillToRemove),
    };
    setActiveFilters(newFilters);
    setTempFilters(newFilters);
    updateUrlWithFilters(newFilters, searchTerm);
    queryClient.invalidateQueries({ queryKey: ["courses"] });
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
    updateUrlWithFilters(newFilters, searchTerm);
    queryClient.invalidateQueries({ queryKey: ["courses"] });
  };

  // Immediate search (when user presses Enter or clicks Search button)
  const handleSearch = useCallback(() => {
    setDebouncedSearchTerm(searchTerm); // Update immediately
    updateUrlWithFilters(activeFilters, searchTerm);
    queryClient.invalidateQueries({ queryKey: ["courses"] });
  }, [searchTerm, activeFilters, updateUrlWithFilters, queryClient]);

  // Handle key press for search (Enter) - immediate search
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Handle search term change
  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value);
  };

  // Debounce search term updates (300ms delay) - only for typing, not for Enter key
  useEffect(() => {
    // Skip debouncing if searchTerm matches debouncedSearchTerm (already synced)
    if (searchTerm === debouncedSearchTerm) {
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      updateUrlWithFilters(activeFilters, searchTerm);
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [
    searchTerm,
    activeFilters,
    updateUrlWithFilters,
    queryClient,
    debouncedSearchTerm,
  ]);

  const handleApplyFilters = () => {
    setActiveFilters(tempFilters);
    updateUrlWithFilters(tempFilters, searchTerm);
    setFilterModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ["courses"] });
  };

  const handleClearFilters = () => {
    const clearedFilters: CourseFilters = {
      country: "Georgia", // Default for internal state
      countries: [],
      skills: [],
    };
    setTempFilters(clearedFilters);
    setActiveFilters(clearedFilters);

    // Clear URL params completely when clearing filters
    const params = new URLSearchParams();
    if (searchTerm) {
      params.set("search", searchTerm);
    }
    // Don't add any filter params - this clears them from URL
    setSearchParams(params, { replace: true });

    // Save cleared filters to session storage
    saveFiltersToSession(
      COURSES_FILTERS_STORAGE_KEY,
      clearedFilters,
      searchTerm
    );

    setFilterModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ["courses"] });
  };

  const renderCourseCard = (course: Course) => {
    const academyProfileName = course.academy_profile_data?.academy_name || "";
    const academyName =
      academyProfileName || course.provider || "Unknown Academy";
    const academyId = course.academy_id;
    const academyUrl = academyId
      ? `/academy/${academyId}`
      : `/academy/${createAcademySlug(academyName)}`;

    return (
      <Card
        key={course.id}
        className="flex flex-col hover:shadow-lg transition-shadow duration-200 border border-gray-200"
      >
        <CardContent className="p-5 flex flex-col flex-grow">
          {/* Course Image */}
          <div className="relative h-48 overflow-hidden rounded-lg mb-4 bg-gradient-to-br from-gray-100 to-gray-200">
            <img
              src={course.image || "lovable-uploads/no_photo.png"}
              alt={course.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = "lovable-uploads/no_photo.png";
              }}
            />
            <div className="absolute top-3 right-3">
              <Badge
                variant="secondary"
                className="bg-white/90 backdrop-blur-sm text-gray-900 font-semibold shadow-md"
              >
                {course.match}% Match
              </Badge>
            </div>
          </div>

          {/* Academy/Provider Info */}
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-breneo-accent flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <Link
                to={academyUrl}
                className="block group/link"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="font-semibold text-sm mb-1 truncate group-hover/link:text-breneo-accent transition-colors">
                  {academyName}
                </h3>
              </Link>
              <p className="text-xs text-gray-500 truncate">
                {course.category}
              </p>
            </div>
          </div>

          {/* Course Title */}
          <h4
            className="font-bold text-lg mb-3 line-clamp-2 cursor-pointer hover:text-breneo-accent transition-colors"
            onClick={() => navigate(`/course/${course.id}`)}
          >
            {course.title}
          </h4>

          {/* Course Details */}
          <div className="space-y-2 mb-4 flex-grow">
            {/* Level */}
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-700">{course.level}</span>
            </div>

            {/* Duration */}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-700">{course.duration}</span>
            </div>

            {/* Required Skills */}
            {course.required_skills && course.required_skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {course.required_skills.slice(0, 3).map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {course.required_skills.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{course.required_skills.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-auto pt-4 border-t border-gray-100">
            <Button
              onClick={() => navigate(`/course/${course.id}`)}
              className="flex-1 bg-black text-white hover:bg-gray-800 rounded-lg"
            >
              View Course
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-10 w-10 rounded-lg border-gray-300"
              onClick={() => saveCourseMutation.mutate(course)}
              aria-label={course.is_saved ? "Unsave course" : "Save course"}
            >
              {course.is_saved ? (
                <BookmarkCheck className="h-5 w-5 fill-black text-black" />
              ) : (
                <Bookmark className="h-5 w-5 text-gray-400 hover:text-black transition-colors" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const shouldShowSavedCourses =
    coursesLoading && sessionFilteredCourses.length > 0;
  const coursesToDisplay = shouldShowSavedCourses
    ? sessionFilteredCourses
    : filteredCourses;
  const coursesCount = shouldShowSavedCourses
    ? sessionFilteredCourses.length
    : filteredCourses.length;

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
              aria-label="Filter courses"
            >
              <Filter className="h-4 w-4" strokeWidth={2} />
              <span className="hidden md:inline text-sm font-medium">
                ფილტრები
              </span>
            </Button>
          </div>
        </div>

        {/* Latest Courses Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-6 w-6 text-breneo-accent" />
            <h2 className="text-2xl font-bold">Latest Courses</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {coursesCount} course
              {coursesCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {coursesLoading && !shouldShowSavedCourses && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-32 md:pb-16">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <Skeleton className="h-48 w-full mb-4" />
                  <Skeleton className="h-6 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!coursesLoading && filteredCourses.length === 0 && (
          <div className="text-center p-10 border border-dashed rounded-lg bg-gray-50 text-muted-foreground">
            <img
              src="/lovable-uploads/no-data-found.png"
              alt="No data found"
              className="mx-auto h-64 w-64 mb-4 object-contain"
            />
            <h4 className="text-lg font-semibold">No Courses Found</h4>
            <p className="text-sm">
              Try adjusting your search terms or filters.
            </p>
          </div>
        )}

        {/* Course Cards Grid */}
        {(shouldShowSavedCourses ||
          (!coursesLoading && coursesToDisplay.length > 0)) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-32 md:pb-16">
            {coursesToDisplay.map((course) => renderCourseCard(course))}
          </div>
        )}
      </div>

      <CourseFilterModal
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
export default CoursesPage;
