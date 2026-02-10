/**
 * Map: normalized company name → canonical industry tags.
 * Extend over time; unknown companies are skipped (no industry assigned).
 */

/** Normalized company key → array of canonical (lowercase) industry tags */
export const COMPANY_INDUSTRY_MAP: Record<string, string[]> = {
  paypal: ["payments", "fintech"],
  stripe: ["payments", "fintech"],
  amazon: ["e-commerce", "retail", "cloud"],
  "amazon web services": ["cloud", "technology"],
  aws: ["cloud", "technology"],
  sap: ["enterprise software", "saas"],
  salesforce: ["saas", "enterprise software"],
  google: ["technology", "cloud"],
  microsoft: ["technology", "cloud", "saas"],
  apple: ["technology"],
  meta: ["technology"],
  facebook: ["technology"],
  spotify: ["technology", "marketplace"],
  netflix: ["technology"],
  uber: ["technology", "marketplace"],
  airbnb: ["marketplace", "e-commerce"],
  shopify: ["e-commerce", "saas"],
  alibaba: ["e-commerce", "retail"],
  ebay: ["e-commerce", "marketplace"],
  adobe: ["technology", "saas"],
  oracle: ["enterprise software", "cloud"],
  ibm: ["technology", "cloud", "enterprise software"],
  jpmorgan: ["banking", "fintech"],
  "jp morgan": ["banking", "fintech"],
  goldman: ["banking", "fintech"],
  "goldman sachs": ["banking", "fintech"],
  "morgan stanley": ["banking", "fintech"],
  visa: ["payments", "fintech"],
  mastercard: ["payments", "fintech"],
  square: ["payments", "fintech"],
  revolut: ["fintech", "banking", "payments"],
  n26: ["fintech", "banking"],
  klarna: ["fintech", "payments", "e-commerce"],
  plaid: ["fintech", "payments"],
  brex: ["fintech"],
  merck: ["pharma", "healthcare"],
  pfizer: ["pharma", "healthcare"],
  johnson: ["pharma", "healthcare"],
  "johnson & johnson": ["pharma", "healthcare"],
  siemens: ["technology", "enterprise software"],
  bcg: ["consulting"],
  "boston consulting": ["consulting"],
  mckinsey: ["consulting"],
  bain: ["consulting"],
};

/**
 * Normalize company name for lookup: lowercase, remove punctuation, collapse spaces.
 */
export function normalizeCompanyName(companyName: string | null | undefined): string {
  if (companyName == null || typeof companyName !== "string") return "";
  return companyName
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Get canonical industry tags for a company. Returns [] if unknown.
 */
export function getIndustriesForCompany(companyName: string | null | undefined): string[] {
  const key = normalizeCompanyName(companyName);
  if (!key) return [];
  return COMPANY_INDUSTRY_MAP[key] ?? [];
}
