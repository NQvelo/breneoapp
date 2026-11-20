const ALLOWED_TAGS = new Set([
  "A", "B", "BLOCKQUOTE", "BR", "EM", "FONT", "H1", "H2", "H3", "H4", "H5",
  "I", "LI", "OL", "P", "SPAN", "STRONG", "U", "UL",
]);

const SAFE_COLOR = /^(#[\da-f]{3,8}|rgba?\([\d\s.,%]+\))$/i;
const SAFE_FONT_SIZES = new Set(["1em", "1.05em", "1.17em", "1.5em", "2em"]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Sanitize course description markup while retaining supported text formatting. */
export function sanitizeCourseDescription(value: string): string {
  const source = value.trim();
  if (!source) return "";

  if (!/<[a-z][^>]*>/i.test(source)) {
    return source
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  const parsed = new DOMParser().parseFromString(source, "text/html");
  if (!parsed.body.textContent?.trim()) return "";
  const cleanNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent ?? "");
    if (!(node instanceof Element)) return "";
    const tag = node.tagName.toUpperCase();
    if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "SVG", "MATH"].includes(tag)) return "";
    const children = Array.from(node.childNodes).map(cleanNode).join("");
    if (tag === "DIV") return `<p>${children}</p>`;
    if (!ALLOWED_TAGS.has(tag)) return children;
    if (tag === "BR") return "<br>";

    let attributes = "";
    if (tag === "SPAN") {
      const textStyle = node.getAttribute("data-course-text-style");
      if (["h1", "h2", "h3", "h4", "h5"].includes(textStyle ?? "")) {
        attributes += ` data-course-text-style="${textStyle}"`;
      }
    }
    if (tag === "A") {
      const href = node.getAttribute("href")?.trim() ?? "";
      if (/^(https?:|mailto:)/i.test(href)) {
        attributes = ` href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"`;
      }
    }
    const styles: string[] = [];
    const styledNode = node as HTMLElement;
    const color = node.getAttribute("color") ?? styledNode.style?.color;
    const backgroundColor = styledNode.style?.backgroundColor;
    const fontSize = styledNode.style?.fontSize;
    const fontWeight = styledNode.style?.fontWeight;
    const fontStyle = styledNode.style?.fontStyle;
    const textDecoration = styledNode.style?.textDecorationLine || styledNode.style?.textDecoration;
    if (color && SAFE_COLOR.test(color.trim())) styles.push(`color:${color.trim()}`);
    if (backgroundColor && SAFE_COLOR.test(backgroundColor.trim())) styles.push(`background-color:${backgroundColor.trim()}`);
    if (fontSize && SAFE_FONT_SIZES.has(fontSize.trim())) styles.push(`font-size:${fontSize.trim()}`);
    if (fontWeight && /^(normal|bold|bolder|[1-9]00)$/i.test(fontWeight.trim())) styles.push(`font-weight:${fontWeight.trim()}`);
    if (fontStyle && /^(italic|oblique)$/i.test(fontStyle.trim())) styles.push("font-style:italic");
    if (textDecoration && /^(underline|line-through|underline line-through|line-through underline)$/i.test(textDecoration.trim())) {
      styles.push(`text-decoration:${textDecoration.trim()}`);
    }
    if (styles.length) attributes += ` style="${styles.join(";")}"`;
    return `<${tag.toLowerCase()}${attributes}>${children}</${tag.toLowerCase()}>`;
  };

  return Array.from(parsed.body.childNodes).map(cleanNode).join("");
}
