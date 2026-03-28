import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  BookOpen,
  Users,
  Award,
  Globe,
  Mail,
  ExternalLink,
  Building2,
  CheckCircle2,
} from "lucide-react";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { normalizeAcademyProfileApiResponse } from "@/api/academy";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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

type EnrolledUserRef = {
  id: number | string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

interface AcademyCourseHome {
  id: string;
  title: string;
  category: string;
  level: string;
  created_at?: string;
  enrolled_users: EnrolledUserRef[];
}

type ApiCourseLight = {
  id?: string | number | null;
  title?: string | null;
  language?: string | null;
  location?: string | null;
  level?: string | null;
  created_at?: string | null;
  enrolled_users?: unknown;
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

const AcademyHomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [academyProfile, setAcademyProfile] = useState<AcademyProfile | null>(
    null,
  );
  const [courses, setCourses] = useState<AcademyCourseHome[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAcademyData = useCallback(async () => {
    if (!user) return;
    try {
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
      }
    } catch (error: unknown) {
      console.error("Failed to load academy profile:", error);
      const axiosError = error as {
        response?: { status?: number };
      };
      if (axiosError.response?.status === 404) {
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
      const url = new URL(
        "https://web-production-80ed8.up.railway.app/api/courses/",
      );
      url.searchParams.set("academy_name", academyProfile.academy_name);

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const data: unknown = await response.json();
      const coursesFromApi: ApiCourseLight[] = Array.isArray(data)
        ? (data as ApiCourseLight[])
        : [];

      setCourses(
        coursesFromApi.map((course) => ({
          id: course.id != null ? String(course.id) : "",
          title: String(course.title ?? ""),
          category: String(course.language ?? course.location ?? ""),
          level: String(course.level ?? ""),
          created_at:
            course.created_at != null ? String(course.created_at) : undefined,
          enrolled_users: parseEnrolledUsersFromApi(course.enrolled_users),
        })),
      );
    } catch (error: unknown) {
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

  const studentAggregates = useMemo(() => {
    const byKey = new Map<
      string,
      { user: EnrolledUserRef; courseTitles: string[] }
    >();
    for (const course of courses) {
      for (const u of course.enrolled_users) {
        const key = String(u.id);
        const prev = byKey.get(key);
        if (!prev) {
          byKey.set(key, { user: u, courseTitles: [course.title] });
        } else if (!prev.courseTitles.includes(course.title)) {
          prev.courseTitles.push(course.title);
        }
      }
    }
    const rows = Array.from(byKey.values()).sort((a, b) => {
      const nameA = [a.user.first_name, a.user.last_name]
        .filter(Boolean)
        .join(" ")
        .trim()
        .toLowerCase();
      const nameB = [b.user.first_name, b.user.last_name]
        .filter(Boolean)
        .join(" ")
        .trim()
        .toLowerCase();
      const labelA = nameA || String(a.user.email ?? a.user.id);
      const labelB = nameB || String(b.user.email ?? b.user.id);
      return labelA.localeCompare(labelB);
    });
    return { uniqueCount: rows.length, rows };
  }, [courses]);

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
                Total Students
              </CardTitle>
              <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-lg md:text-2xl font-bold">
                {studentAggregates.uniqueCount}
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground hidden md:block">
                Unique enrollments across your courses
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

          {/* Enrolled students across all courses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Enrolled students
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/academy/courses")}
              >
                Manage courses
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
              ) : studentAggregates.rows.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No students have enrolled in your courses yet.
                  </p>
                </div>
              ) : (
                <ul className="max-h-[min(420px,50vh)] space-y-2 overflow-y-auto pr-1">
                  {studentAggregates.rows.map(({ user, courseTitles }) => {
                    const displayName = [user.first_name, user.last_name]
                      .filter(Boolean)
                      .join(" ")
                      .trim();
                    return (
                      <li
                        key={String(user.id)}
                        className="rounded-lg border p-3 text-sm"
                      >
                        <div className="font-medium">
                          {displayName ||
                            user.email ||
                            `Student #${user.id}`}
                        </div>
                        {user.email ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {courseTitles.map((title, idx) => (
                            <Badge
                              key={`${String(user.id)}-${idx}-${title}`}
                              variant="secondary"
                              className="text-[10px] font-normal"
                            >
                              {title}
                            </Badge>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
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
