import {
  fetchEmployerStaffMemberships,
} from "@/api/employer/aggregatorBffApi";
import {
  fetchEmployerAccessState,
  type EmployerAccessState,
  type EmployerJoinRequest,
} from "@/api/employer/employerJoinRequests";
import { resolveEmployerStaffUserId } from "@/api/employer/profile";
import {
  isStaffMembershipActive,
  isStaffMembershipPending,
  type CompanyStaffMembership,
} from "@/api/employer/staffMembership";
import { TokenManager } from "@/api/auth/tokenManager";

export const EMPLOYER_ACTIVE_LANDING_PATH = "/employer/jobs";
export const EMPLOYER_ACCESS_POLL_MS = 3000;

export async function fetchCurrentUserStaffMemberships(): Promise<
  CompanyStaffMembership[]
> {
  const staffUserId = resolveEmployerStaffUserId({
    accessToken: TokenManager.getAccessToken(),
  });
  if (!staffUserId) return [];
  try {
    return await fetchEmployerStaffMemberships({
      externalUserId: staffUserId,
    });
  } catch {
    return [];
  }
}

function membershipsForCurrentUser(
  memberships: CompanyStaffMembership[],
  staffUserId: string,
): CompanyStaffMembership[] {
  if (!staffUserId) return memberships;
  return memberships.filter((m) => m.external_user_id === staffUserId);
}

function pendingRequestFromMembership(
  m: CompanyStaffMembership,
): EmployerJoinRequest {
  return {
    id: String(m.id),
    company_id: m.company_id,
    company_name: `Company ${m.company_id}`,
    requester_user_id: m.external_user_id,
    requester_email: m.external_user_email || m.user_email,
    requester_name: m.external_user_name || m.user_name,
    requester_surname: m.external_user_surname || m.user_surname,
    status: "pending",
    created_at: m.created_at || new Date().toISOString(),
  };
}

function accessFromStaffMemberships(
  memberships: CompanyStaffMembership[],
  staffUserId: string,
): EmployerAccessState | null {
  const mine = membershipsForCurrentUser(memberships, staffUserId);
  const active = mine.find((m) => isStaffMembershipActive(m));
  if (active) return { state: "active", membership: active };

  const pending = mine.find((m) => isStaffMembershipPending(m));
  if (pending) {
    return { state: "pending", request: pendingRequestFromMembership(pending) };
  }
  return null;
}

/**
 * Resolves employer dashboard access. Staff memberships (aggregator) are checked
 * first so pending→member transitions are detected without waiting on BFF lag.
 */
export async function resolveEmployerDashboardAccess(): Promise<EmployerAccessState> {
  const staffUserId = resolveEmployerStaffUserId({
    accessToken: TokenManager.getAccessToken(),
  });
  const memberships = await fetchCurrentUserStaffMemberships();
  const fromStaff = accessFromStaffMemberships(memberships, staffUserId);
  if (fromStaff?.state === "active") return fromStaff;

  if (fromStaff?.state === "pending") {
    try {
      const bff = await fetchEmployerAccessState();
      if (bff.state === "active") return bff;
      if (bff.state === "pending" && bff.request) return bff;
    } catch {
      /* use staff-derived pending */
    }
    return fromStaff;
  }

  try {
    const bff = await fetchEmployerAccessState();
    if (bff.state === "needs_company") {
      const retry = await fetchCurrentUserStaffMemberships();
      const retryAccess = accessFromStaffMemberships(retry, staffUserId);
      if (retryAccess) return retryAccess;
    }
    return bff;
  } catch {
    const retryAccess = accessFromStaffMemberships(
      await fetchCurrentUserStaffMemberships(),
      staffUserId,
    );
    if (retryAccess) return retryAccess;
    return { state: "needs_company", request: null };
  }
}
