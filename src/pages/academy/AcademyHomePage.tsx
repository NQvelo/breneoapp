import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  BookOpen,
  Users,
  TrendingUp,
  Award,
  Globe,
  Mail,
  ExternalLink,
  Building2,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Interfaces
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

interface Course {
  id: string;
  title: string;
  category: string;
  level: string;
  created_at: string;
}

const AcademyHomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [academyProfile, setAcademyProfile] = useState<AcademyProfile | null>(
    null
  );
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAcademyData = useCallback(async () => {
    if (!user) return;
    try {
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
      }
    } catch (error: any) {
      console.error("Failed to load academy profile:", error);
      if (error.response?.status === 404) {
        toast.error("Please set up your academy profile first");
        navigate("/academy/profile");
      } else {
        toast.error("Failed to load academy profile");
      }
    } finally {
      setLoading(false);
    }
  }, [user, navigate]);

  const fetchCourses = useCallback(async () => {
    if (!academyProfile) return;

    try {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, category, level, created_at")
        .eq("academy_id", academyProfile.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        throw error;
      }

      setCourses(data || []);
    } catch (error: any) {
      console.error("Error fetching courses:", error);
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

  // Calculate statistics
  const totalCourses = courses.length;
  const categories = new Set(courses.map((c) => c.category)).size;
  const recentCourses = courses.filter(
    (c) =>
      new Date(c.created_at).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
  ).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        {/* <div className="bg-gradient-to-r from-breneo-blue to-blue-600 rounded-3xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Welcome back, {academyProfile.academy_name}!
              </h1>
              <p className="text-blue-100 text-lg">
                Manage your academy and track your progress
              </p>
            </div>
            {academyProfile.logo_url && (
              <div className="hidden md:block">
                <img
                  src={academyProfile.logo_url}
                  alt={academyProfile.academy_name}
                  className="h-24 w-24 rounded-full object-cover border-4 border-white/20"
                />
              </div>
            )}
          </div>
        </div> */}

        {/* Statistics Cards */}
        <div className="grid grid-cols-4 gap-2 md:gap-6">
          <Card className="min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium truncate">
                Total Courses
              </CardTitle>
              <BookOpen className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-lg md:text-2xl font-bold">
                {totalCourses}
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground hidden md:block">
                Active courses in your academy
              </p>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium truncate">
                Categories
              </CardTitle>
              <Award className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-lg md:text-2xl font-bold">{categories}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground hidden md:block">
                Different course categories
              </p>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium truncate">
                Recent Courses
              </CardTitle>
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-lg md:text-2xl font-bold">
                {recentCourses}
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground hidden md:block">
                Added in the last 30 days
              </p>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium truncate">
                Status
              </CardTitle>
              <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-lg md:text-2xl font-bold">
                {academyProfile.is_verified ? (
                  <Badge className="bg-green-500 text-[10px] md:text-xs">
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] md:text-xs">
                    Pending
                  </Badge>
                )}
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground hidden md:block">
                Academy verification status
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Academy Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Academy Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Academy Name
                </p>
                <p className="font-semibold">{academyProfile.academy_name}</p>
              </div>
              {academyProfile.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Description
                  </p>
                  <p className="text-sm">{academyProfile.description}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {academyProfile.website_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(academyProfile.website_url, "_blank")
                    }
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    Website
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                )}
                {academyProfile.contact_email && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      (window.location.href = `mailto:${academyProfile.contact_email}`)
                    }
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Contact
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Courses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Recent Courses
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/academy/courses")}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {courses.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No courses yet</p>
                  <Button
                    onClick={() => navigate("/academy/courses/add")}
                    size="sm"
                  >
                    Create Your First Course
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{course.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {course.category}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {course.level}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigate(`/academy/courses/edit/${course.id}`)
                        }
                      >
                        Edit
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => navigate("/academy/courses/add")}
                className="h-auto flex-col items-start p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-5 w-5" />
                  <span className="font-semibold">Add New Course</span>
                </div>
                <span className="text-sm text-left opacity-80">
                  Create and publish a new course
                </span>
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/academy/courses")}
                className="h-auto flex-col items-start p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5" />
                  <span className="font-semibold">Manage Courses</span>
                </div>
                <span className="text-sm text-left opacity-80">
                  View and edit all your courses
                </span>
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/academy/profile")}
                className="h-auto flex-col items-start p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-5 w-5" />
                  <span className="font-semibold">Edit Profile</span>
                </div>
                <span className="text-sm text-left opacity-80">
                  Update your academy information
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AcademyHomePage;
