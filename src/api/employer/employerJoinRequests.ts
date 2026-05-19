/**
 * Employer company join requests (BFF → Supabase + staff-memberships on approve).
 */

import { TokenManager } from "@/api/auth/tokenManager";
import {
  assertEmployerJobsProxyConfigured,
  getEmployerJobsApiBaseUrl,
} from "@/api/employer/employerJobsApiBase";
import { extractAggregatorErrorMessage } from "@/api/employer/aggregatorHttpErrors";

export type EmployerJoinRequestStatus = "pending" | "approved" | "rejected";

export type EmployerJoinRequest = {
  id: string;
  company_id: number;
  company_name: string;
  requester_user_id: string;
  requester_email: string;
  requester_name: string;
  requester_surname: string;
  status: EmployerJoinRequestStatus;
  reviewed_by_user_id?: string | null;
  created_at: string;
  updated_at?: string;
};

export type EmployerAccessState =
  | { state: "active"; membership?: unknown; request?: EmployerJoinRequest | null }
  | { state: "pending"; request: EmployerJoinRequest }
  | { state: "needs_company"; request?: EmployerJoinRequest | null };

function bffOrigin(): string {
  return getEmployerJobsApiBaseUrl().replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const token = TokenManager.getAccessToken();
  if (!token) throw new Error("Not authenticated");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

export async function fetchEmployerAccessState(): Promise<EmployerAccessState> {
  assertEmployerJobsProxyConfigured("GET");
  const res = await fetch(`${bffOrigin()}/api/employer/access-state`, {
    headers: authHeaders(),
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      extractAggregatorErrorMessage(body, "Could not load employer access state."),
    );
  }
  return body as unknown as EmployerAccessState;
}

export async function fetchMyEmployerJoinRequest(): Promise<EmployerJoinRequest | null> {
  assertEmployerJobsProxyConfigured("GET");
  const res = await fetch(`${bffOrigin()}/api/employer/join-requests/me`, {
    headers: authHeaders(),
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      extractAggregatorErrorMessage(body, "Could not load your join request."),
    );
  }
  const req = body.request;
  if (!req || typeof req !== "object") return null;
  return req as EmployerJoinRequest;
}

export async function fetchEmployerJoinRequestInbox(): Promise<
  EmployerJoinRequest[]
> {
  assertEmployerJobsProxyConfigured("GET");
  const res = await fetch(`${bffOrigin()}/api/employer/join-requests/inbox`, {
    headers: authHeaders(),
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      extractAggregatorErrorMessage(body, "Could not load join requests."),
    );
  }
  const list = body.requests;
  return Array.isArray(list) ? (list as EmployerJoinRequest[]) : [];
}

export async function createEmployerJoinRequest(params: {
  companyId: number | string;
  companyName: string;
}): Promise<EmployerJoinRequest> {
  assertEmployerJobsProxyConfigured("POST");
  const company_id = Number(params.companyId);
  if (!Number.isFinite(company_id)) {
    throw new Error("companyId must be numeric.");
  }
  const res = await fetch(`${bffOrigin()}/api/employer/join-requests`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      company_id,
      company_name: params.companyName.trim(),
    }),
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      extractAggregatorErrorMessage(body, "Could not submit join request."),
    );
  }
  const req = body.request;
  if (!req || typeof req !== "object") {
    throw new Error("Invalid join request response.");
  }
  return req as EmployerJoinRequest;
}

export async function approveEmployerJoinRequest(
  requestId: string,
): Promise<void> {
  assertEmployerJobsProxyConfigured("POST");
  const id = requestId.trim();
  if (!id) throw new Error("request id is required");
  const res = await fetch(
    `${bffOrigin()}/api/employer/join-requests/${encodeURIComponent(id)}/approve`,
    {
      method: "POST",
      headers: authHeaders(),
    },
  );
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      extractAggregatorErrorMessage(body, "Could not approve join request."),
    );
  }
}

export function joinRequestDisplayName(r: EmployerJoinRequest): string {
  const name = [r.requester_name, r.requester_surname]
    .map((x) => x?.trim())
    .filter(Boolean)
    .join(" ");
  return name || r.requester_email || r.requester_user_id;
}
