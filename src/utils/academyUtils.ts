/**
 * Academy Utility Functions
 * 
 * Utility functions for working with academy data and slugs
 */

/**
 * Convert academy name to URL-friendly slug
 * Example: "Beta Academy" -> "beta_academy"
 * 
 * @param name - The academy name to convert
 * @returns URL-friendly slug
 */
export const createAcademySlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/[^a-z0-9_]/g, "") // Remove special characters except underscores
    .replace(/_+/g, "_") // Replace multiple underscores with single
    .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
};

/**
 * Convert slug back to a readable academy name
 * Example: "beta_academy" -> "Beta Academy"
 * 
 * @param slug - The slug to convert
 * @returns Readable academy name
 */
export const slugToAcademyName = (slug: string): string => {
  return slug
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

