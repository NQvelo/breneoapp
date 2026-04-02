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
  work_mode?: string;
  company_id?: string;
  company_name?: string;
  /** Jobs from job-aggregator (POST via dev proxy); omit or breneo = main API */
  source?: EmployerJobSource;
};

export type EmployerJobsFilter = {
  companyId?: string;
  companyName?: string;
};

const EMPLOYER_JOBS_API_BASE =
  (import.meta.env.VITE_EMPLOYER_JOBS_API_BASE_URL as string | undefined) ||
  (import.meta.env.DEV
    ? window.location.origin
    : "https://breneo-job-aggregator.up.railway.app");

function toIsActive(value: unknown): boolean {
  if (value === false || value === 0 || value === "0") return false;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "false" || v === "closed" || v === "inactive") return false;
  }
  return true;
}

function workModeLabel(mode: string): string {
  const m = (mode || "").toLowerCase();
  if (m === "remote") return "Remote";
  if (m === "hybrid") return "Hybrid";
  if (m === "on-site" || m === "onsite") return "On-site";
  if (m === "unknown" || !m) return "—";
  return mode;
}

function parseEmployerJob(raw: Record<string, unknown>): EmployerJob {
  const src = "aggregator";
  const wm = String(raw.work_mode ?? "");
  const companyRaw = raw.company;
  const companyObj =
    companyRaw && typeof companyRaw === "object"
      ? (companyRaw as Record<string, unknown>)
      : null;
  const companyId =
    companyObj?.id != null
      ? String(companyObj.id)
      : (typeof companyRaw === "number" || typeof companyRaw === "string") &&
          String(companyRaw).trim() !== "" &&
          /^\d+$/.test(String(companyRaw).trim())
        ? String(companyRaw).trim()
      : raw.company_id != null
        ? String(raw.company_id)
        : undefined;
  const companyName =
    typeof companyRaw === "string"
      ? companyRaw
      : companyObj?.name != null
        ? String(companyObj.name)
        : raw.company_name != null
          ? String(raw.company_name)
          : undefined;
  return {
    id: raw.id != null ? String(raw.id) : "",
    title: String(raw.title ?? raw.job_title ?? ""),
    description: String(raw.full_description ?? raw.description ?? ""),
    location: String(raw.location ?? raw.job_location ?? ""),
    employment_type: String(
      raw.employment_type ?? raw.job_type ?? raw.type ?? workModeLabel(wm),
    ),
    apply_url: String(raw.apply_url ?? raw.application_url ?? ""),
    salary: String(raw.salary ?? raw.salary_range ?? ""),
    remote: wm.toLowerCase() === "remote" || Boolean(raw.remote ?? raw.is_remote),
    is_active: toIsActive(raw.is_active),
    created_at:
      raw.created_at != null
        ? String(raw.created_at)
        : raw.posted_at != null
          ? String(raw.posted_at)
          : raw.updated_at != null
            ? String(raw.updated_at)
            : undefined,
    work_mode: wm,
    company_id: companyId,
    company_name: companyName,
    source: src,
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

/**
 * Employer dashboard list via server proxy GET /api/employer/jobs.
 * Includes active + inactive jobs.
 */
export async function fetchEmployerJobs(): Promise<EmployerJob[]> {
  return fetchEmployerJobsFiltered();
}

function buildEmployerJobsUrl(
  base: string,
  filter?: EmployerJobsFilter,
): string {
  const url = new URL("/api/employer/jobs", base);
  const companyId = filter?.companyId?.trim();
  const companyName = filter?.companyName?.trim();
  if (companyId) {
    url.searchParams.set("company_id", companyId);
  } else if (companyName) {
    url.searchParams.set("company", companyName);
  }
  return url.toString();
}

export async function fetchEmployerJobsFiltered(
  filter?: EmployerJobsFilter,
): Promise<EmployerJob[]> {
  const token = TokenManager.getAccessToken();
  if (!token || typeof window === "undefined") return [];
  const res = await fetch(buildEmployerJobsUrl(EMPLOYER_JOBS_API_BASE, filter), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const detail =
      (typeof body.detail === "string" && body.detail) || "Could not load jobs.";
    const err = new Error(detail) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const data = (await res.json()) as Record<string, unknown>;
  const rows = unwrapList(data);
  const jobs = rows
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((row) => parseEmployerJob(row));
  jobs.sort((a, b) => {
    const ta = a.created_at ? Date.parse(a.created_at) : 0;
    const tb = b.created_at ? Date.parse(b.created_at) : 0;
    return tb - ta;
  });
  return jobs;
}

async function fetchEmployerJobFromProxyList(
  id: string,
  filter?: EmployerJobsFilter,
): Promise<EmployerJob | null> {
  const token = TokenManager.getAccessToken();
  if (!token || typeof window === "undefined") return null;
  try {
    const res = await fetch(buildEmployerJobsUrl(EMPLOYER_JOBS_API_BASE, filter), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: unknown[] };
    const rows = Array.isArray(data.results) ? data.results : [];
    const found = rows.find((row) => {
      if (!row || typeof row !== "object") return false;
      return String((row as Record<string, unknown>).id ?? "") === String(id);
    });
    if (!found || typeof found !== "object") return null;
    return parseEmployerJob(found as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function fetchEmployerJobForEdit(
  id: string,
  source?: EmployerJobSource,
  filter?: EmployerJobsFilter,
): Promise<EmployerJob | null> {
  const row = await fetchEmployerJobFromProxyList(id, filter);
  if (row) return row;
  return null;
}
