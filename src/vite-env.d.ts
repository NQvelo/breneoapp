/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Job aggregator origin (same role as server `JOB_AGGREGATOR_BASE_URL`). */
  readonly VITE_JOB_API_BASE_URL?: string;
  readonly VITE_EMPLOYER_JOBS_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __APP_VERSION__: string;
