/**
 * Employer join requests (pending admin approval) via BFF.
 */

import { TokenManager } from "@/api/auth/tokenManager";
import {
  assertEmployerJobsProxyConfigured,
  getEmployerJobsApiBaseUrl,
} from "@/api/employer/employerJobsApiBase";

export const EMPLOYER_JOIN_REQUEST_NOTIFICATION_KIND = "employer_join_request";

export type EmployerJoinRequest = {
  id: string;
  company_id: number;
  company_name: string;
  requester_user_id: string;
  requester_email: string;
  requester_name: string;
  requester_surname: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type JoinRequestNotificationPayload = {
  kind: typeof EMPLOYER_JOIN_REQUEST_NOTIFICATION_KIND;
  join_request_id: string;
  company_id: number;
  company_name: string;
  requester_user_id: string;
  requester_name?: string;
  requester_surname?: string;
  requester_email?: string;
};

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

export function parseJoinRequestNotification(
  message: string,
): JoinRequestNotificationPayload | null {
  try {
    const o = JSON.parse(message) as JoinRequestNotificationPayload;
    if (o?.kind === EMPLOYER_JOIN_REQUEST_NOTIFICATION_KIND && o.join_request_id) {
      return o;
    }
  } catch {
    /* not JSON */
  }
  return null;
}

export async function createEmployerJoinRequest(params: {
  companyId: number;
  companyName: string;
}): Promise<EmployerJoinRequest> {
  assertEmployerJobsProxyConfigured("POST");
  const res = await fetch(
    new URL("/api/employer/join-requests", `${bffOrigin()}/`).toString(),
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        company_id: params.companyId,
        company_name: params.companyName,
      }),
    },
  );
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      (typeof body.detail === "string" && body.detail) ||
        "Could not submit join request.",
    );
  }
  return body as unknown as EmployerJoinRequest;
}

export async function fetchMyPendingEmployerJoinRequest(): Promise<EmployerJoinRequest | null> {
  assertEmployerJobsProxyConfigured("GET");
  const res = await fetch(
    new URL("/api/employer/join-requests/me", `${bffOrigin()}/`).toString(),
    { headers: authHeaders() },
  );
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error("Could not load join request status.");
  }
  if (!body || typeof body !== "object") return null;
  return body as EmployerJoinRequest;
}

export async function fetchEmployerJoinRequestInbox(): Promise<
  EmployerJoinRequest[]
> {
  assertEmployerJobsProxyConfigured("GET");
  const res = await fetch(
    new URL("/api/employer/join-requests/inbox", `${bffOrigin()}/`).toString(),
    { headers: authHeaders() },
  );
  const body = await res.json().catch(() => []);
  if (!res.ok) {
    throw new Error("Could not load join requests.");
  }
  return Array.isArray(body) ? (body as EmployerJoinRequest[]) : [];
}

export async function approveEmployerJoinRequest(
  requestId: string,
): Promise<void> {
  assertEmployerJobsProxyConfigured("POST");
  const res = await fetch(
    new URL(
      `/api/employer/join-requests/${encodeURIComponent(requestId)}/approve`,
      `${bffOrigin()}/`,
    ).toString(),
    { method: "POST", headers: authHeaders() },
  );
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      (typeof body.detail === "string" && body.detail) ||
        "Could not approve join request.",
    );
  }
}

export async function rejectEmployerJoinRequest(
  requestId: string,
): Promise<void> {
  assertEmployerJobsProxyConfigured("POST");
  const res = await fetch(
    new URL(
      `/api/employer/join-requests/${encodeURIComponent(requestId)}/reject`,
      `${bffOrigin()}/`,
    ).toString(),
    { method: "POST", headers: authHeaders() },
  );
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      (typeof body.detail === "string" && body.detail) ||
        "Could not reject join request.",
    );
  }
}
