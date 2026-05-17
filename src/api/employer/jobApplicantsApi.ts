import { TokenManager } from "@/api/auth/tokenManager";
import { getEmployerJobsApiBaseUrl } from "@/api/employer/employerJobsApiBase";
import type { AppBffEnvelope } from "@/api/jobs/jobApplicationsApi";
import type { JobApplicationUserFields } from "@/api/jobs/applicationUserFields";

export interface JobApplicant extends JobApplicationUserFields {
  id?: string | number;
  applied_at?: string;
  status?: string;
  [key: string]: unknown;
}

function authHeaders(): HeadersInit {
  const token = TokenManager.getAccessToken();
  if (!token) {
    throw new Error("Sign in to view applicants.");
  }
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function extractApplicants(data: unknown): JobApplicant[] {
  if (Array.isArray(data)) return data as JobApplicant[];
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.items)) return d.items as JobApplicant[];
  if (Array.isArray(d.applicants)) return d.applicants as JobApplicant[];
  return [];
}

/** GET /api/app/jobs/{jobId}/applicants (Breneo JWT → BFF → aggregator + X-Employer-Key). */
export async function fetchEmployerJobApplicants(
  jobId: string,
): Promise<JobApplicant[]> {
  const base = getEmployerJobsApiBaseUrl().replace(/\/$/, "");
  const url = `${base}/api/app/jobs/${encodeURIComponent(jobId)}/applicants`;
  const res = await fetch(url, { headers: authHeaders() });
  const body = (await res.json().catch(() => ({}))) as AppBffEnvelope;

  if (res.status === 401) {
    throw new Error(
      typeof body.message === "string" ? body.message : "Sign in required.",
    );
  }

  if (!body.success) {
    throw new Error(
      typeof body.message === "string" && body.message
        ? body.message
        : `Failed to load applicants (${res.status})`,
    );
  }

  return extractApplicants(body.data);
}
