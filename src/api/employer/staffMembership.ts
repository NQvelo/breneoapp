/**
 * Company staff membership types and helpers (job aggregator employer API).
 */

export interface CompanyStaffMembership {
  id: number;
  company_id: number;
  external_user_id: string;
  external_user_email: string;
  external_user_name: string;
  external_user_surname: string;
  user_id: string;
  user_email: string;
  user_name: string;
  user_surname: string;
  is_admin: boolean;
  created_at: string;
}

/** @deprecated Use CompanyStaffMembership */
export type AggregatorStaffMembership = CompanyStaffMembership;

export function staffFirstName(m: CompanyStaffMembership): string {
  return (m.external_user_name || m.user_name || "").trim();
}

export function staffSurname(m: CompanyStaffMembership): string {
  return (m.external_user_surname || m.user_surname || "").trim();
}

export function staffDisplayName(m: CompanyStaffMembership): string {
  const name = staffFirstName(m);
  const surname = staffSurname(m);
  return [name, surname].filter(Boolean).join(" ") || m.external_user_id;
}

export function staffEmail(m: CompanyStaffMembership): string {
  return m.external_user_email || m.user_email || "";
}

export function isCurrentUserAdmin(
  memberships: CompanyStaffMembership[],
  userId: string,
): boolean {
  return memberships.some((m) => m.external_user_id === userId && m.is_admin);
}

export function countAdmins(memberships: CompanyStaffMembership[]): number {
  return memberships.filter((m) => m.is_admin).length;
}

/** Map aggregator 403 error bodies to user-facing toast copy. */
export function staffMembershipActionErrorMessage(
  status: number,
  body: Record<string, unknown>,
  fallback: string,
): string {
  const raw =
    (typeof body.error === "string" && body.error) ||
    (typeof body.detail === "string" && body.detail) ||
    "";
  const msg = raw.trim() || fallback;
  if (status !== 403) return msg;
  const lower = msg.toLowerCase();
  if (lower.includes("only") && lower.includes("admin")) {
    return "Only company admins can remove staff members.";
  }
  if (lower.includes("cannot remove themselves") || lower.includes("remove themselves")) {
    return "Admins cannot remove themselves. Transfer admin to another member first.";
  }
  if (lower.includes("only admin")) {
    return "Cannot remove the only admin for this company.";
  }
  return msg;
}

export function normalizeStaffMembership(raw: unknown): CompanyStaffMembership | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = Number(o.id);
  const company_id = Number(o.company_id);
  const external_user_id = String(o.external_user_id ?? o.user_id ?? "").trim();
  if (!Number.isFinite(id) || !Number.isFinite(company_id) || !external_user_id) {
    return null;
  }
  const external_user_email = String(
    o.external_user_email ?? o.user_email ?? "",
  ).trim();
  const external_user_name = String(
    o.external_user_name ?? o.user_name ?? "",
  ).trim();
  const external_user_surname = String(
    o.external_user_surname ?? o.user_surname ?? "",
  ).trim();
  return {
    id,
    company_id,
    external_user_id,
    external_user_email,
    external_user_name,
    external_user_surname,
    user_id: String(o.user_id ?? external_user_id).trim(),
    user_email: String(o.user_email ?? external_user_email).trim(),
    user_name: String(o.user_name ?? external_user_name).trim(),
    user_surname: String(o.user_surname ?? external_user_surname).trim(),
    is_admin: Boolean(o.is_admin),
    created_at: String(o.created_at ?? ""),
  };
}

export function unwrapStaffMemberships(data: unknown): CompanyStaffMembership[] {
  if (Array.isArray(data)) {
    return data
      .map((row) => normalizeStaffMembership(row))
      .filter((m): m is CompanyStaffMembership => m != null);
  }
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  for (const key of ["results", "staff_memberships", "data", "items"] as const) {
    const v = o[key];
    if (Array.isArray(v)) {
      return v
        .map((row) => normalizeStaffMembership(row))
        .filter((m): m is CompanyStaffMembership => m != null);
    }
  }
  const inner = o.data;
  if (inner && typeof inner === "object") {
    const d = inner as Record<string, unknown>;
    if (Array.isArray(d.results)) {
      return d.results
        .map((row) => normalizeStaffMembership(row))
        .filter((m): m is CompanyStaffMembership => m != null);
    }
    if (Array.isArray(d.data)) {
      return d.data
        .map((row) => normalizeStaffMembership(row))
        .filter((m): m is CompanyStaffMembership => m != null);
    }
  }
  return [];
}
