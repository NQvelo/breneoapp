import { TokenManager } from "@/api/auth/tokenManager";

/** Same-origin BFF (`production.mjs` or Vite proxy → employer-jobs-proxy). */
function appBffUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined") {
    return `${window.location.origin.replace(/\/$/, "")}${p}`;
  }
  return p;
}

export interface AppBffEnvelope<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface ApplicationJobSummary {
  title?: string;
  company_name?: string;
  logo?: string;
  logo_upload?: string;
  company_logo?: string;
  location?: string;
  [key: string]: unknown;
}

export interface JobApplicationItem {
  job_id?: string | number;
  jobId?: string | number;
  status?: string;
  applied_at?: string;
  job?: ApplicationJobSummary;
  [key: string]: unknown;
}

export interface MyApplicationsPage {
  items: JobApplicationItem[];
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: unknown;
  };
}

export class AppBffAuthError extends Error {
  constructor(message = "Sign in to manage job applications.") {
    super(message);
    this.name = "AppBffAuthError";
  }
}

export class AlreadyAppliedError extends Error {
  constructor(message = "Already applied") {
    super(message);
    this.name = "AlreadyAppliedError";
  }
}

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

async function parseJson(res: Response): Promise<AppBffEnvelope> {
  const text = await res.text();
  if (!text) return { success: res.ok };
  try {
    return JSON.parse(text) as AppBffEnvelope;
  } catch {
    return { success: false, message: text };
  }
}

async function requestAppBff<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const res = await fetch(appBffUrl(path), {
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
    if (body.error === "already_applied") {
      throw new AlreadyAppliedError(
        typeof body.message === "string" ? body.message : undefined,
      );
    }
    throw new Error(
      typeof body.message === "string" && body.message
        ? body.message
        : `Request failed (${res.status})`,
    );
  }

  return body.data as T;
}

export function jobIdFromApplication(item: JobApplicationItem): string {
  const id = item.job_id ?? item.jobId;
  return id != null ? String(id) : "";
}

function extractApplicationsPage(data: unknown): MyApplicationsPage {
  if (!data || typeof data !== "object") {
    return { items: [] };
  }
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.items)) {
    return {
      items: d.items as JobApplicationItem[],
      pagination:
        d.pagination && typeof d.pagination === "object"
          ? (d.pagination as MyApplicationsPage["pagination"])
          : undefined,
    };
  }
  if (Array.isArray(data)) {
    return { items: data as JobApplicationItem[] };
  }
  return { items: [] };
}

/** POST /api/app/jobs/{id}/apply */
export async function applyToJob(jobId: string): Promise<unknown> {
  const id = encodeURIComponent(String(jobId).trim());
  return requestAppBff(`/api/app/jobs/${id}/apply`, { method: "POST" });
}

/** GET /api/app/users/me/applications?page=1 */
export async function fetchMyApplications(
  page = 1,
): Promise<MyApplicationsPage> {
  const q = new URLSearchParams({ page: String(page) });
  const data = await requestAppBff<unknown>(
    `/api/app/users/me/applications?${q.toString()}`,
    { method: "GET" },
  );
  return extractApplicationsPage(data);
}

/** DELETE /api/app/jobs/{id}/application */
export async function withdrawJobApplication(jobId: string): Promise<unknown> {
  const id = encodeURIComponent(String(jobId).trim());
  return requestAppBff(`/api/app/jobs/${id}/application`, {
    method: "DELETE",
  });
}

/** @deprecated Use `JobApplicationItem` */
export type JobApplicationRecord = JobApplicationItem;
