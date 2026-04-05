/**
 * Server-side static extraction (no Gemini). Not used by employer-jobs-proxy for persistence —
 * stored responsibilities/qualifications come only from Gemini. Kept for reference / possible
 * scripts; mirrors src/utils/jobSectionExtractor.ts heuristics.
 */

const MAX_ITEMS = 6;
const MAX_WORDS_PER_ITEM = 10;

/** Drop fluffy standalone bullets (aligned with product rules). */
const GENERIC_ITEM =
  /\b(team player|fast-?paced environment|self-?starter|detail[- ]oriented|proactive approach|strong work ethic)\b/i;

const LEGAL_NOISE =
  /equal opportunity|affirmative action|privacy policy|click here|salary range|color, religion|sex, sexual orientation|gender identity|national origin|disability|veteran status|arrest history|background check/i;

/**
 * @param {string} sentence
 */
function shortenToWords(sentence, maxWords = MAX_WORDS_PER_ITEM) {
  const words = String(sentence)
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?]+$/, "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return words.slice(0, maxWords).join(" ");
}

/**
 * Dedupe, cap count, trim length, drop generic fluff.
 * @param {string[]} rawItems
 * @returns {string[]}
 */
function finalizeItems(rawItems) {
  const seen = new Set();
  const out = [];
  for (const item of rawItems) {
    const t = shortenToWords(item);
    if (t.length < 4) continue;
    if (GENERIC_ITEM.test(t) && t.split(/\s+/).length <= 5) continue;
    const key = t.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

/**
 * Split on line breaks and on `.` / `?` / `!` only when followed by whitespace (avoids `Node.js`, decimals).
 * @param {string} text
 * @returns {string[]}
 */
function splitSentences(text) {
  const t = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!t) return [];
  return t
    .split(/\n+/)
    .flatMap((block) =>
      block
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean),
    )
    .filter(Boolean);
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function extractResponsibilitySentences(text) {
  const sentences = splitSentences(text);
  const responsibilityKeywords = [
    "responsibilities",
    "duties",
    "will",
    "will be",
    "will have",
    "primary",
    "main",
    "develop",
    "design",
    "manage",
    "create",
    "implement",
    "analyze",
    "collaborate",
    "lead",
    "work with",
    "handle",
    "ensure",
    "maintain",
    "build",
    "deliver",
    "support",
    "coordinate",
    "oversee",
    "execute",
    "perform",
    "conduct",
    "provide",
    "assist",
    "participate",
  ];

  const scored = sentences
    .map((sentence, index) => {
      const lower = sentence.toLowerCase();
      if (LEGAL_NOISE.test(lower)) {
        return { sentence: "", score: -100, index };
      }
      let score = 0;
      for (const keyword of responsibilityKeywords) {
        const regex = new RegExp(`\\b${keyword.replace(/ /g, "\\s+")}\\b`, "gi");
        const matches = lower.match(regex);
        if (matches) score += matches.length * 5;
      }
      if (
        /required|must have|qualification|experience|years|degree|education|certification|skill|proficient/i.test(
          lower,
        ) &&
        !/will|responsibilities|duties/i.test(lower)
      ) {
        score -= 5;
      }
      if (
        /company|organization|founded|established|mission|vision|values|culture|opportunity to|join us/i.test(
          lower,
        )
      ) {
        score -= 3;
      }
      return { sentence: sentence.trim(), score, index };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  scored.sort((a, b) => a.index - b.index);
  return scored.map((x) => x.sentence).filter(Boolean);
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function extractQualificationSentences(text) {
  const sentences = splitSentences(text);
  const qualificationKeywords = [
    "required",
    "must have",
    "must",
    "need",
    "should have",
    "qualifications",
    "requirements",
    "experience",
    "years of",
    "degree",
    "education",
    "certification",
    "certified",
    "skills",
    "proficient",
    "expert",
    "knowledge",
    "familiar",
    "expect",
    "looking for",
    "candidate",
    "applicant",
    "ideal candidate",
    "minimum",
    "at least",
    "preferred",
    "bachelor",
    "master",
    "phd",
    "diploma",
  ];

  const scored = sentences
    .map((sentence, index) => {
      const lower = sentence.toLowerCase();
      if (LEGAL_NOISE.test(lower)) {
        return { sentence: "", score: -100, index };
      }
      let score = 0;
      for (const keyword of qualificationKeywords) {
        const regex = new RegExp(`\\b${keyword.replace(/ /g, "\\s+")}\\b`, "gi");
        const matches = lower.match(regex);
        if (matches) score += matches.length * 8;
      }
      if (/\d+\s*(year|years|yr|yrs|month|months)\s*(of|experience)/i.test(sentence)) {
        score += 10;
      }
      if (
        /javascript|python|java|react|node|sql|typescript|html|css|angular|vue|spring|django|flask|express|mongodb|postgresql|mysql|aws|azure|docker|kubernetes|git|agile|scrum/i.test(
          sentence,
        )
      ) {
        score += 6;
      }
      if (
        /will|responsibilities|duties|develop|design|manage|create|implement|handle|ensure/i.test(
          lower,
        ) &&
        !/required|must|qualification|experience|skill/i.test(lower)
      ) {
        score -= 5;
      }
      if (
        /company|organization|founded|established|mission|vision|values|culture|opportunity to|join us/i.test(
          lower,
        )
      ) {
        score -= 3;
      }
      return { sentence: sentence.trim(), score, index };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  scored.sort((a, b) => a.index - b.index);
  return scored.map((x) => x.sentence).filter(Boolean);
}

/**
 * Static extraction for automated job ingestion (no external AI).
 * @param {string} rawJobDescription
 * @returns {{ responsibilities: string[], qualifications: string[] }}
 */
export function extractStaticJobSections(rawJobDescription) {
  const text = String(rawJobDescription ?? "").trim();
  if (!text) {
    return { responsibilities: [], qualifications: [] };
  }
  const resp = finalizeItems(extractResponsibilitySentences(text));
  const qual = finalizeItems(extractQualificationSentences(text));
  return { responsibilities: resp, qualifications: qual };
}
