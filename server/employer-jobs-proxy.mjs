/**
 * Dev/local proxy for employer jobs (BFF; secret never in browser).
 * - GET /api/industries/ — public → GET aggregator industries (proxied)
 * - GET /api/employer/companies/for-user — JWT → GET aggregator “my companies” (for-user or legacy ?staff_user_id=)
 * - GET /api/employer/companies?search=|name= — JWT → company picker search (new API only)
 * - GET /api/employer/companies/:companyId — JWT → company detail (scoped with external_user_id when new API)
 * - POST /api/employer/staff-memberships — JWT → POST aggregator /api/employer/staff-memberships { company_id, external_user_id }
 * - POST /api/employer/companies/:companyId/members — JWT → same as staff-memberships (compat alias)
 * - POST /api/employer/companies — JWT → create company; new API: no staff_user_ids in body; BFF POSTs membership after create
 * - PATCH|POST|PUT /api/employer/companies/:companyId — JWT → partial/full update (new API strips staff_user_ids from body)
 *   Upstream path: JOB_AGGREGATOR_COMPANIES_PATH (default /api/employer/companies). Staff link: POST staff-memberships unless JOB_AGGREGATOR_EMBED_STAFF_USER_IDS_IN_COMPANY_BODY=1.
 * - GET /api/employer/jobs — JWT auth → GET aggregator list (?company_id preferred, ?company fallback)
 * - GET /api/employer/jobs/:jobId — JWT → GET aggregator detail (forwards ?company_id; adds from profile if missing)
 * - POST /api/employer/jobs — JWT + profile → POST aggregator create with X-Employer-Key
 *   (optional Gemini: description = short AI summary; aggregator lists use keys Responsibilities,
 *    qualifications per API contract; full_description = full text from employer)
 * - PATCH /api/employer/jobs/:jobId — forwards ?company_id; Gemini when full_description without client bullets
 * - POST /api/employer/jobs/:jobId — same handler as PATCH (for clients that cannot PATCH)
 * - DELETE /api/employer/jobs/:jobId — forwards ?company_id
 *
 * Run: node server/employer-jobs-proxy.mjs (see npm run dev).
 *
 * Env (never use VITE_* or NEXT_PUBLIC_* for secrets):
 *   JOB_AGGREGATOR_EMPLOYER_KEY — required for POST; must match Django EMPLOYER_POST_SECRET
 *   MAIN_API_BASE_URL — main Breneo API (no trailing slash); JWT/profile checks hit …/api/employer/profile/ here (same as VITE_API_BASE_URL)
 *   VITE_API_BASE_URL — optional fallback if MAIN_API_BASE_URL unset (dotenv loads VITE_* for Node in dev)
 *   JOB_AGGREGATOR_BASE_URL — job aggregator origin (employer CRUD, industries, companies search); default breneo-job-aggregator Railway
 *   VITE_JOB_API_BASE_URL — optional alias for JOB_AGGREGATOR_BASE_URL (same value; dotenv loads for Node)
 *   JOB_AGGREGATOR_COMPANIES_PATH — upstream companies prefix (default /api/employer/companies on JOB_AGGREGATOR_BASE_URL).
 *   JOB_AGGREGATOR_STAFF_MEMBERSHIPS_PATH — default /api/employer/staff-memberships (no trailing slash on upstream POST URL).
 *   JOB_AGGREGATOR_EMBED_STAFF_USER_IDS_IN_COMPANY_BODY=1 — rare: send staff_user_ids inside company POST/PATCH JSON instead of staff-memberships.
 *   JOB_AGGREGATOR_POST_URL — deprecated fallback; full URL or origin only
 *   EMPLOYER_PROXY_PORT — default 8787 (local dev; ignored when PORT is set)
 *   PORT — set by Railway/Render/Fly; when set, server binds 0.0.0.0 for public access
 *   GEMINI_API_KEY — optional; employer job POST/PATCH runs Gemini to fill responsibilities / qualifications
 *   GEMINI_MODEL — optional Gemini model id (default gemini-flash-latest)
 */
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";

import { extractJobSectionsFromDescription } from "./geminiJobParser.mjs";

const hasPlatformPort = Boolean(
  process.env.PORT && String(process.env.PORT).trim() !== "",
);
const PORT = Number(
  hasPlatformPort
    ? process.env.PORT
    : process.env.EMPLOYER_PROXY_PORT || 8787,
);
const LISTEN_HOST = hasPlatformPort
  ? "0.0.0.0"
  : process.env.BIND_HOST || "127.0.0.1";

const DEFAULT_AGGREGATOR_BASE_URL = "https://breneo-job-aggregator.up.railway.app";

function resolveAggregatorBaseUrl() {
  const raw =
    process.env.JOB_AGGREGATOR_BASE_URL?.trim() ||
    process.env.VITE_JOB_API_BASE_URL?.trim() ||
    process.env.JOB_AGGREGATOR_POST_URL?.trim();
  if (!raw) {
    return DEFAULT_AGGREGATOR_BASE_URL.replace(/\/$/, "");
  }
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return `${u.origin}`.replace(/\/$/, "");
  } catch {
    return DEFAULT_AGGREGATOR_BASE_URL.replace(/\/$/, "");
  }
}

// Must match src/api/auth/config.ts API_BASE_URL or JWT validation returns 401 (not the job aggregator).
const MAIN_API_BASE = (
  process.env.MAIN_API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  "https://web-production-80ed8.up.railway.app"
).replace(/\/$/, "");
const AGGREGATOR_BASE_URL = resolveAggregatorBaseUrl();

function employerAuthFailureHint(status) {
  if (status !== 401 && status !== 403) return "";
  return (
    ` The BFF validates your token against the main Breneo API (${MAIN_API_BASE}); set MAIN_API_BASE_URL or VITE_API_BASE_URL to that host, not the job API. ` +
    `Job routes are forwarded to ${AGGREGATOR_BASE_URL} (JOB_AGGREGATOR_BASE_URL or VITE_JOB_API_BASE_URL).`
  );
}
const AGGREGATOR_EMPLOYER_JOBS_URL = `${AGGREGATOR_BASE_URL}/api/employer/jobs`;
const AGGREGATOR_INDUSTRIES_URL = `${AGGREGATOR_BASE_URL}/api/industries/`;

const COMPANIES_PATH_RAW = (
  process.env.JOB_AGGREGATOR_COMPANIES_PATH || "/api/employer/companies"
).trim();
const COMPANIES_PATH_NORM = COMPANIES_PATH_RAW.startsWith("/")
  ? COMPANIES_PATH_RAW
  : `/${COMPANIES_PATH_RAW}`;
const AGGREGATOR_COMPANIES_ROOT = `${AGGREGATOR_BASE_URL.replace(/\/$/, "")}${COMPANIES_PATH_NORM}`.replace(
  /\/$/,
  "",
);
/** Legacy list/detail query shapes (e.g. staff_user_id on GET). */
const COMPANIES_API_LEGACY = COMPANIES_PATH_NORM.includes("employer/companies");

