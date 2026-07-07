const BY_AGREEMENT = /by agreement/i;
const LARI_SUFFIX = " ₾";

/** Digits only; optional single hyphen for a range (e.g. 3000-5000). */
export function sanitizeNumericSalaryInput(raw: string): string {
  const cleaned = raw.replace(/[^\d-]/g, "");
  const dashIdx = cleaned.indexOf("-");
  if (dashIdx === -1) return cleaned;
  const before = cleaned.slice(0, dashIdx).replace(/-/g, "");
  const after = cleaned.slice(dashIdx + 1).replace(/-/g, "");
  if (!after) return before;
  return `${before}-${after}`;
}

function formatNumericToken(token: string): string {
  const digits = token.replace(/\D/g, "");
  if (!digits) return token;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n.toLocaleString() : token;
}

/** Display salary string with ₾ at the end (employer-entered or stored text). */
export function formatJobSalaryWithLari(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || BY_AGREEMENT.test(trimmed)) return "By agreement";

  const withoutCurrency = trimmed
    .replace(/\s*(₾|GEL)\s*$/i, "")
    .replace(/^\s*(₾|GEL)\s*/i, "")
    .trim();
  if (!withoutCurrency || BY_AGREEMENT.test(withoutCurrency)) {
    return "By agreement";
  }

  const formatted = withoutCurrency.replace(/\d+/g, (match) =>
    formatNumericToken(match),
  );

  if (/₾\s*$/u.test(trimmed)) {
    return formatted.endsWith("₾") ? formatted : `${formatted}${LARI_SUFFIX}`;
  }

  return `${formatted}${LARI_SUFFIX}`;
}

export function isValidNumericSalary(value: string): boolean {
  const t = value.trim();
  return /^\d+(-\d+)?$/.test(t);
}

/** Strip trailing ₾/GEL from a formatted salary label. */
export function stripTrailingLari(formatted: string): string {
  return formatted
    .replace(/\s*₾(\s*\/ Monthly)?$/iu, "$1")
    .replace(/\s*GEL(\s*\/ Monthly)?$/i, "$1")
    .trim();
}

/** Numeric salary label without leading/trailing currency (for ₾ prefix in UI). */
export function formatJobSalaryAmount(raw: string): string {
  return stripTrailingLari(formatJobSalaryWithLari(raw));
}

export type JobSalarySource = {
  salary?: string | null;
  min_salary?: number | null;
  max_salary?: number | null;
  job_min_salary?: number | null;
  job_max_salary?: number | null;
  salary_period?: string | null;
  job_salary_period?: string | null;
};

function periodSuffix(period?: string | null): string {
  const p = (period ?? "yearly").toLowerCase();
  return p === "monthly" ? " / Monthly" : "";
}

/** Unified job salary label for cards, detail, lists — always ends with ₾ when numeric. */
export function formatJobSalaryDisplay(job: JobSalarySource): string {
  const minSalary = job.job_min_salary ?? job.min_salary;
  const maxSalary = job.job_max_salary ?? job.max_salary;
  const salaryPeriod = job.job_salary_period ?? job.salary_period;
  const suffix = periodSuffix(salaryPeriod);

  if (
    minSalary != null &&
    maxSalary != null &&
    typeof minSalary === "number" &&
    typeof maxSalary === "number"
  ) {
    return `${minSalary.toLocaleString()} - ${maxSalary.toLocaleString()}${LARI_SUFFIX}${suffix}`;
  }
  if (minSalary != null && typeof minSalary === "number") {
    return `${minSalary.toLocaleString()}+${LARI_SUFFIX}${suffix}`;
  }
  if (maxSalary != null && typeof maxSalary === "number") {
    return `Up to ${maxSalary.toLocaleString()}${LARI_SUFFIX}${suffix}`;
  }
  if (job.salary && typeof job.salary === "string" && job.salary.trim()) {
    return formatJobSalaryWithLari(job.salary);
  }
  return "By agreement";
}

