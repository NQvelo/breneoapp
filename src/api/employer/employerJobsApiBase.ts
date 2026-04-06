/**
 * Shared employer-jobs base URL resolution.
 *
 * - **Local dev / same-origin BFF:** `window.location.origin` so `/api/employer/*` hits Vite proxy or
 *   `production.mjs` (adds `X-Employer-Key` upstream to `JOB_AGGREGATOR_BASE_URL`).
 * - **Static dashboard** (`dashboard.breneo.app`, optional `VITE_STATIC_EMPLOYER_DASHBOARD_HOSTS`):
 *   no `/api/employer/*` on that host — base URL is `JOB_AGGREGATOR_BASE_URL` (e.g.
 *   `https://breneo-job-aggregator.up.railway.app`) so requests target
 *   `…/api/employer/jobs/{id}`, `…/api/employer/companies?search=`, etc. on the aggregator.
 * - **Override:** `VITE_EMPLOYER_JOBS_API_BASE_URL` / `VITE_EMPLOYER_BFF_URL` (e.g. dedicated BFF on Railway).
 */

import { JOB_AGGREGATOR_BASE_URL } from "@/api/auth/config";

function trimBase(raw: string | undefined): string | undefined {
  const t = raw?.trim();
  if (!t) return undefined;
  return t.replace(/\/$/, "");
}

/** Read at build time: `VITE_EMPLOYER_JOBS_API_BASE_URL` or `VITE_EMPLOYER_BFF_URL` (same meaning). */
function employerBffBaseFromEnv(): string | undefined {
  return trimBase(
    (import.meta.env.VITE_EMPLOYER_JOBS_API_BASE_URL ||
      import.meta.env.VITE_EMPLOYER_BFF_URL) as string | undefined,
  );
}

function getRailwayOrigin(): string {
  return JOB_AGGREGATOR_BASE_URL;
}

/**
 * Hostnames where the SPA is static (no Node `/api/employer/*` proxy). Employer calls must use
 * `JOB_AGGREGATOR_BASE_URL` (see `.env.example` — optional `VITE_EMPLOYER_JOBS_API_BASE_URL` overrides).
 */
function isStaticEmployerDashboardHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "dashboard.breneo.app") return true;
  const extra = (
    import.meta.env.VITE_STATIC_EMPLOYER_DASHBOARD_HOSTS as string | undefined
  )
    ?.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (extra?.length) return extra.includes(h);
  return false;
}

function resolveBaseFromEnvOrBrowser(): string {
  const fromEnv = employerBffBaseFromEnv();

  if (fromEnv) {
    // Local dev: common mistake is VITE_EMPLOYER_JOBS_API_BASE_URL=https://breneoapp-production…
    // while Vite proxies /api/employer/* to localhost:8787. Use same-origin so search hits the BFF chain
    // → JOB_AGGREGATOR_BASE_URL (breneo-job-aggregator), not the main app host.
    if (typeof window !== "undefined" && window.location?.origin) {
      const local =
        /^localhost$|^127\.0\.0\.1$/i.test(window.location.hostname) ||
        window.location.hostname === "[::1]";
      if (local) {
        try {
          const u = new URL(
            fromEnv.startsWith("http") ? fromEnv : `https://${fromEnv}`,
          );
          if (u.hostname === "breneoapp-production.up.railway.app") {
            if (import.meta.env.DEV && typeof console !== "undefined") {
              console.warn(
                "[Breneo] Ignoring VITE_EMPLOYER_JOBS_API_BASE_URL / VITE_EMPLOYER_BFF_URL for local dev; using same-origin so /api/employer/* proxies to the job-aggregator BFF.",
              );
            }
            return window.location.origin;
          }
        } catch {
          /* use fromEnv */
        }
      }
    }
    return fromEnv;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    const host = window.location.hostname;
    // Static dashboard (e.g. gh-pages / CDN): same-origin has no BFF — call job aggregator directly
    // (`…/api/employer/jobs`, `…/api/employer/companies?search=`, …) per `JOB_AGGREGATOR_BASE_URL`.
    if (isStaticEmployerDashboardHost(host)) {
      return getRailwayOrigin();
    }
    const local =
      /^localhost$|^127\.0\.0\.1$/i.test(host) || host === "[::1]";
    if (local) {
      // Dev: Vite proxy → employer-jobs-proxy → aggregator with X-Employer-Key
      return window.location.origin;
    }
    // Default: same-origin when your host runs `production.mjs` or a reverse proxy for /api/employer/*
    return window.location.origin;
  }

  return getRailwayOrigin();
}

export function getEmployerJobsApiBaseUrl(): string {
  return resolveBaseFromEnvOrBrowser();
}

/** Reserved for future runtime checks; employer base is resolved in `getEmployerJobsApiBaseUrl()`. */
export function assertEmployerJobsProxyConfigured(
  _action: "GET" | "POST" | "PATCH" | "DELETE",
): void {
  if (typeof window === "undefined") return;
}