/** When true, POST/PATCH company JSON includes staff_user_ids (old aggregator). Default: false — create uses POST staff-memberships after company row is created. */
const EMBED_STAFF_USER_IDS_IN_COMPANY_BODY =
  String(
    process.env.JOB_AGGREGATOR_EMBED_STAFF_USER_IDS_IN_COMPANY_BODY || "",
  ).trim() === "1";

const STAFF_MEM_PATH_RAW = (
  process.env.JOB_AGGREGATOR_STAFF_MEMBERSHIPS_PATH ||
  "/api/employer/staff-memberships"
).trim();
const STAFF_MEM_PATH_NORM = STAFF_MEM_PATH_RAW.startsWith("/")
  ? STAFF_MEM_PATH_RAW
  : `/${STAFF_MEM_PATH_RAW}`;
const AGGREGATOR_STAFF_MEMBERSHIPS_ROOT = `${AGGREGATOR_BASE_URL.replace(/\/$/, "")}${STAFF_MEM_PATH_NORM}`.replace(
  /\/$/,
  "",
);

/**
 * Django REST detail routes often expect a trailing slash before the query string.
 * @param {string} encodedJobId result of encodeURIComponent(jobId)
 */
function aggregatorJobDetailUrl(encodedJobId) {
  const root = AGGREGATOR_EMPLOYER_JOBS_URL.replace(/\/$/, "");
  return `${root}/${encodedJobId}/`;
}
const AGGREGATOR_KEY = process.env.JOB_AGGREGATOR_EMPLOYER_KEY;

if (!AGGREGATOR_KEY) {
  console.warn(
    "[employer-jobs-proxy] JOB_AGGREGATOR_EMPLOYER_KEY is missing — POST /api/employer/jobs returns 500. Add it to .env (server-only, not VITE_*). See .env.example.",
  );
}

if (!process.env.GEMINI_API_KEY?.trim()) {
  console.log(
    "[employer-jobs-proxy] GEMINI_API_KEY not set — Gemini job parsing is off. Add GEMINI_API_KEY to .env (or Railway) and restart.",
  );
}

const ALLOWED_WORK_MODES = new Set([
  "remote",
  "hybrid",
  "onsite",
  "on-site",
  "unknown",
]);

/** Job-aggregator JSON keys for list fields (must match backend API). */
const AGG_FIELD_RESPONSIBILITIES = "Responsibilities";
const AGG_FIELD_QUALIFICATIONS = "qualifications";

/**
 * @param {Record<string, unknown> | null | undefined} body
 */
function hasBodyResponsibilities(body) {
  return (
    Object.prototype.hasOwnProperty.call(body || {}, "responsibilities") ||
    Object.prototype.hasOwnProperty.call(body || {}, "Responsibilities")
  );
}

/**
 * @param {Record<string, unknown> | null | undefined} body
 */
function hasBodyQualifications(body) {
  return (
    Object.prototype.hasOwnProperty.call(body || {}, "qualifications") ||
    Object.prototype.hasOwnProperty.call(body || {}, "Qualifications")
  );
}

/**
 * @param {Record<string, unknown> | null | undefined} body
 */
function getBodyResponsibilities(body) {
  if (Object.prototype.hasOwnProperty.call(body || {}, "responsibilities")) {
    return /** @type {unknown} */ (body.responsibilities);
  }
  if (Object.prototype.hasOwnProperty.call(body || {}, "Responsibilities")) {
    return /** @type {unknown} */ (body.Responsibilities);
  }
  return undefined;
}

/**
 * @param {Record<string, unknown> | null | undefined} body
 */
function getBodyQualifications(body) {
  if (Object.prototype.hasOwnProperty.call(body || {}, "qualifications")) {
    return /** @type {unknown} */ (body.qualifications);
  }
  if (Object.prototype.hasOwnProperty.call(body || {}, "Qualifications")) {
    return /** @type {unknown} */ (body.Qualifications);
  }
  return undefined;
}

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

function normalizeWorkMode(raw) {
  if (raw == null || raw === "") return "unknown";
  const s = String(raw).trim();
  const lower = s.toLowerCase();
  if (ALLOWED_WORK_MODES.has(s)) return s;
  if (ALLOWED_WORK_MODES.has(lower)) return lower;
  if (lower === "on site" || lower === "on_site") return "on-site";
  return "unknown";
}

/**
 * PATCH body: JSON arrays of strings (from employer dashboard).
 * @param {unknown} val
 * @param {number} max
 * @returns {string[]}
 */
function normalizeBodyStringArrayInput(val, max = 6) {
  if (!Array.isArray(val)) return [];
  return val
    .map((x) => String(x ?? "").trim())
    .filter(Boolean)
    .slice(0, max);
}

