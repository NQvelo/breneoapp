export function formatProfileMonthYear(
  value: string | null | undefined,
): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export function formatProfileDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
  isCurrent: boolean,
): string {
  const startStr = formatProfileMonthYear(start);
  if (!startStr) {
    if (isCurrent) return "Present";
    return formatProfileMonthYear(end) || "";
  }
  if (isCurrent) return `${startStr} → Present`;
  const endStr = formatProfileMonthYear(end);
  return endStr ? `${startStr} → ${endStr}` : startStr;
}
