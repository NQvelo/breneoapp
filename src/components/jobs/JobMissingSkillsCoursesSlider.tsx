import React, { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Clock, GraduationCap, CheckCircle2 } from "lucide-react";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { courseMatchesMissingSkills } from "@/utils/courseSkillMatch";

export type JobCourseRecommendation = {
  id: string;
  title: string;
  provider: string;
  duration: string;
  level: string;
  image: string;
  required_skills: string[];
};

function normalizeCourseImage(raw: string): string {
  const t = raw.trim();
  if (!t) return "/lovable-uploads/no_photo.png";
  if (t.startsWith("http") || t.startsWith("/")) return t;
  return `/${t}`;
}

function mapApiCourse(raw: Record<string, unknown>): JobCourseRecommendation {
  const id = raw.id != null ? String(raw.id) : "";
  const coverImageUrl =
    (raw.cover_image_url as string | undefined) ||
    (raw.lecturer_photo_url as string | undefined) ||
    "";
  const requiredSkills = Array.isArray(raw.required_skills)
    ? (raw.required_skills as unknown[]).map((s) => String(s)).filter(Boolean)
    : [];

  return {
    id,
    title: String(raw.title ?? ""),
    provider: String(raw.academy_name ?? ""),
    duration: String(raw.total_duration ?? ""),
    level: String(raw.level ?? ""),
    image: normalizeCourseImage(coverImageUrl),
    required_skills: requiredSkills,
  };
}

async function fetchCoursesForJobPage(): Promise<JobCourseRecommendation[]> {
  const response = await apiClient.get(API_ENDPOINTS.COURSES);
  if (!Array.isArray(response.data)) return [];
  return (response.data as Record<string, unknown>[])
    .filter((row) => row && typeof row === "object")
    .map(mapApiCourse)
    .filter((c) => c.id && c.title);
}

export interface JobMissingSkillsCoursesSliderProps {
  missingSkills: string[];
}

export function JobMissingSkillsCoursesSlider({
  missingSkills,
}: JobMissingSkillsCoursesSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["job-detail-courses"],
    queryFn: fetchCoursesForJobPage,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: missingSkills.length > 0,
  });

  const allSkillsCovered = missingSkills.length === 0;

  const matchedCourses = useMemo(() => {
    if (missingSkills.length === 0) return [];
    return courses.filter((course) =>
      courseMatchesMissingSkills(course.required_skills, missingSkills),
    );
  }, [courses, missingSkills]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = 320;
    el.scrollTo({
      left:
        direction === "left"
          ? el.scrollLeft - amount
          : el.scrollLeft + amount,
      behavior: "smooth",
    });
  };

  return (
    <div className="mt-8 border-t border-gray-100 pt-6 dark:border-gray-800">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Courses for your missing skills
          </h3>
          {allSkillsCovered ? (
            <p className="mt-1 text-xs text-muted-foreground">
              You have every required skill for this role
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Based on skills you still need for this role
            </p>
          )}
        </div>
        {!isLoading && matchedCourses.length > 0 ? (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => scroll("left")}
              aria-label="Scroll courses left"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => scroll("right")}
              aria-label="Scroll courses right"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>

      {allSkillsCovered ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-10 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-foreground">
            You don&apos;t need to enroll in any courses
          </p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            You&apos;ve selected all required skills for this job, so there are
            no skill gaps to fill with additional training.
          </p>
        </div>
      ) : isLoading ? (
        <div className="-mx-2 flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 pb-2 scrollbar-hide">
          {[0, 1, 2].map((i) => (
            <Card
              key={i}
              className="min-w-[280px] flex-shrink-0 snap-start rounded-3xl"
            >
              <CardContent className="p-0">
                <Skeleton className="h-36 w-full rounded-t-3xl" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : matchedCourses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <GraduationCap className="h-10 w-10 text-muted-foreground/70" />
          </div>
          <p className="text-sm font-medium text-foreground">No courses found</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            We couldn&apos;t find courses that teach the skills you&apos;re
            missing for this role yet.
          </p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="-mx-2 flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 pb-2 scrollbar-hide"
        >
          {matchedCourses.map((course) => (
            <Link
              key={course.id}
              to={`/course/${course.id}`}
              className="block min-w-[280px] flex-shrink-0 snap-start"
            >
              <Card className="group h-full overflow-hidden rounded-3xl transition-shadow hover:shadow-md">
                <CardContent className="flex h-full flex-col p-0">
                  <div className="relative h-36 w-full overflow-hidden">
                    <img
                      src={course.image}
                      alt={course.title}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "/lovable-uploads/no_photo.png";
                      }}
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h4 className="mb-1 line-clamp-2 text-sm font-semibold group-hover:text-breneo-blue">
                      {course.title}
                    </h4>
                    {course.provider ? (
                      <p className="mb-3 line-clamp-1 text-xs text-muted-foreground">
                        {course.provider}
                      </p>
                    ) : null}
                    <div className="mt-auto flex flex-wrap items-center gap-2">
                      {course.duration ? (
                        <Badge
                          variant="secondary"
                          className="gap-1 rounded-[10px] px-2.5 py-0.5 text-xs font-normal"
                        >
                          <Clock className="h-3 w-3" />
                          {course.duration}
                        </Badge>
                      ) : null}
                      {course.level ? (
                        <Badge
                          variant="outline"
                          className="rounded-[10px] px-2.5 py-0.5 text-xs font-normal capitalize"
                        >
                          {course.level}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
