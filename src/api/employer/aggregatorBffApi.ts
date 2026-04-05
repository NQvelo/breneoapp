/**
 * Job aggregator routes via same-origin BFF (dev: Vite → employer-jobs-proxy; prod: production.mjs).
 * Never call Railway with the employer key from the browser.
 *
 * Companies API (new): POST body uses industry_ids / industry_names; staff is linked via
 * POST …/companies/{id}/members (BFF). Legacy /api/employer/companies may still accept staff_user_ids
 * — the BFF adds them when using the legacy upstream path.
 */

import { TokenManager } from "@/api/auth/tokenManager";
import {
  assertEmployerJobsProxyConfigured,
  getEmployerJobsApiBaseUrl,
} from "@/api/employer/employerJobsApiBase";
import { extractBreneoUserIdFromEmployerProfileRaw } from "@/api/employer/profile";

export type AggregatorIndustry = { id: number; name: string };

const DEFAULT_AGGREGATOR_PUBLIC_ORIGIN =
  "https://breneo-job-aggregator.up.railway.app";

/**
 * Collection URL (no trailing slash). BFF forwards to the same path on the job aggregator with
 * `X-Employer-Key`: GET `?search=`, POST create body JSON.
 * @see https://breneo-job-aggregator.up.railway.app/api/employer/companies?search=
 */
const EMPLOYER_COMPANIES_COLLECTION = "/api/employer/companies";

function employerBffOrigin(): string {
  return getEmployerJobsApiBaseUrl().replace(/\/$/, "");
}

function employerCompaniesCollectionSearchUrl(search: string): string {
  const u = new URL(EMPLOYER_COMPANIES_COLLECTION, `${employerBffOrigin()}/`);
  u.searchParams.set("search", search);
  return u.toString();
}

function normalizeIndustryList(raw: unknown): AggregatorIndustry[] {
  if (!Array.isArray(raw)) return [];
  const out: AggregatorIndustry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const idRaw = o.id;
    const id =
      typeof idRaw === "number" && Number.isFinite(idRaw)
        ? idRaw
        : typeof idRaw === "string"
          ? Number(idRaw.trim())
          : Number.NaN;
    const name =
      typeof o.name === "string" ? o.name.trim() : String(o.name ?? "").trim();
    if (!Number.isFinite(id) || !name) continue;
    out.push({ id, name });
  }
  return out;
}

export type AggregatorCompany = {
  id?: string | number;
  name?: string;
  company_email?: string;
  staff_user_ids?: string[];
  industry_ids?: number[];
  industry_names?: string[];
  industries?: AggregatorIndustry[];
  domain?: string;
  description?: string;
  website?: string;
  logo?: string;
  employees_count?: string | number;
  [key: string]: unknown;
};

/** Aggregator returns 400 + non_field_errors for duplicate membership, not always 409. */
function isDuplicateStaffMembershipError(
  status: number,
  body: Record<string, unknown>,
): boolean {
  if (status === 409) return true;
  if (status !== 400) return false;
  const nfe = body.non_field_errors;
  if (Array.isArray(nfe)) {
    const joined = nfe.map((x) => String(x).toLowerCase()).join(" ");
    if (joined.includes("unique")) return true;
  }
  const d = body.detail;
  if (typeof d === "string" && d.toLowerCase().includes("unique")) return true;
  return false;
}

function extractErrorMessage(body: Record<string, unknown>, fallback: string): string {
  const d = body.detail;
  if (typeof d === "string" && d.trim()) return d.trim();
  if (Array.isArray(d) && d.length) {
    return d
      .map((x) => (typeof x === "string" ? x : JSON.stringify(x)))
      .join(" ");
  }
  if (d && typeof d === "object") {
    try {
      return JSON.stringify(d);
    } catch {
      /* fall through */
    }
  }
  const nfe = body.non_field_errors;
  if (Array.isArray(nfe) && nfe.length) {
    return nfe.map((x) => String(x)).join(" ");
  }
  const m = body.message;
  if (typeof m === "string" && m.trim()) return m.trim();
  const parts: string[] = [];
  for (const [key, v] of Object.entries(body)) {
    if (key === "detail" || key === "non_field_errors") continue;
    if (Array.isArray(v)) {
      parts.push(`${key}: ${v.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(", ")}`);
    } else if (typeof v === "string") parts.push(`${key}: ${v}`);
    else if (v && typeof v === "object") parts.push(`${key}: ${JSON.stringify(v)}`);
  }
  if (parts.length) return parts.join(" ");
  return fallback;
}

