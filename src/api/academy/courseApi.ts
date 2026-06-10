import axios from "axios";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";

export type CourseEnrolledUser = {
  id: number | string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

export type AcademyCourseDetail = {
  id: string;
  title: string;
  description: string;
  level: string;
  language: string;
  location: string;
  price: number;
  lessons_count: number;
  total_duration: string;
  lecturer_name: string;
  created_at?: string;
  viewCount: number;
  enrolledUsers: CourseEnrolledUser[];
};

export function parseEnrolledUsersFromApi(raw: unknown): CourseEnrolledUser[] {
  if (!Array.isArray(raw)) return [];
  const out: CourseEnrolledUser[] = [];
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
}

export function parseCourseViewCount(raw: unknown): number {
  if (!raw || typeof raw !== "object") return 0;
  const o = raw as Record<string, unknown>;
  for (const key of ["view_count", "views_count", "views", "page_views"]) {
    const n = Number(o[key]);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return 0;
}

function parseCoursePrice(raw: string | number | null | undefined): number {
  const n = Number(raw ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeAcademyCourseDetail(raw: unknown): AcademyCourseDetail {
  const o =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    id: o.id != null ? String(o.id) : "",
    title: String(o.title ?? ""),
    description: String(o.description ?? ""),
    level: String(o.level ?? ""),
    language: String(o.language ?? ""),
    location: String(o.location ?? ""),
    price: parseCoursePrice(o.price as string | number | null | undefined),
    lessons_count:
      typeof o.lessons_count === "number"
        ? o.lessons_count
        : Number.parseInt(String(o.lessons_count ?? "0"), 10) || 0,
    total_duration: String(o.total_duration ?? ""),
    lecturer_name: String(o.lecturer_name ?? ""),
    created_at: o.created_at != null ? String(o.created_at) : undefined,
    viewCount: parseCourseViewCount(o),
    enrolledUsers: parseEnrolledUsersFromApi(o.enrolled_users),
  };
}

export async function fetchAcademyCourseById(
  courseId: string,
): Promise<AcademyCourseDetail> {
  const id = String(courseId ?? "").trim();
  if (!id) throw new Error("Missing course id.");
  const response = await apiClient.get(`${API_ENDPOINTS.COURSES}${id}/`);
  return normalizeAcademyCourseDetail(response.data);
}

/** Skill IDs from API `skills_taught` and/or legacy `required_skills`. */
export function parseSkillIdsFromCourseApi(course: {
  skills_taught?: unknown;
  required_skills?: unknown;
}): number[] {
  const ids: number[] = [];

  const push = (raw: unknown) => {
    if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) {
      ids.push(raw);
      return;
    }
    if (typeof raw === "string") {
      const t = raw.trim();
      if (/^\d+$/.test(t)) ids.push(Number(t));
      return;
    }
    if (raw && typeof raw === "object") {
      const id = Number((raw as Record<string, unknown>).id);
      if (Number.isInteger(id) && id > 0) ids.push(id);
    }
  };

  if (Array.isArray(course.skills_taught)) {
    for (const item of course.skills_taught) push(item);
  }
  if (Array.isArray(course.required_skills)) {
    for (const item of course.required_skills) push(item);
  }

  return [...new Set(ids)].sort((a, b) => a - b);
}

export type CourseWriteFields = {
  title: string;
  description: string;
  level: string;
  language: string;
  location: string;
  price: number;
  lessons_count: number;
  total_duration: string;
  skillIds: number[];
  lecturer_name: string;
  lecturer_photo_url: string | null;
  academy_name?: string;
};

export function buildCourseJsonPayload(
  fields: CourseWriteFields,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    title: fields.title,
    description: fields.description,
    level: fields.level,
    language: fields.language,
    location: fields.location,
    price: fields.price,
    lessons_count: fields.lessons_count,
    total_duration: fields.total_duration,
    skills_taught: fields.skillIds,
    registration_link: "",
    lecturer_name: fields.lecturer_name,
    lecturer_photo_url: fields.lecturer_photo_url || "",
  };
  if (fields.academy_name != null) {
    body.academy_name = fields.academy_name;
  }
  return body;
}

export function appendCourseFieldsToFormData(
  formData: FormData,
  fields: CourseWriteFields,
): void {
  formData.append("title", fields.title);
  formData.append("description", fields.description);
  formData.append("level", fields.level);
  formData.append("language", fields.language);
  formData.append("location", fields.location);
  formData.append("price", String(fields.price));
  formData.append("lessons_count", String(fields.lessons_count));
  formData.append("total_duration", fields.total_duration);
  formData.append("registration_link", "");
  formData.append("lecturer_name", fields.lecturer_name);
  formData.append("lecturer_photo_url", fields.lecturer_photo_url || "");
  if (fields.academy_name != null) {
    formData.append("academy_name", fields.academy_name);
  }
  for (const id of fields.skillIds) {
    formData.append("skills_taught", String(id));
  }
}

export function formatCourseApiError(
  error: unknown,
  fallback: string,
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string" && data.trim()) return data.trim();
    if (data && typeof data === "object") {
      const o = data as Record<string, unknown>;
      if (typeof o.detail === "string" && o.detail.trim()) return o.detail;
      if (Array.isArray(o.detail) && o.detail.length > 0) {
        return o.detail.map((x) => String(x)).join("; ");
      }
      if (typeof o.error === "string" && o.error.trim()) return o.error;
      const fieldErrors = Object.entries(o)
        .filter(([key]) => key !== "detail" && key !== "error")
        .map(([key, val]) => {
          if (Array.isArray(val)) return `${key}: ${val.map(String).join(", ")}`;
          return `${key}: ${String(val)}`;
        });
      if (fieldErrors.length > 0) return fieldErrors.join("; ");
    }
    if (error.message) return error.message;
  }
  return error instanceof Error ? error.message : fallback;
}
