/**
 * Local FCM token store (dev fallback). Production can swap to Supabase later.
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../.data");
const STORE_PATH = path.join(DATA_DIR, "fcm_tokens.json");

/** @type {Promise<void> | null} */
let writeChain = null;

/**
 * @typedef {{ userId: string; token: string; platform: string; updatedAt: string }} FcmTokenRow
 */

/**
 * @returns {Promise<FcmTokenRow[]>}
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
 * @param {FcmTokenRow[]} rows
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
 * @param {string} userId
 * @param {string} token
 * @param {string} [platform]
 */
export async function upsertFcmToken(userId, token, platform = "web") {
  const uid = String(userId ?? "").trim();
  const tok = String(token ?? "").trim();
  if (!uid || !tok) return;

  await serializeWrite(async () => {
    const rows = await readAll();
    const now = new Date().toISOString();
    const idx = rows.findIndex((row) => row.token === tok);
    const next = {
      userId: uid,
      token: tok,
      platform: String(platform || "web"),
      updatedAt: now,
    };
    if (idx >= 0) {
      rows[idx] = next;
    } else {
      rows.push(next);
    }
    await writeAll(rows);
  });
}

/**
 * @param {string} token
 */
export async function removeFcmToken(token) {
  const tok = String(token ?? "").trim();
  if (!tok) return;

  await serializeWrite(async () => {
    const rows = await readAll();
    const filtered = rows.filter((row) => row.token !== tok);
    if (filtered.length === rows.length) return;
    await writeAll(filtered);
  });
}

/**
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export async function listFcmTokensForUser(userId) {
  const uid = String(userId ?? "").trim();
  if (!uid) return [];
  const rows = await readAll();
  return rows.filter((row) => row.userId === uid).map((row) => row.token);
}
