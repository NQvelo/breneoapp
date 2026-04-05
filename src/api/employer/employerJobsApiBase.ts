/**
 * Shared employer-jobs base URL resolution.
 *
 * The browser calls **your BFF** (same-origin dev proxy, `production.mjs`, or a deployed Node
 * proxy) at `/api/employer/jobs` and `/api/employer/jobs/{jobId}` — never the raw aggregator with
 * `X-Employer-Key` in the client.
 *
 * The BFF forwards to the job aggregator, by default:
 *   `https://breneo-job-aggregator.up.railway.app/api/employer/jobs` and `…/api/employer/jobs/{jobId}/`
 * (`JOB_AGGREGATOR_BASE_URL` in `server/employer-jobs-proxy.mjs`).
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

  // Default to same-origin so browser hits your proxy route:
  //   /api/employer/jobs -> server adds X-Employer-Key
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  // Non-browser fallback (tests / SSR): use Railway origin, but calling it
  // from a real browser would be rejected by the guard below.
  return getRailwayOrigin();
}

export function getEmployerJobsApiBaseUrl(): string {
  return resolveBaseFromEnvOrBrowser();
}

export function assertEmployerJobsProxyConfigured(
  action: "GET" | "POST" | "PATCH" | "DELETE",
): void {
  if (typeof window === "undefined") return;

  const baseUrl = getEmployerJobsApiBaseUrl();
  let baseOrigin: string;
  try {
    baseOrigin = new URL(baseUrl, window.location.href).origin;
  } catch {
    return;
  }
  const pageOrigin = window.location.origin;
  let aggregatorOrigin: string;
  try {
    aggregatorOrigin = new URL(getRailwayOrigin()).origin;
  } catch {
    return;
  }

  // Only block cross-origin calls straight to the public aggregator host (no BFF in between).
  // Same-origin requests to that host are OK when the SPA and Node BFF are served together (e.g. Railway).
  if (baseOrigin === aggregatorOrigin && pageOrigin !== aggregatorOrigin) {
    throw new Error(
      `Employer jobs ${action} cannot target the job-aggregator origin (${aggregatorOrigin}) from ` +
        `${pageOrigin} without a BFF. Set VITE_EMPLOYER_JOBS_API_BASE_URL to your BFF origin, ` +
        `or use same-origin (e.g. localhost with Vite proxy to employer-jobs-proxy). ` +
        `The BFF forwards to ${aggregatorOrigin}/api/employer/jobs/{jobId} with X-Employer-Key.`,
    );
  }
}

