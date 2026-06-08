/** Plain-text formatting for job description / section display. */

const HTML_ENTITY_MAP: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

function decodeHtmlEntities(text: string): string {
  let out = text.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(Number(code)),
  );
  out = out.replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
  for (const [entity, ch] of Object.entries(HTML_ENTITY_MAP)) {
    out = out.split(entity).join(ch);
  }
  return out;
}

/** Remove HTML tags and markup; keep readable plain text. */
export function stripHtmlToPlainText(text: string): string {
  let t = String(text ?? "").trim();
  if (!t) return "";

  t = t.replace(/<br\s*\/?>/gi, "\n");
  t = t.replace(/<\/(p|div|li|h[1-6]|tr|td|th|blockquote|section|article)>/gi, "\n\n");
  t = t.replace(
    /<(p|div|li|h[1-6]|blockquote|section|article)[^>]*>/gi,
    "",
  );
  t = t.replace(/<[^>]+>/g, "");
  t = decodeHtmlEntities(t);
  t = t.replace(/[\u200B-\u200D\uFEFF]/g, "");
  t = t.replace(/[ \t]+\n/g, "\n");
  t = t.replace(/\n[ \t]+/g, "\n");
  t = t.replace(/[ \t]{2,}/g, " ");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

/** Split cleaned plain text into separate paragraphs. */
export function splitPlainTextParagraphs(text: string): string[] {
  const plain = stripHtmlToPlainText(text);
  if (!plain) return [];
  const paragraphs = plain
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (paragraphs.length > 0) return paragraphs;
  const single = plain.replace(/\s+/g, " ").trim();
  return single ? [single] : [];
}

/** Clean one bullet-list item (strip HTML / extra whitespace). */
export function cleanJobSectionListItem(item: string): string {
  return stripHtmlToPlainText(item).replace(/\s+/g, " ").trim();
}
