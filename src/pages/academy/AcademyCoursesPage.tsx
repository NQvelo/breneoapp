import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreVertical,
  BookOpen,
  MapPin,
  Clock,
  GraduationCap,
  Users,
} from "lucide-react";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { normalizeAcademyProfileApiResponse } from "@/api/academy";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  duration: string;
  location: string;
  price: number;
  enrolledCount: number;
  image: string;
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
  price?: string | number | null;
  academy_name?: string | null;
  required_skills?: unknown;
  skills_taught?: unknown;
  cover_image_url?: string | null;
  lecturer_photo_url?: string | null;
  enrolled_users?: unknown;
  created_at?: string | null;
};

function normalizeCourseImage(value: string | null | undefined): string {
  if (!value) return "/lovable-uploads/no_photo.png";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return value;
  return `/${value}`;
}

function parseCoursePrice(raw: string | number | null | undefined): number {
  const n = Number(raw ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function parseEnrolledCount(raw: unknown): number {
  return Array.isArray(raw) ? raw.length : 0;
}

const AcademyCoursesPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, updateAcademyDisplay } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [academyProfile, setAcademyProfile] = useState<AcademyProfile | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const priceFilter = (() => {
    const p = searchParams.get("price");
    if (p === "free") return "free";
    if (p === "paid") return "paid";
    return "all";
  })();

  const fetchAcademyProfile = useCallback(async () => {
    if (!user) return null;
    setProfileLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.ACADEMY.PROFILE);
      if (!response.data) return null;

      const data = response.data;
      const normalized = normalizeAcademyProfileApiResponse(
        data as Parameters<typeof normalizeAcademyProfileApiResponse>[0],
        user?.id != null ? String(user.id) : undefined,
      );
      const profile: AcademyProfile = {
        ...normalized,
        first_name:
          normalized.first_name ||
          user?.first_name ||
          normalized.academy_name ||
          "",
        is_verified: data.is_verified ?? false,
      };
      setAcademyProfile(profile);
      updateAcademyDisplay({
        name: profile.academy_name,
        email: profile.contact_email,
        is_verified: profile.is_verified,
        profile_image: profile.logo_url ?? null,
      });
      return profile;
    } catch (error) {
      console.error("Failed to load academy profile:", error);
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
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [user, updateAcademyDisplay]);

  const loadCourses = useCallback(async (profile: AcademyProfile) => {
    setLoading(true);
    try {
      const response = await apiClient.get<ApiCourseFull[]>(
        API_ENDPOINTS.COURSES,
        { params: { academy_name: profile.academy_name } },
      );
      const coursesFromApi = Array.isArray(response.data) ? response.data : [];

      setCourses(
        coursesFromApi.map((course) => {
          const id = course.id != null ? String(course.id) : "";
          const imageCandidate =
            course.cover_image_url || course.lecturer_photo_url || "";

          return {
            id,
            title: String(course.title ?? ""),
            description: String(course.description ?? ""),
            category: String(course.language ?? course.location ?? ""),
            level: String(course.level ?? ""),
            duration: String(course.total_duration ?? ""),
            location: String(course.location ?? course.language ?? ""),
            price: parseCoursePrice(course.price),
            enrolledCount: parseEnrolledCount(course.enrolled_users),
            image: normalizeCourseImage(imageCandidate),
            created_at:
              course.created_at != null ? String(course.created_at) : undefined,
          } satisfies Course;
        }),
      );
      setLoadError(null);
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Failed to load courses";
      setLoadError(msg);
      toast.error(msg, {
        action: {
          label: "Retry",
          onClick: () => {
            void loadCourses(profile);
          },
        },
      });
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const profile = await fetchAcademyProfile();
      if (profile?.is_verified) {
        await loadCourses(profile);
      } else {
        setLoading(false);
      }
    })();
  }, [fetchAcademyProfile, loadCourses]);

  const freeCourses = useMemo(
    () => courses.filter((c) => c.price <= 0),
    [courses],
  );
  const paidCourses = useMemo(
    () => courses.filter((c) => c.price > 0),
    [courses],
  );

  const filteredCourses = useMemo(() => {
    if (priceFilter === "free") return freeCourses;
    if (priceFilter === "paid") return paidCourses;
    return courses;
  }, [priceFilter, freeCourses, paidCourses, courses]);

  const relativeAdded = (value?: string) => {
    if (!value) return "Added recently";
    const ms = Date.now() - new Date(value).getTime();
    if (!Number.isFinite(ms) || ms < 0) return "Added recently";
    const hours = Math.floor(ms / (1000 * 60 * 60));
    if (hours < 1) return "Added just now";
    if (hours < 24) return `Added ${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    return `Added ${days} day${days === 1 ? "" : "s"} ago`;
  };

  const handleOpenCourse = (course: Course) => {
    if (!course.id) return;
    navigate(`/academy/courses/${course.id}`);
  };

  const handleDeleteCourse = async (course: Course) => {
    if (!course.id) return;
    try {
      await apiClient.delete(`${API_ENDPOINTS.COURSES}${course.id}/`);
      setCourses((prev) => prev.filter((row) => row.id !== course.id));
      toast.success("Course deleted.");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete course.";
      toast.error(message);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-lg text-muted-foreground">Loading…</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!academyProfile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
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
      <div className="space-y-6 md:px-6 lg:px-8">
        <div className="flex flex-row items-center gap-2 sm:gap-4">
          <div className="flex min-w-0 flex-1 justify-start overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <motion.div
              layout
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 40,
                mass: 1,
              }}
              className="relative inline-flex h-12 w-max min-w-0 max-w-full flex-nowrap items-stretch justify-center gap-1 bg-white dark:bg-[#242424]/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-3xl p-1 shadow-sm"
            >
              {(
                [
                  {
                    value: "all" as const,
                    label: `All (${courses.length})`,
                  },
                  {
                    value: "free" as const,
                    label: `Free (${freeCourses.length})`,
                  },
                  {
                    value: "paid" as const,
                    label: `Paid (${paidCourses.length})`,
                  },
                ] as const
              ).map((tab) => {
                const isActive = priceFilter === tab.value;
                const pillRadius = "rounded-3xl";
                return (
                  <motion.button
                    key={tab.value}
                    type="button"
                    layout
                    onClick={() =>
                      setSearchParams(
                        (prev) => {
                          const next = new URLSearchParams(prev);
                          if (tab.value === "all") next.delete("price");
                          else next.set("price", tab.value);
                          return next;
                        },
                        { replace: true },
                      )
                    }
                    className={cn(
                      "relative inline-flex h-full min-h-0 shrink-0 items-center justify-center px-3 text-sm transition-colors duration-200 outline-none sm:px-6",
                      pillRadius,
                      isActive
                        ? "text-sky-950 dark:text-gray-100 font-bold"
                        : "text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-200",
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="academy-courses-price-pill"
                        className={cn(
                          "absolute inset-0 bg-sky-100 dark:bg-gray-700",
                          pillRadius,
                        )}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 40,
                          mass: 1,
                        }}
                      />
                    )}
                    <span className="relative z-10 whitespace-nowrap">
                      {tab.label}
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          </div>
          <div className="relative flex shrink-0">
            <Button
              onClick={() => navigate("/academy/courses/add")}
              className="h-12 w-12 shrink-0 rounded-full p-0"
              aria-label="Add new course"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="space-y-0 p-0">
            {loadError ? (
              <p className="text-xs text-destructive px-4 pt-3 md:px-6">
                {loadError}
              </p>
            ) : null}
            {loading ? (
              <div className="p-12 text-center text-muted-foreground">
                Loading…
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="p-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  {courses.length === 0
                    ? "No courses yet"
                    : "No courses match this filter"}
                </p>
                {courses.length === 0 ? (
                  <Button onClick={() => navigate("/academy/courses/add")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add a course
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredCourses.map((course) => (
                  <div
                    key={course.id}
                    className="group cursor-pointer transition-colors hover:bg-muted/30"
                    onClick={() => handleOpenCourse(course)}
                  >
                    <div className="grid grid-cols-[minmax(0,11rem)_1fr_auto] sm:grid-cols-[minmax(0,14rem)_1fr_auto] gap-x-4 gap-y-2 items-center px-4 md:px-6 py-4">
                      <h4 className="font-bold text-base md:text-lg line-clamp-2 min-w-0">
                        {course.title || "Untitled"}
                      </h4>
                      <div className="flex flex-wrap items-center justify-start gap-x-4 gap-y-2 min-w-0">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span>{course.location || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 shrink-0" />
                          <span>{course.duration || "Duration N/A"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <GraduationCap className="h-4 w-4 shrink-0" />
                          <span className="capitalize">
                            {course.level || "Level N/A"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Users className="h-4 w-4 shrink-0" />
                          <span>
                            {course.enrolledCount} enrolled
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <BookOpen className="h-4 w-4 shrink-0" />
                          <span>{relativeAdded(course.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center justify-self-end">
                        {course.id ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => e.stopPropagation()}
                                className="h-8 w-8 bg-[#EDEDEE] hover:bg-[#EDEDEE]/90 dark:bg-[#2D2D30] dark:hover:bg-[#3A3A3E] text-foreground"
                                aria-label="Course actions"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <DropdownMenuItem
                                onClick={() => handleOpenCourse(course)}
                              >
                                Edit course
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteCourse(course)}
                                className="text-destructive focus:text-destructive"
                              >
                                Delete course
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AcademyCoursesPage;
