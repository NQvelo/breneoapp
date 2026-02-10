/**
 * Industry taxonomy: canonical names, synonyms, and related industries.
 * Used to normalize job industryTags and to compute industry match.
 * Do NOT invent job industries — only normalize what is provided.
 */

/** Map variant → canonical (lowercase) industry tag */
export const INDUSTRY_SYNONYMS: Record<string, string> = {
  "financial services": "fintech",
  "finance": "fintech",
  "fs": "fintech",
  banking: "banking",
  payments: "payments",
  "e commerce": "e-commerce",
  "ecommerce": "e-commerce",
  retail: "retail",
  insurance: "insurance",
  "enterprise software": "enterprise software",
  saas: "saas",
  "software as a service": "saas",
  medtech: "medtech",
  "medical technology": "medtech",
  pharma: "pharma",
  pharmaceutical: "pharma",
  healthcare: "healthcare",
  "health care": "healthcare",
  marketplace: "marketplace",
  "market place": "marketplace",
  technology: "technology",
  tech: "technology",
  software: "technology",
  cloud: "cloud",
  "cloud computing": "cloud",
};

/** Canonical tag → related industry tags (for partial match) */
export const INDUSTRY_RELATED: Record<string, string[]> = {
  fintech: ["banking", "insurance", "payments"],
  banking: ["fintech", "payments"],
  payments: ["fintech", "banking"],
  "e-commerce": ["retail", "marketplace"],
  retail: ["e-commerce", "marketplace"],
  marketplace: ["e-commerce", "retail"],
  healthcare: ["medtech", "pharma"],
  medtech: ["healthcare", "pharma"],
  pharma: ["healthcare", "medtech"],
  technology: ["saas", "cloud"],
  saas: ["technology", "enterprise software"],
  "enterprise software": ["saas", "technology"],
  cloud: ["technology"],
};

/**
 * Parse job industryTags string into canonical lowercase array.
 * - null/empty => []
 * - split by comma, trim, lowercase, dedupe, map synonyms
 */
export function parseIndustryTags(tagsString: string | null | undefined): string[] {
  if (tagsString == null || typeof tagsString !== "string") return [];
  const raw = tagsString.trim();
  if (!raw) return [];

  const tags = raw
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, " "))
    .filter(Boolean);

  const canonical = tags.map((t) => INDUSTRY_SYNONYMS[t] ?? t).filter(Boolean);
  return [...new Set(canonical)];
}

/**
 * Capitalize for display (e.g. "fintech" -> "Fintech").
 */
export function capitalizeIndustryTag(tag: string): string {
  if (!tag) return tag;
  return tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
}
