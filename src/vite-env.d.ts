/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Employer jobs BFF origin (no path). Baked in at build time. */
  readonly VITE_EMPLOYER_JOBS_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
