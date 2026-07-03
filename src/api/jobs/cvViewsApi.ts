import { TokenManager } from "@/api/auth/tokenManager";
import {
  getJobApplicationsApiBaseUrl,
  jobApplicationsUseBffPaths,
} from "@/api/employer/employerJobsApiBase";
import type { AppBffEnvelope } from "@/api/jobs/jobApplicationsApi";
import { AppBffAuthError } from "@/api/jobs/jobApplicationsApi";

export interface ApplicantCvView {
  id: string | number;
  job_id?: string | number;
  job_title?: string;
  company_name?: string;
  applicant_user_id?: string | number;
  viewer_user_id?: string | number;
  first_viewed_at?: string;
  last_viewed_at?: string;
  view_count?: number;
  applicant_acknowledged_at?: string | null;
  [key: string]: unknown;
}

export const MY_CV_VIEWS_QUERY_KEY = ["myCvViews"] as const;

function authHeaders(): HeadersInit {
  const token = TokenManager.getAccessToken();
  if (!token) {
    throw new AppBffAuthError();
  }
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function cvViewsUrl(path: string): string {
  const base = getJobApplicationsApiBaseUrl().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

async function parseJson(res: Response): Promise<AppBffEnvelope> {
  const text = await res.text();
  if (!text) return { success: res.ok };
  try {
    return JSON.parse(text) as AppBffEnvelope;
  } catch {
    return { success: false, message: text };
  }
}

async function requestCvViewsApi<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const res = await fetch(cvViewsUrl(path), {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const body = await parseJson(res);

  if (res.status === 401) {
    throw new AppBffAuthError(
      typeof body.message === "string" ? body.message : undefined,
    );
  }

  if (!body.success) {
    throw new Error(
      typeof body.message === "string" && body.message
        ? body.message
        : `Request failed (${res.status})`,
    );
  }

  return body.data as T;
}

function extractCvViews(data: unknown): ApplicantCvView[] {
  if (Array.isArray(data)) return data as ApplicantCvView[];
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.items)) return d.items as ApplicantCvView[];
  if (Array.isArray(d.cv_views)) return d.cv_views as ApplicantCvView[];
  return [];
}

export function cvViewIsUnacknowledged(view: ApplicantCvView): boolean {
  const ack = view.applicant_acknowledged_at;
  return ack == null || String(ack).trim() === "";
}

export function formatCvViewDate(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function cvViewDisplayTitle(view: ApplicantCvView): string {
  const jobTitle =
    typeof view.job_title === "string" && view.job_title.trim()
      ? view.job_title.trim()
      : "your application";
  const company =
    typeof view.company_name === "string" && view.company_name.trim()
      ? view.company_name.trim()
      : "";
  if (company) return `${company} · ${jobTitle}`;
  return jobTitle;
}

export function cvViewLastViewedAt(view: ApplicantCvView): string | undefined {
  if (typeof view.last_viewed_at === "string" && view.last_viewed_at.trim()) {
    return view.last_viewed_at;
  }
  if (typeof view.first_viewed_at === "string" && view.first_viewed_at.trim()) {
    return view.first_viewed_at;
  }
  return undefined;
}

/** GET my CV views — BFF `/api/app/users/me/cv-views`. */
export async function fetchMyCvViews(): Promise<ApplicantCvView[]> {
  if (!jobApplicationsUseBffPaths()) {
    throw new Error("CV view tracking requires the app BFF.");
  }
  const data = await requestCvViewsApi<unknown>("/api/app/users/me/cv-views", {
    method: "GET",
  });
  return extractCvViews(data);
}

/** PATCH acknowledge — BFF `/api/app/users/me/cv-views/{id}`. */
export async function acknowledgeCvView(cvViewId: string | number): Promise<unknown> {
  const id = encodeURIComponent(String(cvViewId).trim());
  return requestCvViewsApi(`/api/app/users/me/cv-views/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ acknowledge: true }),
  });
}
