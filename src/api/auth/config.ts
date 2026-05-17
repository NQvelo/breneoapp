function trimApiBase(raw: string): string {
  return raw.replace(/\/+$/, "");
}

/**
 * Breneo product API (auth, users, sessions, employer profile on Breneo, academy, …).
 * Prefer `VITE_BRENEO_API_BASE_URL`; `VITE_API_BASE_URL` remains supported.
 *
 * In Vite dev, if `VITE_API_BASE_URL` points at a hostname that does not resolve
 * (`net::ERR_NAME_NOT_RESOLVED`), set `VITE_DEV_SAME_ORIGIN_BRENEO_API=1` and
 * restart — requests use same-origin `/api/...` so `vite.config` proxies to the
 * configured backend (see `/api` → `breneo.onrender.com`).
 */
function resolveBreneoApiBaseUrl(): string {
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_SAME_ORIGIN_BRENEO_API === "1") {
    return "";
  }
  return trimApiBase(
    import.meta.env.VITE_BRENEO_API_BASE_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      "https://web-production-80ed8.up.railway.app",
  );
}

export const BRENEO_API_BASE_URL = resolveBreneoApiBaseUrl();

/**
 * Job aggregator (public jobs, search, applications).
 * Prefer `VITE_NEXT_PUBLIC_JOB_AGGREGATOR_URL` (maps to NEXT_PUBLIC_JOB_AGGREGATOR_URL in deploy docs).
 * Public job reads and in-app apply/list/withdraw on static hosts (e.g. dashboard.breneo.app).
 * Local dev apply/list/withdraw use same-origin `/api/app/*` BFF (Breneo JWT → aggregator).
 * Employer CRUD from the browser still uses the employer BFF base, not this origin alone.
 */
export const JOB_AGGREGATOR_BASE_URL = trimApiBase(
  import.meta.env.VITE_NEXT_PUBLIC_JOB_AGGREGATOR_URL ||
    import.meta.env.VITE_JOB_AGGREGATOR_BASE_URL ||
    import.meta.env.VITE_JOB_API_BASE_URL ||
    "https://breneo-job-aggregator.up.railway.app",
);

/** Same as `BRENEO_API_BASE_URL` (legacy export). */
export const API_BASE_URL = BRENEO_API_BASE_URL;

/** Same as `JOB_AGGREGATOR_BASE_URL` (legacy export). */
export const JOB_API_BASE_URL = JOB_AGGREGATOR_BASE_URL;

/** Public aggregator origin only (not the employer BFF base). */
export const JOB_AGGREGATOR_PUBLIC_ORIGIN = JOB_AGGREGATOR_BASE_URL;
