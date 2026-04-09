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
import { uploadEmployerCompanyLogoToAggregator } from "@/api/employer/employerProfileApi";
import {
  extractAggregatorErrorMessage,
  parseAggregatorFieldErrors,
} from "@/api/employer/aggregatorHttpErrors";
import { JOB_AGGREGATOR_BASE_URL } from "@/api/auth/config";

export type AggregatorIndustry = { id: number; name: string };

/**
 * Collection URL (no trailing slash). BFF forwards to the same path on the job aggregator with
 * `X-Employer-Key`: GET `?search=`, POST create body JSON.
 * @see https://breneo-job-aggregator.up.railway.app/api/employer/companies?search=
 */
const EMPLOYER_COMPANIES_COLLECTION = "/api/employer/companies";

/**
 * Employer API uses numeric primary key in `/api/employer/companies/{id}` (not public job-board name paths).
 */
export function parseAggregatorCompanyPk(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw.trim());
    if (Number.isInteger(n) && n > 0) return n;
  }
  return null;
}

function requireAggregatorCompanyPk(raw: unknown, label: string): number {
  const id = parseAggregatorCompanyPk(raw);
  if (id == null) {
    throw new Error(
      `${label} must be a positive integer company id from the aggregator.`,
    );
  }
  return id;
}

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
  /** Canonical logo URL from job aggregator (multipart field `logo_upload`). */
  logo_upload?: string;
  /** Legacy/alternate logo URL; prefer {@link aggregatorCompanyLogoUrl}. */
  logo?: string;
  employees_count?: string | number;
  [key: string]: unknown;
};

/** Resolved display URL: `logo_upload` first, then `logo`. */
export function aggregatorCompanyLogoUrl(
  c: { logo?: unknown; logo_upload?: unknown } | null | undefined,
): string {
  if (!c || typeof c !== "object") return "";
  const fromUpload =
    typeof c.logo_upload === "string" ? c.logo_upload.trim() : "";
  if (fromUpload) return fromUpload;
  const fromLogo = typeof c.logo === "string" ? c.logo.trim() : "";
  return fromLogo;
}

