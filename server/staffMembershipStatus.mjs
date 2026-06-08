/**
 * Shared staff-membership status helpers (job aggregator).
 */

export function normalizeStaffMembershipStatus(raw) {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (s === "panding" || s === "pending") return "pending";
  if (s === "admin") return "admin";
  if (s === "member") return "member";
  return "";
}

export function membershipStatusFromRow(row) {
  if (!row || typeof row !== "object") return "member";
  const fromStatus = normalizeStaffMembershipStatus(row.status);
  if (fromStatus) return fromStatus;
  if (Boolean(row.is_admin)) return "admin";
  return "member";
}

export function isActiveMembershipRow(row) {
  const status = membershipStatusFromRow(row);
  return status === "member" || status === "admin";
}

export function isPendingMembershipRow(row) {
  return membershipStatusFromRow(row) === "pending";
}

/**
 * @param {unknown[]} memberships
 * @param {string} userId
 */
export function adminCompanyIdsFromMemberships(memberships, userId) {
  const uid = String(userId).trim();
  const ids = new Set();
  for (const row of memberships) {
    if (!row || typeof row !== "object") continue;
    const r = row;
    const memberUserId = String(r.external_user_id ?? "").trim();
    const companyId = Number(r.company_id);
    if (
      memberUserId &&
      memberUserId === uid &&
      membershipStatusFromRow(r) === "admin" &&
      Number.isFinite(companyId)
    ) {
      ids.add(companyId);
    }
  }
  return Array.from(ids);
}
