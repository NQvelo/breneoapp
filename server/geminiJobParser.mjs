/**
 * Server-only Gemini helper: extracts short description summary, responsibilities, and
 * qualifications from raw employer job text. Invoked only from employer-jobs-proxy on
 * employer job POST / PATCH (when description is present / changed).
 *
 * Env:
 *   GEMINI_API_KEY — required for extraction; if unset, callers skip Gemini safely.
 *   GEMINI_MODEL   — optional; default gemini-flash-latest (works when gemini-2.0-flash hits free-tier quota 0).
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();
const GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest";

const MAX_ITEMS_PER_ARRAY = 6;
/** Cap AI summary length (2–3 sentences; UTF-8 safe) */
const MAX_DESCRIPTION_CHARS = 900;

/**
 * Primary prompt for employer-uploaded job posts (Gemini). {{JOB_DESCRIPTION}} replaced at runtime.
 * @param {string} jobDescription
 * @param {boolean} strictRetry — second attempt: harder JSON-only tail
 */
function buildPrompt(jobDescription, strictRetry) {
  const base = `You are an expert AI job description parser.

Your task is to extract structured, high-quality information from a job description.

Return ONLY valid JSON in this exact format:

{
  "description": "...",
  "responsibilities": ["..."],
  "qualifications": ["..."]
}

STRICT RULES:

- Output MUST be valid JSON only
- Do NOT include markdown, explanations, or extra text
- Keep the SAME language as the input (do NOT translate)
- Do NOT invent or assume missing information
- If information is missing, return an empty array []

----------------------------------------

DESCRIPTION RULES:

- Write a short summary (2–3 sentences max)
- Focus on:
  - what the company does
  - what the role is about
  - work environment or mission (if relevant)
- Ignore marketing fluff and repetitive HR text

----------------------------------------

RESPONSIBILITIES RULES:

- Extract ONLY actual job tasks (what the person WILL DO)
- Ignore:
  - company values
  - generic HR phrases
  - benefits
  - slogans
- If responsibilities are not clearly listed, infer ONLY from real job-related content (do NOT guess)
- Max 6 items
- Each item:
  - short (max 8–10 words)
  - action-oriented (start with a verb)
  - clear and specific
- Remove duplicates and low-value items

----------------------------------------

QUALIFICATIONS RULES:

- Extract:
  - required skills
  - experience
  - education
  - tools/technologies
  - languages
  - important soft skills (only if meaningful)
- Ignore:
  - generic traits like "team player" unless strongly relevant
- Max 6 items
- Each item:
  - short (max 8–10 words)
  - precise and relevant
- Remove duplicates

----------------------------------------

FILTERING RULES (VERY IMPORTANT):

Exclude:
- company culture text
- marketing content
- benefits (insurance, salary, perks)
- hashtags and slogans
- repeated sentences
- legal or policy-related text unless directly job-relevant

----------------------------------------

LANGUAGE (English and Georgian / ქართული):

- Input may be English, Georgian, or mixed; keep "description" and all list items in the same language(s) as the source (no translation between languages unless the posting duplicates the same point in both).
- Use correct Georgian script where the source is Georgian; natural professional English where the source is English.
- UTF-8 / Unicode must be valid in JSON strings.

----------------------------------------

EXAMPLES:

Input:
"We are looking for a backend developer to build APIs..."

Output:
{
  "description": "The company is hiring a backend developer to build and maintain scalable APIs and backend systems.",
  "responsibilities": [
    "Develop and maintain backend services",
    "Design RESTful APIs",
    "Optimize system performance"
  ],
  "qualifications": [
    "3+ years backend development experience",
    "Strong knowledge of Node.js",
    "Experience with databases"
  ]
}

----------------------------------------

FINAL INSTRUCTION:

- Prioritize accuracy over completeness
- Keep output clean, short, and structured
- If output is not valid JSON, regenerate correctly

----------------------------------------

Job description:
${jobDescription}`;

  if (!strictRetry) return base;

  return `${base}

CRITICAL: Output one raw JSON object only. Keys must be exactly "description" (string), "responsibilities" (array of strings), "qualifications" (array of strings). No markdown fences, no backticks, no text before or after the JSON.`;
}

