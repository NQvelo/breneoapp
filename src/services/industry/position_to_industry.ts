/**
 * Map job title / position to industries.
 * User enters e.g. "UI/UX Designer" → we infer experience in "design" industry.
 * Canonical industry names must match industry_taxonomy (lowercase).
 */

/** Keywords (lowercase) that indicate experience in given industries. First match wins per industry. */
const POSITION_KEYWORDS: { keywords: string[]; industries: string[] }[] = [
  { keywords: ["ui/ux designer", "ui ux designer", "ux designer", "ui designer", "ux/ui", "product designer", "graphic designer", "web designer", "designer"], industries: ["design"] },
  { keywords: ["software engineer", "software developer", "developer", "frontend", "front-end", "backend", "back-end", "fullstack", "full stack", "engineer", "programmer", "devops", "sre"], industries: ["technology"] },
  { keywords: ["data scientist", "data analyst", "analytics", "machine learning", "ml engineer", "ai engineer"], industries: ["technology"] },
  { keywords: ["product manager", "pm ", "product owner", "product lead"], industries: ["technology"] },
  { keywords: ["financial analyst", "finance manager", "banker", "investment", "risk analyst", "compliance", "accountant", "cfo"], industries: ["fintech", "banking"] },
  { keywords: ["payment", "payments specialist"], industries: ["payments", "fintech"] },
  { keywords: ["marketing manager", "marketing specialist", "digital marketing", "growth lead", "brand manager"], industries: ["marketing"] },
  { keywords: ["sales manager", "sales representative", "business development", "bd "], industries: ["sales"] },
  { keywords: ["hr manager", "hr specialist", "recruiter", "talent", "people operations"], industries: ["hr"] },
  { keywords: ["customer success", "customer support", "support specialist", "account manager"], industries: ["customer service"] },
  { keywords: ["nurse", "doctor", "physician", "clinical", "healthcare"], industries: ["healthcare"] },
  { keywords: ["e-commerce", "ecommerce", "retail manager", "merchandising"], industries: ["e-commerce", "retail"] },
  { keywords: ["consultant", "consulting"], industries: ["consulting"] },
  { keywords: ["content writer", "copywriter", "content manager", "editor"], industries: ["content"] },
  { keywords: ["qa engineer", "quality assurance", "test engineer", "sdet"], industries: ["technology"] },
];

function normalizeTitle(title: string | null | undefined): string {
  if (title == null || typeof title !== "string") return "";
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Get canonical industry tags for a job title / position.
 * E.g. "UI/UX Designer" -> ["design"], "Software Engineer" -> ["technology"].
 * Returns [] if no keywords match (we don't guess).
 */
export function getIndustriesForPosition(
  jobTitle: string | null | undefined
): string[] {
  const normalized = normalizeTitle(jobTitle);
  if (!normalized) return [];

  const industriesSet = new Set<string>();
  for (const { keywords, industries } of POSITION_KEYWORDS) {
    const hasMatch = keywords.some((kw) =>
      normalized.includes(kw) || normalized.includes(kw.replace(/\s+/g, " "))
    );
    if (hasMatch) {
      industries.forEach((ind) => industriesSet.add(ind));
    }
  }
  return [...industriesSet];
}
