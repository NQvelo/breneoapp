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
  Bookmark,
  BookmarkCheck,
  Loader2,
  Clock,
  Diamond,
  Languages,
  Award,
  Calendar,
  Eye,
} from "lucide-react";

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

  // Check if course is saved
  const { data: isSaved } = useQuery({
    queryKey: ["course-saved", courseId, user?.id],
    queryFn: async () => {
      if (!user?.id || !courseId) return false;

      try {
        // Fetch from profile API
        const profileResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
        const savedCoursesArray = profileResponse.data?.saved_courses || [];
        return savedCoursesArray.some(
          (id: string | number) => String(id) === String(courseId)
        );
      } catch (error) {
        console.error("Error checking if course is saved:", error);
        return false;
      }
    },
    enabled: !!user?.id && !!courseId,
  });

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
    mutationFn: async (shouldSave: boolean) => {
      if (!user?.id || !course) {
        throw new Error("User not logged in or course not found");
      }

      setIsSaving(true);

      try {
        // Use the course ID (can be UUID or numeric string)
        const courseIdStr = String(course.id);

        console.log("💾 Saving course:", {
          courseId: courseIdStr,
          courseTitle: course.title,
          shouldSave,
          userId: user.id,
        });

        // Validate that course ID is not empty
        if (!courseIdStr || courseIdStr.trim() === "") {
          throw new Error("Course ID is required");
        }

        // Fetch current profile to get existing saved_courses array
        console.log("📥 Fetching current profile...");
        const profileResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);

        console.log("📥 Profile response:", {
          status: profileResponse.status,
          dataKeys: Object.keys(profileResponse.data || {}),
          fullData: profileResponse.data,
        });

        // Try to extract saved_courses from various possible locations
        let currentSavedCourses: (string | number)[] = [];

        if (profileResponse.data) {
          const data = profileResponse.data as Record<string, unknown>;

          // Check multiple possible locations
          if (Array.isArray(data.saved_courses)) {
            currentSavedCourses = data.saved_courses;
            console.log(
              "✅ Found saved_courses at data.saved_courses:",
              currentSavedCourses
            );
          } else if (data.profile && typeof data.profile === "object") {
            const profile = data.profile as Record<string, unknown>;
            if (Array.isArray(profile.saved_courses)) {
              currentSavedCourses = profile.saved_courses;
              console.log(
                "✅ Found saved_courses at data.profile.saved_courses:",
                currentSavedCourses
              );
            }
          } else if (data.user && typeof data.user === "object") {
            const userData = data.user as Record<string, unknown>;
            if (Array.isArray(userData.saved_courses)) {
              currentSavedCourses = userData.saved_courses;
              console.log(
                "✅ Found saved_courses at data.user.saved_courses:",
                currentSavedCourses
              );
            }
          }
        }

        console.log("📋 Current saved courses:", currentSavedCourses);

        // Normalize all IDs to strings for consistent comparison
        const normalizedSavedCourses = currentSavedCourses.map(
          (id: string | number) => String(id)
        );
        console.log("📋 Normalized saved courses:", normalizedSavedCourses);

        let updatedSavedCourses: string[];

        if (!shouldSave) {
          // Unsave: Remove course ID from array
          updatedSavedCourses = normalizedSavedCourses.filter(
            (id: string) => id !== courseIdStr
          );
          console.log(
            "🗑️ Unsaving course. Updated array:",
            updatedSavedCourses
          );
        } else {
          // Save: Add course ID to array if not already present
          if (normalizedSavedCourses.some((id: string) => id === courseIdStr)) {
            console.log("ℹ️ Course already saved, skipping");
            // Already saved, treat as success
            return;
          }
          updatedSavedCourses = [...normalizedSavedCourses, courseIdStr];
          console.log("💾 Saving course. Updated array:", updatedSavedCourses);
        }

        // Update profile with new saved_courses array
        console.log("📤 Sending PATCH request to update profile...");
        console.log("📤 Payload:", { saved_courses: updatedSavedCourses });

        const patchResponse = await apiClient.patch(
          API_ENDPOINTS.AUTH.PROFILE,
          {
            saved_courses: updatedSavedCourses,
          }
        );

        console.log("✅ PATCH response:", {
          status: patchResponse.status,
          data: patchResponse.data,
        });

        // Verify the update was successful
        const verifyResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
        let verifySavedCourses: (string | number)[] = [];

        if (verifyResponse.data) {
          const verifyData = verifyResponse.data as Record<string, unknown>;
          if (Array.isArray(verifyData.saved_courses)) {
            verifySavedCourses = verifyData.saved_courses;
          } else if (
            verifyData.profile &&
            typeof verifyData.profile === "object"
          ) {
            const profile = verifyData.profile as Record<string, unknown>;
            if (Array.isArray(profile.saved_courses)) {
              verifySavedCourses = profile.saved_courses;
            }
          } else if (verifyData.user && typeof verifyData.user === "object") {
            const userData = verifyData.user as Record<string, unknown>;
            if (Array.isArray(userData.saved_courses)) {
              verifySavedCourses = userData.saved_courses;
            }
          }
        }

        const normalizedVerify = verifySavedCourses.map((id: string | number) =>
          String(id)
        );
        const wasSaved = normalizedVerify.includes(courseIdStr);

        console.log(
          "✅ Verification - saved_courses after update:",
          verifySavedCourses
        );
        console.log("✅ Verification - course was saved:", wasSaved);

        if (shouldSave && !wasSaved) {
          console.warn(
            "⚠️ Warning: Course was not found in saved_courses after update"
          );
        }
      } catch (error: any) {
        console.error("Error saving course:", error);

        // Extract more detailed error message
        let errorMessage = "Failed to save course. Please try again.";
        if (error?.response?.data) {
          const errorData = error.response.data;
          errorMessage =
            errorData.detail ||
            errorData.message ||
            errorData.error ||
            errorMessage;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        throw new Error(errorMessage);
      } finally {
        setIsSaving(false);
      }
    },
    onSuccess: (_, shouldSave) => {
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({
        queryKey: ["course-saved", courseId, user?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["savedCourses"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });

      toast.success(
        `"${course?.title}" has been ${
          shouldSave ? "saved" : "unsaved"
        } successfully.`
      );
    },
    onError: (error: any) => {
      console.error("Error saving/unsaving course:", error);

      // Extract more detailed error message
      let errorMessage = "Failed to save course. Please try again.";
      if (error?.response?.data) {
        const errorData = error.response.data;
        errorMessage =
          errorData.detail ||
          errorData.message ||
          errorData.error ||
          errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    },
  });

  const handleSaveCourse = () => {
    if (!user) {
      toast.error("Please log in to save courses.");
      return;
    }
    saveCourseMutation.mutate(!isSaved);
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
      <div className="p-6 space-y-6">
        {/* Top Section: Course Info and Image in One Card */}
        <Card className="rounded-lg mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              {/* Left Side: Course Information */}
              <div className="flex flex-col h-full">
                <CardTitle className="text-3xl font-bold mb-4 text-black">
                  {course.title}
                </CardTitle>

                {/* Tags - Small light gray placeholders */}
                <div className="flex gap-2 mb-4">
                  {displayTags.slice(0, 3).map((tag, index) => (
                    <div
                      key={index}
                      className="h-5 bg-gray-200 rounded px-2 text-xs text-gray-500 flex items-center min-w-[60px]"
                    >
                      {tag}
                    </div>
                  ))}
                  {displayTags.length === 0 && (
                    <>
                      <div className="h-5 bg-gray-200 rounded px-2 w-16"></div>
                      <div className="h-5 bg-gray-200 rounded px-2 w-16"></div>
                      <div className="h-5 bg-gray-200 rounded px-2 w-16"></div>
                    </>
                  )}
                </div>

                {/* Academy Name with Logo */}
                <div className="flex items-center gap-3 mb-4">
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

                {/* Action Buttons */}
                <div className="flex gap-3 mt-auto">
                  <Button
                    onClick={handleSaveCourse}
                    disabled={isSaving || !user}
                    variant={isSaved ? "outline" : "default"}
                    className="flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isSaved ? "Unsaving..." : "Saving..."}
                      </>
                    ) : isSaved ? (
                      <>
                        <BookmarkCheck className="h-4 w-4" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Bookmark className="h-4 w-4" />
                        Save Course
                      </>
                    )}
                  </Button>
                  <Button>Enroll Now</Button>
                </div>
              </div>

              {/* Right Side: Course Image */}
              <div className="w-full h-[300px] flex items-center justify-center overflow-hidden rounded-lg">
                <img
                  src={course.image}
                  alt={course.title}
                  className="w-full h-[300px] object-cover rounded-lg"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Middle Section: Description and Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Description Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              Description
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {course.description || "description here"}
            </p>
          </div>

          {/* Details Content Card */}
          <Card className="rounded-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold mb-4 text-gray-900">
                Details content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-600 flex-shrink-0" />
                <span className="text-gray-700">{getDurationText()}</span>
              </div>
              <div className="flex items-center gap-3">
                <Diamond className="h-5 w-5 text-gray-600 flex-shrink-0" />
                <span className="text-gray-700">100 Points</span>
              </div>
              <div className="flex items-center gap-3">
                <Languages className="h-5 w-5 text-gray-600 flex-shrink-0" />
                <span className="text-gray-700">English</span>
              </div>
              <div className="flex items-center gap-3">
                <Award className="h-5 w-5 text-gray-600 flex-shrink-0" />
                <span className="text-gray-700">Certificate of Completion</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-600 flex-shrink-0" />
                <span className="text-gray-700">
                  No due date for this content
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section: Certificates */}
        <Card className="rounded-lg mb-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Obtain a career. Certificates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Complete this course to earn a certificate that demonstrates your
              skills and knowledge.
            </p>
          </CardContent>
        </Card>

        {/* About Academy Section */}
        {academyProfile && (
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 mb-4">
                About Academy
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                    className="!h-16 !w-16 !rounded-full"
                  />
                </div>

                {/* Academy Info */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {academyName}
                  </h3>
                  {academyProfile.description ? (
                    <p className="text-gray-600 leading-relaxed mb-4">
                      {academyProfile.description}
                    </p>
                  ) : (
                    <p className="text-gray-500 italic mb-4">
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
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CoursePage;
