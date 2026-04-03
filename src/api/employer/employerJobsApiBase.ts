/**
 * Shared employer-jobs base URL resolution.
 *
 * The Django job-aggregator requires `X-Employer-Key` for employer CRUD.
 * That secret MUST be added server-side (BFF / proxy); the browser must
 * never call Railway directly for these routes.
 */

const RAILWAY_AGGREGATOR_ORIGIN =
  "https://breneo-job-aggregator.up.railway.app";

function trimBase(raw: string | undefined): string | undefined {
  const t = raw?.trim();
  if (!t) return undefined;
  return t.replace(/\/$/, "");
}

function getRailwayOrigin(): string {
  return RAILWAY_AGGREGATOR_ORIGIN;
}

function resolveBaseFromEnvOrBrowser(): string {
  const fromEnv = trimBase(
    import.meta.env.VITE_EMPLOYER_JOBS_API_BASE_URL as string | undefined,
  );

  // Prefer explicit BFF origin when provided.
  if (fromEnv) return fromEnv;

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

function isRailwayAggregatorOrigin(baseUrl: string): boolean {
  try {
    return new URL(baseUrl).origin === getRailwayOrigin();
  } catch {
    return false;
  }
}

export function assertEmployerJobsProxyConfigured(
  action: "GET" | "POST" | "PATCH" | "DELETE",
): void {
  // In the browser, Railway employer endpoints always require X-Employer-Key.
  if (typeof window === "undefined") return;

  const baseUrl = getEmployerJobsApiBaseUrl();
  if (isRailwayAggregatorOrigin(baseUrl)) {
    const bffHint =
      "Configure a dashboard/BFF proxy that serves '/api/employer/jobs' " +
      "and forwards to Railway with X-Employer-Key " +
      "server-side (e.g. deploy server/employer-jobs-proxy.mjs). " +
      "Then set VITE_EMPLOYER_JOBS_API_BASE_URL to that BFF origin, " +
      "or leave it unset to use same-origin.";
    throw new Error(
      `Employer jobs ${action} cannot be called directly from the browser ` +
        `to the Railway aggregator (403 without X-Employer-Key). ${bffHint}`,
    );
  }
}

if (import.meta.env.PROD && typeof window !== "undefined") {
  const bff = trimBase(import.meta.env.VITE_EMPLOYER_JOBS_API_BASE_URL);
  if (!bff) {
    const h = window.location.hostname;
    if (h === "dashboard.breneo.app" || h.endsWith(".github.io")) {
      console.warn(
        "[breneo employer jobs] VITE_EMPLOYER_JOBS_API_BASE_URL is missing from this build. " +
          "Calls fall back to same-origin (/api/employer/jobs), which static hosts usually do not serve. " +
          "Rebuild the SPA with VITE_EMPLOYER_JOBS_API_BASE_URL=https://<your-bff>.up.railway.app",
      );
    }
  }
}

