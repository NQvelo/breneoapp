/**
 * Self-reported applications to fetched (external ATS) jobs.
 * The aggregator only accepts in-app applications for platform=employer jobs,
 * so these are stored here (Supabase when configured, local file fallback).
 *
 * GET  /api/app/users/me/external-applications
 * POST /api/app/jobs/:jobId/external-application  { title, company_name, location, logo, apply_url }
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { hasSupabaseServiceRole, supabaseRest } from "./supabaseAdmin.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../.data");
const STORE_PATH = path.join(DATA_DIR, "external_job_applications.json");

const TABLE = "external_job_applications";
const SNAPSHOT_FIELDS = ["title", "company_name", "location", "logo", "apply_url"];

/** @type {Promise<void> | null} */
let writeChain = null;

function cleanText(raw, max = 1000) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return s.slice(0, max);
}

async function readFileRows() {
  try {
    const parsed = JSON.parse(await fs.readFile(STORE_PATH, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
      return [];
    }
    throw err;
  }
}

async function writeFileRows(rows) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${STORE_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(rows), "utf8");
  await fs.rename(tmp, STORE_PATH);
}

function serializeWrite(fn) {
  const next = (writeChain ?? Promise.resolve()).then(fn, fn);
  writeChain = next.catch(() => {});
  return next;
}

async function upsertRow(row) {
  if (hasSupabaseServiceRole()) {
    const result = await supabaseRest(`${TABLE}?on_conflict=user_id,job_id`, {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      body: JSON.stringify(row),
    });
    if (!result.ok) {
      throw new Error(`Supabase upsert failed (${result.status}): ${result.text}`);
    }
    return Array.isArray(result.data) ? result.data[0] : result.data;
  }

  let saved = row;
  await serializeWrite(async () => {
    const rows = await readFileRows();
    const idx = rows.findIndex(
      (r) => r.user_id === row.user_id && r.job_id === row.job_id,
    );
    if (idx >= 0) {
      saved = { ...rows[idx], ...row };
      rows[idx] = saved;
    } else {
      rows.push(row);
    }
    await writeFileRows(rows);
  });
  return saved;
}

async function listRows(userId) {
  if (hasSupabaseServiceRole()) {
    const result = await supabaseRest(
      `${TABLE}?user_id=eq.${encodeURIComponent(userId)}&order=applied_at.desc`,
      { method: "GET" },
    );
    if (!result.ok) {
      throw new Error(`Supabase list failed (${result.status}): ${result.text}`);
    }
    return Array.isArray(result.data) ? result.data : [];
  }
  const rows = await readFileRows();
  return rows
    .filter((r) => r.user_id === userId)
    .sort((a, b) => String(b.applied_at).localeCompare(String(a.applied_at)));
}

/** Same item shape as aggregator `/api/users/me/applications` so the SPA can merge lists. */
function toApplicationItem(row) {
  return {
    job_id: row.job_id,
    status: "applied",
    applied_at: row.applied_at,
    source: "external",
    job: {
      title: row.title ?? undefined,
      company_name: row.company_name ?? undefined,
      location: row.location ?? undefined,
      logo: row.logo ?? undefined,
      apply_url: row.apply_url ?? undefined,
    },
  };
}

function serverError(res, message) {
  return res.status(500).json({
    success: false,
    message,
    data: null,
    error: "server_error",
  });
}

/**
 * @param {import("express").Express} app
 * @param {{
 *   requireUserAuth: (
 *     req: import("express").Request,
 *     res: import("express").Response,
 *   ) => Promise<{ userId: string } | null>;
 * }} deps
 */
export function registerExternalJobApplicationRoutes(app, deps) {
  const { requireUserAuth } = deps;

  async function handleList(req, res) {
    try {
      const ctx = await requireUserAuth(req, res);
      if (!ctx) return;
      const rows = await listRows(String(ctx.userId));
      return res.status(200).json({
        success: true,
        message: "",
        data: { items: rows.map(toApplicationItem) },
      });
    } catch (e) {
      console.error("[external-applications] list failed:", e);
      return serverError(res, "Could not load external applications.");
    }
  }

  async function handleRecord(req, res) {
    try {
      const ctx = await requireUserAuth(req, res);
      if (!ctx) return;

      const jobId = cleanText(req.params.jobId, 256);
      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: "job id is required",
          data: null,
          error: "invalid_request",
        });
      }

      const body = req.body && typeof req.body === "object" ? req.body : {};
      /** @type {Record<string, string | null>} */
      const row = {
        user_id: String(ctx.userId),
        job_id: jobId,
        applied_at: new Date().toISOString(),
      };
      for (const field of SNAPSHOT_FIELDS) {
        row[field] = cleanText(body[field]);
      }

      const saved = await upsertRow(row);
      return res.status(201).json({
        success: true,
        message: "",
        data: toApplicationItem(saved ?? row),
      });
    } catch (e) {
      console.error("[external-applications] record failed:", e);
      return serverError(res, "Could not save application.");
    }
  }

  app.get("/api/app/users/me/external-applications", handleList);
  app.get("/api/app/users/me/external-applications/", handleList);
  app.post("/api/app/jobs/:jobId/external-application", handleRecord);
  app.post("/api/app/jobs/:jobId/external-application/", handleRecord);
}
