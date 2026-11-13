/** Experience fit at or above "one level off" in the job matcher. */
const MIN_EXPERIENCE_FIT = 55;

export interface ExperienceScoredJob {
  matchPercentage?: number;
  experiencePercent?: number | null;
}

/**
 * Jobs to show on Home and the jobs page.
 * With work experience on the profile, only the strongest experience fits
 * are kept, then the highest overall scores. Without it, the highest
 * overall scores are kept.
 */
export function takeTopExperienceScoredJobs<T extends ExperienceScoredJob>(
  jobs: T[],
  limit: number,
  hasWorkExperience: boolean,
): T[] {
  if (!hasWorkExperience) {
    return [...jobs]
      .sort((a, b) => (b.matchPercentage ?? 0) - (a.matchPercentage ?? 0))
      .slice(0, limit);
  }

  const byScore = [...jobs].sort((a, b) => {
    const experienceDiff =
      (b.experiencePercent ?? -1) - (a.experiencePercent ?? -1);
    if (experienceDiff !== 0) return experienceDiff;
    return (b.matchPercentage ?? 0) - (a.matchPercentage ?? 0);
  });

  const strongFit = byScore.filter(
    (job) => (job.experiencePercent ?? -1) >= MIN_EXPERIENCE_FIT,
  );
  if (strongFit.length > 0) return strongFit.slice(0, limit);

  const anyExperienceScore = byScore.filter(
    (job) => job.experiencePercent != null && job.experiencePercent >= 0,
  );
  if (anyExperienceScore.length > 0) return anyExperienceScore.slice(0, limit);

  return byScore.slice(0, limit);
}
