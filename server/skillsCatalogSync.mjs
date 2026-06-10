/**
 * Ensure AI / employer job skill names exist in the Breneo skills catalog
 * (GET/POST `${MAIN_API_BASE}/api/skills/`).
 *
 * Fire-and-forget from employer job preview/create handlers; never blocks job CRUD.
 */

/**
 * @param {string} name
 */
function normalizeSkillLookupKey(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * @param {unknown} data
 * @returns {unknown[]}
 */
function unwrapSkillList(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const o = /** @type {Record<string, unknown>} */ (data);
    for (const key of ["results", "items", "data", "skills"]) {
      const v = o[key];
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

/**
 * @param {unknown} row
 * @returns {string}
 */
function skillRowName(row) {
  if (typeof row === "string") return row.trim();
  if (row && typeof row === "object" && !Array.isArray(row)) {
    const o = /** @type {Record<string, unknown>} */ (row);
    return String(o.name ?? o.skill_name ?? o.title ?? "").trim();
  }
  return "";
}

/**
 * @param {string[]} skillNames
 * @returns {string[]}
 */
export function dedupeSkillNames(skillNames) {
  const seen = new Set();
  const out = [];
  for (const raw of skillNames ?? []) {
    const trimmed = String(raw ?? "").trim();
    if (!trimmed) continue;
    const key = normalizeSkillLookupKey(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

/**
 * @param {string} mainApiBase
 * @param {string} authHeader
 * @param {string} name
 */
async function findCatalogSkill(mainApiBase, authHeader, name) {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return null;

  const url = new URL(`${mainApiBase.replace(/\/$/, "")}/api/skills/`);
  url.searchParams.set("query", trimmed);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : [];
  } catch {
    return null;
  }

  const needle = normalizeSkillLookupKey(trimmed);
  for (const row of unwrapSkillList(data)) {
    if (normalizeSkillLookupKey(skillRowName(row)) === needle) {
      return row;
    }
  }
  return null;
}

/**
 * @param {string} mainApiBase
 * @param {string} authHeader
 * @param {string} name
 */
async function createCatalogSkill(mainApiBase, authHeader, name) {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return false;

  const root = mainApiBase.replace(/\/$/, "");
  const headers = {
    Authorization: authHeader,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const tryCreate = async (url) => {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.ok) return true;
    if (res.status === 400 || res.status === 409) {
      const text = await res.text();
      const lower = text.toLowerCase();
      if (
        lower.includes("already") ||
        lower.includes("exist") ||
        lower.includes("duplicate")
      ) {
        return true;
      }
    }
    return res.status !== 404 && res.status !== 405 ? false : null;
  };

  const globalResult = await tryCreate(`${root}/api/skills/`);
  if (globalResult === true) return true;
  if (globalResult === false) return false;

  const meResult = await tryCreate(`${root}/api/me/skills/`);
  return meResult === true;
}

/**
 * @param {object} options
 * @param {string} options.mainApiBase
 * @param {string | undefined} options.authHeader
 * @param {string[]} options.skillNames
 * @returns {Promise<{ created: number; existing: number; failed: number }>}
 */
export async function ensureSkillsInCatalog({
  mainApiBase,
  authHeader,
  skillNames,
}) {
  const base = String(mainApiBase ?? "").trim();
  const auth = String(authHeader ?? "").trim();
  const names = dedupeSkillNames(skillNames);

  if (!base || !auth.startsWith("Bearer ") || names.length === 0) {
    return { created: 0, existing: 0, failed: 0 };
  }

  let created = 0;
  let existing = 0;
  let failed = 0;

  for (const name of names) {
    try {
      const found = await findCatalogSkill(base, auth, name);
      if (found) {
        existing += 1;
        continue;
      }
      const ok = await createCatalogSkill(base, auth, name);
      if (ok) created += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }

  return { created, existing, failed };
}

/**
 * Non-blocking wrapper for Express handlers.
 * @param {object} options
 * @param {string} options.mainApiBase
 * @param {string | undefined} options.authHeader
 * @param {string[]} options.skillNames
 * @param {string} [options.context]
 */
export function scheduleSkillsCatalogSync({
  mainApiBase,
  authHeader,
  skillNames,
  context = "employer-job",
}) {
  void ensureSkillsInCatalog({ mainApiBase, authHeader, skillNames })
    .then((stats) => {
      if (String(process.env.EMPLOYER_PROXY_DEBUG || "").trim() === "1") {
        console.info(`[skills-catalog-sync] ${context}`, stats);
      }
    })
    .catch((err) => {
      console.warn(`[skills-catalog-sync] ${context} failed:`, err);
    });
}
