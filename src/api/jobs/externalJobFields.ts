/**
 * Helpers for fields that scraped job sources (e.g. jobs.ge) only expose via
 * `raw` or secondary fields instead of `apply_url` / `application_deadline`.
 */

type JobLike = Record<string, unknown>;

function asRecord(value: unknown): JobLike | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JobLike)
    : undefined;
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * External apply link: `apply_url`, then the original posting (`source_url`),
 * then a `mailto:` for sources that only publish an application email.
 */
export function resolveExternalApplyUrl(job: JobLike): string {
  const raw = asRecord(job.raw);

  const applyUrl = firstString(job.apply_url, raw?.apply_url);
  if (applyUrl && isHttpUrl(applyUrl)) return applyUrl;

  const sourceUrl = firstString(
    job.source_url,
    raw?.source_url,
    raw?.absolute_url,
  );
  if (sourceUrl && isHttpUrl(sourceUrl)) return sourceUrl;

  const email = firstString(job.apply_email, raw?.apply_email);
  if (email && isEmail(email)) return `mailto:${email}`;

  return applyUrl;
}

const GEORGIAN_MONTHS: Record<string, number> = {
  იანვარი: 0,
  თებერვალი: 1,
  მარტი: 2,
  აპრილი: 3,
  მაისი: 4,
  ივნისი: 5,
  ივლისი: 6,
  აგვისტო: 7,
  სექტემბერი: 8,
  ოქტომბერი: 9,
  ნოემბერი: 10,
  დეკემბერი: 11,
};

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "02 ნოემბერი" has no year: pick the first occurrence on/after the posting date. */
function parseGeorgianDayMonth(value: string, reference: Date): Date | null {
  const match = value.trim().match(/^(\d{1,2})\s+(\S+)/);
  if (!match) return null;

  const month = GEORGIAN_MONTHS[match[2]];
  const day = Number(match[1]);
  if (month === undefined || !day) return null;

  const date = new Date(reference.getFullYear(), month, day);
  const referenceDay = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
  );
  if (date < referenceDay) date.setFullYear(date.getFullYear() + 1);
  return date;
}

export interface ApplicationDeadline {
  date: Date | null;
  raw: string;
}

export function resolveApplicationDeadline(
  job: JobLike,
): ApplicationDeadline | null {
  const raw = asRecord(job.raw);
  const value = firstString(
    job.application_deadline,
    job.deadline,
    raw?.deadline,
    job.expires_at,
    job.expiration_date,
  );
  if (!value) return null;

  const iso = parseIsoDate(value);
  if (iso) return { date: iso, raw: value };

  const reference =
    parseIsoDate(firstString(job.posted_at, job.date_posted, job.fetched_at)) ??
    new Date();

  return { date: parseGeorgianDayMonth(value, reference), raw: value };
}
