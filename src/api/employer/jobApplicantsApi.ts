import { getEmployerJobsApiBaseUrl } from "@/api/employer/employerJobsApiBase";
import { employerBffFetch } from "@/api/employer/employerBffClient";
import type { AppBffEnvelope } from "@/api/jobs/jobApplicationsApi";
import type { JobApplicationUserFields } from "@/api/jobs/applicationUserFields";

export interface JobApplicant extends JobApplicationUserFields {
  id?: string | number;
  applied_at?: string;
  status?: string;
  employer_viewed_cv?: boolean;
  cv_viewed_by_me?: boolean;
  [key: string]: unknown;
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
  const res = await employerBffFetch(url);
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

export interface RecordCvViewResult {
  id?: string | number;
  view_count?: number;
  first_viewed_at?: string;
  last_viewed_at?: string;
  [key: string]: unknown;
}

/** POST record/increment CV view when employer opens applicant profile. */
export async function recordApplicantCvView(
  jobId: string,
  applicantUserId: string | number,
): Promise<RecordCvViewResult | null> {
  const base = getEmployerJobsApiBaseUrl().replace(/\/$/, "");
  const jid = encodeURIComponent(String(jobId).trim());
  const uid = encodeURIComponent(String(applicantUserId).trim());
  const url = `${base}/api/app/jobs/${jid}/applicants/${uid}/cv-view`;
  const res = await employerBffFetch(url, { method: "POST" });
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
        : `Failed to record CV view (${res.status})`,
    );
  }

  if (body.data && typeof body.data === "object") {
    return body.data as RecordCvViewResult;
  }
  return null;
}