/**
 * Strip accidental ```json fences from model output.
 * @param {string} text
 */
function stripMarkdownFences(text) {
  let t = String(text).trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  return t.trim();
}

/**
 * Coerce unknown input to a cleaned string list: trim, drop empties, dedupe, cap length.
 * @param {unknown} value
 * @returns {string[]}
 */
function sanitizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const item of value) {
    const s =
      typeof item === "string"
        ? item.trim()
        : String(item ?? "").trim();
    if (!s) continue;
    const dedupeKey = s.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push(s);
    if (out.length >= MAX_ITEMS_PER_ARRAY) break;
  }
  return out;
}

/**
 * Short summary string: collapse whitespace, cap length (2–3 sentences).
 * @param {unknown} value
 */
function sanitizeDescriptionSummary(value) {
  if (value == null) return "";
  const s = typeof value === "string" ? value.trim() : String(value).trim();
  if (!s) return "";
  const collapsed = s.replace(/\s+/g, " ");
  if (collapsed.length <= MAX_DESCRIPTION_CHARS) return collapsed;
  return collapsed.slice(0, MAX_DESCRIPTION_CHARS - 1).trimEnd() + "…";
}

/**
 * @param {unknown} parsed
 * @returns {{ description: string, responsibilities: string[], qualifications: string[] }}
 */
function normalizeGeminiPayload(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Gemini JSON root must be an object");
  }
  const o = /** @type {Record<string, unknown>} */ (parsed);
  return {
    description: sanitizeDescriptionSummary(o.description),
    responsibilities: sanitizeStringArray(o.responsibilities),
    qualifications: sanitizeStringArray(o.qualifications),
  };
}

/**
 * @param {string} text
 */
function parseJsonLoose(text) {
  const stripped = stripMarkdownFences(text);
  return JSON.parse(stripped);
}

/**
 * Single Gemini generateContent call.
 * @param {string} prompt
 */
async function callGeminiGenerateJson(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      GEMINI_MODEL,
    )}:generateContent`,
  );
  url.searchParams.set("key", GEMINI_API_KEY);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.15,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      (data && data.error && data.error.message) || res.statusText || "error";
    throw new Error(`Gemini API ${res.status}: ${msg}`);
  }

  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;
  if (!text || typeof text !== "string") {
    const reason = candidate?.finishReason || "unknown";
    throw new Error(`Gemini: no text in response (finishReason=${reason})`);
  }

  return text;
}

/**
 * Run extraction: up to two Gemini calls (retry with stricter JSON-only prompt).
 * Never throws — failures return { ok: false }.
 *
 * @param {string} rawJobDescription — user-submitted description only (no server-only suffixes).
 * @returns {Promise<{ ok: true, description: string, responsibilities: string[], qualifications: string[] } | { ok: false }>}
 */
export async function extractJobSectionsFromDescription(rawJobDescription) {
  const trimmed = String(rawJobDescription ?? "").trim();
  if (!trimmed) {
    return { ok: false };
  }
  if (!GEMINI_API_KEY) {
    return { ok: false };
  }

  const run = async (strictRetry) => {
    const prompt = buildPrompt(trimmed, strictRetry);
    const text = await callGeminiGenerateJson(prompt);
    return normalizeGeminiPayload(parseJsonLoose(text));
  };

  try {
    const result = await run(false);
    return { ok: true, ...result };
  } catch (firstErr) {
    console.warn(
      "[geminiJobParser] first attempt failed:",
      firstErr instanceof Error ? firstErr.message : firstErr,
    );
    try {
      const result = await run(true);
      return { ok: true, ...result };
    } catch (secondErr) {
      console.warn(
        "[geminiJobParser] retry failed:",
        secondErr instanceof Error ? secondErr.message : secondErr,
      );
      return { ok: false };
    }
  }
}
