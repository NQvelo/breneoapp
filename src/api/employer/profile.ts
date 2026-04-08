/**
 * Normalize GET/PATCH /api/employer/profile/ responses (field names vary by backend).
 */

export type NormalizedEmployerProfile = {
  id: string;
  company_name: string;
  email: string;
  /** Account holder / contact person (from profile or nested `user`). */
  first_name: string;
  last_name: string;
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

/**
 * Main Breneo employer profile company id — job aggregator employer API uses
 * numeric primary key: `PATCH|POST …/api/employer/companies/{company_id}/` (not public `/api/companies/{name}`).
 */
export function extractBreneoCompanyIdFromEmployerProfileRaw(
  data: unknown,
): string {
  if (!data || typeof data !== "object") return "";
  const o = data as Record<string, unknown>;
  if (o.company_id != null && String(o.company_id).trim() !== "") {
    return String(o.company_id).trim();
  }
  const c = o.company;
  if (c && typeof c === "object" && !Array.isArray(c)) {
    const id = (c as Record<string, unknown>).id;
    if (id != null && String(id).trim() !== "") return String(id).trim();
  }
  return "";
}

/** Breneo user id for job-aggregator `staff_user_id` / `staff_user_ids`. */
export function extractBreneoUserIdFromEmployerProfileRaw(
  data: unknown,
): string | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const u = o.user;
  if (u != null && typeof u === "object" && !Array.isArray(u)) {
    const uo = u as Record<string, unknown>;
    const id = uo.id ?? uo.pk;
    if (id != null && String(id).trim() !== "") return String(id).trim();
  }
  if (typeof u === "number" || typeof u === "string") {
    const s = String(u).trim();
    if (s) return s;
  }
  for (const key of ["user_id", "owner_id", "account_id", "breneo_user_id"] as const) {
    const v = o[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  const account = o.account;
  if (account != null && typeof account === "object" && !Array.isArray(account)) {
    const aid = (account as Record<string, unknown>).id;
    if (aid != null && String(aid).trim() !== "") return String(aid).trim();
  }
  return null;
}

/** Fallback when employer profile JSON omits nested `user` (some backends only expose JWT claims). */
export function extractBreneoUserIdFromJwt(accessToken: string): string | null {
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1])) as Record<string, unknown>;
    const id = payload.user_id ?? payload.sub ?? payload.id;
    if (id != null && String(id).trim() !== "") return String(id).trim();
  } catch {
    return null;
  }
  return null;
}

/** Email for employer flows when `user.email` in auth context is empty but JWT/profile has it. */
export function extractBreneoEmailFromJwt(accessToken: string): string {
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) return "";
    const payload = JSON.parse(atob(parts[1])) as Record<string, unknown>;
    for (const key of ["email", "user_email", "username"] as const) {
      const v = payload[key];
      if (typeof v === "string" && v.includes("@") && v.trim()) {
        return v.trim().toLowerCase();
      }
    }
  } catch {
    return "";
  }
  return "";
}

export function extractEmailFromEmployerProfileRaw(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const o = data as Record<string, unknown>;
  const direct = readString(o.email) || readString(o.contact_email) || readString(o.company_email);
  if (direct) return direct.toLowerCase();
  const u = o.user;
  if (u != null && typeof u === "object" && !Array.isArray(u)) {
    const em = readString((u as Record<string, unknown>).email);
    if (em) return em.toLowerCase();
  }
  return "";
}

/** Person name fields on employer profile or nested `user` (Breneo API shapes vary). */
function extractPersonNamesFromEmployerProfileRaw(data: Record<string, unknown>): {
  first_name: string;
  last_name: string;
} {
  const fromObj = (o: Record<string, unknown>) => ({
    first_name:
      readString(o.first_name) ||
      readString(o.firstName) ||
      readString(o.given_name) ||
      readString(o.givenName),
    last_name:
      readString(o.last_name) ||
      readString(o.lastName) ||
      readString(o.family_name) ||
      readString(o.familyName),
  });
  let { first_name, last_name } = fromObj(data);
  if (!first_name && !last_name) {
    const u = data.user;
    if (u != null && typeof u === "object" && !Array.isArray(u)) {
      const inner = fromObj(u as Record<string, unknown>);
      first_name = inner.first_name;
      last_name = inner.last_name;
    }
  }
  return { first_name, last_name };
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
  let companyName = readString(o.company_name);
  if (!companyName && o.company && typeof o.company === "object" && !Array.isArray(o.company)) {
    companyName = readString((o.company as Record<string, unknown>).name);
  }
  if (!companyName) companyName = readString(o.name);
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
  const { first_name, last_name } = extractPersonNamesFromEmployerProfileRaw(o);
  return {
    id: o.id != null ? String(o.id) : "",
    company_name: companyName,
    email,
    first_name,
    last_name,
    phone_number: readString(o.phone_number),
    website: readString(o.website),
    description: readString(o.description),
    logo_url: extractEmployerLogoUrl(o),
    locations,
    number_of_employees: readString(o.number_of_employees) || undefined,
    industry_ids,
  };
}
