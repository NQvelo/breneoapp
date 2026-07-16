import {
  assertEmployerJobsProxyConfigured,
  getEmployerJobsApiBaseUrl,
} from "@/api/employer/employerJobsApiBase";
import { employerBffFetch } from "@/api/employer/employerBffClient";
import { TokenManager } from "@/api/auth/tokenManager";
import { resolveJobSectionsAfterAi } from "@/utils/jobSectionsDedup";
import { parseEmploymentTypeFromDescription } from "@/utils/jobEmploymentDisplay";

export type EmployerJobSource = "breneo" | "aggregator";

export type EmployerJob = {
  id: string;
  title: string;
  description: string;
  country?: string;
  city?: string;
  location_country?: string;
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
  /** Filled by BFF + Gemini from job description when aggregator persists them */
  responsibilities?: string[];
  qualifications?: string[];
  /** Short AI summary (2–3 sentences) when API returns it separately from full_description */
  job_description_summary?: string;
  required_skills?: string[];
  /** Number of people who applied / registered for this job (when API provides it). */
  applicants_count?: number;
};

export type EmployerJobsFilter = {
  companyId?: string;
  companyName?: string;
};

function extractAggregatorErrorMessage(
  body: Record<string, unknown>,
  fallback: string,
): string {
  const d = body.detail;
  if (typeof d === "string" && d.trim()) return d.trim();
  const m = body.message;
  if (typeof m === "string" && m.trim()) return m.trim();
  const nfe = body.non_field_errors;
  if (Array.isArray(nfe) && nfe.length > 0) {
    return String(nfe[0]);
  }
  return fallback;
}

function toIsActive(value: unknown): boolean {
  if (value === false || value === 0 || value === "0") return false;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "false" || v === "closed" || v === "inactive") return false;
  }
  return true;
}

function pickAggregatorString(
  raw: Record<string, unknown>,
  keys: readonly string[],
): string {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) continue;
    const s = String(raw[key] ?? "").trim();
    if (s && s !== "—") return s;
  }
  return "";
}

function isWorkModeToken(value: string): boolean {
  const m = value.toLowerCase().replace(/\s+/g, "-");
  return ["remote", "hybrid", "on-site", "onsite", "unknown"].includes(
    m === "onsite" ? "on-site" : m,
  );
}

/** One bullet / line from API (string or nested object from DRF). */
function employerListItemToString(x: unknown): string {
  if (typeof x === "string") return x.trim();
  if (x && typeof x === "object" && !Array.isArray(x)) {
    const o = x as Record<string, unknown>;
    const inner =
      o.text ??
      o.description ??
      o.name ??
      o.value ??
      o.title ??
      o.content;
    if (inner != null) return String(inner).trim();
  }
  return String(x ?? "").trim();
}

/**
 * Normalizes aggregator `Responsibilities` / `qualifications` (and variants) for the employer form.
 * Handles JSON arrays, newline/bullet strings, and list items as objects.
 */
function coerceAggregatorListField(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map(employerListItemToString).filter(Boolean);
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return [];
    if (t.startsWith("[")) {
      try {
        const p = JSON.parse(t) as unknown;
        if (Array.isArray(p)) return coerceAggregatorListField(p);
      } catch {
        /* treat as plain text */
      }
    }
    return t
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
      .filter(Boolean);
  }
  return [];
}

/** Prefer first key that yields a non-empty list (empty `[]` does not block a fallback key). */
function pickAggregatorListField(
  raw: Record<string, unknown>,
  keys: readonly string[],
): string[] {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) continue;
    const coerced = coerceAggregatorListField(raw[key]);
    if (coerced.length > 0) return coerced;
  }
  return [];
}

const REQUIRED_SKILLS_FIELD_KEYS = [
  "skills_required",
  "required_skills",
  "skills",
  "job_skills",
] as const;

function pickRequiredSkillsFromSources(
  ...sources: Array<Record<string, unknown> | null | undefined>
): string[] {
  for (const src of sources) {
    if (!src || typeof src !== "object" || Array.isArray(src)) continue;
    const skills = pickAggregatorListField(src, REQUIRED_SKILLS_FIELD_KEYS);
    if (skills.length > 0) return skills;
  }
  return [];
}

/** Skills explicitly stored on the job record (no description inference). */
export function getEmployerJobStoredSkills(job: EmployerJob): string[] {
  return (job.required_skills ?? [])
    .map((s) => String(s).trim())
    .filter(Boolean);
}

