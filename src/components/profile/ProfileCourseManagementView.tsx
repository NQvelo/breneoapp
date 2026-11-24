import { useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, GraduationCap, Loader2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useMobile } from "@/hooks/use-mobile";
import {
  ENROLLED_COURSES_QUERY_KEY,
  useEnrolledCourses,
} from "@/hooks/useEnrolledCourses";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ManagementCourse {
  id: string;
  title: string;
  provider: string;
  image: string;
  academyId?: string;
  academyLogo?: string;
  academy_logo?: string | null;
}

interface SavedProfileCourse extends ManagementCourse {
  academy_logo?: string | null;
}

interface ProfileCourseManagementViewProps {
  savedCourseIds: string[];
  onToggleSave: (courseId: string) => void;
}

type CourseColumn = "saved" | "applied";

const columns: Array<{
  id: CourseColumn;
  label: string;
  dot: string;
  card: string;
}> = [
  {
    id: "saved",
    label: "Saved",
    dot: "bg-gray-400",
    card: "bg-gray-100 dark:bg-[#303030]",
  },
  {
    id: "applied",
    label: "Applied",
    dot: "bg-sky-500",
    card: "bg-sky-50 dark:bg-sky-950/40",
  },
];

function normalizeLogoUrl(value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) {
    return value;
  }
  return `/${value}`;
}

