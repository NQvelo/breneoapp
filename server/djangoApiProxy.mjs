/**
 * Forward authenticated requests to the main Breneo Django API.
 */

function readMainApiBaseUrl() {
  if (process.env.MAIN_API_BASE_URL?.trim()) {
    return process.env.MAIN_API_BASE_URL.trim().replace(/\/$/, "");
  }
  if (process.env.VITE_DEV_SAME_ORIGIN_BRENEO_API === "1") {
    return "https://breneo.onrender.com";
  }
  const fromVite =
    process.env.VITE_BRENEO_API_BASE_URL?.trim() ||
    process.env.VITE_API_BASE_URL?.trim();
  if (fromVite) return fromVite.replace(/\/$/, "");
  return "https://web-production-80ed8.up.railway.app";
}

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {string} djangoPath path including leading slash, e.g. `/api/employer/join-requests/inbox/`
 * @param {{ method?: string; body?: unknown }} [options]
 */
export async function proxyToDjango(req, res, djangoPath, options = {}) {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ detail: "Not authenticated" });
  }

  const method = options.method ?? req.method;
  const base = readMainApiBaseUrl();
  const path = djangoPath.startsWith("/") ? djangoPath : `/${djangoPath}`;
  const url = `${base}${path}`;

  /** @type {RequestInit} */
  const init = {
    method,
    headers: {
      Accept: "application/json",
      Authorization: auth,
    },
  };

  const body = options.body ?? req.body;
  if (body != null && method !== "GET" && method !== "HEAD") {
    init.headers = {
      ...init.headers,
      "Content-Type": "application/json",
    };
    init.body = JSON.stringify(body);
  }

  try {
    const djangoRes = await fetch(url, init);
    const text = await djangoRes.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return res.status(djangoRes.status).json(data ?? {});
  } catch (e) {
    console.error("[django proxy]", url, e);
    return res.status(502).json({
      detail: "Could not reach Breneo API for employer join requests.",
    });
  }
}
