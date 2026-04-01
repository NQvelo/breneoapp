import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";

export type EmployerJob = {
  id: string;
  title: string;
  description: string;
  location: string;
  employment_type: string;
  apply_url: string;
  salary: string;
  remote: boolean;
  is_active: boolean;
  created_at?: string;
};

function parseJob(raw: Record<string, unknown>): EmployerJob {
  return {
    id: raw.id != null ? String(raw.id) : "",
    title: String(raw.title ?? raw.job_title ?? ""),
    description: String(raw.description ?? ""),
    location: String(raw.location ?? raw.job_location ?? ""),
    employment_type: String(
      raw.employment_type ?? raw.job_type ?? raw.type ?? "",
    ),
    apply_url: String(raw.apply_url ?? raw.application_url ?? ""),
    salary: String(raw.salary ?? raw.salary_range ?? ""),
    remote: Boolean(raw.remote ?? raw.is_remote),
    is_active: raw.is_active !== false && raw.status !== "closed",
    created_at:
      raw.created_at != null ? String(raw.created_at) : undefined,
  };
}

function unwrapList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.results)) return o.results;
    if (Array.isArray(o.jobs)) return o.jobs;
  }
  return [];
}

export async function fetchEmployerJobs(): Promise<EmployerJob[]> {
  try {
    const res = await apiClient.get(API_ENDPOINTS.EMPLOYER.JOBS);
    return unwrapList(res.data)
      .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
      .map((x) => parseJob(x));
  } catch (e: unknown) {
    const status = (e as { response?: { status?: number } })?.response?.status;
    if (status === 404) return [];
    throw e;
  }
}

export async function fetchEmployerJob(id: string): Promise<EmployerJob | null> {
  try {
    const url = `${API_ENDPOINTS.EMPLOYER.JOBS}${id}/`;
    const res = await apiClient.get(url);
    if (res.data && typeof res.data === "object") {
      return parseJob(res.data as Record<string, unknown>);
    }
    return null;
  } catch {
    return null;
  }
}

export type EmployerJobPayload = {
  title: string;
  description: string;
  location: string;
  employment_type: string;
  apply_url: string;
  salary: string;
  remote: boolean;
  is_active: boolean;
};

export async function createEmployerJob(
  payload: EmployerJobPayload,
): Promise<EmployerJob> {
  const res = await apiClient.post(API_ENDPOINTS.EMPLOYER.JOBS, payload);
  if (res.data && typeof res.data === "object") {
    return parseJob(res.data as Record<string, unknown>);
  }
  return { ...payload, id: "", is_active: true, remote: false };
}

export async function updateEmployerJob(
  id: string,
  payload: Partial<EmployerJobPayload>,
): Promise<void> {
  const url = `${API_ENDPOINTS.EMPLOYER.JOBS}${id}/`;
  await apiClient.patch(url, payload);
}
