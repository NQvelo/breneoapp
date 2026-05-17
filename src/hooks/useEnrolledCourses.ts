import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";

export interface EnrolledCourseItem {
  id: string;
  title: string;
  provider: string;
  category: string;
  level: string;
  duration: string;
  image: string;
}

function normalizeImagePath(imagePath: string | null | undefined): string {
  if (!imagePath) return "/lovable-uploads/no_photo.png";
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }
  if (imagePath.startsWith("/")) return imagePath;
  return `/${imagePath}`;
}

function userIsEnrolledInCourse(
  course: Record<string, unknown>,
  userId: string,
): boolean {
  if (course.is_enrolled === true) return true;
  const raw = course.enrolled_users;
  if (!Array.isArray(raw)) return false;
  return raw.some((item) => {
    if (!item || typeof item !== "object") return false;
    const id = (item as Record<string, unknown>).id;
    return id != null && String(id) === userId;
  });
}

function mapCourseToEnrolledItem(
  course: Record<string, unknown>,
): EnrolledCourseItem {
  const id = course.id != null ? String(course.id) : "";
  const cover =
    (course.cover_image_url as string | undefined) ||
    (course.lecturer_photo_url as string | undefined) ||
    "";
  return {
    id,
    title: String(course.title ?? ""),
    provider: String(course.academy_name ?? ""),
    category: String(course.language ?? course.location ?? ""),
    level: String(course.level ?? ""),
    duration: String(course.total_duration ?? ""),
    image: normalizeImagePath(cover),
  };
}

export const ENROLLED_COURSES_QUERY_KEY = ["enrolledCourses"] as const;

export function useEnrolledCourses(enabled: boolean, userId?: string | number) {
  const uid = userId != null ? String(userId) : "";

  return useQuery({
    queryKey: [...ENROLLED_COURSES_QUERY_KEY, uid],
    queryFn: async (): Promise<EnrolledCourseItem[]> => {
      const response = await apiClient.get(API_ENDPOINTS.COURSES);
      const list = Array.isArray(response.data)
        ? (response.data as Record<string, unknown>[])
        : [];
      return list
        .filter((course) => userIsEnrolledInCourse(course, uid))
        .map(mapCourseToEnrolledItem)
        .filter((c) => c.id.length > 0);
    },
    enabled: enabled && uid.length > 0,
    staleTime: 60_000,
  });
}