export function ProfileCourseManagementView({
  savedCourseIds,
  onToggleSave,
}: ProfileCourseManagementViewProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useMobile();
  const [draggingCourseId, setDraggingCourseId] = useState<string | null>(null);
  const [courseToApply, setCourseToApply] = useState<ManagementCourse | null>(
    null,
  );
  const {
    data: savedCourses = [],
    isLoading: loadingSavedCourses,
    isError: savedCoursesError,
  } = useQuery<SavedProfileCourse[]>({
    queryKey: ["savedCoursesDetails", user?.id, savedCourseIds],
    queryFn: async () => {
      if (!user?.id || savedCourseIds.length === 0) return [];
      const response = await apiClient.get(API_ENDPOINTS.COURSES);
      const responseData = response.data as
        | Record<string, unknown>
        | unknown[]
        | null;
      const courseList = Array.isArray(responseData)
        ? responseData
        : responseData &&
            typeof responseData === "object" &&
            Array.isArray(responseData.results)
          ? responseData.results
          : [];

      return courseList.flatMap((item): SavedProfileCourse[] => {
        if (!item || typeof item !== "object") return [];
        const course = item as Record<string, unknown>;
        if (course.id == null || !savedCourseIds.includes(String(course.id))) {
          return [];
        }
        const academy =
          course.academy && typeof course.academy === "object"
            ? (course.academy as Record<string, unknown>)
            : {};
        const logo =
          course.academy_logo_url ??
          course.academy_logo ??
          course.logo_url ??
          academy.logo_url ??
          academy.logo;
        const academyLogo =
          typeof logo === "string" && logo
            ? normalizeLogoUrl(logo)
            : undefined;
        const academyId = course.academy_id ?? academy.id;

        return [
          {
            id: String(course.id),
            title: String(course.title ?? ""),
            provider: String(
              course.academy_name ?? course.provider ?? academy.name ?? "",
            ),
            image: "",
            academyId: academyId == null ? undefined : String(academyId),
            academyLogo,
          },
        ];
      });
    },
    enabled: Boolean(user?.id) && savedCourseIds.length > 0,
  });
  const {
    data: enrolledCourses = [],
    isLoading: loadingEnrolledCourses,
    isError: enrolledCoursesError,
  } = useEnrolledCourses(Boolean(user?.id), user?.id);

  const academyIdsWithoutLogo = useMemo(
    () =>
      [
        ...new Set(
          [...savedCourses, ...enrolledCourses]
            .filter((course) => !course.academyLogo && course.academyId)
            .map((course) => String(course.academyId)),
        ),
      ],
    [savedCourses, enrolledCourses],
  );
  const { data: academyLogos = {} } = useQuery<Record<string, string>>({
    queryKey: ["profile-course-academy-logos", user?.id, academyIdsWithoutLogo],
    queryFn: async () => {
      const entries = await Promise.all(
        academyIdsWithoutLogo.map(async (academyId) => {
          try {
            const response = await apiClient.get(
              `${API_ENDPOINTS.ACADEMY.DETAIL}${academyId}/`,
            );
            const data = response.data as Record<string, unknown>;
            const profileData =
              data.profile_data && typeof data.profile_data === "object"
                ? (data.profile_data as Record<string, unknown>)
                : data;
            const value =
              profileData.logo_url ??
              profileData.logoUrl ??
              profileData.logo ??
              profileData.profile_image ??
              profileData.profile_photo_url ??
              data.logo_url ??
              data.logoUrl;
            return typeof value === "string" && value
              ? ([academyId, normalizeLogoUrl(value)] as const)
              : null;
          } catch (error) {
            console.error(`Failed to load academy logo for ${academyId}`, error);
            return null;
          }
        }),
      );
      return Object.fromEntries(
        entries.filter(
          (entry): entry is readonly [string, string] => entry !== null,
        ),
      );
    },
    enabled: Boolean(user?.id) && academyIdsWithoutLogo.length > 0,
    staleTime: 5 * 60_000,
  });

  const appliedIds = useMemo(
    () => new Set(enrolledCourses.map((course) => String(course.id))),
    [enrolledCourses],
  );
  const savedOnlyCourses = savedCourses.filter(
    (course) => !appliedIds.has(String(course.id)),
  );

  const applyMutation = useMutation({
    mutationFn: async (
      course: ManagementCourse,
    ): Promise<"noop" | undefined> => {
      if (!user?.id) throw new Error("Please log in to apply to courses.");
      if (!course.id) throw new Error("Could not apply to this course.");

      const userId =
        typeof user.id === "number"
          ? user.id
          : Number.isFinite(Number(user.id))
            ? Number(user.id)
            : user.id;

      try {
        await apiClient.post(`${API_ENDPOINTS.COURSES}${course.id}/enroll/`, {});
      } catch (error: unknown) {
        const status = axios.isAxiosError(error)
          ? error.response?.status
          : undefined;
        if (status !== 404 && status !== 405) throw error;

        const response = await apiClient.get(
          `${API_ENDPOINTS.COURSES}${course.id}/`,
        );
        const data = response.data as { enrolled_users?: unknown[] } | null;
        const enrolledUsers = Array.isArray(data?.enrolled_users)
          ? data.enrolled_users
          : [];
        if (
          enrolledUsers.some(
            (entry) =>
              entry &&
              typeof entry === "object" &&
              String((entry as Record<string, unknown>).id) === String(user.id),
          )
        ) {
          return "noop";
        }

        await apiClient.patch(`${API_ENDPOINTS.COURSES}${course.id}/`, {
          enrolled_users: [
            ...enrolledUsers,
            {
              id: userId,
              email: user.email,
              first_name: user.first_name ?? "",
              last_name: user.last_name ?? "",
            },
          ],
        });
      }
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ENROLLED_COURSES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ["courses"] }),
        queryClient.invalidateQueries({ queryKey: ["home-courses"] }),
        queryClient.invalidateQueries({ queryKey: ["academy-courses"] }),
      ]);
      setCourseToApply(null);
      if (result !== "noop") toast.success("You are enrolled in this course.");
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.data) {
        const data = error.response.data as Record<string, unknown>;
        if (typeof data.detail === "string") {
          toast.error(data.detail);
          return;
        }
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not apply. Please try again.",
      );
    },
  });

  const coursesByStatus: Record<CourseColumn, ManagementCourse[]> = {
    saved: savedOnlyCourses,
    applied: enrolledCourses,
  };

  if (loadingSavedCourses || loadingEnrolledCourses) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <>
      <div className="flex overflow-x-auto rounded-3xl bg-white dark:bg-[#242424] scrollbar-hide">
        {columns.map((column) => {
          const courses = coursesByStatus[column.id];
          return (
            <section
              key={column.id}
              className={cn(
                "flex-1 min-h-[360px] bg-white p-3 dark:bg-[#242424]",
                "border-r-[8px] border-breneo-lightgray last:border-r-0 dark:border-r-[#181818]",
                isMobile
                  ? "w-[78vw] min-w-[78vw] max-w-[78vw]"
                  : "min-w-[320px]",
              )}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (column.id === "applied" && draggingCourseId) {
                  const course = savedOnlyCourses.find(
                    (item) => String(item.id) === draggingCourseId,
                  );
                  if (course) setCourseToApply(course);
                }
                setDraggingCourseId(null);
              }}
            >
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className={cn("h-2.5 w-2.5 rounded-full", column.dot)} />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {column.label}
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {courses.length}
                </span>
              </div>
              <div className="space-y-3">
                {courses.map((course) => {
                  const id = String(course.id);
                  const isSaved = savedCourseIds.includes(id);
                  const title = course.title || "Untitled course";
                  const academy = course.provider || "Academy";
                  const academyLogo =
                    course.academyLogo ??
                    course.academy_logo ??
                    (course.academyId
                      ? academyLogos[String(course.academyId)]
                      : undefined);

                  return (
                    <article
                      key={id}
                      draggable={column.id === "saved"}
                      onDragStart={() => setDraggingCourseId(id)}
                      onDragEnd={() => setDraggingCourseId(null)}
                      onClick={() =>
                        navigate(`/course/${encodeURIComponent(id)}`)
                      }
                      className={cn(
                        "cursor-pointer rounded-2xl p-4 transition-colors",
                        column.card,
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-breneo-blue/10">
                          <span className="font-semibold text-breneo-blue">
                            {academy.trim().charAt(0).toUpperCase() || "A"}
                          </span>
                          {academyLogo ? (
                            <img
                              src={academyLogo}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {academy}
                          </p>
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                            Course
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={isSaved ? "Unsave course" : "Save course"}
                          aria-pressed={isSaved}
                          onClick={(event) => {
                            event.stopPropagation();
                            onToggleSave(id);
                          }}
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
                            isSaved
                              ? "bg-breneo-blue/10 text-breneo-blue"
                              : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
                          )}
                        >
                          <Bookmark
                            className={cn(
                              "h-4 w-4",
                              isSaved && "fill-breneo-blue",
                            )}
                          />
                        </button>
                      </div>
                      <h4 className="mt-3 line-clamp-2 font-bold text-gray-900 dark:text-gray-100">
                        {title}
                      </h4>
                    </article>
                  );
                })}
                {courses.length === 0 ? (
                  <div className="flex min-h-40 flex-col items-center justify-center gap-2 px-3 text-center">
                    {(column.id === "applied" && enrolledCoursesError) ||
                    (column.id === "saved" && savedCoursesError) ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Could not load {column.label.toLowerCase()} courses.
                      </p>
                    ) : (
                      <>
                        <GraduationCap className="h-8 w-8 text-gray-400" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No {column.label.toLowerCase()} courses yet.
                        </p>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      <Dialog
        open={Boolean(courseToApply)}
        onOpenChange={(open) => {
          if (!open && !applyMutation.isPending) setCourseToApply(null);
        }}
      >
        <DialogContent className="max-w-sm gap-0">
          <DialogHeader className="space-y-2">
            <DialogTitle>Apply to this course?</DialogTitle>
            <DialogDescription>
              {courseToApply
                ? `Do you want to apply to ${courseToApply.title}?`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-2 pt-8 sm:space-x-0">
            <Button
              type="button"
              variant="ghost"
              disabled={applyMutation.isPending}
              onClick={() => setCourseToApply(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!courseToApply || applyMutation.isPending}
              onClick={() => {
                if (courseToApply) applyMutation.mutate(courseToApply);
              }}
              className="bg-breneo-blue text-white hover:bg-breneo-blue/90"
            >
              {applyMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Apply"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