function validateApplyUrl(raw) {
  if (raw == null || String(raw).trim() === "") {
    return { ok: true, url: null };
  }
  const t = String(raw).trim();
  try {
    const u = new URL(t.startsWith("http://") || t.startsWith("https://") ? t : `https://${t}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { ok: false, error: "apply_url must use http or https" };
    }
    return { ok: true, url: u.toString() };
  } catch {
    return { ok: false, error: "Invalid apply_url" };
  }
}

/**
 * Same company name fields as `normalizeEmployerProfile` in src/api/employer/profile.ts (no first_name).
 * @param {Record<string, unknown>} profile
 */
function extractCompanyNameFromBreneoProfile(profile) {
  if (!profile || typeof profile !== "object") return "";
  const o = profile;
  const rs = (v) => (v == null ? "" : String(v).trim());
  let companyName = rs(o.company_name);
  if (!companyName && o.company && typeof o.company === "object" && !Array.isArray(o.company)) {
    companyName = rs(
      /** @type {Record<string, unknown>} */ (o.company).name,
    );
  }
  if (!companyName) companyName = rs(o.name);
  return companyName;
}

/**
 * @param {Record<string, unknown>} profile
 */
function extractCompanyIdFromBreneoProfile(profile) {
  if (!profile || typeof profile !== "object") return "";
  if (profile.company_id != null && String(profile.company_id).trim() !== "") {
    return String(profile.company_id).trim();
  }
  if (
    profile.company &&
    typeof profile.company === "object" &&
    /** @type {Record<string, unknown>} */ (profile.company).id != null
  ) {
    return String(/** @type {Record<string, unknown>} */ (profile.company).id).trim();
  }
  return "";
}

/** Matches client `unwrapCompanies` / DRF list shapes. */
function unwrapAggregatorCompanyList(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const o = /** @type {Record<string, unknown>} */ (data);
  for (const key of ["results", "companies", "data", "items"]) {
    const v = o[key];
    if (Array.isArray(v)) return v;
  }
  const inner = o.data;
  if (inner && typeof inner === "object") {
    const d = /** @type {Record<string, unknown>} */ (inner);
    if (Array.isArray(d.results)) return d.results;
    if (Array.isArray(d.data)) return d.data;
  }
  return [];
}

/**
 * Same source as SPA `resolveEmployerJobsCompanyFilter` → `fetchEmployerAggregatorCompanies`.
 * @param {string} userId
 * @returns {Promise<{ id: string; name: string } | null>}
 */
async function fetchAggregatorFirstCompanyForUser(userId) {
  if (!userId || !AGGREGATOR_KEY) return null;
  const root = AGGREGATOR_COMPANIES_ROOT.replace(/\/$/, "");
  let listUrl;
  if (COMPANIES_API_LEGACY) {
    listUrl = new URL(root);
    listUrl.searchParams.set("staff_user_id", userId);
  } else {
    listUrl = new URL(`${root}/for-user`);
    listUrl.searchParams.set("external_user_id", userId);
  }
  try {
    const upstream = await fetch(listUrl.toString(), {
      headers: {
        Accept: "application/json",
        "X-Employer-Key": AGGREGATOR_KEY,
      },
    });
    const text = await upstream.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      return null;
    }
    if (!upstream.ok) return null;
    const list = unwrapAggregatorCompanyList(data);
    const first = list[0];
    if (!first || typeof first !== "object") return null;
    const row = /** @type {Record<string, unknown>} */ (first);
    const id = row.id != null ? String(row.id).trim() : "";
    const name = row.name != null ? String(row.name).trim() : "";
    if (!id && !name) return null;
    return { id, name };
  } catch {
    return null;
  }
}

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<{ auth: string; company: string; companyId: string } | null>}
 */
async function requireEmployerCompany(req, res) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ detail: "Authentication required" });
    return null;
  }

  const profRes = await fetch(`${MAIN_API_BASE}/api/employer/profile/`, {
    headers: {
      Authorization: auth,
      Accept: "application/json",
    },
  });

  if (!profRes.ok) {
    res.status(401).json({
      detail: `Employer authentication failed (${profRes.status}).${employerAuthFailureHint(profRes.status)}`,
    });
    return null;
  }

  const profile = /** @type {Record<string, unknown>} */ (await profRes.json());
  /** Company for jobs — same fields as SPA normalizeEmployerProfile; never first_name. */
  let company = extractCompanyNameFromBreneoProfile(profile);
  let companyId = extractCompanyIdFromBreneoProfile(profile);

  const userId =
    extractStaffUserIdFromEmployerProfile(profile) ||
    extractUserIdFromBearerJwt(auth);

  // Job aggregator list/create use `GET|POST …/api/employer/jobs?company_id=<id>` on Railway;
  // that id must be the directory company id from the aggregator, not only Breneo's FK.
  if (userId) {
    const agg = await fetchAggregatorFirstCompanyForUser(userId);
    if (agg) {
      if (!company && agg.name) company = agg.name;
      if (agg.id) companyId = agg.id;
    }
  }

  if (!company) {
    res.status(400).json({
      detail:
        "Company name is missing. Set it on your employer profile or link a company on the job directory.",
    });
    return null;
  }

  return { auth, company, companyId };
}

/**
 * Breneo user id for aggregator `staff_user_id` / `staff_user_ids` (from employer profile JSON).
 * @param {Record<string, unknown>} profile
 * @returns {string | null}
 */
function extractStaffUserIdFromEmployerProfile(profile) {
  if (!profile || typeof profile !== "object") return null;
  const u = profile.user;
  if (u != null && typeof u === "object" && !Array.isArray(u)) {
    const uo = /** @type {Record<string, unknown>} */ (u);
    const id = uo.id ?? uo.pk;
    if (id != null && String(id).trim() !== "") return String(id).trim();
  }
  if (typeof u === "number" || typeof u === "string") {
    const s = String(u).trim();
    if (s) return s;
  }
  for (const key of ["user_id", "owner_id", "account_id", "breneo_user_id"]) {
    const v = profile[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  const account = profile.account;
  if (account != null && typeof account === "object" && !Array.isArray(account)) {
    const aid = /** @type {Record<string, unknown>} */ (account).id;
    if (aid != null && String(aid).trim() !== "") return String(aid).trim();
  }
  return null;
}

/**
 * Fallback: read user id from JWT payload (Breneo often omits nested `user` on GET profile).
 * @param {string} authHeader Authorization: Bearer …
 * @returns {string | null}
 */
function extractUserIdFromBearerJwt(authHeader) {
  if (!authHeader || typeof authHeader !== "string") return null;
  const m = authHeader.match(/^Bearer\s+(\S+)/i);
  if (!m) return null;
  const token = m[1];
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (b64.length % 4)) % 4);
    const json = Buffer.from(b64 + pad, "base64").toString("utf8");
    const payload = JSON.parse(json);
    const id =
      payload.user_id ??
      payload.sub ??
      payload.id ??
      payload.userId ??
      payload.uid;
    if (id != null && String(id).trim() !== "") return String(id).trim();
  } catch {
    return null;
  }
  return null;
}

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<{ auth: string; userId: string } | null>}
 */
async function requireEmployerAuth(req, res) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ detail: "Authentication required" });
    return null;
  }

  const profRes = await fetch(`${MAIN_API_BASE}/api/employer/profile/`, {
    headers: {
      Authorization: auth,
      Accept: "application/json",
    },
  });

  if (!profRes.ok) {
    res.status(401).json({
      detail: `Employer authentication failed (${profRes.status}).${employerAuthFailureHint(profRes.status)}`,
    });
    return null;
  }

  const profile = await profRes.json();
  let userId = extractStaffUserIdFromEmployerProfile(
    /** @type {Record<string, unknown>} */ (profile),
  );
  if (!userId) {
    userId = extractUserIdFromBearerJwt(auth);
  }
  if (!userId) {
    res.status(400).json({
      detail:
        "Could not resolve Breneo user id from employer profile or JWT. Ensure MAIN_API_BASE_URL matches your Breneo API and the token is a valid employer access token.",
    });
    return null;
  }

  return { auth, userId };
}

/**
 * Upstream URL for one job (GET/PATCH/DELETE detail).
 * Matches Postman / public API: path only — auth is `X-Employer-Key`; `?company_id=` can make
 * some aggregator builds return 404 for valid job ids.
 * Set AGGREGATOR_JOB_DETAIL_COMPANY_QUERY=1 to append `company_id` from JWT (legacy).
 * @param {string} jobId
 * @param {import("express").Request} req
 * @param {{ companyId?: string }} ctx
 */
function jobDetailUpstreamUrl(jobId, req, ctx) {
  const id = encodeURIComponent(String(jobId || "").trim());
  const base = aggregatorJobDetailUrl(id);
  const legacyQuery =
    String(process.env.AGGREGATOR_JOB_DETAIL_COMPANY_QUERY || "").trim() === "1";
  if (!legacyQuery) {
    return base;
  }
  const u = new URL(base);
  const fromQuery = String(req.query.company_id || "").trim();
  const ctxId = ctx.companyId ? String(ctx.companyId).trim() : "";
  if (ctxId) {
    u.searchParams.set("company_id", ctxId);
  } else if (fromQuery) {
    u.searchParams.set("company_id", fromQuery);
  }
  return u.toString();
}

/**
 * Parse aggregator JSON. HTML/plain error pages are not JSON — forward upstream status instead of 502.
 * @param {string} text
 * @param {number} upstreamStatus
 * @param {boolean} upstreamOk
 * @returns {{ ok: true, data: unknown } | { ok: false, status: number, detail: string }}
 */
function parseAggregatorJsonResponse(text, upstreamStatus, upstreamOk) {
  const trimmed = String(text ?? "")
    .replace(/^\uFEFF/, "")
    .trim();
  if (!trimmed) {
    return { ok: true, data: {} };
  }
  try {
    return { ok: true, data: JSON.parse(trimmed) };
  } catch {
    const snippet = trimmed.slice(0, 2000);
    if (!upstreamOk) {
      return {
        ok: false,
        status: upstreamStatus,
        detail: snippet || "Aggregator error",
      };
    }
    console.error(
      "[employer-jobs-proxy] aggregator returned non-JSON (status ok)",
      upstreamStatus,
      snippet.slice(0, 400),
    );
    return {
      ok: false,
      status: 502,
      detail: "Invalid response from job aggregator",
    };
  }
}

/**
 * Public read-only industries list (proxied so the browser never calls Railway with secrets).
 */
async function handleIndustriesList(req, res) {
  try {
    const headers = { Accept: "application/json" };
    if (AGGREGATOR_KEY) {
      headers["X-Employer-Key"] = AGGREGATOR_KEY;
    }
    const upstream = await fetch(AGGREGATOR_INDUSTRIES_URL, { headers });
    const text = await upstream.text();
    let data;
    try {
      data = text ? JSON.parse(text) : [];
    } catch {
      return res.status(502).json({ detail: "Invalid response from job aggregator" });
    }
    if (!upstream.ok) {
      return res.status(upstream.status).json(
        typeof data === "object" && data !== null
          ? data
          : { detail: text || "Aggregator industries error" },
      );
    }
    return res.status(200).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ detail: "Internal server error" });
  }
}

/**
 * @param {unknown} data
 * @returns {string}
 */
function extractCompanyIdFromUpstreamCreate(data) {
  if (!data || typeof data !== "object") return "";
  const o = /** @type {Record<string, unknown>} */ (data);
  const id = o.id ?? o.pk ?? o.company_id;
  if (id != null && String(id).trim() !== "") return String(id).trim();
  return "";
}

/**
 * @param {import("express").Request} req
 * @param {{ userId: string }} ctx
 */
function prepareEmployerCompanyPayloadLegacy(req, ctx) {
  const rawBody =
    req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? /** @type {Record<string, unknown>} */ ({ ...req.body })
      : {};
  delete rawBody.company_id;
  const idsRaw = rawBody.staff_user_ids;
  const ids = Array.isArray(idsRaw)
    ? idsRaw.map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];
  if (!ids.includes(ctx.userId)) {
    rawBody.staff_user_ids = [...ids, ctx.userId];
  } else {
    rawBody.staff_user_ids = ids;
  }
  return rawBody;
}

/**
 * Strip staff_user_ids (memberships are separate on new API).
 * @param {import("express").Request} req
 */
function prepareEmployerCompanyPayloadNew(req) {
  const rawBody =
    req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? /** @type {Record<string, unknown>} */ ({ ...req.body })
      : {};
  delete rawBody.company_id;
  delete rawBody.staff_user_ids;
  return rawBody;
}

/**
 * Django often returns 400 + non_field_errors for unique (company_id, external_user_id), not 409.
 * @param {number} status
 * @param {unknown} data
 */
function isDuplicateStaffMembershipResponse(status, data) {
  if (status === 409) return true;
  if (status !== 400 || data == null || typeof data !== "object") return false;
  const o = /** @type {Record<string, unknown>} */ (data);
  const nfe = o.non_field_errors;
  if (Array.isArray(nfe)) {
    const joined = nfe.map((x) => String(x).toLowerCase()).join(" ");
    if (joined.includes("unique")) return true;
  }
  const d = o.detail;
  if (typeof d === "string" && d.toLowerCase().includes("unique")) return true;
  return false;
}

/**
 * POST staff-memberships on the aggregator (company_id must be numeric). URL has no trailing slash.
 * @param {string | number} companyIdRaw
 * @param {{ userId: string }} ctx
 */
async function postStaffMembership(companyIdRaw, ctx) {
  const n = Number(companyIdRaw);
  if (!Number.isFinite(n)) {
    return {
      ok: false,
      status: 400,
      data: { detail: "company_id must be a finite number" },
      text: "",
    };
  }
  const url = AGGREGATOR_STAFF_MEMBERSHIPS_ROOT.replace(/\/$/, "");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Employer-Key": AGGREGATOR_KEY || "",
    },
    body: JSON.stringify({ company_id: n, external_user_id: ctx.userId }),
  });
  const text = await res.text();
  const data = parseUpstreamJson(text);
  const ok = res.ok || isDuplicateStaffMembershipResponse(res.status, data);
  return { ok, status: res.status, data, text };
}

async function handleStaffMembershipsCreate(req, res) {
  try {
    const ctx = await requireEmployerAuth(req, res);
    if (!ctx) return;
    if (!AGGREGATOR_KEY) {
      return res.status(500).json({
        detail:
          "JOB_AGGREGATOR_EMPLOYER_KEY is not set. Add it to .env and restart npm run dev.",
      });
    }
    const raw =
      req.body && typeof req.body === "object" && !Array.isArray(req.body)
        ? /** @type {Record<string, unknown>} */ ({ ...req.body })
        : {};
    const n = Number(raw.company_id);
    if (!Number.isFinite(n)) {
      return res.status(400).json({
        detail: "company_id is required and must be a number",
      });
    }
    const payload = {
      company_id: n,
      external_user_id: ctx.userId,
    };
    const url = AGGREGATOR_STAFF_MEMBERSHIPS_ROOT.replace(/\/$/, "");
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Employer-Key": AGGREGATOR_KEY,
      },
      body: JSON.stringify(payload),
    });
    const text = await upstream.text();
    const data = parseUpstreamJson(text);
    if (!upstream.ok && !isDuplicateStaffMembershipResponse(upstream.status, data)) {
      return res.status(upstream.status >= 400 ? upstream.status : 502).json(
        typeof data === "object" && data !== null
          ? data
          : { detail: text || "Staff membership error" },
      );
    }
    const okStatus =
      upstream.status >= 200 && upstream.status < 300 ? upstream.status : 201;
    return res.status(okStatus).json(
      typeof data === "object" && data !== null ? data : {},
    );
  } catch (e) {
    console.error(e);
    return res.status(500).json({ detail: "Internal server error" });
  }
}

async function handleEmployerCompaniesForUser(req, res) {
  try {
    const ctx = await requireEmployerAuth(req, res);
    if (!ctx) return;
    if (!AGGREGATOR_KEY) {
      return res.status(500).json({
        detail:
          "JOB_AGGREGATOR_EMPLOYER_KEY is not set. Add it to .env and restart npm run dev.",
      });
    }
    const root = AGGREGATOR_COMPANIES_ROOT.replace(/\/$/, "");
    let listUrl;
    if (COMPANIES_API_LEGACY) {
      listUrl = new URL(root);
      listUrl.searchParams.set("staff_user_id", ctx.userId);
    } else {
      listUrl = new URL(`${root}/for-user`);
      listUrl.searchParams.set("external_user_id", ctx.userId);
    }
    const upstream = await fetch(listUrl.toString(), {
      headers: {
        Accept: "application/json",
        "X-Employer-Key": AGGREGATOR_KEY,
      },
    });
    const text = await upstream.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      return res.status(502).json({ detail: "Invalid response from job aggregator" });
    }
    if (!upstream.ok) {
      return res.status(upstream.status).json(
        typeof data === "object" && data !== null
          ? data
          : { detail: text || "Aggregator companies (for-user) error" },
      );
    }
    return res.status(200).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ detail: "Internal server error" });
  }
}

async function handleEmployerCompanyDetailRead(req, res) {
  try {
    const ctx = await requireEmployerAuth(req, res);
    if (!ctx) return;
    if (!AGGREGATOR_KEY) {
      return res.status(500).json({
        detail:
          "JOB_AGGREGATOR_EMPLOYER_KEY is not set. Add it to .env and restart npm run dev.",
      });
    }
    const companyId = String(req.params.companyId || "").trim();
    if (!companyId || companyId === "for-user") {
      return res.status(400).json({ detail: "company id is required in the URL path" });
    }
    const root = AGGREGATOR_COMPANIES_ROOT.replace(/\/$/, "");
    const u = new URL(`${root}/${encodeURIComponent(companyId)}/`);
    if (!COMPANIES_API_LEGACY) {
      u.searchParams.set("external_user_id", ctx.userId);
    }
    for (const [k, v] of Object.entries(req.query)) {
      if (v === undefined || v === "") continue;
      if (k === "external_user_id" || k === "staff_user_id") continue;
      const val = Array.isArray(v) ? v[0] : v;
      u.searchParams.set(k, String(val));
    }
    const upstream = await fetch(u.toString(), {
      headers: {
        Accept: "application/json",
        "X-Employer-Key": AGGREGATOR_KEY,
      },
    });
    const text = await upstream.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      return res.status(502).json({ detail: "Invalid response from job aggregator" });
    }
    if (!upstream.ok) {
      return res.status(upstream.status).json(
        typeof data === "object" && data !== null
          ? data
          : { detail: text || "Aggregator company detail read error" },
      );
    }
    return res.status(200).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ detail: "Internal server error" });
  }
}

async function handleEmployerCompanyMembers(req, res) {
  try {
    const ctx = await requireEmployerAuth(req, res);
    if (!ctx) return;
    if (!AGGREGATOR_KEY) {
      return res.status(500).json({
        detail:
          "JOB_AGGREGATOR_EMPLOYER_KEY is not set. Add it to .env and restart npm run dev.",
      });
    }
    const companyId = String(req.params.companyId || "").trim();
    if (!companyId) {
      return res.status(400).json({ detail: "company id is required in the URL path" });
    }
    const link = await postStaffMembership(companyId, ctx);
    if (!link.ok) {
      return res.status(link.status >= 400 ? link.status : 502).json(
        typeof link.data === "object" && link.data !== null
          ? link.data
          : { detail: link.text || "Could not create staff membership" },
      );
    }
    const okStatus =
      link.status >= 200 && link.status < 300 ? link.status : 201;
    return res.status(okStatus).json(
      typeof link.data === "object" && link.data !== null ? link.data : {},
    );
  } catch (e) {
    console.error(e);
    return res.status(500).json({ detail: "Internal server error" });
  }
}

async function handleEmployerCompaniesList(req, res) {
  try {
    const ctx = await requireEmployerAuth(req, res);
    if (!ctx) return;
    if (!AGGREGATOR_KEY) {
      return res.status(500).json({
        detail:
          "JOB_AGGREGATOR_EMPLOYER_KEY is not set. Add it to .env and restart npm run dev.",
      });
    }
    if (COMPANIES_API_LEGACY) {
      /** Upstream contract: GET …/api/employer/companies?search=… (e.g. Railway). */
      const pickerList = String(req.query.picker || "").trim() === "1";
      const searchForUpstream = String(
        req.query.search || req.query.name || req.query.q || "",
      ).trim();
      const requested = String(req.query.staff_user_id || "").trim();
      /** Upstream list URL must be …/companies?search=… not …/companies/?… (404 on Railway). */
      const listUrl = new URL(AGGREGATOR_COMPANIES_ROOT.replace(/\/$/, ""));
      if (pickerList) {
        for (const key of ["page", "page_size", "limit", "ordering", "search"]) {
          const v = req.query[key];
          if (v === undefined || v === "") continue;
          const val = Array.isArray(v) ? v[0] : v;
          listUrl.searchParams.set(key, String(val));
        }
        if (
          !listUrl.searchParams.has("page_size") &&
          !listUrl.searchParams.has("limit")
        ) {
          listUrl.searchParams.set("page_size", "200");
        }
      } else if (searchForUpstream) {
        listUrl.searchParams.set("search", searchForUpstream);
        for (const key of ["page", "limit", "page_size", "ordering"]) {
          const v = req.query[key];
          if (v === undefined || v === "") continue;
          const val = Array.isArray(v) ? v[0] : v;
          listUrl.searchParams.set(key, String(val));
        }
      } else {
        if (!requested) {
          return res.status(400).json({
            detail:
              "staff_user_id query parameter is required (or pass search= or picker=1 for company list)",
          });
        }
        if (requested !== ctx.userId) {
          return res.status(403).json({
            detail: "staff_user_id does not match authenticated user",
          });
        }
        listUrl.searchParams.set("staff_user_id", ctx.userId);
      }
      const upstream = await fetch(listUrl.toString(), {
        headers: {
          Accept: "application/json",
          "X-Employer-Key": AGGREGATOR_KEY,
        },
      });
      const text = await upstream.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        return res.status(502).json({ detail: "Invalid response from job aggregator" });
      }
      if (!upstream.ok) {
        return res.status(upstream.status).json(
          typeof data === "object" && data !== null
            ? data
            : { detail: text || "Aggregator companies error" },
        );
      }
      return res.status(200).json(data);
    }

    const ext = String(
      req.query.external_user_id || req.query.staff_user_id || "",
    ).trim();
    if (ext && ext !== ctx.userId) {
      return res.status(403).json({
        detail: "external_user_id does not match authenticated user",
      });
    }
    const listUrl2 = new URL(AGGREGATOR_COMPANIES_ROOT.replace(/\/$/, ""));
    const pickerListNew = String(req.query.picker || "").trim() === "1";
    for (const [k, v] of Object.entries(req.query)) {
      if (v === undefined || v === "") continue;
      if (k === "picker") continue;
      const val = Array.isArray(v) ? v[0] : v;
      listUrl2.searchParams.set(k, String(val));
    }
    if (
      pickerListNew &&
      !listUrl2.searchParams.has("page_size") &&
      !listUrl2.searchParams.has("limit")
    ) {
      listUrl2.searchParams.set("page_size", "200");
    }
    const upstream = await fetch(listUrl2.toString(), {
      headers: {
        Accept: "application/json",
        "X-Employer-Key": AGGREGATOR_KEY,
      },
    });
    const text = await upstream.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      return res.status(502).json({ detail: "Invalid response from job aggregator" });
    }
    if (!upstream.ok) {
      return res.status(upstream.status).json(
        typeof data === "object" && data !== null
          ? data
          : { detail: text || "Aggregator companies error" },
      );
    }
    return res.status(200).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ detail: "Internal server error" });
  }
}

async function handleEmployerCompaniesCreate(req, res) {
  try {
    const ctx = await requireEmployerAuth(req, res);
    if (!ctx) return;
    if (!AGGREGATOR_KEY) {
      return res.status(500).json({
        detail:
          "JOB_AGGREGATOR_EMPLOYER_KEY is not set. Add it to .env and restart npm run dev.",
      });
    }
    const rawBody = EMBED_STAFF_USER_IDS_IN_COMPANY_BODY
      ? prepareEmployerCompanyPayloadLegacy(req, ctx)
      : prepareEmployerCompanyPayloadNew(req);
    const postUrl = AGGREGATOR_COMPANIES_ROOT.replace(/\/$/, "");
    const upstream = await fetch(postUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Employer-Key": AGGREGATOR_KEY,
      },
      body: JSON.stringify(rawBody),
    });
    const text = await upstream.text();
    const data = parseUpstreamJson(text);
    if (!upstream.ok) {
      return res.status(upstream.status).json(
        typeof data === "object" && data !== null
          ? data
          : { detail: text || "Aggregator company create error" },
      );
    }
    if (!EMBED_STAFF_USER_IDS_IN_COMPANY_BODY) {
      const newId = extractCompanyIdFromUpstreamCreate(data);
      const num = Number(newId);
      if (newId !== "" && Number.isFinite(num)) {
        const link = await postStaffMembership(num, ctx);
        if (!link.ok) {
          return res.status(502).json({
            detail:
              "Company was created but staff membership failed. Retry from your profile or contact support.",
            company: data,
            membership_error:
              typeof link.data === "object" && link.data !== null
                ? link.data
                : link.text,
          });
        }
      }
    }
    return res.status(upstream.status).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ detail: "Internal server error" });
  }
}

/**
 * Aggregator company detail write (PATCH/POST/PUT).
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
async function handleEmployerCompanyDetailWrite(req, res) {
  try {
    const ctx = await requireEmployerAuth(req, res);
    if (!ctx) return;
    if (!AGGREGATOR_KEY) {
      return res.status(500).json({
        detail:
          "JOB_AGGREGATOR_EMPLOYER_KEY is not set. Add it to .env and restart npm run dev.",
      });
    }
    const companyId = String(req.params.companyId || "").trim();
    if (!companyId) {
      return res.status(400).json({ detail: "company id is required in the URL path" });
    }
    const method = String(req.method || "PATCH").toUpperCase();
    if (!["PATCH", "POST", "PUT"].includes(method)) {
      return res.status(405).json({ detail: "Method not allowed" });
    }
    const rawBody = EMBED_STAFF_USER_IDS_IN_COMPANY_BODY
      ? prepareEmployerCompanyPayloadLegacy(req, ctx)
      : prepareEmployerCompanyPayloadNew(req);
    const root = AGGREGATOR_COMPANIES_ROOT.replace(/\/$/, "");
    const detailUrl = `${root}/${encodeURIComponent(companyId)}/`;
    const upstream = await fetch(detailUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Employer-Key": AGGREGATOR_KEY,
      },
      body: JSON.stringify(rawBody),
    });
    const text = await upstream.text();
    const data = parseUpstreamJson(text);
    if (!upstream.ok) {
      return res.status(upstream.status).json(
        typeof data === "object" && data !== null
          ? data
          : { detail: text || "Aggregator company detail error" },
      );
    }
    return res.status(upstream.status).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ detail: "Internal server error" });
  }
}

async function handleEmployerJobsList(req, res) {
  try {
    const ctx = await requireEmployerCompany(req, res);
    if (!ctx) return;
    if (!AGGREGATOR_KEY) {
      return res.status(500).json({
        detail:
          "JOB_AGGREGATOR_EMPLOYER_KEY is not set. Add it to .env and restart npm run dev.",
      });
    }

    // Upstream: same as `https://…railway.app/api/employer/jobs?company_id=<linked id>`.
    const listUrl = new URL(AGGREGATOR_EMPLOYER_JOBS_URL);
    const requestedCompanyId = String(req.query.company_id || "").trim();
    const requestedCompany = String(req.query.company || "").trim();
    const ctxId = ctx.companyId ? String(ctx.companyId).trim() : "";
    if (ctxId) {
      listUrl.searchParams.set("company_id", ctxId);
    } else if (requestedCompanyId) {
      listUrl.searchParams.set("company_id", requestedCompanyId);
    } else if (requestedCompany) {
      listUrl.searchParams.set("company", requestedCompany);
    } else if (ctx.company) {
      listUrl.searchParams.set("company", ctx.company);
    }

    for (const key of ["page", "page_size", "limit", "ordering"]) {
      const v = req.query[key];
      if (v === undefined || v === "") continue;
      const val = Array.isArray(v) ? v[0] : v;
      listUrl.searchParams.set(key, String(val));
    }
    if (
      !listUrl.searchParams.has("page_size") &&
      !listUrl.searchParams.has("limit")
    ) {
      listUrl.searchParams.set("page_size", "200");
    }

    const upstream = await fetch(listUrl.toString(), {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Employer-Key": AGGREGATOR_KEY,
      },
    });

    const text = await upstream.text();
    const parsed = parseAggregatorJsonResponse(
      text,
      upstream.status,
      upstream.ok,
    );
    if (!parsed.ok) {
      return res.status(parsed.status).json({ detail: parsed.detail });
    }
    const data = parsed.data;

    if (!upstream.ok) {
      return res.status(upstream.status).json(
        typeof data === "object" && data !== null
          ? data
          : { detail: text || "Aggregator list error" },
      );
    }

    const results = Array.isArray(data)
      ? data
      : Array.isArray(data.results)
        ? data.results
        : Array.isArray(data.jobs)
          ? data.jobs
          : [];
    const mapped = results.map((row) => ({
      ...row,
      source: "aggregator",
    }));

    return res.status(200).json({ results: mapped, pagination: data.pagination });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ detail: "Internal server error" });
  }
}

