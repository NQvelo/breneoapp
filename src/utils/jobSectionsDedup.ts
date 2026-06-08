/**
 * When AI summarisation yields identical responsibilities and qualifications,
 * show only the API `description` field (short summary).
 */

export type JobSectionsInput = {
  description?: string | null;
  responsibilities?: string[] | string | null;
  qualifications?: string[] | string | null;
};

export type ResolvedJobSections = {
  description: string;
  responsibilities: string[];
  qualifications: string[];
  /** True when responsibilities and qualifications are duplicate — use description only. */
  useDescriptionOnly: boolean;
};

export function coerceJobSectionList(
  value: string[] | string | null | undefined,
): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }
  const t = value.trim();
  if (!t) return [];
  return t
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);
}

function sectionCompareKey(value: string[] | string | null | undefined): string {
  const items = coerceJobSectionList(value);
  if (items.length === 0) return "";
  return items
    .map((item) => item.toLowerCase().replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .sort()
    .join("\n");
}

function textCompareKey(value: string | null | undefined): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveJobSectionsAfterAi(
  input: JobSectionsInput,
): ResolvedJobSections {
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

/** Join list items for textarea / prose display. */
export function formatJobSectionList(items: string[]): string {
  return items.join("\n");
}

/** True when AI produced separate responsibilities and qualifications to show as lists. */
export function hasDistinctStructuredSections(
  resolved: Pick<
    ResolvedJobSections,
    "useDescriptionOnly" | "responsibilities" | "qualifications"
  >,
): boolean {
  return (
    !resolved.useDescriptionOnly &&
    resolved.responsibilities.length > 0 &&
    resolved.qualifications.length > 0
  );
}