function unwrapCompanies(data: unknown): AggregatorCompany[] {
  if (Array.isArray(data)) return data as AggregatorCompany[];
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  for (const key of ["results", "companies", "data", "items", "value"] as const) {
    const v = o[key];
    if (Array.isArray(v)) return v as AggregatorCompany[];
  }
  const inner = o.data;
  if (inner && typeof inner === "object") {
    const d = inner as Record<string, unknown>;
    if (Array.isArray(d.results)) return d.results as AggregatorCompany[];
    if (Array.isArray(d.data)) return d.data as AggregatorCompany[];
  }
  return [];
}

/**
 * Public list — no Authorization header.
 * Tries the configured app/BFF base first, then the public Railway aggregator (read-only, no key).
 */
export async function fetchAggregatorIndustries(): Promise<AggregatorIndustry[]> {
  const bases: string[] = [];
  const primary = getEmployerJobsApiBaseUrl().replace(/\/$/, "");
  bases.push(primary);
  try {
    const o = new URL(primary).origin;
    if (o !== new URL(DEFAULT_AGGREGATOR_PUBLIC_ORIGIN).origin) {
      bases.push(DEFAULT_AGGREGATOR_PUBLIC_ORIGIN.replace(/\/$/, ""));
    }
  } catch {
    bases.push(DEFAULT_AGGREGATOR_PUBLIC_ORIGIN.replace(/\/$/, ""));
  }

  let lastMessage = "Could not load industries.";
  for (const base of bases) {
    try {
      const res = await fetch(`${base}/api/industries/`, {
        headers: { Accept: "application/json" },
      });
      const raw = await res.json().catch(() => null);
      if (!res.ok) {
        const body =
          raw && typeof raw === "object" && !Array.isArray(raw)
            ? (raw as Record<string, unknown>)
            : {};
        lastMessage = extractErrorMessage(body, lastMessage);
        continue;
      }
      const list = normalizeIndustryList(raw);
      if (list.length > 0 || Array.isArray(raw)) {
        return list;
      }
    } catch {
      lastMessage =
        "Could not reach industries service. Check your network or try again.";
    }
  }
  throw new Error(lastMessage);
}

/**
 * Authenticated user’s companies (BFF → upstream for-user or legacy list).
 * @param _staffUserId retained for callers; BFF resolves the user from JWT.
 */
