import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, BookOpen, Clock } from "lucide-react";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { normalizeAcademyProfileApiResponse } from "@/api/academy";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Interfaces
interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  duration: string;
  provider: string;
  required_skills: string[];
  topics: string[];
  image: string;
  enrolled: boolean;
  popular: boolean;
  is_academy_course: boolean;
  created_at?: string;
}

interface AcademyProfile {
  id: string;
  academy_name: string;
  first_name?: string;
  description: string;
  website_url: string;
  contact_email: string;
  is_verified: boolean;
  logo_url: string | null;
}

type ApiCourseFull = {
  id?: string | number | null;
  title?: string | null;
  description?: string | null;
  language?: string | null;
  location?: string | null;
  level?: string | null;
  total_duration?: string | null;
  academy_name?: string | null;
  required_skills?: unknown;
  cover_image_url?: string | null;
  lecturer_photo_url?: string | null;
  is_enrolled?: boolean | null;
  academy_id?: string | number | null;
  created_at?: string | null;
};

const AcademyCoursesPage = () => {
  const navigate = useNavigate();
  const { user, updateAcademyDisplay } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [academyProfile, setAcademyProfile] = useState<AcademyProfile | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const handleEditClick = (course: Course) => {
    navigate(`/academy/courses/edit/${course.id}`);
  };

  const fetchAcademyData = useCallback(async () => {
    if (!user) return;
    try {
      // Fetch academy profile from API endpoint to get the academy_id
      const response = await apiClient.get(API_ENDPOINTS.ACADEMY.PROFILE);

      if (response.data) {
        const data = response.data;
        const normalized = normalizeAcademyProfileApiResponse(
          data as Parameters<typeof normalizeAcademyProfileApiResponse>[0],
          user?.id != null ? String(user.id) : undefined
        );
        const academyProfile: AcademyProfile = {
          ...normalized,
          first_name:
            normalized.first_name ||
            user?.first_name ||
            normalized.academy_name ||
            "",
          is_verified: data.is_verified ?? false,
        };
        setAcademyProfile(academyProfile);
        updateAcademyDisplay({
          name: academyProfile.academy_name,
          email: academyProfile.contact_email,
          is_verified: academyProfile.is_verified,
          profile_image: academyProfile.logo_url ?? null,
        });
      }
    } catch (error) {
      console.error("Failed to load academy profile:", error);
      // If 404, academy profile doesn't exist yet
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          toast.error("Please set up your academy profile first");
        } else {
          toast.error("Failed to load academy profile");
        }
      } else {
        toast.error("Failed to load academy profile");
      }
    } finally {
      setLoading(false);
    }
  }, [user, updateAcademyDisplay]);

  const fetchCourses = useCallback(async () => {
    if (!academyProfile) return;

    try {
      const url = new URL(
        "https://web-production-80ed8.up.railway.app/api/courses/",
      );
      url.searchParams.set("academy_name", academyProfile.academy_name);

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const data: unknown = await response.json();
      const coursesFromApi = Array.isArray(data) ? (data as ApiCourseFull[]) : [];

      setCourses(
        coursesFromApi.map((course) => {
          const id = course.id != null ? String(course.id) : "";
          const imageCandidate =
            course.cover_image_url || course.lecturer_photo_url || "";
          const image =
            imageCandidate &&
            !imageCandidate.startsWith("/") &&
            !imageCandidate.startsWith("http")
              ? `/${imageCandidate}`
              : imageCandidate || "/lovable-uploads/no_photo.png";

          const requiredSkills = Array.isArray(course.required_skills)
            ? course.required_skills.map((s) => String(s))
            : [];

          return {
            id,
            title: String(course.title ?? ""),
            description: String(course.description ?? ""),
            category: String(course.language ?? course.location ?? ""),
            level: String(course.level ?? ""),
            duration: String(course.total_duration ?? ""),
            provider: String(course.academy_name ?? ""),
            required_skills: requiredSkills,
            topics: [],
            image,
            enrolled: Boolean(course.is_enrolled),
            popular: false,
            is_academy_course: true,
            created_at:
              course.created_at != null ? String(course.created_at) : undefined,
          } satisfies Course;
        }),
      );
    } catch (error: unknown) {
      console.error("Error fetching courses:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load courses";
      toast.error(errorMessage);
    }
  }, [academyProfile]);

  useEffect(() => {
    fetchAcademyData();
  }, [fetchAcademyData]);

  useEffect(() => {
    if (academyProfile && academyProfile.id && academyProfile.is_verified) {
      fetchCourses();
    }
  }, [academyProfile, fetchCourses]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-lg">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!academyProfile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">
              Academy Profile Not Found
            </h2>
            <p className="text-muted-foreground">
              Please contact support to set up your academy profile.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!academyProfile.is_verified) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md border-dashed shadow-none">
            <CardContent className="space-y-4 pt-10 pb-10 text-center">
              <Clock
                className="mx-auto h-14 w-14 text-amber-500"
                strokeWidth={1.25}
                aria-hidden
              />
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Verification pending
                </h1>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  Your academy is not verified yet. The dashboard will appear
                  here after our team completes verification.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-2"
                onClick={() => navigate("/academy/profile")}
              >
                Academy profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <span className="text-md font-semibold">
              You have {courses.length} Courses
            </span>
            <Button onClick={() => navigate("/academy/courses/add")}>
              <Plus className="w-4 h-4 mr-2" />
              Add Course
            </Button>
          </div>

          <div>
            {courses.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No courses yet</h3>
                <p className="text-muted-foreground">
                  Add your first course to get started
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <img
                          src={course.image}
                          alt={course.title}
                          className="h-16 w-auto rounded-md object-contain"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {course.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{course.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{course.level}</Badge>
                      </TableCell>
                      <TableCell>{course.duration}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(course)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AcademyCoursesPage;
