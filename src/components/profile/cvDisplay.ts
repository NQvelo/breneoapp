import type { BilingualText } from "@/api/ats";

const MAX_RESUME_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["pdf", "docx"]);

export type ResumeFileProblem = "too_large" | "unsupported";

export function bilingualLines(
  value: Partial<BilingualText> | null | undefined,
): string[] {
  const en = value?.en?.trim() ?? "";
  const ka = value?.ka?.trim() ?? "";
  if (en && ka) return [en, ka];
  if (en) return [en];
  if (ka) return [ka];
  return [];
}

export function namedLines(nameEn?: string, nameKa?: string): string[] {
  return bilingualLines({ en: nameEn ?? "", ka: nameKa ?? "" });
}

export function formatDateRange(
  start: string | undefined,
  end: string | undefined,
  isCurrent: boolean | undefined,
  presentLabel: string,
): string {
  const startLabel = start?.trim() ?? "";
  if (isCurrent) {
    return startLabel ? `${startLabel}–${presentLabel}` : presentLabel;
  }
  const endLabel = end?.trim() ?? "";
  if (startLabel && endLabel) return `${startLabel}–${endLabel}`;
  return startLabel || endLabel;
}

export function showsLlmFallbackNote(warnings: string[] | undefined): boolean {
  if (!Array.isArray(warnings)) return false;
  return (
    warnings.includes("llm_not_configured") || warnings.includes("llm_failed")
  );
}

export function formatScore(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return String(Math.round(value * 100) / 100);
}

function fileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function resumeFileProblem(file: {
  name: string;
  size: number;
}): ResumeFileProblem | null {
  if (!ALLOWED_EXTENSIONS.has(fileExtension(file.name))) return "unsupported";
  if (file.size > MAX_RESUME_BYTES) return "too_large";
  return null;
}
