/**
 * Shared employer-jobs base URL resolution.
 *
 * Browser employer routes (`/api/employer/*`) should hit a BFF/same-origin proxy that injects
 * `X-Employer-Key` server-side before forwarding to `JOB_AGGREGATOR_BASE_URL`.
 *
 * - **Local dev / same-origin BFF:** `window.location.origin` (`vite` proxy or `production.mjs`).
 * - **Static dashboards (e.g. dashboard.breneo.app):** must set `VITE_EMPLOYER_JOBS_API_BASE_URL`
 *   or `VITE_EMPLOYER_BFF_URL` to a deployed BFF URL (do NOT call raw aggregator directly).
 * - **Override:** `VITE_EMPLOYER_JOBS_API_BASE_URL` / `VITE_EMPLOYER_BFF_URL`.
 */

import { JOB_AGGREGATOR_BASE_URL } from "@/api/auth/config";

function trimBase(raw: string | undefined): string | undefined {
  const t = raw?.trim();
  if (!t) return undefined;
  // Railway/UI copy-paste sometimes includes wrapping quotes.
  // Accept `"https://.../"` or `'https://.../'` safely.
  const unquoted = t.replace(/^['"]+|['"]+$/g, "").trim();
  if (!unquoted) return undefined;
  return unquoted.replace(/\/+$/, "");
}

/** Read at build time: `VITE_EMPLOYER_JOBS_API_BASE_URL` or `VITE_EMPLOYER_BFF_URL` (same meaning). */
function employerBffBaseFromEnv(): string | undefined {
  const buildTime = trimBase(
    (import.meta.env.VITE_EMPLOYER_JOBS_API_BASE_URL ||
      import.meta.env.VITE_EMPLOYER_BFF_URL) as string | undefined,
  );
  if (buildTime) return buildTime;

  // Backward-compatible fallback for deployments that only define the generic API base.
  // This commonly points at production.mjs (same BFF surface for /api/employer/*).
  const genericApiBase = trimBase(
    import.meta.env.VITE_API_BASE_URL as string | undefined,
  );
  if (genericApiBase) return genericApiBase;

  if (typeof window !== "undefined") {
    // Emergency runtime override for static deployments when build-time env was missed.
    // Can be set from browser console:
    // localStorage.setItem("EMPLOYER_BFF_URL_OVERRIDE", "https://your-bff.up.railway.app")
    const runtimeLocal = trimBase(
      window.localStorage?.getItem("EMPLOYER_BFF_URL_OVERRIDE") || undefined,
    );
    if (runtimeLocal) return runtimeLocal;

    const runtimeGlobal = trimBase(
      (
        window as Window & {
          __BRENEO_EMPLOYER_BFF_URL__?: string;
        }
      ).__BRENEO_EMPLOYER_BFF_URL__,
    );
    if (runtimeGlobal) return runtimeGlobal;
  }

  return undefined;
}

function getRailwayOrigin(): string {
  return JOB_AGGREGATOR_BASE_URL;
}

/**
 * Hostnames where the SPA is static (no same-origin Node `/api/employer/*` proxy).
 * These hosts require an explicit BFF URL in env.
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
    if (isStaticEmployerDashboardHost(host)) {
      throw new Error(
        "Employer API requires a BFF on static hosts. Set VITE_EMPLOYER_JOBS_API_BASE_URL " +
          "(or VITE_EMPLOYER_BFF_URL) to your deployed employer-jobs-proxy URL.",
      );
    }
    const local = /^localhost$|^127\.0\.0\.1$/i.test(host) || host === "[::1]";
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

export function getEmployerJobsApiDebugInfo(): {
  baseUrl: string;
  mode: "same-origin-bff" | "custom-bff" | "unknown";
} {
  if (typeof window === "undefined") {
    return { baseUrl: getEmployerJobsApiBaseUrl(), mode: "unknown" };
  }
  const baseUrl = getEmployerJobsApiBaseUrl();
  let baseOrigin = "";
  try {
    baseOrigin = new URL(baseUrl, window.location.href).origin;
  } catch {
    return { baseUrl, mode: "unknown" };
  }
  const mode =
    baseOrigin === window.location.origin ? "same-origin-bff" : "custom-bff";
  return { baseUrl, mode };
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
  const sameOrigin = baseOrigin === pageOrigin;
  if (sameOrigin) return;

  let aggregatorOrigin: string;
  try {
    aggregatorOrigin = new URL(getRailwayOrigin()).origin;
  } catch {
    return;
  }

  // Direct browser calls to raw aggregator employer routes commonly fail with 403 because
  // X-Employer-Key must stay server-side in the BFF.
  if (baseOrigin === aggregatorOrigin) {
    throw new Error(
      `Employer ${action} cannot target raw aggregator origin (${aggregatorOrigin}) from browser. ` +
        "Configure VITE_EMPLOYER_JOBS_API_BASE_URL/VITE_EMPLOYER_BFF_URL to a BFF that forwards with X-Employer-Key.",
    );
  }
}
