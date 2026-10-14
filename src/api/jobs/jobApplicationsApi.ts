import { TokenManager } from "@/api/auth/tokenManager";
import { extractBreneoUserIdFromJwt } from "@/api/employer/profile";
import {
  getJobApplicationsApiBaseUrl,
  jobApplicationsUseBffPaths,
} from "@/api/employer/employerJobsApiBase";
import type { JobApplicationUserFields } from "@/api/jobs/applicationUserFields";

export type { JobApplicationUserFields } from "@/api/jobs/applicationUserFields";
export {
  applicationUserDisplayName,
  applicationUserEmail,
} from "@/api/jobs/applicationUserFields";

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

export interface JobApplicationItem extends JobApplicationUserFields {
  job_id?: string | number;
  jobId?: string | number;
  status?: string;
  applied_at?: string;
  employer_viewed_cv?: boolean;
  employer_first_viewed_at?: string;
  employer_cv_view_count?: number;
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

function requireExternalUserId(): string {
  const token = TokenManager.getAccessToken();
  if (!token) {
    throw new AppBffAuthError();
  }
  const userId = extractBreneoUserIdFromJwt(token);
  if (!userId) {
    throw new AppBffAuthError("Could not resolve your user id.");
  }
  return userId;
}

function applicationsUrl(path: string, query?: Record<string, string>): string {
  const base = getJobApplicationsApiBaseUrl().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(p, `${base}/`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value) url.searchParams.set(key, value);
    }
  }
  return url.toString();
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

async function requestApplicationsApi<T>(
  path: string,
  init: RequestInit,
  query?: Record<string, string>,
): Promise<T> {
  const res = await fetch(applicationsUrl(path, query), {
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

/** POST apply — BFF `/api/app/jobs/{id}/apply` or aggregator `/api/jobs/{id}/apply`. */
export async function applyToJob(jobId: string): Promise<unknown> {
  const id = encodeURIComponent(String(jobId).trim());
  const useBff = jobApplicationsUseBffPaths();
  const path = useBff ? `/api/app/jobs/${id}/apply` : `/api/jobs/${id}/apply`;
  const externalUserId = useBff ? undefined : requireExternalUserId();
  return requestApplicationsApi(path, {
    method: "POST",
    ...(externalUserId
      ? { body: JSON.stringify({ external_user_id: externalUserId }) }
      : {}),
  });
}

/** GET my applications — BFF `/api/app/users/me/applications` or aggregator `/api/users/me/applications`. */
export async function fetchMyApplications(
  page = 1,
): Promise<MyApplicationsPage> {
  const useBff = jobApplicationsUseBffPaths();
  const path = useBff
    ? "/api/app/users/me/applications"
    : "/api/users/me/applications";
  const query = useBff
    ? { page: String(page) }
    : {
        external_user_id: requireExternalUserId(),
        page: String(page),
        limit: "20",
        sort: "-applied_at",
      };
  const data = await requestApplicationsApi<unknown>(
    path,
    { method: "GET" },
    query,
  );
  return extractApplicationsPage(data);
}

const MAX_APPLICATION_PAGES = 50;

/** Walks every page of {@link fetchMyApplications} using `pagination.total`. */
export async function fetchAllMyApplications(): Promise<MyApplicationsPage> {
  const first = await fetchMyApplications(1);
  const items = [...first.items];
  const total = first.pagination?.total;

  if (typeof total === "number") {
    for (
      let page = 2;
      items.length < total && page <= MAX_APPLICATION_PAGES;
      page++
    ) {
      const next = await fetchMyApplications(page);
      if (next.items.length === 0) break;
      items.push(...next.items);
    }
  }

  return { items, pagination: first.pagination };
}

/** DELETE withdraw — BFF `/api/app/jobs/{id}/application` or aggregator `/api/jobs/{id}/application`. */
export async function withdrawJobApplication(jobId: string): Promise<unknown> {
  const id = encodeURIComponent(String(jobId).trim());
  const useBff = jobApplicationsUseBffPaths();
  const path = useBff
    ? `/api/app/jobs/${id}/application`
    : `/api/jobs/${id}/application`;
  const query = useBff
    ? undefined
    : { external_user_id: requireExternalUserId() };
  return requestApplicationsApi(path, { method: "DELETE" }, query);
}

/** Job details saved with a self-reported external application (shown in Applied Jobs). */
export interface ExternalJobSnapshot {
  title?: string;
  company_name?: string;
  location?: string;
  logo?: string;
  apply_url?: string;
}

/** POST self-reported apply for a fetched (external) job — BFF only. */
export async function recordExternalJobApplication(
  jobId: string,
  snapshot: ExternalJobSnapshot,
): Promise<JobApplicationItem> {
  const id = encodeURIComponent(String(jobId).trim());
  return requestApplicationsApi<JobApplicationItem>(
    `/api/app/jobs/${id}/external-application`,
    { method: "POST", body: JSON.stringify(snapshot) },
  );
}

/** GET self-reported external applications — BFF only; empty when not on a BFF base. */
export async function fetchMyExternalApplications(): Promise<
  JobApplicationItem[]
> {
  if (!jobApplicationsUseBffPaths()) return [];
  const data = await requestApplicationsApi<unknown>(
    "/api/app/users/me/external-applications",
    { method: "GET" },
  );
  return extractApplicationsPage(data).items;
}

/** @deprecated Use `JobApplicationItem` */
export type JobApplicationRecord = JobApplicationItem;
