/**
 * Employer onboarding / company access state (aggregator membership + join requests).
 */

import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { fetchEmployerAggregatorCompanies } from "@/api/employer/aggregatorBffApi";
import {
  extractBreneoUserIdFromEmployerProfileRaw,
  normalizeEmployerProfile,
} from "@/api/employer/profile";
import { fetchMyPendingEmployerJoinRequest } from "@/api/employer/employerJoinRequests";

export const PLACEHOLDER_EMPLOYER_COMPANY_NAME = "Pending company setup";

export type EmployerAccessState =
  | "active"
  | "pending_approval"
  | "needs_company";

export type EmployerAccessSnapshot = {
  state: EmployerAccessState;
  companyName: string;
  pendingRequest: Awaited<
    ReturnType<typeof fetchMyPendingEmployerJoinRequest>
  > | null;
};

export function isPlaceholderEmployerCompanyName(name: string | undefined): boolean {
  const n = (name || "").trim().toLowerCase();
  return !n || n === PLACEHOLDER_EMPLOYER_COMPANY_NAME.toLowerCase();
}

/**
 * Resolve whether the employer can use the dashboard or must join / wait for approval.
 */
export async function resolveEmployerAccess(
  breneoUserId: string,
  profileEmail?: string,
): Promise<EmployerAccessSnapshot> {
  const uid = breneoUserId.trim();
  if (!uid) {
    return { state: "needs_company", companyName: "", pendingRequest: null };
  }

  let profileCompanyName = "";
  try {
    const prof = await apiClient.get(API_ENDPOINTS.EMPLOYER.PROFILE);
    const n = normalizeEmployerProfile(prof.data, profileEmail);
    profileCompanyName = n?.company_name?.trim() || "";
  } catch {
    /* continue */
  }

  try {
    const companies = await fetchEmployerAggregatorCompanies(uid);
    if (companies.length > 0) {
      const name =
        companies[0]?.name != null ? String(companies[0].name).trim() : "";
      return {
        state: "active",
        companyName: name || profileCompanyName,
        pendingRequest: null,
      };
    }
  } catch {
    /* continue */
  }

  try {
    const pending = await fetchMyPendingEmployerJoinRequest();
    if (pending?.status === "pending") {
      return {
        state: "pending_approval",
        companyName: pending.company_name || profileCompanyName,
        pendingRequest: pending,
      };
    }
  } catch {
    /* continue */
  }

  return {
    state: "needs_company",
    companyName: profileCompanyName,
    pendingRequest: null,
  };
}

export async function resolveEmployerAccessFromSession(
  profileRaw?: unknown,
  profileEmail?: string,
): Promise<EmployerAccessSnapshot> {
  const uid =
    (profileRaw
      ? extractBreneoUserIdFromEmployerProfileRaw(profileRaw)
      : null) || "";
  return resolveEmployerAccess(uid, profileEmail);
}
