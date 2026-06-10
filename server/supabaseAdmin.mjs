/**
 * Supabase REST (service role) for server-side employer join requests + notifications.
 */

function readSupabaseUrl() {
  const raw =
    process.env.SUPABASE_URL?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim() ||
    "https://kwvpfetgerukuglqeuzl.supabase.co";
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return u.origin.replace(/\/$/, "");
  } catch {
    return "https://kwvpfetgerukuglqeuzl.supabase.co";
  }
}

export function hasSupabaseServiceRole() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

/**
 * @param {string} path e.g. `employer_join_requests?status=eq.pending`
 * @param {RequestInit & { prefer?: string }} [options]
 */
export async function supabaseRest(path, options = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    return {
      ok: false,
      status: 500,
      data: { detail: "SUPABASE_SERVICE_ROLE_KEY is not configured on the BFF." },
    };
  }
  const base = readSupabaseUrl();
  const prefer = options.prefer ?? "return=representation";
  const { prefer: _p, ...fetchOpts } = options;
  const res = await fetch(`${base}/rest/v1/${path}`, {
    ...fetchOpts,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: prefer,
      ...(fetchOpts.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return {
    ok: res.ok,
    status: res.status,
    data,
    text,
    headers: res.headers,
  };
}

/**
 * @param {string} path Filtered table path (no leading slash).
 */
export async function supabaseExactCount(path) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    return { ok: false, status: 500, count: 0 };
  }
  const base = readSupabaseUrl();
  const res = await fetch(`${base}/rest/v1/${path}`, {
    method: "HEAD",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "count=exact",
    },
  });
  if (!res.ok) {
    return { ok: false, status: res.status, count: 0 };
  }
  const range = res.headers.get("content-range") || "";
  const match = range.match(/\/(\d+)\s*$/);
  const count = match ? Number.parseInt(match[1], 10) : 0;
  return {
    ok: true,
    status: res.status,
    count: Number.isFinite(count) ? count : 0,
  };
}
