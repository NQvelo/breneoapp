/**
 * Local file fallback for course page views when Supabase is not configured.
 * Production should set SUPABASE_SERVICE_ROLE_KEY and apply the migration.
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../.data");
const STORE_PATH = path.join(DATA_DIR, "course_page_views.json");

/** @type {Promise<void> | null} */
let writeChain = null;

/**
 * @returns {Promise<Array<{ course_id: string; viewer_user_id: string | null; viewed_at: string }>>}
 */
async function readAll() {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
      return [];
    }
    throw err;
  }
}

/**
 * @param {Array<{ course_id: string; viewer_user_id: string | null; viewed_at: string }>} rows
 */
async function writeAll(rows) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${STORE_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(rows), "utf8");
  await fs.rename(tmp, STORE_PATH);
}

/**
 * @param {() => Promise<void>} fn
 */
function serializeWrite(fn) {
  const next = (writeChain ?? Promise.resolve()).then(fn, fn);
  writeChain = next.catch(() => {});
  return next;
}

/**
 * @param {string} courseId
 * @param {string | null} viewerUserId
 */
export async function recordCourseViewToFile(courseId, viewerUserId) {
  await serializeWrite(async () => {
    const rows = await readAll();
    rows.push({
      course_id: courseId,
      viewer_user_id: viewerUserId,
      viewed_at: new Date().toISOString(),
    });
    await writeAll(rows);
  });
}

/**
 * @param {string} courseId
 */
export async function countCourseViewsFromFile(courseId) {
  const rows = await readAll();
  return rows.filter((row) => row.course_id === courseId).length;
}

/**
 * @param {string[]} courseIds
 * @param {Date} from
 * @param {Date} to
 */
export async function listCourseViewsFromFile(courseIds, from, to) {
  const idSet = new Set(courseIds.map((id) => String(id).trim()).filter(Boolean));
  if (idSet.size === 0) return [];
  const fromMs = from.getTime();
  const toMs = to.getTime();
  const rows = await readAll();
  return rows.filter((row) => {
    if (!idSet.has(row.course_id)) return false;
    const t = new Date(row.viewed_at).getTime();
    return Number.isFinite(t) && t >= fromMs && t < toMs;
  });
}
