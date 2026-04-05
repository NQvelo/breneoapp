function trimApiBase(raw: string): string {
  return raw.replace(/\/+$/, "");
}

/**
 * Breneo product API (auth, users, sessions, employer profile on Breneo, academy, …).
 * Prefer `VITE_BRENEO_API_BASE_URL`; `VITE_API_BASE_URL` remains supported.
 */
export const BRENEO_API_BASE_URL = trimApiBase(
  import.meta.env.VITE_BRENEO_API_BASE_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "https://web-production-80ed8.up.railway.app",
);

/**
 * Job aggregator (public jobs, search, v1, companies, industries, health/docs).
 * Prefer `VITE_JOB_AGGREGATOR_BASE_URL`; `VITE_JOB_API_BASE_URL` remains supported.
 * Do not use for Breneo-only routes; employer CRUD from the browser uses the BFF base, not this origin alone.
 */
export const JOB_AGGREGATOR_BASE_URL = trimApiBase(
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
