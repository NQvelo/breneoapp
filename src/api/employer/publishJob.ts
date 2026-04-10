import { TokenManager } from "@/api/auth/tokenManager";

import {
  assertEmployerJobsProxyConfigured,
  getEmployerJobsApiBaseUrl,
} from "@/api/employer/employerJobsApiBase";

/** Values accepted by the job-aggregator Django API */
export type AggregatorWorkMode =
  | "remote"
  | "hybrid"
  | "onsite"
  | "on-site"
  | "unknown";

export type PublishEmployerJobBody = {
  title: string;
  full_description: string;
  work_mode: AggregatorWorkMode;
  country?: string;
  city?: string;
  location_country?: string;
  location?: string;
  salary?: string;
  /** Omit or null when empty */
  apply_url?: string | null;
  is_active?: boolean;
  /** Appended to full_description on the server */
  employment_type_note?: string;
  /** Sent on PATCH from employer edit form; max 6 items each. BFF maps to API keys Responsibilities + qualifications. */
  responsibilities?: string[];
  qualifications?: string[];
};

export type EmployerJobsApiError = Error & {
  status?: number;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Employer jobs CRUD base.
 * Never put the aggregator secret in VITE_* env.
 */
export async function publishEmployerJob(
  body: PublishEmployerJobBody,
): Promise<Record<string, unknown>> {
  return sendEmployerJobsRequest("POST", "/api/employer/jobs", body);
}

/**
 * PATCH/DELETE: same-origin `/api/employer/jobs/{jobId}` only (no query string).
 * BFF forwards to the aggregator, e.g. `https://breneo-job-aggregator.up.railway.app/api/employer/jobs/{id}?company_id=…`
 * (`JOB_AGGREGATOR_BASE_URL`), with `X-Employer-Key` and Breneo JWT validation server-side.
 */
export async function updatePublishedEmployerJob(
  jobId: string,
  body: Partial<PublishEmployerJobBody>,
): Promise<Record<string, unknown>> {
  return sendEmployerJobsRequest(
    "PATCH",
    `/api/employer/jobs/${encodeURIComponent(jobId)}`,
    body,
  );
}

export async function deletePublishedEmployerJob(
  jobId: string,
): Promise<void> {
  await sendEmployerJobsRequest(
    "DELETE",
    `/api/employer/jobs/${encodeURIComponent(jobId)}`,
  );
}

async function sendEmployerJobsRequest(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<Record<string, unknown>> {
  const token = TokenManager.getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  // Prevent accidental direct browser calls to Railway (requires X-Employer-Key server-side).
  assertEmployerJobsProxyConfigured(method);

  const url = new URL(path, getEmployerJobsApiBaseUrl()).toString();
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body == null ? undefined : JSON.stringify(body),
  });

  const data = await parseJsonBody(res);

  if (!res.ok) {
    const detail =
      formatEmployerJobsErrorDetail(data) ||
      (typeof data.message === "string" && data.message) ||
      (res.status === 403
        ? "You are not allowed to perform this action on this job."
        : res.status === 404
          ? "Job not found"
          : res.statusText);
    const err = new Error(detail) as EmployerJobsApiError;
    err.status = res.status;
    if (data && typeof data === "object") {
      const fields: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(data)) {
        if (k === "detail" || k === "message") continue;
        if (Array.isArray(v)) {
          fields[k] = v.map((x) => String(x));
        } else if (typeof v === "string") {
          fields[k] = [v];
        }
      }
      if (Object.keys(fields).length > 0) err.fieldErrors = fields;
    }
    throw err;
  }

  return data;
}

/** Django REST: detail string | string[] | { field: string[] } */
function formatEmployerJobsErrorDetail(data: Record<string, unknown>): string {
  const d = data.detail;
  if (typeof d === "string" && d.trim()) return d.trim();
  if (Array.isArray(d)) {
    const parts = d.map((x) => {
      if (typeof x === "string") return x;
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        if (typeof o.string === "string") return o.string;
        if (typeof o.message === "string") return o.message;
      }
      return JSON.stringify(x);
    });
    return parts.filter(Boolean).join(" ");
  }
  if (d && typeof d === "object") {
    const o = d as Record<string, unknown>;
    const lines: string[] = [];
    for (const [k, v] of Object.entries(o)) {
      if (Array.isArray(v)) {
        lines.push(`${k}: ${v.map(String).join(", ")}`);
      } else if (v != null) {
        lines.push(`${k}: ${String(v)}`);
      }
    }
    if (lines.length) return lines.join("; ");
  }
  return "";
}

async function parseJsonBody(res: Response): Promise<Record<string, unknown>> {
  // Upstream delete returns 204 with an empty body.
  if (res.status === 204 || res.status === 205) return {};
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** Client-side apply URL check (server validates again) */
export function validateHttpUrl(
  raw: string,
): { ok: true; url: string } | { ok: false; error: string } {
  const t = raw.trim();
  if (!t) return { ok: true, url: "" };
  try {
    const u = new URL(
      t.startsWith("http://") || t.startsWith("https://") ? t : `https://${t}`,
    );
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return {
        ok: false,
        error: "Application URL must start with http:// or https://",
      };
    }
    return { ok: true, url: u.toString() };
  } catch {
    return { ok: false, error: "Invalid application URL" };
  }
}