app.get("/api/industries", handleIndustriesList);
app.get("/api/industries/", handleIndustriesList);
app.post("/api/employer/staff-memberships", handleStaffMembershipsCreate);
app.post("/api/employer/staff-memberships/", handleStaffMembershipsCreate);
app.get("/api/employer/companies/for-user", handleEmployerCompaniesForUser);
app.get("/api/employer/companies/for-user/", handleEmployerCompaniesForUser);
app.post(
  "/api/employer/companies/:companyId/members",
  handleEmployerCompanyMembers,
);
app.post(
  "/api/employer/companies/:companyId/members/",
  handleEmployerCompanyMembers,
);
app.get("/api/employer/companies/:companyId", handleEmployerCompanyDetailRead);
app.get("/api/employer/companies/:companyId/", handleEmployerCompanyDetailRead);
app.patch("/api/employer/companies/:companyId", handleEmployerCompanyDetailWrite);
app.patch("/api/employer/companies/:companyId/", handleEmployerCompanyDetailWrite);
app.post("/api/employer/companies/:companyId", handleEmployerCompanyDetailWrite);
app.post("/api/employer/companies/:companyId/", handleEmployerCompanyDetailWrite);
app.put("/api/employer/companies/:companyId", handleEmployerCompanyDetailWrite);
app.put("/api/employer/companies/:companyId/", handleEmployerCompanyDetailWrite);
app.get("/api/employer/companies", handleEmployerCompaniesList);
app.get("/api/employer/companies/", handleEmployerCompaniesList);
app.post("/api/employer/companies", handleEmployerCompaniesCreate);
app.post("/api/employer/companies/", handleEmployerCompaniesCreate);

