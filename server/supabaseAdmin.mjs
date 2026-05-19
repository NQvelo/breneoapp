/**
 * Server-side Supabase PostgREST (service role or anon). Used by employer-jobs-proxy for join requests.
 */

const DEFAULT_SUPABASE_URL = "https://kwvpfetgerukuglqeuzl.supabase.co";
const DEFAULT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3dnBmZXRnZXJ1a3VnbHFldXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNDYzNjEsImV4cCI6MjA2NTgyMjM2MX0.oQNRxz5hNqp_YVkIJ0KOtVSgAksQ0km6iESqiWI8wHw";

export function supabaseRestBase() {
  const url = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(
    /\/$/,
    "",
  );
  return `${url}/rest/v1`;
}

export function supabaseAdminKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    DEFAULT_ANON_KEY
  );
}

/**
 * @param {string} table
 * @param {{ method?: string; query?: string; body?: unknown; prefer?: string }} opts
 */
export async function supabaseRest(table, opts = {}) {
  const method = opts.method || "GET";
  const q = opts.query ? (opts.query.startsWith("?") ? opts.query : `?${opts.query}`) : "";
  const url = `${supabaseRestBase()}/${table}${q}`;
  /** @type {RequestInit} */
  const init = {
    method,
    headers: {
      apikey: supabaseAdminKey(),
      Authorization: `Bearer ${supabaseAdminKey()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(opts.prefer ? { Prefer: opts.prefer } : {}),
    },
  };
  if (opts.body !== undefined && method !== "GET" && method !== "HEAD") {
    init.body = JSON.stringify(opts.body);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data, text };
}
