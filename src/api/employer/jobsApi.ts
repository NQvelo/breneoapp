import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { TokenManager } from "@/api/auth/tokenManager";

export type EmployerJobSource = "breneo" | "aggregator";

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
  /** Jobs from job-aggregator (POST via dev proxy); omit or breneo = main API */
  source?: EmployerJobSource;
};

function workModeLabel(mode: string): string {
  const m = (mode || "").toLowerCase();
  if (m === "remote") return "Remote";
  if (m === "hybrid") return "Hybrid";
  if (m === "on-site" || m === "onsite") return "On-site";
  if (m === "unknown" || !m) return "—";
  return mode;
}

function parseJob(raw: Record<string, unknown>): EmployerJob {
  const src = raw.source === "aggregator" ? "aggregator" : "breneo";
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
    source: src,
  };
}

/** v1 list/detail shape from breneo-job-aggregator */
function parseAggregatorV1Job(raw: Record<string, unknown>): EmployerJob {
  const wm = String(raw.work_mode ?? "unknown");
  return {
    id: raw.id != null ? String(raw.id) : "",
    title: String(raw.title ?? ""),
    description: String(raw.description ?? ""),
    location: String(raw.location ?? ""),
    employment_type: workModeLabel(wm),
    apply_url: String(raw.apply_url ?? ""),
    salary: raw.salary != null ? String(raw.salary) : "",
    remote: wm === "remote",
    is_active: raw.is_active !== false,
    created_at:
      raw.posted_at != null
        ? String(raw.posted_at)
        : raw.fetched_at != null
          ? String(raw.fetched_at)
          : undefined,
    source: "aggregator",
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

async function fetchEmployerJobsBreneo(): Promise<EmployerJob[]> {
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

/**
 * Jobs posted to the job-aggregator (same-origin GET /api/employer/jobs in dev via Vite → Express proxy).
 * Returns [] if unauthenticated, offline, or no proxy (e.g. static production host).
 */
async function fetchEmployerJobsAggregator(): Promise<EmployerJob[]> {
  const token = TokenManager.getAccessToken();
  if (!token || typeof window === "undefined") return [];
  try {
    const res = await fetch(`${window.location.origin}/api/employer/jobs`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: unknown[] };
    const rows = Array.isArray(data.results) ? data.results : [];
    return rows
      .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
      .map((row) => parseAggregatorV1Job(row));
  } catch {
    return [];
  }
}

/** Merges main Breneo employer jobs with job-aggregator listings for the signed-in company. */
export async function fetchEmployerJobs(): Promise<EmployerJob[]> {
  const [breneoRes, aggRes] = await Promise.allSettled([
    fetchEmployerJobsBreneo(),
    fetchEmployerJobsAggregator(),
  ]);

  const agg =
    aggRes.status === "fulfilled" ? aggRes.value : [];
  let breneo: EmployerJob[] = [];
  if (breneoRes.status === "fulfilled") {
    breneo = breneoRes.value;
  } else if (agg.length === 0) {
    throw breneoRes.reason;
  }

  const seen = new Set<string>();
  const merged: EmployerJob[] = [];
  for (const j of [...agg, ...breneo]) {
    const key = `${j.source ?? "breneo"}:${j.id}:${j.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(j);
  }

  merged.sort((a, b) => {
    const ta = a.created_at ? Date.parse(a.created_at) : 0;
    const tb = b.created_at ? Date.parse(b.created_at) : 0;
    return tb - ta;
  });

  return merged;
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