app.get("/api/employer/jobs", handleEmployerJobsList);
app.get("/api/employer/jobs/", handleEmployerJobsList);

/** Register detail mutations before collection POST so `POST /api/employer/jobs` never shadows `/:jobId`. */
app.patch("/api/employer/jobs/:jobId", handleEmployerJobUpdate);
app.patch("/api/employer/jobs/:jobId/", handleEmployerJobUpdate);
app.post("/api/employer/jobs/:jobId", handleEmployerJobUpdate);
app.post("/api/employer/jobs/:jobId/", handleEmployerJobUpdate);
app.delete("/api/employer/jobs/:jobId", handleEmployerJobDelete);
app.delete("/api/employer/jobs/:jobId/", handleEmployerJobDelete);

async function handleEmployerJobDetail(req, res) {
  try {
    const ctx = await requireEmployerCompany(req, res);
    if (!ctx) return;
    if (!AGGREGATOR_KEY) {
      return res.status(500).json({
        detail:
          "JOB_AGGREGATOR_EMPLOYER_KEY is not set. Add it to .env and restart npm run dev.",
      });
    }
    const { jobId } = req.params;
    const url = jobDetailUpstreamUrl(jobId, req, ctx);
    const upstream = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Employer-Key": AGGREGATOR_KEY,
      },
    });
    const text = await upstream.text();
    const parsed = parseAggregatorJsonResponse(
      text,
      upstream.status,
      upstream.ok,
    );
    if (!parsed.ok) {
      return res.status(parsed.status).json({ detail: parsed.detail });
    }
    const data = parsed.data;
    if (!upstream.ok) {
      return res.status(upstream.status).json(
        typeof data === "object" && data !== null
          ? data
          : { detail: text || "Aggregator job detail error" },
      );
    }
    const enriched =
      typeof data === "object" && data !== null && !Array.isArray(data)
        ? { ...data, source: "aggregator" }
        : data;
    return res.status(upstream.status).json(enriched);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ detail: "Internal server error" });
  }
}

