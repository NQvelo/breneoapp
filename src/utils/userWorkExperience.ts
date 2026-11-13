import type { WorkExperienceEntry } from "@/api/profile/types";
import type { SeniorityLevel } from "@/types/matching";

export interface UserExperienceMatchInput {
  yearsExperienceTotal: number | null;
  seniority: SeniorityLevel;
}

const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.25;

/** Same seniority words the job matcher uses on titles. */
export function seniorityFromText(raw: string | null | undefined): SeniorityLevel | null {
  if (!raw) return null;
  const value = raw.toLowerCase();
  if (/\bintern\b/.test(value)) return "intern";
  if (/\bjunior\b|\bentry\b/.test(value)) return "junior";
  if (/\bmid\b|\bmiddle\b|\bintermediate\b/.test(value)) return "mid";
  if (/\bsenior\b/.test(value)) return "senior";
  if (/\blead\b|\bprincipal\b|\bstaff\b/.test(value)) return "lead";
  return null;
}

function yearsFromEntry(entry: WorkExperienceEntry): number {
  const start = new Date(entry.start_date);
  if (Number.isNaN(start.getTime())) return 0;
  const end =
    entry.is_current || !entry.end_date ? new Date() : new Date(entry.end_date);
  if (Number.isNaN(end.getTime())) return 0;
  const years = (end.getTime() - start.getTime()) / MS_PER_YEAR;
  return years > 0 ? years : 0;
}

function mostRecentEntry(
  entries: WorkExperienceEntry[],
): WorkExperienceEntry | null {
  if (entries.length === 0) return null;
  const current = entries.find((entry) => entry.is_current);
  if (current) return current;
  return [...entries].sort((a, b) => {
    const aTime = new Date(a.end_date || a.start_date).getTime();
    const bTime = new Date(b.end_date || b.start_date).getTime();
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  })[0];
}

function seniorityFromYears(years: number): SeniorityLevel {
  if (years < 3) return "junior";
  if (years < 6) return "mid";
  return "senior";
}

/**
 * Years and seniority taken from the profile Work experience section.
 * No entries means experience is unknown, so listings are not filtered by it.
 */
export function experienceFromWorkHistory(
  entries: WorkExperienceEntry[],
): UserExperienceMatchInput {
  if (!entries || entries.length === 0) {
    return { yearsExperienceTotal: null, seniority: "unknown" };
  }

  const years = entries.reduce((sum, entry) => sum + yearsFromEntry(entry), 0);
  const yearsExperienceTotal = Math.round(years * 10) / 10;
  const title = mostRecentEntry(entries)?.job_title;
  const fromTitle = seniorityFromText(title);
  return {
    yearsExperienceTotal,
    seniority: fromTitle ?? seniorityFromYears(yearsExperienceTotal),
  };
}

export function userHasWorkExperience(
  experience: UserExperienceMatchInput,
): boolean {
  return (
    experience.seniority !== "unknown" || experience.yearsExperienceTotal != null
  );
}
