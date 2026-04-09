/**
 * Shared parsing for job-aggregator / BFF JSON error bodies (Django REST, FastAPI, etc.).
 */

export function extractAggregatorErrorMessage(
  body: Record<string, unknown>,
  fallback: string,
): string {
  const d = body.detail;
  if (typeof d === "string" && d.trim()) return d.trim();
  if (Array.isArray(d) && d.length) {
    const parts = d.map((x) => {
      if (typeof x === "string") return x;
      if (x && typeof x === "object" && !Array.isArray(x)) {
        const o = x as Record<string, unknown>;
        const msg = o.msg;
        const loc = o.loc;
        if (typeof msg === "string" && msg.trim()) {
          const where = Array.isArray(loc)
            ? loc.filter((p) => typeof p === "string").join(".")
            : "";
          return where ? `${where}: ${msg.trim()}` : msg.trim();
        }
      }
      try {
        return JSON.stringify(x);
      } catch {
        return String(x);
      }
    });
    return parts.join(" ");
  }
  if (d && typeof d === "object") {
    try {
      return JSON.stringify(d);
    } catch {
      /* fall through */
    }
  }
  const nfe = body.non_field_errors;
  if (Array.isArray(nfe) && nfe.length) {
    return nfe.map((x) => String(x)).join(" ");
  }
  const m = body.message;
  if (typeof m === "string" && m.trim()) return m.trim();
  const parts: string[] = [];
  for (const [key, v] of Object.entries(body)) {
    if (key === "detail" || key === "non_field_errors") continue;
    if (Array.isArray(v)) {
      parts.push(
        `${key}: ${v.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(", ")}`,
      );
    } else if (typeof v === "string") parts.push(`${key}: ${v}`);
    else if (v && typeof v === "object")
      parts.push(`${key}: ${JSON.stringify(v)}`);
  }
  if (parts.length) return parts.join(" ");
  return fallback;
}

export function parseAggregatorFieldErrors(
  body: Record<string, unknown>,
): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(body)) {
    if (k === "detail" || k === "message") continue;
    if (k === "non_field_errors" && Array.isArray(v)) {
      fields.non_field_errors = v.map((x) => String(x));
      continue;
    }
    if (Array.isArray(v)) {
      fields[k] = v.map((x) => String(x));
    } else if (typeof v === "string") {
      fields[k] = [v];
    }
  }
  return fields;
}
