import React, { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import OptimizedAvatar from "@/components/ui/OptimizedAvatar";
import { createAcademySlug } from "@/utils/academyUtils";
import axios from "axios";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Heart,
  Loader2,
  Clock,
  Diamond,
  Languages,
  Award,
  Calendar,
  Eye,
  DollarSign,
  RotateCcw,
  Video,
  Users,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/LanguageContext";

interface AcademyProfile {
  id: string;
  academy_name: string;
  slug?: string;
  logo_url?: string | null;
  profile_photo_url?: string | null;
  description?: string | null;
}

type EnrolledUserRef = {
  id: number | string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

type ApiCourse = {
  id?: string | number | null;
  title?: string | null;
  academy_id?: string | number | null;
  academy_name?: string | null;
  cover_image_url?: string | null;
  lecturer_photo_url?: string | null;
  lecturer_name?: string | null;
  description?: string | null;
  level?: string | null;
  language?: string | null;
  location?: string | null;
  total_duration?: string | null;
  lessons_count?: number | null;
  price?: string | number | null;
  registration_link?: string | null;
  required_skills?: unknown;
  is_enrolled?: boolean | null;
  enrolled_users?: unknown;
};

type CourseUi = {
  id: string;
  title: string;
  provider: string;
  category: string;
  level: string;
  duration: string;
  image: string;
  description: string;
  lecturer_name: string;
  lecturer_photo_url: string | null;
  topics: string[];
  required_skills: string[];
  academy_id: string | null;
  lessons_count: number;
  price: string;
  registration_link: string | null;
  is_enrolled: boolean;
  enrolled_users: EnrolledUserRef[];
};

const normalizeCourseImage = (value: string | null | undefined) => {
  if (!value) return "/lovable-uploads/no_photo.png";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return value;
  return `/${value}`;
};

const parseEnrolledUsersFromApi = (raw: unknown): EnrolledUserRef[] => {
  if (!Array.isArray(raw)) return [];
  const out: EnrolledUserRef[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = o.id;
    if (id === null || id === undefined) continue;
    out.push({
      id: typeof id === "number" || typeof id === "string" ? id : String(id),
      email: o.email != null ? String(o.email) : null,
      first_name: o.first_name != null ? String(o.first_name) : null,
      last_name: o.last_name != null ? String(o.last_name) : null,
    });
  }
  return out;
};

const normalizeApiCourseToUi = (api: ApiCourse): CourseUi => {
  const requiredSkills = Array.isArray(api.required_skills)
    ? api.required_skills.map((s) => String(s))
    : [];

  const imageCandidate = api.cover_image_url || api.lecturer_photo_url || "";
  const enrolledUsers = parseEnrolledUsersFromApi(api.enrolled_users);

  return {
    id: api.id != null ? String(api.id) : "",
    title: String(api.title ?? ""),
    provider: String(api.academy_name ?? ""),
    category: String(api.language ?? api.location ?? ""),
    level: String(api.level ?? ""),
    duration: String(api.total_duration ?? ""),
    image: normalizeCourseImage(imageCandidate),
    description: String(api.description ?? ""),
    lecturer_name: String(api.lecturer_name ?? ""),
    lecturer_photo_url:
      api.lecturer_photo_url != null ? String(api.lecturer_photo_url) : null,
    topics: [],
    required_skills: requiredSkills,
    academy_id: api.academy_id != null ? String(api.academy_id) : null,
    lessons_count:
      typeof api.lessons_count === "number" ? api.lessons_count : 0,
    price: api.price != null ? String(api.price) : "0.00",
    registration_link:
      api.registration_link != null ? String(api.registration_link) : null,
    is_enrolled: Boolean(api.is_enrolled),
    enrolled_users: enrolledUsers,
  };
};

const CoursePage = () => {
  const { courseId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const t = useTranslation();

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      try {
        const response = await fetch(
          "https://web-production-80ed8.up.railway.app/api/courses/",
        );
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        const data: unknown = await response.json();
        const allCourses: ApiCourse[] = Array.isArray(data)
          ? (data as ApiCourse[])
          : [];
        const match = allCourses.find(
          (c) => String(c?.id) === String(courseId),
        );
        return match ? normalizeApiCourseToUi(match) : null;
      } catch (error) {
        console.error("Error fetching course details:", error);
        return null;
      }
    },
    enabled: !!courseId,
  });

  // Fetch saved courses
  const { data: savedCourses = [] } = useQuery({
    queryKey: ["savedCourses", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      try {
        // Fetch from profile API
        const profileResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
        const savedCoursesArray = profileResponse.data?.saved_courses || [];
        return savedCoursesArray.map((id: string | number) => String(id));
      } catch (error) {
        console.error("Error fetching saved courses:", error);
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Check if course is saved
  const isSaved = savedCourses?.includes(String(course?.id || ""));

  // Fetch academy profile if academy_id exists
  const { data: academyProfile } = useQuery({
    queryKey: ["academy-profile", course?.academy_id],
    queryFn: async () => {
      if (!course?.academy_id) return null;

      try {
        // Try to fetch from API first - use the detail endpoint
        const response = await apiClient.get(
          `/api/academy/${course.academy_id}/`,
        );

        if (response.data) {
          // Check if response has profile_data wrapper
          const apiData = response.data.profile_data || response.data;
          const data = apiData as Record<string, unknown>;

          const getStringField = (fields: string[]) => {
            for (const field of fields) {
              const value = data[field];
              if (
                value !== null &&
                value !== undefined &&
                typeof value === "string"
              ) {
                return value;
              }
            }
            return undefined;
          };

          const academyName =
            getStringField([
              "academy_name",
              "name",
              "first_name",
              "firstName",
            ]) ||
            course.provider ||
            "";

          const profilePhotoUrl = getStringField([
            "profile_photo_url",
            "profilePhotoUrl",
            "profile_image_url",
            "profileImageUrl",
            "profile_photo",
            "profilePhoto",
          ]);

          const logoUrl = getStringField([
            "logo_url",
            "logoUrl",
            "logo",
            "image",
          ]);

          const description = getStringField(["description", "desc", "about"]);

          const profile = {
            id: course.academy_id,
            academy_name: academyName,
            slug:
              getStringField(["slug"]) ||
              (academyName ? createAcademySlug(academyName) : undefined),
            profile_photo_url:
              profilePhotoUrl && profilePhotoUrl.trim() !== ""
                ? profilePhotoUrl
                : null,
            logo_url: logoUrl && logoUrl.trim() !== "" ? logoUrl : null,
            description:
              description && description.trim() !== "" ? description : null,
          } as AcademyProfile;

          console.log("🔍 Academy profile fetched from API:", {
            academyId: course.academy_id,
            rawData: data,
            profileData: profile,
            logoUrl: logoUrl,
          });

          return profile;
        }
      } catch (error) {
        console.debug(
          "Could not fetch academy profile from API, trying Supabase",
          error,
        );
      }

      // Fallback to Supabase
      try {
        const { data: supabaseData, error: supabaseError } = await supabase
          .from("academy_profiles")
          .select("id, academy_name, logo_url, description")
          .eq("id", course.academy_id)
          .single();

        if (!supabaseError && supabaseData) {
          const profile = {
            id: supabaseData.id,
            academy_name: supabaseData.academy_name || course.provider || "",
            slug: supabaseData.academy_name
              ? createAcademySlug(supabaseData.academy_name)
              : undefined,
            profile_photo_url: null, // Supabase doesn't have this field separately
            logo_url:
              supabaseData.logo_url && supabaseData.logo_url.trim() !== ""
                ? supabaseData.logo_url
                : null,
            description:
              supabaseData.description && supabaseData.description.trim() !== ""
                ? supabaseData.description
                : null,
          } as AcademyProfile;

          console.log("🔍 Academy profile fetched from Supabase:", {
            academyId: course.academy_id,
            supabaseData: supabaseData,
            profile: profile,
          });

          return profile;
        }
      } catch (error) {
        console.debug("Could not fetch academy profile from Supabase", error);
      }

      // Last resort: use provider name to create slug
      return {
        id: course.academy_id,
        academy_name: course.provider || "",
        slug: course.provider ? createAcademySlug(course.provider) : undefined,
        profile_photo_url: null,
        logo_url: null,
        description: null,
      } as AcademyProfile;
    },
    enabled: !!course?.academy_id,
  });

  // Save course mutation
  const saveCourseMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) {
        throw new Error("User not logged in");
      }

      setIsSaving(true);

      try {
        // Use the correct API endpoint with /api prefix and trailing slash
        await apiClient.post(`/api/save-course/${id}/`);
      } catch (error: unknown) {
        console.error("Error saving course:", error);

        // Extract more detailed error message
        let errorMessage = "Failed to save course. Please try again.";
        if (
          error &&
          typeof error === "object" &&
          "response" in error &&
          error.response &&
          typeof error.response === "object" &&
          "data" in error.response
        ) {
          const errorData = error.response.data as Record<string, unknown>;
          errorMessage =
            (errorData.detail as string) ||
            (errorData.message as string) ||
            (errorData.error as string) ||
            errorMessage;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        throw new Error(errorMessage);
      } finally {
        setIsSaving(false);
      }
    },
    onMutate: async (id: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["savedCourses", user?.id] });

      // Snapshot the previous value
      const previousSavedCourses = queryClient.getQueryData<string[]>([
        "savedCourses",
        user?.id,
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData<string[]>(["savedCourses", user?.id], (prev) => {
        if (!prev) return prev;
        const idString = String(id);
        return prev.includes(idString)
          ? prev.filter((c) => c !== idString)
          : [...prev, idString];
      });

      // Return a context object with the snapshotted value
      return { previousSavedCourses };
    },
    onError: (error: unknown, id: string, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousSavedCourses) {
        queryClient.setQueryData(
          ["savedCourses", user?.id],
          context.previousSavedCourses,
        );
      }

      // Extract more detailed error message
      let errorMessage = "Failed to save course. Please try again.";
      if (
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response
      ) {
        const errorData = error.response.data as Record<string, unknown>;
        errorMessage =
          (errorData.detail as string) ||
          (errorData.message as string) ||
          (errorData.error as string) ||
          errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    },
    onSuccess: (_, id, context) => {
      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["savedCourses", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });

      // Check if it was previously saved to determine the action
      const idString = String(id);
      const wasPreviouslySaved =
        context?.previousSavedCourses?.includes(idString) || false;
      toast.success(
        `"${course?.title}" has been ${
          wasPreviouslySaved ? "unsaved" : "saved"
        } successfully.`,
      );
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async (courseData: CourseUi): Promise<"noop" | void> => {
      if (!user?.id) {
        throw new Error(t.courses.enrollLoginRequired);
      }
      if (!courseData?.id) {
        throw new Error(t.courses.enrollFailed);
      }
      const uid = user.id;
      if (
        courseData.is_enrolled ||
        courseData.enrolled_users.some((e) => String(e.id) === String(uid))
      ) {
        return "noop";
      }

      const idForPayload =
        typeof uid === "number"
          ? uid
          : Number.isFinite(Number(uid))
            ? Number(uid)
            : uid;

      const patchEnrolledUsers = () =>
        apiClient.patch(`${API_ENDPOINTS.COURSES}${courseData.id}/`, {
          enrolled_users: [
            ...courseData.enrolled_users,
            {
              id: idForPayload,
              email: user.email,
              first_name: user.first_name ?? "",
              last_name: user.last_name ?? "",
            },
          ],
        });

      try {
        await apiClient.post(
          `${API_ENDPOINTS.COURSES}${courseData.id}/enroll/`,
          {},
        );
      } catch (err: unknown) {
        const status = axios.isAxiosError(err)
          ? err.response?.status
          : undefined;
        if (status === 404 || status === 405) {
          await patchEnrolledUsers();
        } else {
          throw err;
        }
      }
    },
    onSuccess: (result) => {
      if (result === "noop") return;
      queryClient.invalidateQueries({ queryKey: ["course", courseId] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["home-courses"] });
      queryClient.invalidateQueries({ queryKey: ["academy-courses"] });
      toast.success(t.courses.enrollSuccess);
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.data) {
        const data = error.response.data as Record<string, unknown>;
        const detail = data.detail;
        if (typeof detail === "string") {
          toast.error(detail);
          return;
        }
      }
      const message =
        error instanceof Error ? error.message : t.courses.enrollFailed;
      toast.error(message);
    },
  });

  const handleSaveCourse = () => {
    if (!user || !course) {
      toast.error("Please log in to save courses.");
      return;
    }
    const courseId = String(course.id);
    saveCourseMutation.mutate(courseId);
  };

  const isUserEnrolled = useMemo(() => {
    if (!course) return false;
    if (!user) return Boolean(course.is_enrolled);
    return (
      Boolean(course.is_enrolled) ||
      course.enrolled_users.some((e) => String(e.id) === String(user.id))
    );
  }, [course, user]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-8">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout>
        <div className="p-8">Course not found.</div>
      </DashboardLayout>
    );
  }

  // Determine academy URL for navigation
  const getAcademyUrl = () => {
    if (course.academy_id) {
      // Prefer academy_id if available (most reliable)
      return `/academy/${course.academy_id}`;
    }
    // Fallback to slug created from provider name
    const slug = academyProfile?.slug || createAcademySlug(course.provider);
    return `/academy/${slug}`;
  };

  const academyUrl = getAcademyUrl();
  const academyName = academyProfile?.academy_name || course.provider;
  const lecturerName = course.lecturer_name || "Lecturer";
  const lecturerPhotoUrl = course.lecturer_photo_url || null;

  // Get the image URL (prefer profile_photo_url, fallback to logo_url)
  const academyImageUrl =
    academyProfile?.profile_photo_url || academyProfile?.logo_url || null;

  // Debug logging
  console.log("🔍 CoursePage Debug:", {
    courseId: courseId,
    courseAcademyId: course?.academy_id,
    academyProfile: academyProfile,
    profilePhotoUrl: academyProfile?.profile_photo_url,
    logoUrl: academyProfile?.logo_url,
    academyImageUrl: academyImageUrl,
    academyName: academyName,
  });

  // Extract duration in hours if possible, otherwise use duration as-is
  const getDurationText = () => {
    if (course.duration.toLowerCase().includes("hour")) {
      return course.duration;
    }
    // Try to estimate hours (e.g., "4 weeks" -> "3 Hours Estimation")
    return "3 Hours Estimation";
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto pt-0 sm:pt-4 pb-40 sm:pb-44 mb-16 sm:mb-20 sm:px-4 md:px-6">
        {/* Main Content Wrapper */}
        <div className="pb-20 p-1">
          {/* 1. Cover Image - Outside the main div */}
          <div className="w-full h-48 sm:h-80 overflow-hidden rounded-3xl mb-6">
            <img
              src={course.image}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* 2. Course Title - Outside the main card */}
          <h1 className="text-xl sm:text-2xl font-bold text-black dark:text-white mb-6">
            {course.title}
          </h1>

          {/* Main Content Card */}
          <Card className="rounded-3xl border-0 shadow-none bg-white dark:bg-white">
            <CardContent className="p-6 sm:p-6 space-y-0 ">
              {/* 5. Info Cards Section with Registration and Save Buttons */}
              <div className="py-0 px-0 sm:py-2 sm:px-0 bg-white dark:bg-white rounded-3xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-6">
                  {/* Info Cards */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-12 flex-1 w-full sm:w-auto  rounded-2xl sm:rounded-none p-0 sm:p-0">
                    {/* Price Card */}
                    <div className="flex flex-row items-center justify-between sm:justify-start gap-3 rounded-2xl py-1 flex-shrink-0 w-full sm:w-auto">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-10 sm:h-10 rounded-xl sm:rounded-xl bg-breneo-blue/15 dark:bg-breneo-blue/15 sm:bg-breneo-blue/20 dark:sm:bg-breneo-blue/15 flex items-center justify-center flex-shrink-0">
                          <DollarSign className="h-5 w-5 sm:h-5 sm:w-5 text-breneo-blue dark:text-breneo-blue" />
                        </div>
                        <span className="text-base sm:text-sm font-semibold text-gray-900 dark:text-gray-100 sm:hidden">
                          Free
                        </span>
                        <div className="hidden sm:flex flex-col">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Free
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Course
                          </span>
                        </div>
                      </div>
                      <span className="text-m text-gray-500 dark:text-gray-400 sm:hidden ml-auto">
                        Course
                      </span>
                    </div>

                    {/* Duration Card */}
                    <div className="flex flex-row items-center justify-between sm:justify-start gap-3 rounded-2xl py-1 flex-shrink-0 w-full sm:w-auto">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-10 sm:h-10 rounded-xl sm:rounded-xl bg-breneo-blue/15 dark:bg-breneo-blue/15 sm:bg-breneo-blue/20 dark:sm:bg-breneo-blue/15 flex items-center justify-center flex-shrink-0">
                          <RotateCcw className="h-5 w-5 sm:h-5 sm:w-5 text-breneo-blue dark:text-breneo-blue" />
                        </div>
                        <span className="text-base sm:text-sm font-semibold text-gray-900 dark:text-gray-100 sm:hidden">
                          {course.duration || "2 თვე"}
                        </span>
                        <div className="hidden sm:flex flex-col">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {course.duration || "2 თვე"}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Duration
                          </span>
                        </div>
                      </div>
                      <span className="text-m text-gray-500 dark:text-gray-400 sm:hidden ml-auto">
                        Duration
                      </span>
                    </div>

                    {/* Lectures Card */}
                    <div className="flex flex-row items-center justify-between sm:justify-start gap-3 rounded-2xl py-1 flex-shrink-0 w-full sm:w-auto">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-10 sm:h-10 rounded-xl sm:rounded-xl bg-breneo-blue/15 dark:bg-breneo-blue/15 sm:bg-breneo-blue/20 dark:sm:bg-breneo-blue/15 flex items-center justify-center flex-shrink-0">
                          <Video className="h-5 w-5 sm:h-5 sm:w-5 text-breneo-blue dark:text-breneo-blue" />
                        </div>
                        <span className="text-base sm:text-sm font-semibold text-gray-900 dark:text-gray-100 sm:hidden">
                          {course.topics?.length || 16}
                        </span>
                        <div className="hidden sm:flex flex-col">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {course.topics?.length || 16}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Lectures
                          </span>
                        </div>
                      </div>
                      <span className="text-m text-gray-500 dark:text-gray-400 sm:hidden ml-auto">
                        Lectures
                      </span>
                    </div>

                    {/* Level Card */}
                    <div className="flex flex-row items-center justify-between sm:justify-start gap-3 rounded-2xl py-1 flex-shrink-0 w-full sm:w-auto">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-10 sm:h-10 rounded-xl sm:rounded-xl bg-breneo-blue/15 dark:bg-breneo-blue/15 sm:bg-breneo-blue/15 dark:sm:bg-breneo-blue/15 flex items-center justify-center flex-shrink-0">
                          <Users className="h-5 w-5 sm:h-5 sm:w-5 text-breneo-blue dark:text-breneo-blue" />
                        </div>
                        <span className="text-base sm:text-sm font-semibold text-gray-900 dark:text-gray-100 sm:hidden">
                          {course.level || "All Levels"}
                        </span>
                        <div className="hidden sm:flex flex-col">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {course.level || "All Levels"}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Level
                          </span>
                        </div>
                      </div>
                      <span className="text-m text-gray-500 dark:text-gray-400 sm:hidden ml-auto">
                        Level
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 w-full sm:w-auto pb-0 sm:pb-0">
                    <Button
                      onClick={handleSaveCourse}
                      disabled={isSaving || !user}
                      variant="secondary"
                      size="icon"
                      className={cn(
                        "aspect-square bg-[#E6E7EB] hover:bg-[#E6E7EB]/90 dark:bg-[#3A3A3A]",
                        isSaved
                          ? "text-white-500 bg-[#E6E7EB] dark:bg-[#474747] "
                          : "text-black dark:text-white ",
                      )}
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isSaved ? (
                        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                      ) : (
                        <Heart className="h-4 w-4" />
                      )}
                    </Button>

                    {course.registration_link ? (
                      <Button
                        type="button"
                        size="default"
                        disabled={enrollMutation.isPending}
                        className="w-full sm:w-auto px-6 text-sm bg-breneo-blue hover:bg-breneo-blue/90 text-white rounded-xl"
                        onClick={() => {
                          if (!user) {
                            toast.error(t.courses.enrollLoginRequired);
                            return;
                          }
                          if (isUserEnrolled) {
                            window.open(
                              course.registration_link!,
                              "_blank",
                              "noopener,noreferrer",
                            );
                            return;
                          }
                          enrollMutation.mutate(course, {
                            onSuccess: (result) => {
                              if (result === "noop") return;
                              window.open(
                                course.registration_link!,
                                "_blank",
                                "noopener,noreferrer",
                              );
                            },
                          });
                        }}
                      >
                        {enrollMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isUserEnrolled ? (
                          t.courses.enrolled
                        ) : (
                          t.courses.enroll
                        )}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="default"
                        disabled={
                          !user || isUserEnrolled || enrollMutation.isPending
                        }
                        onClick={() => enrollMutation.mutate(course)}
                        className="w-full sm:w-auto px-6 text-sm bg-breneo-blue hover:bg-breneo-blue/90 text-white rounded-xl"
                      >
                        {enrollMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isUserEnrolled ? (
                          t.courses.enrolled
                        ) : (
                          t.courses.enroll
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Course Description - Separate Card */}
          <Card className="rounded-3xl border-0 shadow-none bg-white dark:bg-white mt-6">
            <CardContent className="p-6 sm:p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                What will You learn
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {course.description || "No description available."}
              </p>
            </CardContent>
          </Card>

          <div
            className={cn(
              "grid grid-cols-1 gap-6 mt-6",
              academyProfile && "lg:grid-cols-2",
            )}
          >
            <Card className="rounded-3xl border-0 shadow-none bg-white dark:bg-white">
              <CardContent className="p-6 sm:p-6">
                <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
                  Lecturer
                </h2>
                <div className="flex items-start gap-4">
                  <OptimizedAvatar
                    src={lecturerPhotoUrl || undefined}
                    alt={lecturerName}
                    fallback={lecturerName ? lecturerName.charAt(0).toUpperCase() : "L"}
                    size="lg"
                    className="!h-16 !w-16 !rounded-sm"
                  />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {lecturerName}
                  </h3>
                </div>
              </CardContent>
            </Card>

            {/* About Academy Section - Separate Card */}
            {academyProfile && (
              <Card className="rounded-3xl border-0 shadow-none bg-white dark:bg-white">
                <CardContent className="p-6 sm:p-6">
                  <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
                    About Academy
                  </h2>
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    {/* Academy Logo */}
                    <div className="flex-shrink-0">
                      <OptimizedAvatar
                        src={academyImageUrl || undefined}
                        alt={academyName}
                        fallback={
                          academyName ? academyName.charAt(0).toUpperCase() : "A"
                        }
                        size="lg"
                        className="!h-16 !w-16 !rounded-sm"
                      />
                    </div>

                    {/* Academy Info */}
                    <div className="flex-1 w-full">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            {academyName}
                          </h3>
                          {academyProfile.description ? (
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                              {academyProfile.description}
                            </p>
                          ) : (
                            <p className="text-gray-500 dark:text-gray-500 italic">
                              No description available.
                            </p>
                          )}
                        </div>

                        <Link
                          to={academyUrl}
                          className="hidden sm:block flex-shrink-0"
                        >
                          <Button
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            View Academy
                          </Button>
                        </Link>
                      </div>

                      {/* Mobile View Academy Button */}
                      <div className="block sm:hidden mt-4 w-full">
                        <Link to={academyUrl}>
                          <Button
                            variant="outline"
                            className="w-full flex items-center gap-2 justify-center"
                          >
                            <Eye className="h-4 w-4" />
                            View Academy
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CoursePage;
