/**
 * Keyword-based skill extraction when Gemini returns no skills.
 * Mirrors a subset of src/utils/jobMatchUtils.ts skillKeywords.
 */

const SKILL_KEYWORDS = {
  javascript: ["javascript", "js", "es6", "typescript", "ts"],
  react: ["react", "reactjs", "react.js", "next.js", "nextjs"],
  python: ["python", "django", "flask", "fastapi"],
  java: ["java", "spring", "spring boot"],
  node: ["node", "nodejs", "node.js", "express"],
  sql: ["sql", "mysql", "postgresql", "postgres", "database"],
  aws: ["aws", "amazon web services", "cloud"],
  docker: ["docker", "kubernetes", "k8s", "container"],
  git: ["git", "github", "gitlab"],
  figma: ["figma", "sketch", "ui design", "ux design"],
  sales: ["sales", "crm", "negotiation"],
  marketing: ["marketing", "seo", "content marketing", "digital marketing"],
};

const MAX_SKILLS = 12;

/**
 * @param {string} text
 * @returns {string[]}
 */
export function extractSkillsFromTextFallback(text) {
  const haystack = String(text ?? "").toLowerCase();
  if (!haystack.trim()) return [];

  const found = [];
  const seen = new Set();

  for (const [skill, keywords] of Object.entries(SKILL_KEYWORDS)) {
    if (keywords.some((kw) => haystack.includes(kw.toLowerCase()))) {
      const key = skill.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        found.push(skill);
      }
    }
    if (found.length >= MAX_SKILLS) break;
  }

  return found;
}
