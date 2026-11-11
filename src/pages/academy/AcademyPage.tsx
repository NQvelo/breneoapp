import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import OptimizedAvatar from "@/components/ui/OptimizedAvatar";
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Globe,
  GraduationCap,
  Link2,
  Mail,
  Phone,
} from "@/components/icons";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import {
  PLATFORM_CHIP_BADGE_CLASS,
} from "@/lib/chipStyles";
import { slugToAcademyName } from "@/utils/academyUtils";
import {
  coverGradientStyle,
  useSoftImageGradient,
} from "@/utils/imageGradient";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// Social Platform Icons as React Components
const GitHubIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      clipRule="evenodd"
    />
  </svg>
);

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"
      clipRule="evenodd"
    />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10c5.523 0 10-4.477 10-10S17.523 2 12 2zm6.605 4.61a8.502 8.502 0 011.93 5.314c-.281-.054-3.101-.629-5.943-.271-.065-.141-.12-.293-.184-.445a25.416 25.416 0 00-.564-1.236c3.145-1.28 4.577-3.124 4.761-3.362zM12 3.475c2.17 0 4.154.813 5.662 2.148-.152.216-1.443 1.941-4.48 3.08-1.399-2.57-2.042-3.609-3.125-3.609-.92 0-1.816.12-2.675.339 1.433.9 3.113 1.698 5.046 2.19-.745-.469-1.396-1.012-1.911-1.59 1.473-.46 3.876-1.025 6.205-.924.762 1.618.76 3.12.76 3.162 0 .078-.006.158-.018.24a8.28 8.28 0 00-2.77.782c.504-.719 1.324-2.316 1.324-3.202 0-3.17-2.617-5.742-5.847-5.742-3.23 0-5.847 2.571-5.847 5.742 0 1.764 1.062 3.289 2.65 3.99-.107.3-.253.585-.422.856a8.404 8.404 0 01-4.56-3.576C2.454 7.257 6.787 3.475 12 3.475zM8.33 4.922a7.033 7.033 0 012.066-.312c2.099 0 3.771 1.12 3.771 2.882 0 .876-1.503 2.856-4.053 3.867-.498-1.491-.947-2.883-1.167-3.83-.73-.934-1.032-1.757-.617-2.607zm-2.443 4.589c.533-.135 1.145-.268 1.836-.398.231.936.675 2.32 1.197 3.845-2.57.52-4.661 1.201-6.194 1.984a8.545 8.545 0 013.161-5.431zm.87 6.854c1.523-1.123 3.554-1.898 6.023-2.469.406 1.185.729 2.404.966 3.643a8.646 8.646 0 01-6.989-1.174zm2.71 1.822c-.28-.991-.618-1.981-1.01-2.941 2.42-.44 4.71-.155 6.343.351-.106.527-.244 1.043-.411 1.549a8.654 8.654 0 01-4.922 1.041zm3.745 1.569c.254.554.54 1.084.855 1.58-1.492-.28-2.84-.953-3.963-1.896.374-1.228.615-2.494.719-3.789 1.391.175 2.819.379 4.256.522-.138.985-.367 1.938-.867 2.583zm2.612 1.564c.6-.768 1.043-1.64 1.3-2.6 1.453-.122 2.86-.308 4.205-.555a8.52 8.52 0 01-5.505 3.155z"
      clipRule="evenodd"
    />
  </svg>
);

// Helper function to get icon component
type SocialPlatform = "github" | "linkedin" | "facebook" | "instagram";

const getSocialIcon = (platform: SocialPlatform, className?: string) => {
  const iconProps = { className: className || "h-5 w-5" };
  switch (platform) {
    case "github":
      return <GitHubIcon {...iconProps} />;
    case "linkedin":
      return <LinkedInIcon {...iconProps} />;
    case "facebook":
      return <FacebookIcon {...iconProps} />;
    case "instagram":
      return <InstagramIcon {...iconProps} />;
    default:
      return <Link2 className={className || "h-5 w-5"} />;
  }
};