export type AggregatorStaffMembership = {
  id: number;
  company_id: number;
  external_user_id: string;
  created_at?: string;
  updated_at?: string;
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

function unwrapCompanies(data: unknown): AggregatorCompany[] {
  if (Array.isArray(data)) return data as AggregatorCompany[];
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  for (const key of [
    "results",
    "companies",
    "data",
    "items",
    "value",
  ] as const) {
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

function unwrapStaffMemberships(data: unknown): AggregatorStaffMembership[] {
  if (Array.isArray(data)) return data as AggregatorStaffMembership[];
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  for (const key of [
    "results",
    "staff_memberships",
    "data",
    "items",
  ] as const) {
    const v = o[key];
    if (Array.isArray(v)) return v as AggregatorStaffMembership[];
  }
  const inner = o.data;
  if (inner && typeof inner === "object") {
    const d = inner as Record<string, unknown>;
    if (Array.isArray(d.results))
      return d.results as AggregatorStaffMembership[];
    if (Array.isArray(d.data)) return d.data as AggregatorStaffMembership[];
  }
  return [];
}

/**
 * Public list — no Authorization header.
 * Tries the configured app/BFF base first, then the public Railway aggregator (read-only, no key).
 */
export async function fetchAggregatorIndustries(): Promise<
  AggregatorIndustry[]
> {
  const bases: string[] = [];
  const primary = getEmployerJobsApiBaseUrl().replace(/\/$/, "");
  bases.push(primary);
  try {
    const o = new URL(primary).origin;
    if (o !== new URL(JOB_AGGREGATOR_BASE_URL).origin) {
      bases.push(JOB_AGGREGATOR_BASE_URL.replace(/\/$/, ""));
    }
  } catch {
    bases.push(JOB_AGGREGATOR_BASE_URL.replace(/\/$/, ""));
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
        lastMessage = extractAggregatorErrorMessage(body, lastMessage);
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
  externalUserId: string,
): Promise<AggregatorCompany[]> {
  const token = TokenManager.getAccessToken();
  if (!token || typeof window === "undefined") return [];

  assertEmployerJobsProxyConfigured("GET");

  const staffUserId = externalUserId.trim();
  if (!staffUserId) return [];
  const url = new URL(
    `${EMPLOYER_COMPANIES_COLLECTION}/for-user`,
    `${employerBffOrigin()}/`,
  );
  url.searchParams.set("external_user_id", staffUserId);
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = new Error(
      extractAggregatorErrorMessage(body, "Could not load companies."),
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return unwrapCompanies(body);
}

export async function fetchEmployerStaffMemberships(params: {
  companyId?: number | string;
  externalUserId?: string;
}): Promise<AggregatorStaffMembership[]> {
  const token = TokenManager.getAccessToken();
  if (!token || typeof window === "undefined") return [];
  assertEmployerJobsProxyConfigured("GET");
  const url = new URL(
    "/api/employer/staff-memberships",
    `${employerBffOrigin()}/`,
  );
  if (params.companyId != null) {
    const id = requireAggregatorCompanyPk(params.companyId, "companyId");
    url.searchParams.set("company_id", String(id));
  }
  const ext = params.externalUserId?.trim();
  if (ext) url.searchParams.set("external_user_id", ext);
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = new Error(
      extractAggregatorErrorMessage(body, "Could not load staff memberships."),
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return unwrapStaffMemberships(body);
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
      extractAggregatorErrorMessage(body, "Could not search companies."),
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return unwrapCompanies(body);
}

export async function fetchAggregatorCompanyDetail(
  companyId: number | string,
  externalUserId?: string,
): Promise<AggregatorCompany> {
  const token = TokenManager.getAccessToken();
  if (!token || typeof window === "undefined") {
    throw new Error("Not authenticated");
  }
  assertEmployerJobsProxyConfigured("GET");
  const id = requireAggregatorCompanyPk(companyId, "companyId");
  const url = new URL(
    `${EMPLOYER_COMPANIES_COLLECTION}/${id}`,
    `${employerBffOrigin()}/`,
  );
  const staffUserId = externalUserId?.trim();
  if (staffUserId) {
    url.searchParams.set("external_user_id", staffUserId);
  }
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = new Error(
      extractAggregatorErrorMessage(body, "Could not load company."),
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return body as AggregatorCompany;
}

/** PATCH `/api/employer/companies/{company_id}` (snake_case, job aggregator). */
export type PatchAggregatorCompanyBody = Partial<{
  name: string;
  domain: string;
  /** URL or null — do not use legacy `logo` on JSON updates. */
  logo_upload: string | null;
  platform: string | null;
  description: string;
  website: string;
  founded_date: string | null;
  employees_count: string | number | null;
  social_links: Record<string, unknown>;
  additional_details: Record<string, unknown>;
  company_email: string;
  industry_ids: number[];
  industry_names: string[];
}>;

export type AggregatorApiError = Error & {
  status?: number;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Partial update on the job aggregator via BFF (`X-Employer-Key` server-side; scoped user from JWT).
 * Path uses numeric primary key `company_id` from list/detail JSON.
 */
export async function patchEmployerAggregatorCompany(
  companyId: number | string,
  body: PatchAggregatorCompanyBody,
): Promise<AggregatorCompany> {
  const id = requireAggregatorCompanyPk(companyId, "companyId");
  const token = TokenManager.getAccessToken();
  if (!token || typeof window === "undefined") {
    throw new Error("Not authenticated");
  }
  assertEmployerJobsProxyConfigured("PATCH");
  const url = new URL(
    `${EMPLOYER_COMPANIES_COLLECTION}/${id}`,
    `${employerBffOrigin()}/`,
  );
  const res = await fetch(url.toString(), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const parsed = (await res.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!res.ok) {
    const err = new Error(
      extractAggregatorErrorMessage(
        parsed,
        "Could not update company on the job directory.",
      ),
    ) as AggregatorApiError;
    err.status = res.status;
    const fe = parseAggregatorFieldErrors(parsed);
    if (Object.keys(fe).length > 0) err.fieldErrors = fe;
    throw err;
  }
  return parsed as AggregatorCompany;
}

/**
 * Multipart logo upload (`logo_upload` field) on Job Aggregator.
 * Uses aggregator origin directly — same-origin BFF proxy can reset connections on large multipart bodies.
 */
export async function uploadEmployerAggregatorCompanyLogo(
  companyId: number | string,
  file: File,
  externalUserId?: string,
): Promise<AggregatorCompany> {
  const token = TokenManager.getAccessToken();
  if (!token || typeof window === "undefined") {
    throw new Error("Not authenticated");
  }
  requireAggregatorCompanyPk(companyId, "companyId");
  const ext = externalUserId?.trim();
  if (!ext) {
    throw new Error("external_user_id is required for company logo upload.");
  }
  try {
    const data = await uploadEmployerCompanyLogoToAggregator({
      companyId,
      externalUserId: ext,
      file,
    });
    return data as AggregatorCompany;
  } catch (e: unknown) {
    const src = e as Error & { status?: number };
    const err = new Error(
      src.message || "Could not upload company logo.",
    ) as AggregatorApiError;
    err.status = src.status;
    throw err;
  }
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
  /** Explicit null on create; file uploads use multipart field `logo_upload` separately. */
  logo_upload: null;
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
    logo_upload: null,
    industry_ids,
    industry_names,
    social_links: {},
    additional_details: {},
  };

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
      ? email
          .slice(email.indexOf("@") + 1)
          .trim()
          .toLowerCase()
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
    logo_upload: null,
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
  /** Primary key for PATCH/PUT `/api/employer/companies/{id}/`. */
  aggregatorCompanyId?: number | string;
  /** @deprecated Use aggregatorCompanyId; employer paths use numeric id only. */
  aggregatorCompanyName?: string;
  /** Optional scoped access query for company detail/update endpoints. */
  externalUserId?: string;
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

  const idOpt =
    options?.aggregatorCompanyId != null
      ? parseAggregatorCompanyPk(options.aggregatorCompanyId)
      : null;
  const legacyName = options?.aggregatorCompanyName?.trim();
  const updateId =
    idOpt ??
    (legacyName && /^\d+$/.test(legacyName)
      ? parseAggregatorCompanyPk(legacyName)
      : null);
  const detailMethod = options?.detailMethod ?? "PATCH";
  const method = updateId != null ? detailMethod : "POST";
  assertEmployerJobsProxyConfigured(method === "PUT" ? "PATCH" : method);

  const origin = employerBffOrigin();
  let url = new URL(EMPLOYER_COMPANIES_COLLECTION, `${origin}/`);
  if (updateId != null) {
    url = new URL(`${EMPLOYER_COMPANIES_COLLECTION}/${updateId}`, `${origin}/`);
    const externalUserId = options?.externalUserId?.trim();
    if (externalUserId) {
      url.searchParams.set("external_user_id", externalUserId);
    }
  }

  const res = await fetch(url.toString(), {
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
      extractAggregatorErrorMessage(
        body,
        updateId != null
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
  externalUserId: string,
): Promise<void> {
  const token = TokenManager.getAccessToken();
  if (!token || typeof window === "undefined") {
    throw new Error("Not authenticated");
  }
  const userId = externalUserId.trim();
  if (!userId) {
    throw new Error("external_user_id is required for membership create.");
  }
  const n = Number(companyId);
  if (!Number.isFinite(n)) {
    throw new Error("Company id must be numeric for staff membership.");
  }
  assertEmployerJobsProxyConfigured("POST");
  const res = await fetch(
    new URL(
      "/api/employer/staff-memberships",
      `${employerBffOrigin()}/`,
    ).toString(),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ company_id: n, external_user_id: userId }),
    },
  );
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok && !isDuplicateStaffMembershipError(res.status, body)) {
    const err = new Error(
      extractAggregatorErrorMessage(
        body,
        "Could not link your account to this company.",
      ),
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
  let aggregatorCompanyId: number | undefined;
  try {
    const list = await fetchEmployerAggregatorCompanies(params.breneoUserId);
    const first = list[0];
    const pk = first ? parseAggregatorCompanyPk(first.id) : null;
    if (pk != null) aggregatorCompanyId = pk;
  } catch {
    /* POST new company */
  }
  return createEmployerAggregatorCompany(payload, {
    aggregatorCompanyId,
    externalUserId: params.breneoUserId,
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
  existingCompanyName?: string;
  createPayload?: CreateAggregatorCompanyBody;
}): Promise<AggregatorCompany | void> {
  if (args.mode === "existing") {
    const id = args.existingCompanyId?.trim();
    if (!id) throw new Error("Company id is required.");
    await linkEmployerToAggregatorCompany(id, args.breneoUserId);
    try {
      const pk = parseAggregatorCompanyPk(id);
      if (pk != null) {
        return await fetchAggregatorCompanyDetail(pk, args.breneoUserId);
      }
      return;
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
      first != null && first.name != null && String(first.name).trim() !== ""
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