/** Active salary filter chip label. */
export function formatSalaryFilterLabel(
  min?: number,
  max?: number,
): string {
  if (min !== undefined && max !== undefined) {
    return `${min.toLocaleString()} - ${max.toLocaleString()}${LARI_SUFFIX}`;
  }
  if (min !== undefined) return `Min: ${min.toLocaleString()}${LARI_SUFFIX}`;
  if (max !== undefined) return `Max: ${max.toLocaleString()}${LARI_SUFFIX}`;
  return "";
}

const BY_AGREEMENT_PATTERN = /by agreement/i;

/** Numeric midpoint for a job listing (min/max average, or parsed salary text). */
export function extractJobSalaryMidpoint(job: JobSalarySource): number | null {
  const minSalary = job.job_min_salary ?? job.min_salary;
  const maxSalary = job.job_max_salary ?? job.max_salary;

  if (
    minSalary != null &&
    maxSalary != null &&
    typeof minSalary === "number" &&
    typeof maxSalary === "number" &&
    minSalary > 0 &&
    maxSalary > 0
  ) {
    return (minSalary + maxSalary) / 2;
  }
  if (minSalary != null && typeof minSalary === "number" && minSalary > 0) {
    return minSalary;
  }
  if (maxSalary != null && typeof maxSalary === "number" && maxSalary > 0) {
    return maxSalary;
  }

  if (job.salary && typeof job.salary === "string") {
    const trimmed = job.salary.trim();
    if (!trimmed || BY_AGREEMENT_PATTERN.test(trimmed)) return null;

    const rangeMatch = trimmed.match(/(\d[\d,]*)\s*-\s*(\d[\d,]*)/);
    if (rangeMatch) {
      const min = Number.parseInt(rangeMatch[1].replace(/,/g, ""), 10);
      const max = Number.parseInt(rangeMatch[2].replace(/,/g, ""), 10);
      if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max > 0) {
        return (min + max) / 2;
      }
    }

    const singleMatch = trimmed.match(/(\d[\d,]+)/);
    if (singleMatch) {
      const value = Number.parseInt(singleMatch[1].replace(/,/g, ""), 10);
      if (Number.isFinite(value) && value > 0) return value;
    }
  }

  return null;
}

export type AverageJobSalaryResult = {
  average: number;
  count: number;
  period: "monthly" | "yearly" | null;
};

/** Average salary across jobs that expose numeric compensation. */
export function computeAverageJobSalary(
  jobs: JobSalarySource[],
): AverageJobSalaryResult | null {
  const values: number[] = [];
  let monthlyCount = 0;
  let yearlyCount = 0;

  for (const job of jobs) {
    const midpoint = extractJobSalaryMidpoint(job);
    if (midpoint == null) continue;

    values.push(midpoint);
    const period = (job.job_salary_period ?? job.salary_period ?? "")
      .toLowerCase()
      .trim();
    if (period === "monthly") monthlyCount += 1;
    else if (period === "yearly" || period === "year") yearlyCount += 1;
  }

  if (values.length === 0) return null;

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const period =
    monthlyCount > yearlyCount
      ? "monthly"
      : yearlyCount > 0
        ? "yearly"
        : null;

  return { average, count: values.length, period };
}

export type SkillPathSalaryCountry = "Georgia" | "USA";

export function formatAverageJobSalary(
  result: AverageJobSalaryResult,
  country: SkillPathSalaryCountry,
): string {
  const formatted = Math.round(result.average).toLocaleString();
  const periodSuffix =
    result.period === "monthly"
      ? " / Monthly"
      : result.period === "yearly"
        ? " / Yearly"
        : "";

  if (country === "USA") {
    return `$${formatted}${periodSuffix}`;
  }
  return `${formatted}${LARI_SUFFIX}${periodSuffix}`;
}
