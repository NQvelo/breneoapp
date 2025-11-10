import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createAcademySlug } from "@/utils/academyUtils";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";

interface AcademyProfile {
  id: string;
  academy_name: string;
  slug?: string;
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
        // Try API first
        const response = await apiClient.get(API_ENDPOINTS.USER.SAVED_COURSES);
        const courses = Array.isArray(response.data)
          ? response.data
          : response.data?.results ||
            response.data?.courses ||
            response.data?.data ||
            [];

        return courses.some(
          (c: { id?: string; course_id?: string }) =>
            String(c.id) === String(courseId) ||
            String(c.course_id) === String(courseId)
        );
      } catch (error) {
        // Fallback to Supabase
        try {
          const { data, error: supabaseError } = await supabase
            .from("saved_courses")
            .select("course_id")
            .eq("user_id", String(user.id))
            .eq("course_id", String(courseId))
            .single();

          return !supabaseError && !!data;
        } catch {
          return false;
        }
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
        // Try to fetch from API first
        const response = await apiClient.get(
          `${API_ENDPOINTS.ACADEMY.PROFILE}${course.academy_id}/`
        );

        if (response.data) {
          const data = response.data as Record<string, unknown>;
          const getStringField = (field: string) => {
            const value = data[field];
            return typeof value === "string" ? value : undefined;
          };

          const academyName =
            getStringField("academy_name") ||
            getStringField("name") ||
            getStringField("first_name") ||
            getStringField("firstName") ||
            course.provider ||
            "";

          return {
            id: course.academy_id,
            academy_name: academyName,
            slug:
              getStringField("slug") ||
              (academyName ? createAcademySlug(academyName) : undefined),
          } as AcademyProfile;
        }
      } catch (error) {
        console.debug(
          "Could not fetch academy profile from API, trying Supabase"
        );
      }

      // Fallback to Supabase
      try {
        const { data: supabaseData, error: supabaseError } = await supabase
          .from("academy_profiles")
          .select("id, academy_name")
          .eq("id", course.academy_id)
          .single();

        if (!supabaseError && supabaseData) {
          return {
            id: supabaseData.id,
            academy_name: supabaseData.academy_name || course.provider || "",
            slug: supabaseData.academy_name
              ? createAcademySlug(supabaseData.academy_name)
              : undefined,
          } as AcademyProfile;
        }
      } catch (error) {
        console.debug("Could not fetch academy profile from Supabase");
      }

      // Last resort: use provider name to create slug
      return {
        id: course.academy_id,
        academy_name: course.provider || "",
        slug: course.provider ? createAcademySlug(course.provider) : undefined,
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
        if (!shouldSave) {
          // Unsave course - try API first
          try {
            await apiClient.delete(
              `${API_ENDPOINTS.USER.SAVED_COURSES}${String(course.id)}/`
            );
          } catch (apiError) {
            // If API delete fails, try Supabase
            const { error } = await supabase
              .from("saved_courses")
              .delete()
              .eq("user_id", String(user.id))
              .eq("course_id", String(course.id));

            if (error) throw error;
          }
        } else {
          // Save course - try API endpoint first, then profile endpoint as requested
          const courseIdStr = String(course.id);
          try {
            await apiClient.post(API_ENDPOINTS.USER.SAVED_COURSES, {
              course_id: courseIdStr,
              course: courseIdStr,
            });
          } catch (apiError: unknown) {
            // If API post fails, try saving via profile endpoint as requested
            try {
              await apiClient.patch(API_ENDPOINTS.AUTH.PROFILE, {
                saved_courses: [courseIdStr],
              });
            } catch (profileError) {
              // If profile endpoint also fails, fallback to Supabase
              const { error } = await supabase.from("saved_courses").insert({
                user_id: String(user.id),
                course_id: courseIdStr,
              });

              if (error) {
                // Handle duplicate entry
                if (error.code === "23505") {
                  return; // Already saved
                }
                throw error;
              }
            }
          }
        }
      } catch (error) {
        console.error("Error saving course:", error);
        throw error;
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

      toast.success(
        `"${course?.title}" has been ${
          shouldSave ? "saved" : "unsaved"
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

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <img
              src={course.image}
              alt={course.title}
              className="w-full h-64 object-cover mb-4 rounded-md"
            />
            <CardTitle className="text-3xl font-bold">{course.title}</CardTitle>
            <div className="flex items-center gap-4 text-md text-gray-600 pt-2">
              <span>
                Provider:{" "}
                <Link
                  to={academyUrl}
                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                >
                  {academyName}
                </Link>
              </span>
              <span>Level: {course.level}</span>
              <span>Duration: {course.duration}</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg mb-6">{course.description}</p>
            {course.topics && course.topics.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-xl mb-2">Topics Covered</h3>
                <div className="flex flex-wrap gap-2">
                  {course.topics.map((topic) => (
                    <Badge key={topic}>{topic}</Badge>
                  ))}
                </div>
              </div>
            )}
            {course.required_skills && course.required_skills.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-xl mb-2">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {course.required_skills.map((skill) => (
                    <Badge variant="secondary" key={skill}>
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <Button
                size="lg"
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
              <Button size="lg">Enroll Now</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CoursePage;
