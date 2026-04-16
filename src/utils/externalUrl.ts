/**
 * Normalize API/user-provided URLs for http(s) navigation.
 * Bare hostnames (no scheme) are treated as https — otherwise the browser
 * resolves them as paths on the current origin (common cause of blank SPA views on mobile).
 */
export function normalizeExternalHttpUrl(
  raw: string | null | undefined,
): string {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (!s) return "";
  const lower = s.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return "";
  if (lower.startsWith("mailto:") || lower.startsWith("tel:")) return s;
  if (s.startsWith("//")) return `https:${s}`;
  if (/^https?:\/\//i.test(s)) return s;
  // Same-origin path from API — avoid turning "/careers" into "https:///careers"
  if (s.startsWith("/")) {
    if (typeof window !== "undefined" && window.location?.origin) {
      return `${window.location.origin}${s}`;
    }
    return s;
  }
  return `https://${s}`;
}

/**
 * Open an external URL in a new tab using a real anchor click (more reliable on iOS
 * than window.open for untrusted / long URLs from the jobs API).
 */
export function openExternalHttpUrl(raw: string | null | undefined): void {
  const href = normalizeExternalHttpUrl(raw);
  if (!href) return;
  const a = document.createElement("a");
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
