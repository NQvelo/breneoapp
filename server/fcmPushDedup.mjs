/**
 * Prevent sending duplicate FCM pushes for the same tag within a TTL window.
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../.data");
const STORE_PATH = path.join(DATA_DIR, "fcm_push_dedup.json");
const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;

/** @type {Promise<void> | null} */
let writeChain = null;

/**
 * @returns {Promise<Record<string, number>>}
 */
async function readAll() {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
      return {};
    }
    throw err;
  }
}

/**
 * @param {Record<string, number>} rows
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
 * @param {string} tag
 * @param {number} [ttlMs]
 * @returns {Promise<boolean>}
 */
export async function shouldSendFcmPush(tag, ttlMs = DEFAULT_TTL_MS) {
  const key = String(tag ?? "").trim();
  if (!key) return true;

  const now = Date.now();
  const rows = await readAll();
  const lastSent = rows[key];
  if (typeof lastSent === "number" && now - lastSent < ttlMs) {
    return false;
  }
  return true;
}

/**
 * @param {string} tag
 */
export async function recordFcmPushSent(tag) {
  const key = String(tag ?? "").trim();
  if (!key) return;

  await serializeWrite(async () => {
    const rows = await readAll();
    rows[key] = Date.now();
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const [storedTag, sentAt] of Object.entries(rows)) {
      if (typeof sentAt !== "number" || sentAt < cutoff) {
        delete rows[storedTag];
      }
    }
    await writeAll(rows);
  });
}
