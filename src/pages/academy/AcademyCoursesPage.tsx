import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, BookOpen } from "lucide-react";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  created_at: string;
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

const AcademyCoursesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [academyProfile, setAcademyProfile] = useState<AcademyProfile | null>(
    null
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
        const academyProfile: AcademyProfile = {
          id: data.id || data.academy_id || String(user.id),
          academy_name: data.academy_name || "",
          first_name:
            data.first_name ||
            data.firstName ||
            user.first_name ||
            data.academy_name ||
            "",
          description: data.description || "",
          website_url: data.website_url || "",
          contact_email: data.contact_email || user.email || "",
          is_verified: data.is_verified || false,
          logo_url: data.profile_photo_url || data.logo_url || null,
        };

        setAcademyProfile(academyProfile);
        console.log("✅ Academy profile loaded from API:", academyProfile);
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
  }, [user]);

  const fetchCourses = useCallback(async () => {
    if (!academyProfile) return;

    try {
      // Fetch courses from Supabase filtered by academy_id
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("academy_id", academyProfile.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const coursesData = (data || []).map((course) => ({
        ...course,
        required_skills: course.required_skills || [],
        topics: course.topics || [],
        enrolled: course.enrolled || false,
        popular: course.popular || false,
        is_academy_course: course.is_academy_course || false,
      })) as Course[];

      setCourses(coursesData);
    } catch (error) {
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
    if (academyProfile && academyProfile.id) {
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
