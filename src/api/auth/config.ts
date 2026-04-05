function trimApiBase(raw: string): string {
  return raw.replace(/\/+$/, "");
}

/**
 * Main Breneo backend (auth, employer profile, educations, academy, etc.).
 * The employer jobs BFF validates JWTs against `…/api/employer/profile/` on this host — not the job API.
 */
export const API_BASE_URL = trimApiBase(
  import.meta.env.VITE_API_BASE_URL ||
    "https://web-production-80ed8.up.railway.app",
);

/**
 * Public [Job Aggregator](https://breneo-job-aggregator.up.railway.app) (job search, v1 jobs, company logos, etc.).
 * Employer dashboard calls still go through the BFF (`/api/employer/*`) with `X-Employer-Key` server-side.
 */
export const JOB_API_BASE_URL = trimApiBase(
  import.meta.env.VITE_JOB_API_BASE_URL ||
    "https://breneo-job-aggregator.up.railway.app",
);
