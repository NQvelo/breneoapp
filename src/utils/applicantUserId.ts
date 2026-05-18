import type { JobApplicationUserFields } from "@/api/jobs/applicationUserFields";

/** Django User.id for public profile API (not UserProfile.id). */
export function applicantUserId(
  applicant: JobApplicationUserFields,
): number | null {
  const raw = applicant.user_id ?? applicant.external_user_id;
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
