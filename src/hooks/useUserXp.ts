import { useEnrolledCourses } from "@/hooks/useEnrolledCourses";
import { useMyApplications } from "@/hooks/useMyApplications";
import { useCompletedAtoms } from "@/hooks/useCompletedAtoms";

export const XP_PER_JOB_APPLICATION = 5;
export const XP_PER_COURSE_ENROLLMENT = 10;
export const XP_PER_ATOM_COMPLETION = 5;

export interface UserXp {
  xp: number;
  jobApplicationsCount: number;
  courseEnrollmentsCount: number;
  atomCompletionsCount: number;
  isLoading: boolean;
  /** All sources have loaded, so the counts are real rather than fallback zeros. */
  isReady: boolean;
}

/** XP derived from the user's job applications, course enrollments, and atom quiz completions (job seekers only). */
export function useUserXp(
  enabled: boolean,
  userId?: string | number,
): UserXp {
  const { data: myApps, isLoading: loadingApps } = useMyApplications(enabled);
  const { data: enrolledCourses, isLoading: loadingCourses } =
    useEnrolledCourses(enabled, userId);
  const { data: atomCompletionsCount, isLoading: loadingAtoms } =
    useCompletedAtoms(enabled);

  const jobApplicationsCount =
    myApps?.pagination?.total ?? myApps?.applications.length ?? 0;
  const courseEnrollmentsCount = enrolledCourses?.length ?? 0;

  return {
    xp:
      jobApplicationsCount * XP_PER_JOB_APPLICATION +
      courseEnrollmentsCount * XP_PER_COURSE_ENROLLMENT +
      atomCompletionsCount * XP_PER_ATOM_COMPLETION,
    jobApplicationsCount,
    courseEnrollmentsCount,
    atomCompletionsCount,
    isLoading: enabled && (loadingApps || loadingCourses || loadingAtoms),
    isReady:
      enabled &&
      myApps !== undefined &&
      enrolledCourses !== undefined &&
      !loadingAtoms,
  };
}
