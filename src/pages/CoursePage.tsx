import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import OptimizedAvatar from "@/components/ui/OptimizedAvatar";
import { createAcademySlug } from "@/utils/academyUtils";
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

const CoursePage = () => {
  const { courseId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const t = useTranslation();

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (error) {
        console.error("Error fetching course details:", error);
        return null;
      }
      return data;
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
          `/api/academy/${course.academy_id}/`
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
          error
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
          context.previousSavedCourses
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
        } successfully.`
      );
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

  // Get first 3 topics/categories for tags
  const displayTags =
    course.topics?.slice(0, 3) || course.required_skills?.slice(0, 3) || [];

  return (
    <DashboardLayout>
      <div className="px-4 py-4 sm:px-6 sm:py-6 pb-40 sm:pb-44 mb-16 sm:mb-20 ">
        {/* Main Content Wrapper */}
        <div className="max-w-7xl mx-auto pb-20">
          {/* 1. Cover Image - Outside the main div */}
          <div className="w-full h-40 sm:h-80 overflow-hidden rounded-3xl mb-6 border border-gray-200 dark:border-gray-700">
            <img
              src={course.image}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Main Content Card with Border */}
          <Card className="rounded-3xl border border-gray-200 dark:border-gray-700">
            <CardContent className="p-6 sm:p-6 space-y-0">
              {/* 2. Academy Name */}
              <div className="flex items-center gap-3 pb-2">
                <OptimizedAvatar
                  src={academyImageUrl || undefined}
                  alt={academyName}
                  fallback={
                    academyName ? academyName.charAt(0).toUpperCase() : "A"
                  }
                  size="sm"
                  className="flex-shrink-0 !h-10 !w-10 !rounded-full"
                />
                <span className="text-gray-600 text-base font-medium">
                  {academyName}
                </span>
              </div>

              {/* 3. Course Title (smaller font) */}
              <h1 className="text-xl sm:text-2xl font-bold text-black dark:text-white pb-6">
                {course.title}
              </h1>

              {/* 5. Info Cards Section with Registration and Save Buttons */}
              <div className="border-t border-b border-gray-200 dark:border-gray-700 py-2 px-2 sm:py-4 sm:px-20 ">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
                  {/* Info Cards */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-12 flex-1 w-full sm:w-auto ">
                    {/* Price Card */}
                    <div className="flex items-center gap-2 rounded-2xl py-2 flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-breneo-blue/20 dark:bg-breneo-blue/40 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="h-4 w-4 text-breneo-blue dark:text-breneo-blue" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Free
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Course
                        </span>
                      </div>
                    </div>

                    {/* Duration Card */}
                    <div className="flex items-center gap-2  rounded-2xl  py-2 flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-breneo-blue/20 dark:bg-breneo-blue/40 flex items-center justify-center flex-shrink-0">
                        <RotateCcw className="h-4 w-4 text-breneo-blue dark:text-breneo-blue" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {course.duration || "2 თვე"}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Duration
                        </span>
                      </div>
                    </div>

                    {/* Lectures Card */}
                    <div className="flex items-center gap-2  rounded-2xl  py-2 flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-breneo-blue/20 dark:bg-breneo-blue/40 flex items-center justify-center flex-shrink-0">
                        <Video className="h-4 w-4 text-breneo-blue dark:text-breneo-blue" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {course.topics?.length || 16}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Lectures
                        </span>
                      </div>
                    </div>

                    {/* Level Card */}
                    <div className="flex items-center gap-2  rounded-2xl py-2 flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-breneo-blue/20 dark:bg-breneo-blue/40 flex items-center justify-center flex-shrink-0">
                        <Users className="h-4 w-4 text-breneo-blue dark:text-breneo-blue" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {course.level || "All Levels"}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Level
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 w-full sm:w-auto pb-5 sm:pb-0">
                    {/* Save button – square */}
                    <Button
                      onClick={handleSaveCourse}
                      disabled={isSaving || !user}
                      variant="secondary"
                      size="icon"
                      aria-label={isSaved ? "Unsave course" : "Save course"}
                      className={cn(
                        "h-10 w-10 flex-shrink-0 bg-[#E6E7EB] hover:bg-[#E6E7EB]/90 dark:bg-[#3A3A3A] dark:hover:bg-[#4A4A4A]",
                        isSaved
                          ? "text-red-500 bg-red-50 hover:bg-red-50/90 dark:bg-red-900/40 dark:hover:bg-red-900/60"
                          : "text-black dark:text-white"
                      )}
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isSaved ? (
                        <Heart className="h-4 w-4 text-red-500 fill-red-500 animate-heart-pop" />
                      ) : (
                        <Heart className="h-4 w-4" />
                      )}
                    </Button>

                    {/* Registration button – full width */}
                    <Button
                      size="sm"
                      className="h-10 w-full sm:w-auto px-6 text-sm bg-breneo-blue hover:bg-breneo-blue/90 text-white rounded-xl"
                    >
                      {t.courses.enroll}
                    </Button>
                  </div>
                </div>
              </div>

              {/* 6. Description */}
              <div className="py-6">
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src="/lovable-uploads/3dicons-notebook-dynamic-color.png"
                    alt="Notebook"
                    className="h-12 w-12 object-contain flex-shrink-0"
                  />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    What will You learn
                  </h2>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {course.description || "No description available."}
                </p>
              </div>

              {/* About Academy Section */}
              {academyProfile && (
                <div className="py-6">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                    About Academy
                  </h2>
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    {/* Academy Logo */}
                    <div className="flex-shrink-0">
                      <OptimizedAvatar
                        src={academyImageUrl || undefined}
                        alt={academyName}
                        fallback={
                          academyName
                            ? academyName.charAt(0).toUpperCase()
                            : "A"
                        }
                        size="lg"
                        className="!h-16 !w-16 !rounded-full"
                      />
                    </div>

                    {/* Academy Info */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {academyName}
                      </h3>
                      {academyProfile.description ? (
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                          {academyProfile.description}
                        </p>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-500 italic mb-4">
                          No description available.
                        </p>
                      )}

                      {/* View Academy Button */}
                      <Link to={academyUrl}>
                        <Button
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View Academy
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Chips - Moved to bottom */}
              <div className="flex flex-wrap gap-2 py-6">
                {displayTags.slice(0, 3).map((tag, index) => (
                  <Badge
                    key={index}
                    className="rounded-[10px] px-3 py-1 text-[13px] font-medium bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CoursePage;
