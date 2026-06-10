import { TokenManager } from "@/api/auth/tokenManager";

export type VisitorPeriod = "today" | "yesterday" | "last_7_days";

export type VisitorOverviewBucket = {
  label: string;
  count: number;
};

export type VisitorOverview = {
  period: VisitorPeriod;
  total_views: number;
  buckets: VisitorOverviewBucket[];
  course_count: number;
  storage?: string;
};

export type CourseAnalytics = {
  course_id: string;
  view_count: number;
  registered_count: number;
  storage?: string;
};

/** Same-origin BFF — Vite dev proxy and production.mjs both serve this path. */
function courseAnalyticsUrl(courseId: string, suffix = ""): string {
  const id = encodeURIComponent(String(courseId).trim());
  return `/api/academy/course-analytics/${id}${suffix}`;
}

export async function fetchCourseAnalytics(
  courseId: string,
): Promise<CourseAnalytics> {
  const token = TokenManager.getAccessToken();
  if (!token) throw new Error("Authentication required.");

  const res = await fetch(courseAnalyticsUrl(courseId, "/"), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const detail =
      (typeof body.detail === "string" && body.detail) ||
      (typeof body.error === "string" && body.error) ||
      `Could not load course analytics (${res.status}).`;
    throw new Error(detail);
  }
  return {
    course_id: String(body.course_id ?? courseId),
    view_count: Number(body.view_count) || 0,
    registered_count: Number(body.registered_count) || 0,
    storage: typeof body.storage === "string" ? body.storage : undefined,
  };
}

export async function fetchAcademyVisitorOverview(
  period: VisitorPeriod,
): Promise<VisitorOverview> {
  const token = TokenManager.getAccessToken();
  if (!token) throw new Error("Authentication required.");

  const url = new URL(
    "/api/academy/course-analytics/overview/",
    window.location.origin,
  );
  url.searchParams.set("period", period);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const detail =
      (typeof body.detail === "string" && body.detail) ||
      (typeof body.error === "string" && body.error) ||
      `Could not load visitor overview (${res.status}).`;
    throw new Error(detail);
  }

  const buckets = Array.isArray(body.buckets)
    ? (body.buckets as unknown[])
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const o = row as Record<string, unknown>;
          return {
            label: String(o.label ?? ""),
            count: Number(o.count) || 0,
          };
        })
        .filter((b): b is VisitorOverviewBucket => b != null)
    : [];

  const rawPeriod = String(body.period ?? period);
  const normalizedPeriod: VisitorPeriod =
    rawPeriod === "today" || rawPeriod === "yesterday"
      ? rawPeriod
      : "last_7_days";

  return {
    period: normalizedPeriod,
    total_views: Number(body.total_views) || 0,
    buckets,
    course_count: Number(body.course_count) || 0,
    storage: typeof body.storage === "string" ? body.storage : undefined,
  };
}

/** Records a course detail page view. Returns false when the BFF did not accept the view. */
export async function recordCoursePageView(courseId: string): Promise<boolean> {
  const id = String(courseId ?? "").trim();
  if (!id) return false;

  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const token = TokenManager.getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(courseAnalyticsUrl(id, "/view/"), {
      method: "POST",
      headers,
      body: "{}",
    });
    if (!res.ok) {
      if (import.meta.env.DEV) {
        const body = (await res.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        console.warn(
          "[course-analytics] view not recorded:",
          res.status,
          body.detail ?? body.error ?? res.statusText,
        );
      }
      return false;
    }
    return true;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("[course-analytics] view request failed:", err);
    }
    return false;
  }
}