function parseEmployerJob(raw: Record<string, unknown>): EmployerJob {
  const firstNonEmpty = (...vals: unknown[]): string => {
    for (const v of vals) {
      const s = String(v ?? "").trim();
      if (s) return s;
    }
    return "";
  };
  const src = "aggregator";
  const wm = String(raw.work_mode ?? "");
  const rawEnvelope =
    raw.raw && typeof raw.raw === "object" && !Array.isArray(raw.raw)
      ? (raw.raw as Record<string, unknown>)
      : null;
  const employerSubmitted =
    rawEnvelope?.employer_submitted &&
    typeof rawEnvelope.employer_submitted === "object" &&
    !Array.isArray(rawEnvelope.employer_submitted)
      ? (rawEnvelope.employer_submitted as Record<string, unknown>)
      : null;
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

  const fullDesc = String(raw.full_description ?? "").trim();
  const descField = String(raw.description ?? "").trim();
  const explicitSummary = String(raw.job_description_summary ?? "").trim();
  const editorBody = fullDesc || descField;
  let job_description_summary: string | undefined =
    explicitSummary || undefined;
  if (
    !job_description_summary &&
    fullDesc &&
    descField &&
    descField !== fullDesc
  ) {
    job_description_summary = descField;
  }

  const jobId =
    raw.id != null
      ? String(raw.id)
      : raw.pk != null
        ? String(raw.pk)
        : raw.job_id != null
          ? String(raw.job_id)
          : "";

  return {
    id: jobId,
    title: String(raw.title ?? raw.job_title ?? ""),
    description: editorBody,
    country: firstNonEmpty(
      raw.country,
      raw.location_country,
      raw.job_country,
      employerSubmitted?.location_country,
      employerSubmitted?.locationCountry,
      employerSubmitted?.country,
      rawEnvelope?.location_country,
      rawEnvelope?.locationCountry,
      rawEnvelope?.country,
      rawEnvelope?.job_country,
      companyObj?.country,
      typeof raw.location === "object" && raw.location !== null
        ? (raw.location as Record<string, unknown>).country
        : undefined,
      typeof raw.location === "object" && raw.location !== null
        ? (raw.location as Record<string, unknown>).location_country
        : undefined,
    ),
    city: firstNonEmpty(
      raw.city,
      raw.location,
      raw.job_location,
      employerSubmitted?.city,
      rawEnvelope?.city,
    ),
    location_country: firstNonEmpty(
      raw.location_country,
      raw.country,
      raw.job_country,
      employerSubmitted?.location_country,
      employerSubmitted?.locationCountry,
      employerSubmitted?.country,
      rawEnvelope?.location_country,
      rawEnvelope?.locationCountry,
      rawEnvelope?.country,
      rawEnvelope?.job_country,
      companyObj?.country,
      typeof raw.location === "object" && raw.location !== null
        ? (raw.location as Record<string, unknown>).location_country
        : undefined,
      typeof raw.location === "object" && raw.location !== null
        ? (raw.location as Record<string, unknown>).country
        : undefined,
    ),
    location: firstNonEmpty(
      raw.location,
      raw.city,
      raw.job_location,
      employerSubmitted?.city,
      rawEnvelope?.city,
    ),
    employment_type: (() => {
      const fromNote = pickAggregatorString(raw, [
        "employment_type_note",
        "employmentTypeNote",
      ]);
      const fromSubmitted = employerSubmitted
        ? pickAggregatorString(employerSubmitted, [
            "employment_type_note",
            "employmentTypeNote",
          ])
        : "";
      const explicit = pickAggregatorString(raw, [
        "employment_type",
        "job_type",
        "type",
      ]);
      const candidate = fromNote || fromSubmitted || explicit;
      if (candidate && !isWorkModeToken(candidate)) return candidate;
      const fromDesc = parseEmploymentTypeFromDescription(
        String(raw.full_description ?? raw.description ?? ""),
      );
      return fromDesc || candidate || "—";
    })(),
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
    ...(() => {
      const resolved = resolveJobSectionsAfterAi({
        description: job_description_summary ?? descField,
        responsibilities: pickAggregatorListField(raw, [
          "Responsibilities",
          "responsibilities",
          "job_responsibilities",
        ]),
        qualifications: pickAggregatorListField(raw, [
          "qualifications",
          "Qualifications",
          "job_qualifications",
        ]),
      });
      return {
        responsibilities: resolved.responsibilities,
        qualifications: resolved.qualifications,
      };
    })(),
    job_description_summary,
    required_skills: pickRequiredSkillsFromSources(
      employerSubmitted,
      rawEnvelope &&
        typeof rawEnvelope.employer_submitted === "object" &&
        !Array.isArray(rawEnvelope.employer_submitted)
        ? (rawEnvelope.employer_submitted as Record<string, unknown>)
        : null,
      raw,
      rawEnvelope,
      raw.raw && typeof raw.raw === "object" && !Array.isArray(raw.raw)
        ? (raw.raw as Record<string, unknown>)
        : null,
    ),
    applicants_count: (() => {
      const candidates = [
        raw.applicants_count,
        raw.applicant_count,
        raw.applications_count,
        raw.application_count,
        raw.total_applicants,
        raw.num_applicants,
        rawEnvelope?.applicants_count,
        rawEnvelope?.applicant_count,
        rawEnvelope?.applications_count,
        employerSubmitted?.applicants_count,
      ];
      for (const c of candidates) {
        if (typeof c === "number" && Number.isFinite(c) && c >= 0) {
          return Math.floor(c);
        }
        if (typeof c === "string" && c.trim() !== "" && /^\d+$/.test(c.trim())) {
          return Number(c.trim());
        }
      }
      return undefined;
    })(),
  };
}