app.get("/api/employer/jobs/:jobId", handleEmployerJobDetail);
app.get("/api/employer/jobs/:jobId/", handleEmployerJobDetail);

function parseUpstreamJson(text) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}


/**
 * Raw description text for Gemini = user field only (not employment_type_note appended later).
 * @param {Record<string, unknown>} body
 */
function getRawJobDescriptionForParsing(body) {
  return String(body?.full_description ?? "").trim();
}

/**
 * Gemini-only fields: description (2–3 sentence summary), Responsibilities[], qualifications[].
 * full_description on payload stays the employer’s full posting. If GEMINI_API_KEY is missing
 * or extraction fails: create omits these keys; patch clears arrays and description.
 *
 * @param {Record<string, unknown>} payload
 * @param {string} rawDescription
 */
async function attachParsedJobSectionsForCreate(payload, rawDescription) {
  const gemini = await extractJobSectionsFromDescription(rawDescription);
  if (!gemini.ok) return;
  if (gemini.description) {
    payload.description = gemini.description;
  }
  payload[AGG_FIELD_RESPONSIBILITIES] = gemini.responsibilities;
  payload[AGG_FIELD_QUALIFICATIONS] = gemini.qualifications;
}

/**
 * @param {Record<string, unknown>} payload
 * @param {string} rawDescription
 */
