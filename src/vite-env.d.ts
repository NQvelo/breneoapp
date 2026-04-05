/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Breneo product API — same role as `VITE_API_BASE_URL`. */
  readonly VITE_BRENEO_API_BASE_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  /** Job aggregator — same role as `VITE_JOB_API_BASE_URL` and server `JOB_AGGREGATOR_BASE_URL`. */
  readonly VITE_JOB_AGGREGATOR_BASE_URL?: string;
  /** Public job aggregator (search, v1 jobs, logos). Same role as server `JOB_AGGREGATOR_BASE_URL`. */
  readonly VITE_JOB_API_BASE_URL?: string;
  /**
   * Employer dashboard BFF origin (`/api/employer/companies`, `/api/employer/jobs`, …).
   * Same as `VITE_EMPLOYER_BFF_URL`. Leave unset only when the SPA host runs `production.mjs` (same-origin proxy).
   */
  readonly VITE_EMPLOYER_JOBS_API_BASE_URL?: string;
  /** Alias of `VITE_EMPLOYER_JOBS_API_BASE_URL` (deployed Node `employer-jobs-proxy`, not the raw aggregator URL). */
  readonly VITE_EMPLOYER_BFF_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __APP_VERSION__: string;
