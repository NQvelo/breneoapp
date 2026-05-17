/** Employer-owned jobs: in-app apply via same-origin `/api/app/*` BFF. */
export function jobSupportsInAppApply(
  job: Record<string, unknown> | null | undefined,
): boolean {
  if (!job) return false;
  return job.supports_in_app_apply === true;
}