async function attachParsedJobSectionsForPatchDescription(
  payload,
  rawDescription,
) {
  const gemini = await extractJobSectionsFromDescription(rawDescription);
  if (gemini.ok) {
    payload.description = gemini.description || "";
    payload[AGG_FIELD_RESPONSIBILITIES] = gemini.responsibilities;
    payload[AGG_FIELD_QUALIFICATIONS] = gemini.qualifications;
  } else {
    payload.description = "";
    payload[AGG_FIELD_RESPONSIBILITIES] = [];
    payload[AGG_FIELD_QUALIFICATIONS] = [];
  }
}

/**
 * Build payload for POST/PATCH from request body.
 * For PATCH, fields are optional and sent only when present.
 */
function buildAggregatorPayload(body, company, isPatch = false) {
  const payload = {};
  const has = (k) => Object.prototype.hasOwnProperty.call(body || {}, k);

  if (!isPatch || has("title")) {
    if (!body.title || !String(body.title).trim()) {
      return { ok: false, error: "title is required" };
    }
    payload.title = String(body.title).trim();
  }

  if (!isPatch || has("full_description")) {
    if (!body.full_description || !String(body.full_description).trim()) {
      return { ok: false, error: "full_description is required" };
    }
    let fullDesc = String(body.full_description).trim();
    if (body.employment_type_note && String(body.employment_type_note).trim()) {
      fullDesc += `\n\nEmployment: ${String(body.employment_type_note).trim()}`;
    }
    payload.full_description = fullDesc;
  }

  if (!isPatch || has("work_mode")) {
    payload.work_mode = normalizeWorkMode(body.work_mode);
  }

  // Keep ownership/company coherent on create.
  if (!isPatch) {
    payload.company = company;
  }

  if (has("location")) {
    if (body.location != null && String(body.location).trim() !== "") {
      payload.location = String(body.location).trim();
    } else if (isPatch) {
      payload.location = "";
    }
  } else if (!isPatch && body.location != null && String(body.location).trim() !== "") {
    payload.location = String(body.location).trim();
  }

  if (has("salary")) {
    if (body.salary != null && String(body.salary).trim() !== "") {
      payload.salary = String(body.salary).trim();
    } else if (isPatch) {
      payload.salary = "";
    }
  } else if (!isPatch && body.salary != null && String(body.salary).trim() !== "") {
    payload.salary = String(body.salary).trim();
  }

  if (!isPatch || has("apply_url")) {
    const applyResult = validateApplyUrl(body.apply_url);
    if (!applyResult.ok) return { ok: false, error: applyResult.error };
    if (applyResult.url) {
      payload.apply_url = applyResult.url;
    } else if (isPatch && has("apply_url")) {
      payload.apply_url = null;
    }
  }

  if (!isPatch || has("is_active")) {
    payload.is_active =
      typeof body.is_active === "boolean" ? body.is_active : true;
  }

  if (isPatch) {
    if (hasBodyResponsibilities(body)) {
      payload[AGG_FIELD_RESPONSIBILITIES] = normalizeBodyStringArrayInput(
        getBodyResponsibilities(body),
        6,
      );
    }
    if (hasBodyQualifications(body)) {
      payload[AGG_FIELD_QUALIFICATIONS] = normalizeBodyStringArrayInput(
        getBodyQualifications(body),
        6,
      );
    }
  }

  return { ok: true, payload };
}

