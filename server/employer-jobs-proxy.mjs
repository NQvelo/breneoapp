/**
 * Dev/local proxy for employer jobs (BFF; secret never in browser).
 * - GET /api/employer/jobs — JWT auth → GET aggregator /api/employer/jobs (active + inactive)
 * - POST /api/employer/jobs — JWT + profile → POST aggregator /api/employer/jobs with X-Employer-Key
 * - PATCH /api/employer/jobs/:jobId — same auth + key forwarding
 * - DELETE /api/employer/jobs/:jobId — same auth + key forwarding
 *
 * Run: node server/employer-jobs-proxy.mjs (see npm run dev).
 *
 * Env (never use VITE_* or NEXT_PUBLIC_* for secrets):
 *   JOB_AGGREGATOR_EMPLOYER_KEY — required for POST; must match Django EMPLOYER_POST_SECRET
 *   MAIN_API_BASE_URL — Breneo API base (no trailing slash); must match JWT issuer (same as VITE_API_BASE_URL)
 *   VITE_API_BASE_URL — optional fallback from .env if MAIN_API_BASE_URL unset (dotenv loads it for Node too)
 *   JOB_AGGREGATOR_BASE_URL — aggregator origin (default: https://breneo-job-aggregator.up.railway.app)
 *   JOB_AGGREGATOR_POST_URL — deprecated fallback; full URL or origin only
 *   EMPLOYER_PROXY_PORT — default 8787 (local dev; ignored when PORT is set)
 *   PORT — set by Railway/Render/Fly; when set, server binds 0.0.0.0 for public access
 */
import "dotenv/config";
import express from "express";
import cors from "cors";

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

// Must match src/api/auth/config.ts API_BASE_URL or JWT validation returns 401.
const MAIN_API_BASE = (
  process.env.MAIN_API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  "https://web-production-80ed8.up.railway.app"
).replace(/\/$/, "");
const AGGREGATOR_BASE_URL = resolveAggregatorBaseUrl();
const AGGREGATOR_EMPLOYER_JOBS_URL = `${AGGREGATOR_BASE_URL}/api/employer/jobs`;
const AGGREGATOR_KEY = process.env.JOB_AGGREGATOR_EMPLOYER_KEY;

if (!AGGREGATOR_KEY) {
  console.warn(
    "[employer-jobs-proxy] JOB_AGGREGATOR_EMPLOYER_KEY is missing — POST /api/employer/jobs returns 500. Add it to .env (server-only, not VITE_*). See .env.example.",
  );
}

const ALLOWED_WORK_MODES = new Set([
  "remote",
  "hybrid",
  "onsite",
  "on-site",
  "unknown",
]);

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

/** @returns {{ ok: true, url: string | null } | { ok: false, error: string }} */
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
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<{ auth: string; company: string } | null>}
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
    const hint =
      profRes.status === 401 || profRes.status === 403
        ? ` Check MAIN_API_BASE_URL / VITE_API_BASE_URL matches your app API (current base: ${MAIN_API_BASE}).`
        : "";
    res.status(401).json({
      detail: `Employer authentication failed (${profRes.status}).${hint}`,
    });
    return null;
  }

  const profile = await profRes.json();
  const company = String(
    profile.company_name || profile.name || profile.first_name || "",
  ).trim();
  if (!company) {
    res.status(400).json({
      detail: "Company name is missing from employer profile",
    });
    return null;
  }

  return { auth, company };
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

    const listUrl = new URL(AGGREGATOR_EMPLOYER_JOBS_URL);
    const requestedCompanyId = String(req.query.company_id || "").trim();
    const requestedCompany = String(req.query.company || "").trim();
    if (requestedCompanyId) {
      listUrl.searchParams.set("company_id", requestedCompanyId);
    } else if (requestedCompany) {
      listUrl.searchParams.set("company", requestedCompany);
    } else if (ctx.company) {
      // Safe fallback if client did not provide explicit company filters.
      listUrl.searchParams.set("company", ctx.company);
    }

    const upstream = await fetch(listUrl.toString(), {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
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

app.get("/api/employer/jobs", handleEmployerJobsList);
app.get("/api/employer/jobs/", handleEmployerJobsList);

function parseUpstreamJson(text) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function aggregatorJobDetailUrl(jobId) {
  const id = encodeURIComponent(String(jobId || "").trim());
  return `${AGGREGATOR_EMPLOYER_JOBS_URL}/${id}`;
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
    }
  } else if (!isPatch && body.location != null && String(body.location).trim() !== "") {
    payload.location = String(body.location).trim();
  }

  if (has("salary")) {
    if (body.salary != null && String(body.salary).trim() !== "") {
      payload.salary = String(body.salary).trim();
    }
  } else if (!isPatch && body.salary != null && String(body.salary).trim() !== "") {
    payload.salary = String(body.salary).trim();
  }

  if (!isPatch || has("apply_url")) {
    const applyResult = validateApplyUrl(body.apply_url);
    if (!applyResult.ok) return { ok: false, error: applyResult.error };
    if (applyResult.url) {
      payload.apply_url = applyResult.url;
    }
  }

  if (!isPatch || has("is_active")) {
    payload.is_active =
      typeof body.is_active === "boolean" ? body.is_active : true;
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

app.patch("/api/employer/jobs/:jobId", async (req, res) => {
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

    const upstream = await fetch(aggregatorJobDetailUrl(jobId), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Employer-Key": AGGREGATOR_KEY,
      },
      body: JSON.stringify(built.payload),
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
});

app.delete("/api/employer/jobs/:jobId", async (req, res) => {
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

    const upstream = await fetch(aggregatorJobDetailUrl(jobId), {
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
});

const server = app.listen(PORT, LISTEN_HOST, () => {
  console.log(
    `[employer-jobs-proxy] http://${LISTEN_HOST}:${PORT} (profile: ${MAIN_API_BASE}) CRUD ${AGGREGATOR_EMPLOYER_JOBS_URL}`,
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
