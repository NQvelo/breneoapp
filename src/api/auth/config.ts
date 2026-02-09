/**
 * API base URL for the main Breneo backend (auth, profile, educations, etc.).
 * Use VITE_API_BASE_URL in .env for local/production override.
 * Default: Railway deployment (no trailing slash).
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://web-production-80ed8.up.railway.app";