app.post("/api/employer/jobs", async (req, res) => {
  try {
    const ctx = await requireEmployerCompany(req, res);
    if (!ctx) return;
    const { company } = ctx;

    if (!AGGREGATOR_KEY) {
      console.error("JOB_AGGREGATOR_EMPLOYER_KEY is not set");
      return res.status(500).json({
        detail:
          "JOB_AGGREGATOR_EMPLOYER_KEY is not set. Add it to .env and restart npm run dev.",
      });
    }

    const built = buildAggregatorPayload(req.body, company, false);
    if (!built.ok) return res.status(400).json({ detail: built.error });
    const payload = built.payload;

    const bodyObj = /** @type {Record<string, unknown>} */ (req.body || {});
    const rawDesc = getRawJobDescriptionForParsing(bodyObj);
    try {
      await attachParsedJobSectionsForCreate(payload, rawDesc);
    } catch (e) {
      console.error(
        "[employer-jobs-proxy] unexpected job-section parser error (create):",
        e,
      );
    }

    const upstream = await fetch(AGGREGATOR_EMPLOYER_JOBS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Employer-Key": AGGREGATOR_KEY,
      },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    const data = parseUpstreamJson(text);

    if (!upstream.ok) {
      return res.status(upstream.status).json(
        typeof data === "object" && data !== null
          ? data
          : { detail: text || "Aggregator error" },
      );
    }

    return res.status(upstream.status).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ detail: "Internal server error" });
  }
});

async function handleEmployerJobUpdate(req, res) {
  try {
    const ctx = await requireEmployerCompany(req, res);
    if (!ctx) return;
    const { company } = ctx;
    const { jobId } = req.params;

    if (!AGGREGATOR_KEY) {
      return res.status(500).json({
        detail:
          "JOB_AGGREGATOR_EMPLOYER_KEY is not set. Add it to .env and restart npm run dev.",
      });
    }

    const built = buildAggregatorPayload(req.body, company, true);
    if (!built.ok) return res.status(400).json({ detail: built.error });
    const payload = built.payload;

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        detail:
          "No fields to update. If you cleared optional fields, ensure the request still includes those keys (e.g. apply_url: null).",
      });
    }

    const bodyObj = /** @type {Record<string, unknown>} */ (req.body || {});
    const patchIncludesDescription = Object.prototype.hasOwnProperty.call(
      bodyObj,
      "full_description",
    );
    const patchIncludesClientStructured =
      hasBodyResponsibilities(bodyObj) || hasBodyQualifications(bodyObj);

    if (patchIncludesDescription && !patchIncludesClientStructured) {
      const rawDesc = getRawJobDescriptionForParsing(bodyObj);
      if (rawDesc) {
        try {
          await attachParsedJobSectionsForPatchDescription(payload, rawDesc);
        } catch (e) {
          console.error(
            "[employer-jobs-proxy] unexpected job-section parser error (patch):",
            e,
          );
          payload.description = "";
          payload[AGG_FIELD_RESPONSIBILITIES] = [];
          payload[AGG_FIELD_QUALIFICATIONS] = [];
        }
      }
    }

    const upstreamUrl = jobDetailUpstreamUrl(jobId, req, ctx);
    const upstream = await fetch(upstreamUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Employer-Key": AGGREGATOR_KEY,
      },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    const data = parseUpstreamJson(text);
    if (!upstream.ok) {
      return res.status(upstream.status).json(
        typeof data === "object" && data !== null
          ? data
          : { detail: text || "Aggregator patch error" },
      );
    }
    return res.status(upstream.status).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ detail: "Internal server error" });
  }
}

async function handleEmployerJobDelete(req, res) {
  try {
    const ctx = await requireEmployerCompany(req, res);
    if (!ctx) return;
    const { jobId } = req.params;

    if (!AGGREGATOR_KEY) {
      return res.status(500).json({
        detail:
          "JOB_AGGREGATOR_EMPLOYER_KEY is not set. Add it to .env and restart npm run dev.",
      });
    }

    const upstream = await fetch(jobDetailUpstreamUrl(jobId, req, ctx), {
      method: "DELETE",
      headers: {
        "X-Employer-Key": AGGREGATOR_KEY,
      },
    });
    const text = await upstream.text();
    if (!upstream.ok) {
      const data = parseUpstreamJson(text);
      return res.status(upstream.status).json(
        typeof data === "object" && data !== null
          ? data
          : { detail: text || "Aggregator delete error" },
      );
    }
    return res.status(204).send();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ detail: "Internal server error" });
  }
}

export { app };

const __filename = fileURLToPath(import.meta.url);
const isMainModule =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === path.resolve(__filename);

if (isMainModule) {
  const server = app.listen(PORT, LISTEN_HOST, () => {
    console.log(
      `[employer-jobs-proxy] http://${LISTEN_HOST}:${PORT} profile=${MAIN_API_BASE}`,
    );
    console.log(
      `[employer-jobs-proxy] upstream companies=${AGGREGATOR_COMPANIES_ROOT} staff=${AGGREGATOR_STAFF_MEMBERSHIPS_ROOT} jobs=${AGGREGATOR_EMPLOYER_JOBS_URL}`,
    );
  });
  server.on("error", (err) => {
    if (/** @type {NodeJS.ErrnoException} */ (err).code === "EADDRINUSE") {
      console.error(
        `[employer-jobs-proxy] Port ${PORT} is already in use (leftover \`npm run dev\`?).\n` +
          `  Free it:  lsof -ti :${PORT} | xargs kill\n` +
          `  Or use another port:  EMPLOYER_PROXY_PORT=8788  (and match vite.config.ts proxy target).`,
      );
      process.exit(1);
    }
    throw err;
  });
}
