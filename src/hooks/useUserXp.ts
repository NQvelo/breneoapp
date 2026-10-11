import { useEnrolledCourses } from "@/hooks/useEnrolledCourses";
import { useMyApplications } from "@/hooks/useMyApplications";

export const XP_PER_JOB_APPLICATION = 5;
export const XP_PER_COURSE_ENROLLMENT = 10;

export interface UserXp {
  xp: number;
  jobApplicationsCount: number;
  courseEnrollmentsCount: number;
  isLoading: boolean;
}

/** XP derived from the user's job applications and course enrollments (job seekers only). */
export function useUserXp(
  enabled: boolean,
  userId?: string | number,
): UserXp {
  const { data: myApps, isLoading: loadingApps } = useMyApplications(enabled);
  const { data: enrolledCourses, isLoading: loadingCourses } =
    useEnrolledCourses(enabled, userId);

  const jobApplicationsCount =
    myApps?.pagination?.total ?? myApps?.applications.length ?? 0;
  const courseEnrollmentsCount = enrolledCourses?.length ?? 0;

  return {
    xp:
      jobApplicationsCount * XP_PER_JOB_APPLICATION +
      courseEnrollmentsCount * XP_PER_COURSE_ENROLLMENT,
    jobApplicationsCount,
    courseEnrollmentsCount,
    isLoading: enabled && (loadingApps || loadingCourses),
  };
}
