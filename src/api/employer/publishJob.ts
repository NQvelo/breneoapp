import { TokenManager } from "@/api/auth/tokenManager";

/** Values accepted by the job-aggregator Django API */
export type AggregatorWorkMode =
  | "remote"
  | "hybrid"
  | "onsite"
  | "on-site"
  | "unknown";

export type PublishEmployerJobBody = {
  title: string;
  full_description: string;
  work_mode: AggregatorWorkMode;
  location?: string;
  salary?: string;
  /** Omit or null when empty */
  apply_url?: string | null;
  is_active?: boolean;
  /** Appended to full_description on the server */
  employment_type_note?: string;
};

/**
 * POST /api/employer/jobs — same-origin proxy (dev: Vite → Express) with server-side X-Employer-Key.
 * The server forwards the JSON body to:
 *   https://breneo-job-aggregator.up.railway.app/api/employer/jobs
 * Never put the aggregator secret in VITE_* env.
 */
export async function publishEmployerJob(
  body: PublishEmployerJobBody,
): Promise<Record<string, unknown>> {
  const token = TokenManager.getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const res = await fetch("/api/employer/jobs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!res.ok) {
    const detail =
      (typeof data.detail === "string" && data.detail) ||
      (typeof data.message === "string" && data.message) ||
      res.statusText;
    throw new Error(detail);
  }

  return data;
}

/** Client-side apply URL check (server validates again) */
export function validateHttpUrl(raw: string): { ok: true; url: string } | { ok: false; error: string } {
  const t = raw.trim();
  if (!t) return { ok: true, url: "" };
  try {
    const u = new URL(
      t.startsWith("http://") || t.startsWith("https://") ? t : `https://${t}`,
    );
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { ok: false, error: "Application URL must start with http:// or https://" };
    }
    return { ok: true, url: u.toString() };
  } catch {
    return { ok: false, error: "Invalid application URL" };
  }
}