// Platform display names
const platformLabels: Record<SocialPlatform, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
};

function websiteHref(value: string | undefined) {
  if (!value) return "";
  const raw = value.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.includes(".")) return `https://${raw}`;
  return "";
}

function websiteLabel(value: string) {
  const label = value.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
  return label.length > 40 ? `${label.slice(0, 37)}...` : label;
}

interface Course {
  id: string;
  title: string;
  provider: string;
  category: string;
  level: string;
  duration: string;
  enrolled: boolean;
  popular: boolean;
  image: string;
  description: string;
  topics: string[];
  required_skills: string[];
}

function courseMeta(course: Course) {
  return [course.duration, course.level, course.category]
    .filter(Boolean)
    .join(" · ");
}

function courseMatchScore(course: Course, userSkills: string[]): number {
  if (!userSkills.length || course.required_skills.length === 0) return 0;

  const normalizeSkill = (skill: string) =>
    skill.toLowerCase().trim().replace(/\s+/g, " ");
  const normalizedUserSkills = userSkills.map(normalizeSkill);
  const normalizedCourseSkills = course.required_skills.map(normalizeSkill);

  let matchCount = 0;
  normalizedCourseSkills.forEach((courseSkill) => {
    normalizedUserSkills.forEach((userSkill) => {
      if (userSkill === courseSkill) matchCount += 2;
      else if (
        courseSkill.includes(userSkill) ||
        userSkill.includes(courseSkill)
      ) {
        matchCount += 1;
      }
    });
  });

  if (matchCount === 0) return 0;
  return (
    (matchCount / normalizedCourseSkills.length) *
    (matchCount / normalizedUserSkills.length) *
    10
  );
}

const headerButtonClass = "h-9 px-4";

const headerMetaClass =
  "inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200";

const courseCarouselNavButtonClass = cn(
  "h-8 w-8 border-0 backdrop-blur-sm",
  "bg-white/75 hover:bg-white/90 text-gray-700",
  "dark:bg-[#3A3A3A]/75 dark:hover:bg-[#3A3A3A]/90 dark:text-white",
  "[&_svg]:text-current",
);

type ApiCourse = {
  id?: string | number | null;
  title?: string | null;
  academy_id?: string | number | null;
  academy_name?: string | null;
  cover_image_url?: string | null;
  lecturer_photo_url?: string | null;
  description?: string | null;
  level?: string | null;
  language?: string | null;
  location?: string | null;
  total_duration?: string | null;
  required_skills?: unknown;
  is_enrolled?: boolean | null;
};

const normalizeCourseImage = (value: string | null | undefined) => {
  if (!value) return "/lovable-uploads/no_photo.png";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return value;
  return `/${value}`;
};

interface AcademyProfile {
  id: string;
  user_id?: string;
  academy_name?: string;
  description?: string;
  website_url?: string;
  contact_email?: string;
  phone_number?: string;
  is_verified?: boolean;
  logo_url?: string;
  profile_photo_url?: string;
  social_links?: {
    github?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  };
}

