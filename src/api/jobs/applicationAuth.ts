/** Employer-owned jobs: in-app apply via same-origin `/api/app/*` BFF. */
export function jobSupportsInAppApply(
  job: Record<string, unknown> | null | undefined,
): boolean {
  if (!job) return false;
  return job.supports_in_app_apply === true;
}

/** Application URL the employer entered (no scraped / legacy fallbacks). */
export function getExplicitEmployerApplyUrl(
  job: Record<string, unknown> | null | undefined,
): string {
  if (!job) return "";
  if (typeof job.apply_url === "string" && job.apply_url.trim()) {
    return job.apply_url.trim();
  }
  const raw = job.raw;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const submitted = (raw as Record<string, unknown>).employer_submitted;
    if (
      submitted &&
      typeof submitted === "object" &&
      !Array.isArray(submitted)
    ) {
      const url = (submitted as Record<string, unknown>).apply_url;
      if (typeof url === "string" && url.trim()) return url.trim();
    }
  }
  return "";
}