function unwrapList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.results)) return o.results;
    if (Array.isArray(o.jobs)) return o.jobs;
    if (Array.isArray(o.data)) return o.data;
    const inner = o.data;
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      const d = inner as Record<string, unknown>;
      if (Array.isArray(d.results)) return d.results;
      if (Array.isArray(d.jobs)) return d.jobs;
    }
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

/**
 * GET same-origin BFF `/api/employer/jobs`, which forwards to the job aggregator
 * (e.g. `…/api/employer/jobs?company_id=<id>`). Prefer `company_id` when you have the
 * linked directory company id; the BFF also resolves `company_id` from the JWT when omitted.
 */
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
  if (typeof window === "undefined") return [];
  if (!(await TokenManager.getValidAccessToken())) return [];

  // Prevent accidental direct browser calls to Railway (requires X-Employer-Key server-side).
  assertEmployerJobsProxyConfigured("GET");

  const base = getEmployerJobsApiBaseUrl();
  const res = await employerBffFetch(buildEmployerJobsUrl(base, filter));
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const detail = extractAggregatorErrorMessage(body, "Could not load jobs.");
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

/**
 * GET `/api/employer/jobs/{id}` via your BFF (no query params in the browser). Upstream (when
 * `AGGREGATOR_JOB_DETAIL_COMPANY_QUERY=1` on the BFF): `…/api/employer/jobs/{id}?company_id=…` with `X-Employer-Key`.
 */
export async function fetchEmployerJobById(id: string): Promise<EmployerJob> {
  if (typeof window === "undefined") {
    throw new Error("Not authenticated");
  }
  assertEmployerJobsProxyConfigured("GET");

  const baseRoot = getEmployerJobsApiBaseUrl().replace(/\/$/, "");
  const url = `${baseRoot}/api/employer/jobs/${encodeURIComponent(id)}`;

  const res = await employerBffFetch(url);

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (res.status === 404) {
    const err = new Error("Job not found") as Error & { status?: number };
    err.status = 404;
    throw err;
  }

  if (!res.ok) {
    const detail = extractAggregatorErrorMessage(
      body,
      res.status === 403
        ? "You are not allowed to access this job."
        : "Could not load job.",
    );
    const err = new Error(detail) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return parseEmployerJob(body);
}

export async function fetchEmployerJobForEdit(
  id: string,
  _source?: EmployerJobSource,
  filter?: EmployerJobsFilter,
): Promise<EmployerJob | null> {
  const normalizedId = String(id ?? "").trim();
  if (!normalizedId) return null;

  try {
    return await fetchEmployerJobById(normalizedId);
  } catch (e: unknown) {
    const err = e as Error & { status?: number };
    // Detail may 404/405; 403 often means missing/wrong ?company_id= vs list filter — try the company-scoped list.
    if (err.status === 404 || err.status === 405 || err.status === 403) {
      try {
        const list = await fetchEmployerJobsFiltered(filter);
        const found = list.find((j) => String(j.id) === normalizedId);
        return found ?? null;
      } catch {
        throw e;
      }
    }
    throw e;
  }
}