export async function fetchEmployerAggregatorCompanies(
  _staffUserId: string,
): Promise<AggregatorCompany[]> {
  const token = TokenManager.getAccessToken();
  if (!token || typeof window === "undefined") return [];

  assertEmployerJobsProxyConfigured("GET");

  const res = await fetch(
    new URL(`${EMPLOYER_COMPANIES_COLLECTION}/for-user`, `${employerBffOrigin()}/`).toString(),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  );
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = new Error(
      extractErrorMessage(body, "Could not load companies."),
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return unwrapCompanies(body);
}

/**
 * Company picker: same-origin BFF → aggregator
 * `GET …/api/employer/companies?search=<query>` (e.g. breneo-job-aggregator Railway).
 * BFF adds `X-Employer-Key`; the browser sends the Breneo JWT only.
 */
export async function searchAggregatorCompanies(
  query: string,
): Promise<AggregatorCompany[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const token = TokenManager.getAccessToken();
  if (!token || typeof window === "undefined") {
    throw new Error("Not authenticated");
  }

  assertEmployerJobsProxyConfigured("GET");

  const res = await fetch(employerCompaniesCollectionSearchUrl(q), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = new Error(
      extractErrorMessage(body, "Could not search companies."),
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return unwrapCompanies(body);
}

export async function fetchAggregatorCompanyDetail(
  companyId: string,
): Promise<AggregatorCompany> {
  const token = TokenManager.getAccessToken();
  if (!token || typeof window === "undefined") {
    throw new Error("Not authenticated");
  }
  assertEmployerJobsProxyConfigured("GET");
  const res = await fetch(
    new URL(
      `${EMPLOYER_COMPANIES_COLLECTION}/${encodeURIComponent(companyId)}/`,
      `${employerBffOrigin()}/`,
    ).toString(),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  );
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = new Error(
      extractErrorMessage(body, "Could not load company."),
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return body as AggregatorCompany;
}

/**
 * Body for POST `{BASE}/api/employer/companies` (and PATCH detail). Do not send staff_user_ids;
 * BFF calls POST `/api/employer/staff-memberships` with `{ company_id, external_user_id }` after create.
 */
export type CreateAggregatorCompanyBody = {
  name: string;
  company_email?: string;
  domain?: string;
  description?: string;
  website?: string;
  logo?: string;
  platform?: string | null;
  founded_date?: string | null;
  employees_count?: string | number | null;
  industry_ids: number[];
  industry_names: string[];
  social_links?: Record<string, unknown>;
  additional_details?: Record<string, unknown>;
};

export function buildAggregatorCompanyCreatePayload(args: {
  name: string;
  companyEmail: string;
  domain: string;
  description: string;
  website: string;
  logoUrl?: string;
  employeesCount?: string | number | null;
  selectedIndustryIds: number[];
  industriesCatalog: AggregatorIndustry[];
  industryNamesBySelectionOrder: string[];
}): CreateAggregatorCompanyBody {
  const industry_ids = [...args.selectedIndustryIds];
  const industry_names = args.selectedIndustryIds.map((id, idx) => {
    const fromCatalog = args.industriesCatalog.find((i) => i.id === id);
    const fallbackName = args.industryNamesBySelectionOrder[idx]?.trim();
    return (
      (fromCatalog?.name && fromCatalog.name.trim()) ||
      fallbackName ||
      `Industry ${id}`
    );
  });

  const body: CreateAggregatorCompanyBody = {
    name: args.name.trim(),
    company_email: args.companyEmail.trim().toLowerCase(),
    domain: args.domain.trim(),
    description: args.description.trim(),
    website: args.website.trim(),
    industry_ids,
    industry_names,
    social_links: {},
    additional_details: {},
  };

  const logo = args.logoUrl?.trim();
  if (logo) body.logo = logo;

  const ec = args.employeesCount;
  if (ec != null && ec !== "") {
    body.employees_count = ec;
  }

  return body;
}

/**
 * Minimal payload for “create from search” when the directory has no match.
 * Uses the first industry in `catalog` when present; otherwise `[1]` / `"General"` as a last resort.
 */
export function buildQuickCreateAggregatorCompanyPayload(args: {
  name: string;
  companyEmail: string;
  domain?: string;
  industriesCatalog: AggregatorIndustry[];
  descriptionFallback?: string;
}): CreateAggregatorCompanyBody {
  const desc =
    (args.descriptionFallback && args.descriptionFallback.trim()) ||
    "Company created from employer company search.";
  const email = args.companyEmail.trim().toLowerCase();
  const domain =
    (args.domain && args.domain.trim()) ||
    (email.includes("@")
      ? email.slice(email.indexOf("@") + 1).trim().toLowerCase()
      : "");
  const cat = args.industriesCatalog;
  if (!cat.length) {
    throw new Error(
      "Industries are still loading. Wait a moment, then try Create again.",
    );
  }
  const industry_ids = [cat[0].id];
  const industry_names = [cat[0].name.trim() || `Industry ${cat[0].id}`];
  return {
    name: args.name.trim(),
    company_email: email,
    domain: domain || "pending.local",
    description: desc,
    website: "",
    industry_ids,
    industry_names,
    social_links: {},
    additional_details: {},
  };
}

/** POST new directory row + membership (same as full registration create, minimal fields). */
export async function createEmployerDirectoryCompanyQuick(args: {
  name: string;
  companyEmail: string;
  breneoUserId: string;
  domain?: string;
  industriesCatalog: AggregatorIndustry[];
  descriptionFallback?: string;
}): Promise<AggregatorCompany> {
  const payload = buildQuickCreateAggregatorCompanyPayload(args);
  const created = await joinOrCreateEmployerAggregatorCompany({
    breneoUserId: args.breneoUserId,
    mode: "new",
    createPayload: payload,
  });
  if (!created || typeof created !== "object") {
    throw new Error("Company create returned no data.");
  }
  return created as AggregatorCompany;
}

export type CreateEmployerAggregatorCompanyOptions = {
  aggregatorCompanyId?: string;
  detailMethod?: "PATCH" | "POST" | "PUT";
};

export async function createEmployerAggregatorCompany(
  payload: CreateAggregatorCompanyBody,
  options?: CreateEmployerAggregatorCompanyOptions,
): Promise<AggregatorCompany> {
  const token = TokenManager.getAccessToken();
  if (!token || typeof window === "undefined") {
    throw new Error("Not authenticated");
  }

  const id = options?.aggregatorCompanyId?.trim();
  const detailMethod = options?.detailMethod ?? "PATCH";
  const method = id ? detailMethod : "POST";
  assertEmployerJobsProxyConfigured(method === "PUT" ? "PATCH" : method);

  const origin = employerBffOrigin();
  const url = id
    ? new URL(
        `${EMPLOYER_COMPANIES_COLLECTION}/${encodeURIComponent(id)}/`,
        `${origin}/`,
      ).toString()
    : new URL(EMPLOYER_COMPANIES_COLLECTION, `${origin}/`).toString();

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = new Error(
      extractErrorMessage(
        body,
        id
          ? "Could not save company on job aggregator."
          : "Could not create company on job aggregator.",
      ),
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return body as AggregatorCompany;
}

/**
 * Link the current user to an existing company: BFF → POST `/api/employer/staff-memberships`
 * with `{ company_id: number, external_user_id }` (external_user_id from JWT server-side).
 */
export async function linkEmployerToAggregatorCompany(
  companyId: string,
): Promise<void> {
  const token = TokenManager.getAccessToken();
  if (!token || typeof window === "undefined") {
    throw new Error("Not authenticated");
  }
  const n = Number(companyId);
  if (!Number.isFinite(n)) {
    throw new Error("Company id must be numeric for staff membership.");
  }
  assertEmployerJobsProxyConfigured("POST");
  const res = await fetch(
    new URL("/api/employer/staff-memberships", `${employerBffOrigin()}/`).toString(),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ company_id: n }),
    },
  );
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok && !isDuplicateStaffMembershipError(res.status, body)) {
    const err = new Error(
      extractErrorMessage(body, "Could not link your account to this company."),
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
}

/**
 * If `GET …/for-user` returns a row, PATCH that id; else POST list (new company). Membership is handled by BFF on create.
 */
export async function createOrUpdateEmployerAggregatorCompany(
  payload: CreateAggregatorCompanyBody,
  params: {
    breneoUserId: string;
    detailMethod?: CreateEmployerAggregatorCompanyOptions["detailMethod"];
  },
): Promise<AggregatorCompany> {
  let aggregatorCompanyId: string | undefined;
  try {
    const list = await fetchEmployerAggregatorCompanies(params.breneoUserId);
    const first = list[0];
    if (first?.id != null && String(first.id).trim() !== "") {
      aggregatorCompanyId = String(first.id).trim();
    }
  } catch {
    /* POST new company */
  }
  return createEmployerAggregatorCompany(payload, {
    aggregatorCompanyId,
    detailMethod: params.detailMethod,
  });
}

/**
 * Join an existing directory company, or create a new one + membership (via BFF).
 */
export async function joinOrCreateEmployerAggregatorCompany(args: {
  breneoUserId: string;
  mode: "existing" | "new";
  existingCompanyId?: string;
  createPayload?: CreateAggregatorCompanyBody;
}): Promise<AggregatorCompany | void> {
  if (args.mode === "existing") {
    const id = args.existingCompanyId?.trim();
    if (!id) throw new Error("Company id is required.");
    await linkEmployerToAggregatorCompany(id);
    try {
      return await fetchAggregatorCompanyDetail(id);
    } catch {
      return;
    }
  }
  if (!args.createPayload) {
    throw new Error("Missing company payload.");
  }
  return createOrUpdateEmployerAggregatorCompany(args.createPayload, {
    breneoUserId: args.breneoUserId,
  });
}

/**
 * Prefer aggregator company id from `/api/employer/companies/for-user` for job list/detail when present.
 * Pass `employerProfileRaw` so `external_user_id` matches the profile/directory page (nested `user.id`
 * may differ from auth context `user.id` on some backends).
 */
export async function resolveEmployerJobsCompanyFilter(params: {
  breneoUserId: string | number | undefined;
  employerProfileRaw?: unknown;
  profileCompanyId: string;
  profileCompanyName: string;
}): Promise<{
  companyId: string;
  companyName: string;
  /** Same label as profile “Company” card: `fetchEmployerAggregatorCompanies` → `[0].name` when set. */
  linkedDirectoryCompanyName: string;
}> {
  const { profileCompanyId, profileCompanyName } = params;
  const profileFallback = (profileCompanyName || "").trim();
  const fromProfile = params.employerProfileRaw
    ? extractBreneoUserIdFromEmployerProfileRaw(params.employerProfileRaw)
    : null;
  const staffUserId =
    fromProfile && fromProfile.trim() !== ""
      ? fromProfile.trim()
      : params.breneoUserId != null && String(params.breneoUserId).trim() !== ""
        ? String(params.breneoUserId).trim()
        : "";
  if (staffUserId === "") {
    return {
      companyId: profileCompanyId,
      companyName: profileCompanyName,
      linkedDirectoryCompanyName: profileFallback,
    };
  }
  try {
    const list = await fetchEmployerAggregatorCompanies(staffUserId);
    const first = list[0];
    const fromDirectory =
      first != null &&
      first.name != null &&
      String(first.name).trim() !== ""
        ? String(first.name).trim()
        : "";
    if (first?.id != null && String(first.id).trim() !== "") {
      return {
        companyId: String(first.id),
        companyName: fromDirectory || profileCompanyName,
        linkedDirectoryCompanyName: fromDirectory || profileFallback,
      };
    }
    if (fromDirectory) {
      return {
        companyId: profileCompanyId,
        companyName: fromDirectory,
        linkedDirectoryCompanyName: fromDirectory,
      };
    }
  } catch {
    /* use Breneo profile fallback */
  }
  return {
    companyId: profileCompanyId,
    companyName: profileCompanyName,
    linkedDirectoryCompanyName: profileFallback,
  };
}
