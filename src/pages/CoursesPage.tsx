import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import {
  calculateSkillScores,
  getTopSkills,
  getUserTestAnswers,
  filterHardSkills,
} from "@/utils/skillTestUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Bookmark, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { cn } from "@/lib/utils";
import { BetaVersionModal } from "@/components/common/BetaVersionModal";

const COURSES_FILTERED_RESULTS_KEY = "coursesResults";

const saveFilteredCoursesToSession = (courses: Course[]) => {
  try {
    sessionStorage.setItem(
      COURSES_FILTERED_RESULTS_KEY,
      JSON.stringify(courses),
    );
  } catch (error) {
    console.error("Error saving filtered courses to session storage:", error);
  }
};

const loadFilteredCoursesFromSession = (): Course[] => {
  try {
    const stored = sessionStorage.getItem(COURSES_FILTERED_RESULTS_KEY);
    if (stored) {
      return JSON.parse(stored) as Course[];
    }
  } catch (error) {
    console.error(
      "Error loading filtered courses from session storage:",
      error,
    );
  }
  return [];
};

interface AcademyProfile {
  id: string;
  academy_name: string;
  description: string;
  website_url?: string;
  contact_email?: string;
  logo_url?: string;
  profile_photo_url?: string;
  profile_image_url?: string;
  slug?: string;
}

interface Course {
  id: string;
  title: string;
  provider: string;
  category: string;
  level: string;
  duration: string;
  match: number;
  enrolled: boolean;
  popular: boolean;
  image: string;
  description: string;
  topics: string[];
  required_skills: string[];
  is_saved: boolean;
  academy_id: string | null;
  academy_profiles?: { slug?: string } | null;
  academy_profile_data?: AcademyProfile | null;
}

const isAcademyCourse = (course: Course) =>
  course.academy_id != null && course.academy_id !== "";

