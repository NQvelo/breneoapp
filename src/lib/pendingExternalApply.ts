/**
 * Remembers that the user left to an external apply page, so the job page can ask
 * "Did you apply?" when they come back (same tab after navigation, or new tab closed).
 */
const STORAGE_KEY = "breneo:pendingExternalApply";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface PendingExternalApply {
  jobId: string;
  startedAt: number;
}

export function markExternalApplyStarted(jobId: string): void {
  const id = String(jobId).trim();
  if (!id) return;
  try {
    const value: PendingExternalApply = { jobId: id, startedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) — prompt simply won't show */
  }
}

export function hasPendingExternalApply(jobId: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<PendingExternalApply>;
    if (typeof parsed.startedAt !== "number") return false;
    if (Date.now() - parsed.startedAt > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }
    return String(parsed.jobId ?? "") === String(jobId).trim();
  } catch {
    return false;
  }
}

export function clearPendingExternalApply(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
