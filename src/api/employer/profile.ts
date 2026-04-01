/**
 * Normalize GET/PATCH /api/employer/profile/ responses (field names vary by backend).
 */

export type NormalizedEmployerProfile = {
  id: string;
  company_name: string;
  email: string;
  phone_number: string;
  website: string;
  description: string;
  logo_url: string | null;
  locations: string[];
  number_of_employees?: string;
  industry_ids: number[];
};

function readString(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

export function extractEmployerLogoUrl(data: Record<string, unknown>): string | null {
  const direct =
    data.logo_url ??
    data.logo ??
    data.company_logo ??
    data.profile_image ??
    data.image;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const user = data.user;
  if (user && typeof user === "object") {
    const u = user as Record<string, unknown>;
    const fromUser =
      u.profile_image ?? u.logo ?? u.logo_url ?? u.avatar;
    if (typeof fromUser === "string" && fromUser.trim()) return fromUser.trim();
  }
  return null;
}

export function normalizeEmployerProfile(
  data: unknown,
  fallbackEmail?: string,
): NormalizedEmployerProfile | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const companyName = readString(
    o.company_name ?? o.name ?? o.first_name,
  );
  const email = readString(o.email) || (fallbackEmail ?? "");
  const locs = o.locations;
  const locations = Array.isArray(locs)
    ? locs.map((x) => String(x)).filter(Boolean)
    : [];
  const industriesRaw = o.industries;
  const industry_ids: number[] = [];
  if (Array.isArray(industriesRaw)) {
    for (const item of industriesRaw) {
      if (typeof item === "number" && Number.isInteger(item)) {
        industry_ids.push(item);
      } else if (item && typeof item === "object" && "id" in item) {
        const id = (item as { id?: unknown }).id;
        if (typeof id === "number" && Number.isInteger(id)) industry_ids.push(id);
      }
    }
  }
  return {
    id: o.id != null ? String(o.id) : "",
    company_name: companyName,
    email,
    phone_number: readString(o.phone_number),
    website: readString(o.website),
    description: readString(o.description),
    logo_url: extractEmployerLogoUrl(o),
    locations,
    number_of_employees: readString(o.number_of_employees) || undefined,
    industry_ids,
  };
}