const AcademyLogo = ({ name, src }: { name: string; src: string | null }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white text-sm font-bold md:h-12 md:w-12 md:rounded-xl md:text-base text-breneo-blue dark:border-gray-700 dark:bg-[#2C2C2C]">
      {src && !failed ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );
};

const CoursesPage = () => {
  const { user } = useAuth();
  const t = useTranslation();
  const queryClient = useQueryClient();
  // State for user's top skills from test results
  const [userTopSkills, setUserTopSkills] = useState<string[]>([]);
  const [sessionFilteredCourses, setSessionFilteredCourses] = useState<
    Course[]
  >(() => loadFilteredCoursesFromSession());

  // Fetch user's top skills from test results (used only for match sorting)
  useEffect(() => {
    const fetchUserSkills = async () => {
      if (!user) return;

      try {
        try {
          const response = await apiClient.get("/api/skilltest/results/");
          if (
            response.data &&
            Array.isArray(response.data) &&
            response.data.length > 0
          ) {
            const skillsJson = response.data[0].skills_json;
            const allSkills: string[] = skillsJson?.tech
              ? Object.keys(skillsJson.tech)
              : [];
            setUserTopSkills(filterHardSkills(allSkills).slice(0, 5));
            return;
          }
        } catch (apiError) {
          console.log("API endpoint not available, trying Supabase...");
        }

        const answers = await getUserTestAnswers(String(user.id));
        if (answers && answers.length > 0) {
          const skillScores = calculateSkillScores(answers);
          const allTopSkills = getTopSkills(skillScores, 10).map(
            (s) => s.skill,
          );
          setUserTopSkills(filterHardSkills(allTopSkills).slice(0, 5));
        }
      } catch (error) {
        console.error("Error fetching user skills:", error);
      }
    };

    fetchUserSkills();
  }, [user]);

  const isValidUUID = React.useCallback((value: unknown) => {
    if (typeof value !== "string") return false;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }, []);

  // Support both UUID strings and integer IDs from backend
  const userId = user?.id ? String(user.id) : null;
  // Remove UUID validation - backend uses integer IDs, not UUIDs
  const canUseUserId = React.useMemo(
    () => !!userId && userId.length > 0,
    [userId],
  );

  const { data: savedCourses = [] } = useQuery({
    queryKey: ["savedCourses", userId],
    queryFn: async () => {
      if (!userId || !canUseUserId) return [];

      try {
        // Fetch from profile API
        const profileResponse = await apiClient.get(
          API_ENDPOINTS.AUTH.PROFILE,
          {
            timeout: 30000, // 30 seconds timeout
          },
        );
        const savedCoursesArray = profileResponse.data?.saved_courses || [];
        return savedCoursesArray.map((id: string | number) => String(id));
      } catch (error) {
        console.error("Error fetching saved courses from profile API:", error);
        return [];
      }
    },
    enabled: canUseUserId,
  });

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ["courses", savedCourses],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.COURSES);
      if (!response.data || !Array.isArray(response.data)) {
        console.error("Error fetching courses: invalid response shape");
        return [];
      }

      return (response.data as Array<Record<string, unknown>>).map((course) => {
        const id = course.id != null ? String(course.id) : "";
        const coverImageUrl =
          (course.cover_image_url as string | undefined) ||
          (course.lecturer_photo_url as string | undefined) ||
          "/lovable-uploads/no_photo.png";

        const image =
          coverImageUrl &&
          !coverImageUrl.startsWith("/") &&
          !coverImageUrl.startsWith("http")
            ? `/${coverImageUrl}`
            : coverImageUrl;

        const requiredSkills = Array.isArray(course.required_skills)
          ? (course.required_skills as unknown[]).map((s) => String(s))
          : [];

        return {
          id,
          title: String(course.title ?? ""),
          provider: String(course.academy_name ?? ""),
          category: String(course.language ?? course.location ?? ""),
          level: String(course.level ?? ""),
          duration: String(course.total_duration ?? ""),
          match: 0,
          enrolled: Boolean(course.is_enrolled),
          popular: false,
          image: image || "/lovable-uploads/no_photo.png",
          description: String(course.description ?? ""),
          topics: [],
          required_skills: requiredSkills,
          is_saved: savedCourses?.includes(id),
          academy_id:
            course.academy_id != null ? String(course.academy_id) : null,
          academy_profiles: null,
          academy_profile_data: null,
        } satisfies Course;
      });
    },
    enabled: !!savedCourses,
    // Optimize caching and refetching behavior
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 3 * 60 * 1000, // Keep data fresh for 3 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const coursesWithMatches = React.useMemo(() => {
    if (!courses) return [];
    // Match score is always based on the user's skill test, not on filter selection.
    if (!userTopSkills || userTopSkills.length === 0) {
      return courses.map((course) => ({
        ...course,
        match: 50,
      }));
    }

    return courses
      .map((course) => {
        const matchingSkills = course.required_skills.filter((skill) =>
          userTopSkills.some(
            (userSkill) =>
              userSkill.toLowerCase().includes(skill.toLowerCase()) ||
              skill.toLowerCase().includes(userSkill.toLowerCase()),
          ),
        );
        const matchPercentage =
          course.required_skills.length > 0
            ? Math.round(
                (matchingSkills.length / course.required_skills.length) * 100,
              )
            : 50;
        return {
          ...course,
          match: Math.max(matchPercentage, 25),
        };
      })
      .sort((a, b) => b.match - a.match);
  }, [userTopSkills, courses]);

  const filteredCourses = React.useMemo(() => {
    return coursesWithMatches;
  }, [coursesWithMatches]);

  useEffect(() => {
    if (coursesLoading) {
      return;
    }
    saveFilteredCoursesToSession(filteredCourses);
    setSessionFilteredCourses(filteredCourses);
  }, [filteredCourses, coursesLoading]);

  const SaveCourseButton = ({
    course,
    className,
  }: {
    course: Course;
    className?: string;
  }) => {
    const queryClient = useQueryClient();
    const saveCourseMutation = useMutation({
      mutationFn: async (id: string) => {
        if (!userId) {
          throw new Error("Please log in to save courses.");
        }

        // Use the correct API endpoint with /api prefix and trailing slash
        await apiClient.post(`/api/save-course/${id}/`);
      },
      onMutate: async (id: string) => {
        // Cancel any outgoing refetches
        await queryClient.cancelQueries({
          queryKey: ["savedCourses", userId],
        });

        // Snapshot the previous value
        const previousSavedCourses = queryClient.getQueryData<string[]>([
          "savedCourses",
          userId,
        ]);

        // Optimistically update to the new value
        let wasSaved = false;
        queryClient.setQueryData<string[]>(["savedCourses", userId], (prev) => {
          if (!prev) return prev;
          const idString = String(id);
          wasSaved = prev.includes(idString);
          return wasSaved
            ? prev.filter((c) => c !== idString)
            : [...prev, idString];
        });

        // Return a context object with the snapshotted value
        return { previousSavedCourses, wasSaved };
      },
      onError: (error, id, context) => {
        // If the mutation fails, use the context returned from onMutate to roll back
        if (context?.previousSavedCourses && userId) {
          queryClient.setQueryData(
            ["savedCourses", userId],
            context.previousSavedCourses,
          );
        }

        console.error("Error updating saved courses:", error);
        toast.error("Failed to update saved courses. Please try again.");
      },
      onSuccess: (_, id, context) => {
        // Invalidate queries to ensure consistency
        queryClient.invalidateQueries({ queryKey: ["savedCourses", userId] });
        queryClient.invalidateQueries({ queryKey: ["courses"] });
        queryClient.invalidateQueries({ queryKey: ["profile"] });

        const idString = String(id);
        const wasSaved = context?.wasSaved ?? false;
        toast.success(
          wasSaved
            ? "Removed from saved courses."
            : "Course saved to your profile.",
        );
      },
    });

    const isCourseSaved = savedCourses?.includes(String(course.id));

    return (
      <Button
        variant="secondary"
        size="icon"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          saveCourseMutation.mutate(String(course.id));
        }}
        disabled={saveCourseMutation.isPending}
        aria-label={isCourseSaved ? "Unsave course" : "Save course"}
        className={cn(
          "bg-[#E6E7EB] hover:bg-[#E6E7EB]/90 dark:bg-[#3A3A3A] dark:hover:bg-[#4A4A4A] h-10 w-10 flex-shrink-0",
          isCourseSaved
            ? "text-breneo-blue bg-breneo-blue/10 hover:bg-breneo-blue/15 dark:bg-breneo-blue/20 dark:hover:bg-breneo-blue/30"
            : "text-black dark:text-white",
          className,
        )}
      >
        <Bookmark
          className={cn(
            "h-4 w-4 transition-colors",
            isCourseSaved
              ? "text-breneo-blue fill-breneo-blue animate-heart-pop"
              : "text-black dark:text-white",
          )}
        />
      </Button>
    );
  };

  const courseMeta = (course: Course) =>
    [course.duration, course.level, course.category]
      .filter(Boolean)
      .join(" · ");

  const renderAcademyCourseRow = (course: Course) => (
    <Link key={course.id} to={`/course/${course.id}`} className="block">
      <div className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30 md:px-5">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold transition-colors group-hover:text-breneo-blue">
            {course.title}
          </h3>
          {courseMeta(course) ? (
            <p className="mt-0.5 truncate text-xs text-gray-500">
              {courseMeta(course)}
            </p>
          ) : null}
        </div>
        <div onClick={(e) => e.preventDefault()}>
          <SaveCourseButton course={course} className="h-8 w-8" />
        </div>
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400 transition-colors group-hover:text-breneo-blue" />
      </div>
    </Link>
  );

  const renderOurCourseRow = (course: Course) => (
    <Link key={course.id} to={`/course/${course.id}`} className="block">
      <div className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/30 md:px-6">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-base font-semibold transition-colors group-hover:text-breneo-blue">
            {course.title}
          </h3>
          {courseMeta(course) ? (
            <p className="mt-1 truncate text-sm text-gray-500">
              {courseMeta(course)}
            </p>
          ) : null}
        </div>
        <div onClick={(e) => e.preventDefault()}>
          <SaveCourseButton course={course} />
        </div>
      </div>
    </Link>
  );

  const shouldShowSavedCourses =
    coursesLoading && sessionFilteredCourses.length > 0;
  const coursesToDisplay = shouldShowSavedCourses
    ? sessionFilteredCourses
    : filteredCourses;
  const academyCourses = coursesToDisplay.filter(isAcademyCourse);
  const ourCourses = coursesToDisplay.filter(
    (course) => !isAcademyCourse(course),
  );
  const showCourseLists = shouldShowSavedCourses || !coursesLoading;

  const academyIds = [
    ...new Set(academyCourses.map((course) => course.academy_id as string)),
  ].sort();

  const { data: academyProfiles = {} } = useQuery({
    queryKey: ["academyProfiles", academyIds],
    queryFn: async () => {
      const entries = await Promise.all(
        academyIds.map(async (academyId) => {
          try {
            const response = await apiClient.get(
              `${API_ENDPOINTS.ACADEMY.DETAIL}${academyId}/`,
            );
            const responseData = (response.data ?? {}) as Record<
              string,
              unknown
            >;
            const profileData =
              (responseData.profile_data as Record<string, unknown>) ||
              responseData;
            const firstString = (values: unknown[]) =>
              values.find(
                (value): value is string =>
                  typeof value === "string" && value.trim() !== "",
              ) ?? null;
            const logo = firstString([
              profileData.logo_url,
              profileData.logoUrl,
              profileData.logo,
              profileData.profile_photo_url,
              profileData.profile_image_url,
              responseData.logo_url,
            ]);
            const description = firstString([
              profileData.description,
              responseData.description,
            ]);
            const normalizedLogo =
              logo && !logo.startsWith("http") && !logo.startsWith("/")
                ? `/${logo}`
                : logo;
            return [academyId, { logo: normalizedLogo, description }] as const;
          } catch {
            return [academyId, { logo: null, description: null }] as const;
          }
        }),
      );
      return Object.fromEntries(entries) as Record<
        string,
        { logo: string | null; description: string | null }
      >;
    },
    enabled: academyIds.length > 0,
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const academyGroups = academyCourses.reduce<
    { academyId: string; name: string; courses: Course[] }[]
  >((groups, course) => {
    const academyId = course.academy_id as string;
    const existing = groups.find((g) => g.academyId === academyId);
    if (existing) {
      existing.courses.push(course);
    } else {
      groups.push({
        academyId,
        name: course.provider || t.courses.academyCourses,
        courses: [course],
      });
    }
    return groups;
  }, []);

  const sectionHeading = (title: string, count: number) => (
    <div className="mb-4 flex items-center gap-3">
      <h2 className="text-lg font-bold">{title}</h2>
      <span className="text-sm text-gray-600">{count}</span>
    </div>
  );

  return (
    <DashboardLayout>
      <BetaVersionModal />

      <div className="max-w-7xl mx-auto py-6 px-2 sm:px-6 lg:px-8 pb-32 md:pb-16">
        {coursesLoading && !shouldShowSavedCourses ? (
          <div className="space-y-10">
            <section>
              {sectionHeading(t.courses.academyCourses, 0)}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="min-h-[220px] rounded-3xl bg-white p-5 dark:bg-[#242424] md:p-6">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                  <Skeleton className="mt-5 h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-3/4" />
                </div>
                <div className="overflow-hidden rounded-3xl bg-white divide-y divide-gray-200 dark:bg-[#242424] dark:divide-gray-700">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="px-4 py-3 md:px-5">
                      <Skeleton className="mb-2 h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  ))}
                </div>
              </div>
            </section>
            <section>
              {sectionHeading(t.courses.ourCourses, 0)}
              <div className="overflow-hidden rounded-3xl bg-white dark:bg-[#242424]">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="px-6 py-4">
                    <Skeleton className="mb-2 h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {showCourseLists ? (
          <>
            <section className="mb-10">
              {sectionHeading(t.courses.academyCourses, academyCourses.length)}
              {academyCourses.length === 0 ? (
                <p className="rounded-3xl bg-white px-6 py-10 text-center text-sm text-muted-foreground dark:bg-[#242424]">
                  {t.courses.noAcademyCourses}
                </p>
              ) : (
                <div className="space-y-6">
                  {academyGroups.map((group) => {
                    const profile = academyProfiles[group.academyId];
                    const bestMatch = Math.max(
                      ...group.courses.map((course) => course.match),
                    );
                    return (
                      <div
                        key={group.academyId}
                        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
                      >
                        <Link
                          to={`/academy/${group.academyId}`}
                          className="group flex h-full min-h-[220px] flex-col rounded-3xl bg-gradient-to-br from-white via-white to-breneo-blue/15 p-5 dark:from-[#242424] dark:via-[#242424] dark:to-breneo-blue/20 md:p-6"
                        >
                          <div className="flex items-start gap-3">
                            <AcademyLogo
                              name={group.name}
                              src={profile?.logo ?? null}
                            />
                            <h3 className="min-w-0 flex-1 self-center truncate text-base font-bold md:text-lg">
                              {group.name}
                            </h3>
                            <ArrowUpRight className="h-5 w-5 flex-shrink-0 text-gray-500 transition-colors group-hover:text-breneo-blue" />
                          </div>
                          {profile?.description ? (
                            <p className="mt-5 line-clamp-3 text-sm text-gray-700 dark:text-gray-300">
                              {profile.description}
                            </p>
                          ) : null}
                          <div className="mt-auto flex gap-10 pt-6">
                            <div>
                              <p className="text-2xl font-bold">
                                {group.courses.length}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {t.courses.totalCourses}
                              </p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold">{bestMatch}%</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {t.courses.bestMatch}
                              </p>
                            </div>
                          </div>
                        </Link>
                        <div className="self-start overflow-hidden rounded-3xl bg-white divide-y divide-gray-200 dark:bg-[#242424] dark:divide-gray-700">
                          {group.courses.map((course) =>
                            renderAcademyCourseRow(course),
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
            <section className="mb-10">
              {sectionHeading(t.courses.ourCourses, ourCourses.length)}
              <div className="overflow-hidden rounded-3xl bg-white divide-y divide-gray-200 dark:bg-[#242424] dark:divide-gray-700">
                {ourCourses.length === 0 ? (
                  <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                    {t.courses.noOurCourses}
                  </p>
                ) : (
                  ourCourses.map((course) => renderOurCourseRow(course))
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
};
export default CoursesPage;
