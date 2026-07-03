import type { JobDetail } from "@/api/jobs/types";

const WORK_MODE_VALUES = new Set([
  "remote",
  "hybrid",
  "on-site",
  "onsite",
  "unknown",
]);

const WORK_MODE_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  "on-site": "On-site",
  onsite: "On-site",
  unknown: "Not specified",
};

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULLTIME: "Full-time",
  PARTTIME: "Part-time",
  CONTRACT: "Contract",
  CONTRACTOR: "Contract",
  INTERN: "Internship",
  INTERNSHIP: "Internship",
  TEMPORARY: "Temporary",
  TEMP: "Temporary",
};

function pickString(...vals: unknown[]): string {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s && s !== "—") return s;
  }
  return "";
}

function pickEmployerSubmitted(
  job: Record<string, unknown>,
): Record<string, unknown> | null {
  const raw = job.raw;
  const rawObj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : null;
  const submitted = job.employer_submitted ?? rawObj?.employer_submitted;
  return submitted && typeof submitted === "object" && !Array.isArray(submitted)
    ? (submitted as Record<string, unknown>)
    : null;
}

function isWorkModeValue(value: string): boolean {
  const key = value.toLowerCase().replace(/\s+/g, "-");
  return WORK_MODE_VALUES.has(key === "onsite" ? "on-site" : key);
}

export function formatWorkModeLabel(mode: string): string {
  const key = mode.toLowerCase().replace(/\s+/g, "-");
  if (key === "onsite") return WORK_MODE_LABELS["on-site"];
  return WORK_MODE_LABELS[key] ?? mode;
}

export function formatEmploymentTypeLabel(raw: string): string {
  const t = raw.trim();
  if (!t || t === "—") return "Full-time";
  const normalizedKey = t.toUpperCase().replace(/[\s_-]/g, "");
  if (EMPLOYMENT_TYPE_LABELS[normalizedKey]) {
    return EMPLOYMENT_TYPE_LABELS[normalizedKey];
  }
  return t;
}

export function parseEmploymentTypeFromDescription(
  description: string | undefined | null,
): string {
  if (!description?.trim()) return "";
  const patterns = [
    /\n\nEmployment:\s*(.+?)(?:\n\n|$)/is,
    /(?:^|\n)Employment:\s*(.+?)(?:\n|$)/i,
  ];
  for (const re of patterns) {
    const m = description.match(re);
    const val = m?.[1]?.trim();
    if (val) return val;
  }
  return "";
}

/** Work arrangement from employer work_mode dropdown (Remote / Hybrid / On-site). */
export function resolveJobWorkArrangement(
  job: JobDetail | Record<string, unknown> | null | undefined,
): string {
  if (!job) return "On-site";
  const j = job as Record<string, unknown>;
  const submitted = pickEmployerSubmitted(j);

  const workMode = pickString(j.work_mode, j.job_work_mode, submitted?.work_mode);
  if (workMode && workMode.toLowerCase() !== "unknown") {
    return formatWorkModeLabel(workMode);
  }

  const isRemote =
    j.is_remote === true || j.remote === true || j.job_is_remote === true;
  if (isRemote) return "Remote";

  const title = pickString(j.title, j.job_title).toLowerCase();
  if (title.includes("hybrid")) return "Hybrid";

  return "On-site";
}

/** Employment type from employer dropdown (Full-time, Part-time, etc.). */
export function resolveJobEmploymentType(
  job: JobDetail | Record<string, unknown> | null | undefined,
): string {
  if (!job) return "Full-time";
  const j = job as Record<string, unknown>;
  const submitted = pickEmployerSubmitted(j);

  const fromNote = pickString(
    j.employment_type_note,
    submitted?.employment_type_note,
  );
  if (fromNote) return formatEmploymentTypeLabel(fromNote);

  const fromDesc = parseEmploymentTypeFromDescription(
    pickString(j.full_description, j.description, j.job_description),
  );
  if (fromDesc) return formatEmploymentTypeLabel(fromDesc);

  const rawType = pickString(
    j.employment_type,
    j.job_employment_type,
    j.job_type,
    j.type,
  );
  if (rawType && !isWorkModeValue(rawType)) {
    return formatEmploymentTypeLabel(rawType);
  }

  return "Full-time";
}
