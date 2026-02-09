/**
 * Normalize academy profile API response to frontend shape.
 * API returns: name, email, website, profile_image, social_links, ...
 * Frontend expects: academy_name, contact_email, website_url, logo_url, ...
 */

export interface AcademyProfileApiRaw {
  id?: number | string;
  name?: string;
  academy_name?: string;
  email?: string;
  contact_email?: string;
  phone_number?: string;
  description?: string;
  website?: string;
  website_url?: string;
  is_verified?: boolean;
  created_at?: string;
  profile_image?: string | null;
  logo_url?: string | null;
  profile_photo_url?: string | null;
  first_name?: string;
  firstName?: string;
  academy_id?: string | number;
  social_links?: {
    id?: number;
    github?: string | null;
    linkedin?: string | null;
    facebook?: string | null;
    instagram?: string | null;
    dribbble?: string | null;
    behance?: string | null;
    user?: number | null;
    academy?: number;
  };
  saved_courses?: unknown[];
  saved_jobs?: unknown[];
}

export interface AcademyProfileNormalized {
  id: string;
  academy_name: string;
  description: string;
  website_url: string;
  contact_email: string;
  logo_url: string | null;
  is_verified?: boolean;
  first_name?: string;
}

export interface SocialLinksFromApi {
  github: string;
  linkedin: string;
  facebook: string;
  instagram: string;
  dribbble: string;
  behance: string;
}

/**
 * Normalize raw academy profile API response to frontend shape.
 * Supports both API field names (name, website, email, profile_image) and legacy (academy_name, website_url, contact_email, logo_url).
 */
export function normalizeAcademyProfileApiResponse(
  data: AcademyProfileApiRaw,
  fallbackUserId?: string
): AcademyProfileNormalized {
  const id = data.id != null ? String(data.id) : (fallbackUserId ?? "");
  return {
    id,
    academy_name: data.name ?? data.academy_name ?? "",
    description: data.description ?? "",
    website_url: data.website ?? data.website_url ?? "",
    contact_email: data.email ?? data.contact_email ?? "",
    logo_url:
      data.profile_image ?? data.logo_url ?? data.profile_photo_url ?? null,
    is_verified: data.is_verified,
    first_name:
      data.first_name ?? data.firstName ?? data.name ?? data.academy_name,
  };
}

/**
 * Extract social links object for frontend state from API social_links.
 * Returns object with platform keys and string values (empty string if null).
 */
export function normalizeSocialLinksFromApi(
  social_links: AcademyProfileApiRaw["social_links"]
): SocialLinksFromApi {
  if (!social_links || typeof social_links !== "object") {
    return {
      github: "",
      linkedin: "",
      facebook: "",
      instagram: "",
      dribbble: "",
      behance: "",
    };
  }
  return {
    github: social_links.github ?? "",
    linkedin: social_links.linkedin ?? "",
    facebook: social_links.facebook ?? "",
    instagram: social_links.instagram ?? "",
    dribbble: social_links.dribbble ?? "",
    behance: social_links.behance ?? "",
  };
}