// Helper function to check if a string is a UUID
const isUUID = (str: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const AcademyPage = () => {
  const { academySlug } = useParams<{ academySlug: string }>();
  const { user } = useAuth();
  const t = useTranslation();
  const queryClient = useQueryClient();
  const userId = user?.id ? String(user.id) : null;
  const [userTopSkills, setUserTopSkills] = useState<string[]>([]);
  const coursesScrollRef = useRef<HTMLDivElement>(null);

  // Determine if the parameter is an academy_id (UUID or number) or a slug
  const isNumericId = academySlug ? /^\d+$/.test(academySlug) : false;
  const isAcademyId = academySlug ? isUUID(academySlug) || isNumericId : false;
  const academyId = isAcademyId ? academySlug : null;
  const slug = !isAcademyId ? academySlug : null;

  // Helper function to normalize API response to AcademyProfile
  const normalizeAcademyProfile = (data: Record<string, unknown>): AcademyProfile => {
    if (!data) return { id: "" };

    // Handle different possible field names from API
    const getStringField = (fields: string[]) => {
      for (const field of fields) {
        const value = data[field];
        if (value !== null && value !== undefined) {
          if (typeof value === "string" && value.trim()) {
            return value;
          }
          if (typeof value === "number") {
            return String(value);
          }
        }
      }
      return undefined;
    };

    // Handle ID - can be number or string
    const getId = () => {
      if (data.id !== null && data.id !== undefined) {
        return String(data.id);
      }
      if (data.academy_id !== null && data.academy_id !== undefined) {
        return String(data.academy_id);
      }
      return "";
    };

    return {
      id: getId(),
      user_id:
        typeof data.user_id === "string" ? data.user_id : undefined,
      academy_name:
        getStringField([
          "academy_name",
          "name",
          "academyName",
          "first_name",
          "firstName",
        ]) || undefined,
      description: getStringField(["description", "desc"]) || undefined,
      website_url:
        getStringField(["website_url", "website", "websiteUrl", "url"]) ||
        undefined,
      contact_email:
        getStringField([
          "contact_email",
          "email",
          "contactEmail",
          "contact_mail",
        ]) || undefined,
      phone_number:
        getStringField(["phone_number", "phone", "phoneNumber"]) || undefined,
      is_verified: Boolean(
        (data as Record<string, unknown>).is_verified ??
          (data as Record<string, unknown>).isVerified ??
          (data as Record<string, unknown>).verified,
      ),
      logo_url:
        getStringField([
          "logo_url",
          "logoUrl",
          "logo",
          "profile_image_url",
          "profileImageUrl",
          "profile_photo_url",
          "profilePhotoUrl",
          "image",
        ]) || undefined,
      profile_photo_url:
        getStringField([
          "profile_image_url",
          "profileImageUrl",
          "profile_photo_url",
          "profilePhotoUrl",
          "profile_photo",
          "profilePhoto",
          "image",
          "logo_url",
          "logoUrl",
          "logo",
        ]) || undefined,
      social_links: data.social_links || undefined,
    };
  };

  const {
    data: academyProfile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ["academy-profile", academyId || slug],
    queryFn: async () => {
      if (!academySlug) return null;

      let apiData: Record<string, unknown> | null = null;
      let targetAcademyId: string | null = null;

      try {
        let response;
        if (isAcademyId && academyId) {
          // Use academy_id endpoint: /api/academy/<int:academy_id>/
          targetAcademyId = academyId;
          response = await apiClient.get(`/api/academy/${academyId}/`);
          console.log("✅ Academy profile fetched by ID:", {
            academyId: academyId,
            rawData: response.data,
            hasProfileData: !!response.data?.profile_data,
          });

          // Check if response has profile_data field
          if (response.data?.profile_data) {
            apiData = response.data.profile_data;
            console.log("📦 Using profile_data from response:", apiData);
          } else {
            apiData = response.data;
          }
        } else if (slug) {
          // Try the endpoint with singular "academy" using slug
          response = await apiClient.get(`/api/academy/${slug}/`);
          console.log("✅ Academy profile fetched by slug:", {
            academySlug: slug,
            rawData: response.data,
            hasProfileData: !!response.data?.profile_data,
          });

          // Check if response has profile_data field
          if (response.data?.profile_data) {
            apiData = response.data.profile_data;
            console.log("📦 Using profile_data from response:", apiData);
          } else {
            apiData = response.data;
          }

          // Extract ID from API response if available (can be number)
          if (apiData?.id !== null && apiData?.id !== undefined) {
            targetAcademyId = String(apiData.id);
          } else if (apiData?.academy_id) {
            targetAcademyId = String(apiData.academy_id);
          }
        } else {
          return null;
        }
      } catch (err: unknown) {
        // If singular fails and it's a slug, try plural "academies"
        if (slug) {
          try {
            const response = await apiClient.get(`/api/academies/${slug}/`);
            console.log("✅ Academy profile fetched (plural endpoint):", {
              academySlug: slug,
              rawData: response.data,
              hasProfileData: !!response.data?.profile_data,
            });

            // Check if response has profile_data field
            if (response.data?.profile_data) {
              apiData = response.data.profile_data;
            } else {
              apiData = response.data;
            }

            if (apiData?.id !== null && apiData?.id !== undefined) {
              targetAcademyId = String(apiData.id);
            } else if (apiData?.academy_id) {
              targetAcademyId = String(apiData.academy_id);
            }
          } catch (error: unknown) {
            console.error("❌ Error fetching academy profile:", {
              singularError: err,
              pluralError: error,
              academySlug: slug,
              endpointsTried: [
                `/api/academy/${slug}/`,
                `/api/academies/${slug}/`,
              ],
            });
            // Continue to try Supabase as fallback
          }
        } else {
          console.error("❌ Error fetching academy profile by ID:", {
            error: err,
            academyId: academyId,
            endpoint: `/api/academy/${academyId}/`,
          });
          // Continue to try Supabase as fallback
        }
      }

      // Normalize API data
      const normalizedApi = apiData ? normalizeAcademyProfile(apiData) : null;

      // Fetch from Supabase as fallback or to supplement missing data
      let supabaseData: Partial<AcademyProfile> | null = null;
      if (targetAcademyId || normalizedApi?.id) {
        const fetchId = targetAcademyId || normalizedApi?.id;
        try {
          const { data, error } = await supabase
            .from("academy_profiles")
            .select(
              "id, academy_name, description, website_url, contact_email, logo_url, is_verified, user_id",
            )
            .eq("id", fetchId)
            .single();

          if (error) {
            console.warn(
              "⚠️ Error fetching academy profile from Supabase:",
              error,
            );
          } else if (data) {
            supabaseData = data as unknown as Partial<AcademyProfile>;
            console.log(
              "✅ Academy profile fetched from Supabase:",
              supabaseData,
            );
          }
        } catch (supabaseError) {
          console.warn("⚠️ Error fetching from Supabase:", supabaseError);
        }
      }

      // Check if we have any data at all
      if (!normalizedApi && !supabaseData) {
        // If we have an error from API and no Supabase data, throw an error
        if (apiData === null && !targetAcademyId) {
          throw new Error("Academy not found");
        }
      }

      // Merge data: prioritize API data, but use Supabase as fallback
      const merged: AcademyProfile = {
        id: String(normalizedApi?.id || supabaseData?.id || targetAcademyId || ""),
        user_id:
          normalizedApi?.user_id ||
          (typeof supabaseData?.user_id === "string"
            ? supabaseData.user_id
            : undefined),
        academy_name:
          normalizedApi?.academy_name ||
          (typeof supabaseData?.academy_name === "string"
            ? supabaseData.academy_name
            : undefined) ||
          undefined,
        description:
          normalizedApi?.description ||
          (typeof supabaseData?.description === "string"
            ? supabaseData.description
            : undefined) ||
          undefined,
        website_url:
          normalizedApi?.website_url ||
          (typeof supabaseData?.website_url === "string"
            ? supabaseData.website_url
            : undefined) ||
          undefined,
        contact_email:
          normalizedApi?.contact_email ||
          (typeof supabaseData?.contact_email === "string"
            ? supabaseData.contact_email
            : undefined) ||
          undefined,
        phone_number: normalizedApi?.phone_number || undefined,
        is_verified:
          normalizedApi?.is_verified ?? Boolean(supabaseData?.is_verified),
        logo_url:
          normalizedApi?.logo_url ||
          normalizedApi?.profile_photo_url ||
          (typeof supabaseData?.logo_url === "string" ? supabaseData.logo_url : undefined) ||
          undefined,
        profile_photo_url:
          normalizedApi?.profile_photo_url ||
          normalizedApi?.logo_url ||
          (typeof supabaseData?.logo_url === "string" ? supabaseData.logo_url : undefined) ||
          undefined,
        social_links: normalizedApi?.social_links || undefined,
      };

      // If we don't have a name or ID, it means academy was not found
      if (!merged.academy_name && !merged.id) {
        throw new Error("Academy not found");
      }

      console.log("📋 Merged academy profile:", merged);
      return merged;
    },
    enabled: !!academySlug,
    retry: 1, // Only retry once
  });

  const {
    data: courses,
    isLoading: coursesLoading,
    error: coursesError,
  } = useQuery({
    queryKey: ["academy-courses", academyProfile?.id, academyId || slug],
    queryFn: async () => {
      const academyName = academyProfile?.academy_name;
      const response = await fetch(
        "https://web-production-80ed8.up.railway.app/api/courses/",
      );
      if (!response.ok) return [];
      const data: unknown = await response.json();
      const allCourses: ApiCourse[] = Array.isArray(data)
        ? (data as ApiCourse[])
        : [];

      const filtered = academyName
        ? allCourses.filter(
            (c) =>
              String(c?.academy_name ?? "").toLowerCase() ===
              academyName.toLowerCase(),
          )
        : academyId
          ? allCourses.filter((c) => String(c?.academy_id) === String(academyId))
          : [];

      return filtered.map((c) => ({
        id: String(c?.id ?? ""),
        title: String(c?.title ?? ""),
        provider: String(c?.academy_name ?? ""),
        category: String(c?.language ?? c?.location ?? ""),
        level: String(c?.level ?? ""),
        duration: String(c?.total_duration ?? ""),
        enrolled: Boolean(c?.is_enrolled),
        popular: false,
        image: normalizeCourseImage(c?.cover_image_url || c?.lecturer_photo_url),
        description: String(c?.description ?? ""),
        topics: [],
        required_skills: Array.isArray(c?.required_skills)
          ? (c.required_skills as unknown[]).map((s) => String(s))
          : [],
        academy_id: c?.academy_id != null ? String(c.academy_id) : null,
      })) as Course[];
    },
    enabled: !!(academyProfile?.id || academyId),
    retry: 1,
  });

  useEffect(() => {
    if (!user?.id) {
      setUserTopSkills([]);
      return;
    }
    let cancelled = false;
    const loadSkills = async () => {
      try {
        const response = await apiClient.get(
          `/api/skilltest/results/?user=${user.id}`,
        );
        const skillTestData = Array.isArray(response.data)
          ? response.data[0]
          : response.data;
        const skillsJson = skillTestData?.skills_json || {};
        const allSkills = [
          ...Object.keys(skillsJson.tech || {}),
          ...Object.keys(skillsJson.soft || {}),
        ];
        if (!cancelled) setUserTopSkills(allSkills);
      } catch {
        if (!cancelled) setUserTopSkills([]);
      }
    };
    loadSkills();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const { data: savedCourses = [] } = useQuery({
    queryKey: ["savedCourses", userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const profileResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
        const savedCoursesArray = profileResponse.data?.saved_courses || [];
        return savedCoursesArray.map((id: string | number) => String(id));
      } catch {
        return [];
      }
    },
    enabled: !!userId,
  });

  const saveCourseMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error("Please log in to save courses.");
      await apiClient.post(`/api/save-course/${id}/`);
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["savedCourses", userId] });
      const previousSavedCourses = queryClient.getQueryData<string[]>([
        "savedCourses",
        userId,
      ]);
      let wasSaved = false;
      queryClient.setQueryData<string[]>(["savedCourses", userId], (prev) => {
        if (!prev) return prev;
        wasSaved = prev.includes(id);
        return wasSaved
          ? prev.filter((courseId) => courseId !== id)
          : [...prev, id];
      });
      return { previousSavedCourses, wasSaved };
    },
    onError: (_error, _id, context) => {
      if (context?.previousSavedCourses && userId) {
        queryClient.setQueryData(
          ["savedCourses", userId],
          context.previousSavedCourses,
        );
      }
      toast.error("Failed to update saved courses. Please try again.");
    },
    onSuccess: (_data, _id, context) => {
      queryClient.invalidateQueries({ queryKey: ["savedCourses", userId] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success(
        context?.wasSaved
          ? "Removed from saved courses."
          : "Course saved to your profile.",
      );
    },
  });

  const academyDisplayName =
    academyProfile?.academy_name ||
    (slug ? slugToAcademyName(slug) : "Loading Academy...");
  const logo = academyProfile?.profile_photo_url || academyProfile?.logo_url;
  const coverGradient = useSoftImageGradient(
    logo,
    academyProfile?.id || academySlug || "academy",
  );
  const siteUrl = websiteHref(academyProfile?.website_url);
  const courseCount = courses?.length ?? 0;
  const { matchedCourses, otherCourses } = useMemo(() => {
    const scored = (courses ?? []).map((course) => ({
      course,
      match: courseMatchScore(course, userTopSkills),
    }));
    scored.sort((a, b) => b.match - a.match);
    return {
      matchedCourses: scored
        .filter((item) => item.match > 0)
        .map((item) => item.course),
      otherCourses: scored
        .filter((item) => item.match <= 0)
        .map((item) => item.course),
    };
  }, [courses, userTopSkills]);

  const scrollMatchedCourses = (direction: "left" | "right") => {
    if (!coursesScrollRef.current) return;
    const scrollAmount = 400;
    coursesScrollRef.current.scrollTo({
      left:
        direction === "left"
          ? coursesScrollRef.current.scrollLeft - scrollAmount
          : coursesScrollRef.current.scrollLeft + scrollAmount,
      behavior: "smooth",
    });
  };
  const socialEntries = academyProfile?.social_links
    ? (
        Object.entries(academyProfile.social_links) as [
          SocialPlatform,
          string | undefined,
        ][]
      ).filter((entry): entry is [SocialPlatform, string] =>
        Boolean(entry[1] && entry[1].trim()),
      )
    : [];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto pt-2 pb-40 md:pb-6 px-2 sm:px-6 lg:px-8 space-y-4 md:space-y-6">
        {!academySlug ? (
          <Card className="border-0 rounded-3xl">
            <CardContent className="p-8 text-center text-muted-foreground">
              Academy not found.
            </CardContent>
          </Card>
        ) : profileLoading ? (
          <>
            <Card className="overflow-hidden border-0 rounded-3xl">
              <CardContent className="px-6 py-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <Skeleton className="h-16 w-16 rounded-sm" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-28 rounded-full" />
                  <Skeleton className="h-8 w-36 rounded-full" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 rounded-3xl">
              <CardContent className="space-y-2 px-6 py-6">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          </>
        ) : profileError || !academyProfile ? (
          <Card className="border-0 rounded-3xl">
            <CardContent className="p-10 text-center">
              <GraduationCap className="mx-auto mb-3 h-10 w-10 text-gray-400" />
              <h1 className="text-xl font-semibold text-foreground">
                Academy not found
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {profileError instanceof Error &&
                profileError.message &&
                profileError.message !== "Academy not found" &&
                !profileError.message.includes("not found") &&
                !profileError.message.includes("404")
                  ? profileError.message
                  : "The academy you're looking for doesn't exist or has been removed."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="overflow-hidden border-0 rounded-3xl">
              <div className="relative">
                <div className="relative h-28 sm:h-36">
                  <div
                    className="absolute inset-0 dark:hidden"
                    style={{
                      background: coverGradientStyle(coverGradient, "light"),
                    }}
                  />
                  <div
                    className="absolute inset-0 hidden dark:block"
                    style={{
                      background: coverGradientStyle(coverGradient, "dark"),
                    }}
                  />
                </div>
                <div className="relative -mt-14 flex flex-col gap-4 border-b border-gray-100 px-5 pb-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="flex min-w-0 items-center gap-4">
                    <OptimizedAvatar
                      src={logo}
                      alt={academyDisplayName}
                      fallback={
                        academyDisplayName.charAt(0).toUpperCase() || "A"
                      }
                      size="lg"
                      className="!h-16 !w-16 !rounded-sm bg-white shadow-sm"
                    />
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <h1 className="truncate text-xl font-bold text-gray-900">
                          {academyDisplayName}
                        </h1>
                        {academyProfile.is_verified ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className="inline-flex h-5 w-5 shrink-0 cursor-help items-center justify-center rounded-full bg-[linear-gradient(135deg,#5D78FF_0%,#2EB9D1_100%)] text-white shadow-sm"
                                aria-label="This badge is for verified academies"
                              >
                                <Check
                                  className="h-2.5 w-2.5"
                                  strokeWidth={3.5}
                                  aria-hidden
                                />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              This badge is for verified academies
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {academyProfile.phone_number ? (
                          <a
                            href={`tel:${academyProfile.phone_number}`}
                            className={headerMetaClass}
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {academyProfile.phone_number}
                          </a>
                        ) : null}
                        {academyProfile.contact_email ? (
                          <a
                            href={`mailto:${academyProfile.contact_email}`}
                            className={headerMetaClass}
                          >
                            <Mail className="h-3.5 w-3.5" />
                            {academyProfile.contact_email}
                          </a>
                        ) : null}
                        {siteUrl ? (
                          <a
                            href={siteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(headerMetaClass, "hover:underline")}
                          >
                            <Globe className="h-3.5 w-3.5" />
                            {websiteLabel(siteUrl)}
                          </a>
                        ) : null}
                        {socialEntries.map(([platform, url]) => (
                          <a
                            key={platform}
                            href={websiteHref(url) || url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(headerMetaClass, "hover:underline")}
                          >
                            {getSocialIcon(platform, "h-3.5 w-3.5")}
                            {platformLabels[platform]}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                  {siteUrl ? (
                    <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                      <Button asChild size="sm" className={headerButtonClass}>
                        <a
                          href={siteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Visit website
                        </a>
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>

            <Card className="border-0 rounded-3xl">
              <CardHeader className="mb-0 border-b-0 p-4 pb-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  About
                </h3>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0">
                {academyProfile.description?.trim() ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900 dark:text-gray-100">
                    {academyProfile.description}
                  </p>
                ) : (
                  <p className="text-sm italic text-gray-500">
                    No information available.
                  </p>
                )}
              </CardContent>
            </Card>

            <div id="academy-courses" />
            {matchedCourses.length > 0 ? (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Top courses picked for you
                  </h2>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      className={courseCarouselNavButtonClass}
                      onClick={() => scrollMatchedCourses("left")}
                      aria-label="Scroll courses left"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className={courseCarouselNavButtonClass}
                      onClick={() => scrollMatchedCourses("right")}
                      aria-label="Scroll courses right"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div
                  ref={coursesScrollRef}
                  className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-2 px-2"
                >
                  {matchedCourses.map((course) => {
                    const isSaved = savedCourses.includes(String(course.id));
                    return (
                      <Link
                        key={course.id}
                        to={`/course/${course.id}`}
                        className="block w-[calc((100%-2rem)/3)] min-w-[280px] flex-shrink-0 snap-start"
                      >
                        <Card className="group relative flex w-full cursor-pointer flex-col rounded-3xl transition-all duration-200 hover:shadow-soft">
                          <CardContent className="relative flex flex-grow flex-col overflow-hidden rounded-3xl p-0">
                            <div className="relative isolate h-40 w-full overflow-hidden rounded-t-3xl">
                              <img
                                src={course.image}
                                alt={course.title}
                                className="h-full w-full origin-center object-cover transition-transform duration-200 group-hover:scale-105"
                                onError={(event) => {
                                  (event.target as HTMLImageElement).src =
                                    "/lovable-uploads/no_photo.png";
                                }}
                              />
                            </div>
                            <div className="flex min-h-[140px] flex-grow flex-col p-4">
                              <h3 className="mb-2 line-clamp-2 text-base font-semibold transition-colors group-hover:text-breneo-blue">
                                {course.title}
                              </h3>
                              <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  {course.duration ? (
                                    <Badge className={PLATFORM_CHIP_BADGE_CLASS}>
                                      {course.duration}
                                    </Badge>
                                  ) : null}
                                </div>
                                {userId ? (
                                  <Button
                                    variant="secondary"
                                    size="icon"
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      saveCourseMutation.mutate(
                                        String(course.id),
                                      );
                                    }}
                                    disabled={saveCourseMutation.isPending}
                                    aria-label={
                                      isSaved ? "Unsave course" : "Save course"
                                    }
                                    className={cn(
                                      "h-10 w-10 flex-shrink-0 bg-[#E6E7EB] hover:bg-[#E6E7EB]/90 dark:bg-[#3A3A3A] dark:hover:bg-[#4A4A4A]",
                                      isSaved
                                        ? "text-breneo-blue bg-breneo-blue/10 hover:bg-breneo-blue/15 dark:bg-breneo-blue/20 dark:hover:bg-breneo-blue/30"
                                        : "text-black dark:text-white",
                                    )}
                                  >
                                    <Bookmark
                                      className={cn(
                                        "h-4 w-4 transition-colors",
                                        isSaved
                                          ? "text-breneo-blue fill-breneo-blue animate-heart-pop"
                                          : "text-black dark:text-white",
                                      )}
                                    />
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {coursesLoading ||
            coursesError ||
            otherCourses.length > 0 ||
            matchedCourses.length === 0 ? (
            <Card className="overflow-hidden border-0 rounded-3xl">
              <CardHeader className="border-b-0 p-4 pb-3">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {t.nav.courses}
                </h3>
              </CardHeader>
              <CardContent className="px-0 pb-2">
                {coursesLoading ? (
                  <div className="space-y-3 px-6 pb-4">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-5 w-1/2" />
                  </div>
                ) : coursesError ? (
                  <p className="px-6 pb-4 text-sm text-muted-foreground">
                    Could not load courses for {academyDisplayName}.
                  </p>
                ) : courseCount === 0 ? (
                  <div className="px-6 pb-6 text-center text-muted-foreground">
                    <GraduationCap className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                    <p className="font-medium text-foreground">
                      {t.courses.noOurCourses}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {otherCourses.map((course) => {
                      const meta = courseMeta(course);
                      const isSaved = savedCourses.includes(String(course.id));
                      return (
                        <Link
                          key={course.id}
                          to={`/course/${course.id}`}
                          className="block"
                        >
                          <div className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/30 md:px-6">
                            <div className="min-w-0 flex-1">
                              <h3 className="line-clamp-2 text-base font-semibold transition-colors group-hover:text-breneo-blue">
                                {course.title}
                              </h3>
                              {meta ? (
                                <p className="mt-1 truncate text-sm text-gray-500">
                                  {meta}
                                </p>
                              ) : null}
                            </div>
                            {userId ? (
                              <div onClick={(event) => event.preventDefault()}>
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    saveCourseMutation.mutate(String(course.id));
                                  }}
                                  disabled={saveCourseMutation.isPending}
                                  aria-label={
                                    isSaved ? "Unsave course" : "Save course"
                                  }
                                  className={cn(
                                    "h-10 w-10 flex-shrink-0 bg-[#E6E7EB] hover:bg-[#E6E7EB]/90 dark:bg-[#3A3A3A] dark:hover:bg-[#4A4A4A]",
                                    isSaved
                                      ? "text-breneo-blue bg-breneo-blue/10 hover:bg-breneo-blue/15 dark:bg-breneo-blue/20 dark:hover:bg-breneo-blue/30"
                                      : "text-black dark:text-white",
                                  )}
                                >
                                  <Bookmark
                                    className={cn(
                                      "h-4 w-4 transition-colors",
                                      isSaved
                                        ? "text-breneo-blue fill-breneo-blue animate-heart-pop"
                                        : "text-black dark:text-white",
                                    )}
                                  />
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            ) : null}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AcademyPage;
