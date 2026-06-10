import type { JobDetail } from "@/api/jobs/types";
import { resolveRequiredSkillsList } from "@/services/matching";

function listItemToString(x: unknown): string {
  if (typeof x === "string") return x.trim();
  if (x && typeof x === "object" && !Array.isArray(x)) {
    const o = x as Record<string, unknown>;
    const inner =
      o.text ?? o.description ?? o.name ?? o.value ?? o.title ?? o.content;
    if (inner != null) return String(inner).trim();
  }
  return String(x ?? "").trim();
}

function coerceSkillListField(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map(listItemToString).filter(Boolean);
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return [];
    if (t.startsWith("[")) {
      try {
        const p = JSON.parse(t) as unknown;
        if (Array.isArray(p)) return coerceSkillListField(p);
      } catch {
        /* plain text */
      }
    }
    return t
      .split(/[\n,;]/)
      .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
      .filter(Boolean);
  }
  return [];
}

const SKILL_FIELD_KEYS = [
  "skills_required",
  "required_skills",
  "skills",
  "job_skills",
] as const;

function pickExplicitSkillsFromRecord(
  raw: Record<string, unknown> | null | undefined,
): string[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  for (const key of SKILL_FIELD_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) continue;
    const coerced = coerceSkillListField(raw[key]);
    if (coerced.length > 0) return coerced;
  }
  return [];
}

/** Explicit skills stored on the job record (no description inference). */
export function pickExplicitSkillsFromJobDetail(job: JobDetail): string[] {
  const raw = job as Record<string, unknown>;
  const rawEnvelope =
    raw.raw && typeof raw.raw === "object" && !Array.isArray(raw.raw)
      ? (raw.raw as Record<string, unknown>)
      : null;
  const employerSubmittedTop =
    raw.employer_submitted &&
    typeof raw.employer_submitted === "object" &&
    !Array.isArray(raw.employer_submitted)
      ? (raw.employer_submitted as Record<string, unknown>)
      : null;
  const employerSubmittedNested =
    rawEnvelope?.employer_submitted &&
    typeof rawEnvelope.employer_submitted === "object" &&
    !Array.isArray(rawEnvelope.employer_submitted)
      ? (rawEnvelope.employer_submitted as Record<string, unknown>)
      : null;

  for (const src of [
    employerSubmittedTop,
    employerSubmittedNested,
    raw,
    rawEnvelope,
    rawEnvelope?.raw &&
    typeof rawEnvelope.raw === "object" &&
    !Array.isArray(rawEnvelope.raw)
      ? (rawEnvelope.raw as Record<string, unknown>)
      : null,
  ]) {
    const skills = pickExplicitSkillsFromRecord(src);
    if (skills.length > 0) return skills;
  }
  return [];
}

/**
 * Required skills for job detail UIs — matches employer posting form:
 * use stored API skills when present; infer from description only when empty.
 */
export function resolveJobDisplayRequiredSkills(job: JobDetail): string[] {
  const stored = pickExplicitSkillsFromJobDetail(job);
  if (stored.length > 0) return stored;
  return resolveRequiredSkillsList(job);
}
