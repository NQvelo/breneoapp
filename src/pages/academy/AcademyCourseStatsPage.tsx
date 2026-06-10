import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AcademyCourseRegisteredPanel } from "@/components/academy/AcademyCourseRegisteredPanel";
import {
  fetchAcademyCourseById,
  type AcademyCourseDetail,
} from "@/api/academy/courseApi";
import { fetchCourseAnalytics } from "@/api/academy/courseAnalyticsApi";
import {
  BookOpen,
  Clock,
  Eye,
  GraduationCap,
  Loader2,
  MapPin,
  Pencil,
  Users,
} from "lucide-react";
import { toast } from "sonner";

function relativeAdded(value?: string): string {
  if (!value) return "Added recently";
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "Added recently";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return "Added just now";
  if (hours < 24) return `Added ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `Added ${days} day${days === 1 ? "" : "s"} ago`;
}

function priceLabel(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return "Free";
  return `${price.toFixed(2)}`;
}

export default function AcademyCourseStatsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<AcademyCourseDetail | null>(null);
  const [viewCount, setViewCount] = useState(0);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const id = String(courseId ?? "").trim();
    if (!id) {
      setLoadError("Missing course id.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [row, analytics] = await Promise.all([
        fetchAcademyCourseById(id),
        fetchCourseAnalytics(id).catch(() => null),
      ]);
      setCourse(row);
      setViewCount(analytics?.view_count ?? row.viewCount);
      setRegisteredCount(
        analytics?.registered_count ?? row.enrolledUsers.length,
      );
      setLoadError(null);
    } catch (e: unknown) {
      const msg =
        e instanceof Error && e.message.trim()
          ? e.message.trim()
          : "Could not load course.";
      setLoadError(msg);
      setCourse(null);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [load]);

  const handleEdit = () => {
    const id = String(courseId ?? "").trim();
    if (!id) return;
    navigate(`/academy/courses/edit/${id}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading course…
          </div>
        ) : loadError ? (
          <Card>
            <CardContent className="py-12 text-center text-destructive">
              {loadError}
            </CardContent>
          </Card>
        ) : course ? (
          <>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400 capitalize">
                      {course.level || "Course"}
                    </p>
                    <CardTitle className="text-xl md:text-2xl font-bold">
                      {course.title || "Untitled"}
                    </CardTitle>
                  </div>
                  <Button
                    onClick={handleEdit}
                    disabled={!courseId}
                    size="sm"
                    className="shrink-0"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit course
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {course.location || course.language || "Location not specified"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 shrink-0" />
                    <span className="capitalize">
                      {course.level || "Level not specified"}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4 shrink-0" />
                    {course.total_duration
                      ? `${course.total_duration} duration`
                      : "Duration not specified"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 shrink-0" />
                    {relativeAdded(course.created_at)}
                  </span>
                </div>
                <p className="text-sm">
                  <span className="text-muted-foreground">Price: </span>
                  {priceLabel(course.price)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-4 py-3 border-b-0">
                <CardTitle className="text-lg font-semibold">
                  Course analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-[#F2F2F3] dark:bg-[#171717] p-4 space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Eye className="h-4 w-4 shrink-0" />
                      <p className="text-xs">Page views</p>
                    </div>
                    <p className="text-3xl font-bold text-foreground">
                      {viewCount.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total course detail page views
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F2F2F3] dark:bg-[#171717] p-4 space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4 shrink-0" />
                      <p className="text-xs">Registered</p>
                    </div>
                    <p className="text-3xl font-bold text-foreground">
                      {registeredCount.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Students enrolled in this course
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <AcademyCourseRegisteredPanel enrolledUsers={course.enrolledUsers} />
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
