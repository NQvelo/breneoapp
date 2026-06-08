/**
 * When Gemini (or the employer form) yields identical responsibilities and
 * qualifications, keep only the short description summary for display/storage.
 */

/**
 * @param {unknown} value
 * @returns {string[]}
 */
export function coerceJobSectionList(value) {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return [];
    return t
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * @param {string[] | string | undefined | null} value
 */
function sectionCompareKey(value) {
  const items = coerceJobSectionList(value);
  if (items.length === 0) return "";
  return items
    .map((item) => item.toLowerCase().replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .sort()
    .join("\n");
}

/**
 * @param {string | undefined | null} value
 */
function textCompareKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {{
 *   description?: string;
 *   responsibilities?: string[] | string;
 *   qualifications?: string[] | string;
 * }} input
 * @returns {{
 *   description: string;
 *   responsibilities: string[];
 *   qualifications: string[];
 *   useDescriptionOnly: boolean;
 * }}
 */
export function resolveJobSectionsAfterAi(input) {
  const description = String(input.description ?? "").trim();
  const responsibilities = coerceJobSectionList(input.responsibilities);
  const qualifications = coerceJobSectionList(input.qualifications);

  const respKey = sectionCompareKey(responsibilities);
  const qualKey = sectionCompareKey(qualifications);

  const listDuplicate = Boolean(respKey && qualKey && respKey === qualKey);
  const respMatchesDescription = Boolean(
    respKey && textCompareKey(description) === respKey,
  );
  const qualMatchesDescription = Boolean(
    qualKey && textCompareKey(description) === qualKey,
  );
  const useDescriptionOnly =
    listDuplicate || (respMatchesDescription && qualMatchesDescription);

  if (useDescriptionOnly) {
    return {
      description,
      responsibilities: [],
      qualifications: [],
      useDescriptionOnly: true,
    };
  }

  return {
    description,
    responsibilities,
    qualifications,
    useDescriptionOnly: false,
  };
}
