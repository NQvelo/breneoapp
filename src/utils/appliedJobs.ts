/** Job ids used on listing cards (`id`, then `job_id`). */
export function listingJobId(
  job: { id?: unknown; job_id?: unknown } | null | undefined,
): string {
  const raw = job?.id ?? job?.job_id;
  return raw == null ? "" : String(raw).trim();
}

/** Drop jobs the user has already applied to. Applied jobs belong on Applied Jobs only. */
export function withoutAppliedJobs<T extends { id?: unknown; job_id?: unknown }>(
  jobs: readonly T[],
  appliedJobIds: ReadonlySet<string> | undefined,
): T[] {
  if (!appliedJobIds?.size) return [...jobs];
  return jobs.filter((job) => {
    const id = listingJobId(job);
    return !id || !appliedJobIds.has(id);
  });
}
