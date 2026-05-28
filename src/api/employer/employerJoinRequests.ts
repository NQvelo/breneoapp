/**
 * Employer company join requests — BFF API (not Django notifications API).
 */

import { TokenManager } from "@/api/auth/tokenManager";
import { getEmployerJobsApiBaseUrl } from "@/api/employer/employerJobsApiBase";

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

function resolveEmployerBffUrl(path: string): string {
  const base = getEmployerJobsApiBaseUrl().replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

function authHeaders(): HeadersInit {
  const token = TokenManager.getAccessToken();
  if (!token) throw new Error("Authentication required.");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (data instanceof Error && data.message) return data.message;
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (typeof o.detail === "string" && o.detail.trim()) return o.detail;
    if (Array.isArray(o.detail) && o.detail[0]) return String(o.detail[0]);
    const firstKey = Object.keys(o)[0];
    const firstVal = firstKey ? o[firstKey] : null;
    if (typeof firstVal === "string" && firstVal.trim()) return firstVal;
    if (Array.isArray(firstVal) && firstVal[0]) return String(firstVal[0]);
  }
  if (typeof data === "string" && data.trim()) return data;
  return fallback;
}

async function bffRequest<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(resolveEmployerBffUrl(path), {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.headers || {}),
    },
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(extractErrorMessage(data, "Employer request failed."));
  }
  return data as T;
}

function normalizeJoinRequest(row: unknown): EmployerJoinRequest | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = r.id != null ? String(r.id) : "";
  if (!id) return null;
  return {
    id,
    company_id: Number(r.company_id) || 0,
    company_name: String(r.company_name ?? ""),
    requester_user_id: String(r.requester_user_id ?? ""),
    requester_email: String(r.requester_email ?? ""),
    requester_name: String(r.requester_name ?? ""),
    requester_surname: String(r.requester_surname ?? ""),
    status:
      (String(r.status ?? "pending") as EmployerJoinRequestStatus) || "pending",
    reviewed_by_user_id:
      r.reviewed_by_user_id != null ? String(r.reviewed_by_user_id) : null,
    created_at: String(r.created_at ?? new Date().toISOString()),
    updated_at: r.updated_at ? String(r.updated_at) : undefined,
  };
}

function extractJoinRequestList(data: unknown): EmployerJoinRequest[] {
  if (Array.isArray(data)) {
    return data
      .map((row) => normalizeJoinRequest(row))
      .filter((r): r is EmployerJoinRequest => r != null);
  }
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const list = o.requests ?? o.results ?? o.data;
    if (Array.isArray(list)) {
      return list
        .map((row) => normalizeJoinRequest(row))
        .filter((r): r is EmployerJoinRequest => r != null);
    }
  }
  return [];
}

export async function fetchEmployerAccessState(): Promise<EmployerAccessState> {
  try {
    const data = await bffRequest<EmployerAccessState>(
      "/api/employer/access-state/",
      { method: "GET" },
    );
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load employer access state."));
  }
}

export async function fetchMyEmployerJoinRequest(): Promise<EmployerJoinRequest | null> {
  try {
    const body = await bffRequest<unknown>("/api/employer/join-requests/me/", {
      method: "GET",
    });
    if (body && typeof body === "object" && "request" in body) {
      return normalizeJoinRequest((body as { request: unknown }).request);
    }
    return normalizeJoinRequest(body);
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load your join request."));
  }
}

export async function fetchEmployerJoinRequestInbox(): Promise<
  EmployerJoinRequest[]
> {
  try {
    const body = await bffRequest<unknown>("/api/employer/join-requests/inbox/", {
      method: "GET",
    });
    return extractJoinRequestList(body);
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load join requests."));
  }
}

export async function createEmployerJoinRequest(params: {
  companyId: number | string;
  companyName: string;
}): Promise<EmployerJoinRequest> {
  const company_id = Number(params.companyId);
  if (!Number.isFinite(company_id)) {
    throw new Error("companyId must be numeric.");
  }
  try {
    const body = await bffRequest<unknown>("/api/employer/join-requests/", {
      method: "POST",
      body: JSON.stringify({
        company_id,
        company_name: params.companyName.trim(),
      }),
    });
    const row =
      body && typeof body === "object" && "request" in body
        ? (body as { request: unknown }).request
        : body;
    const normalized = normalizeJoinRequest(row);
    if (!normalized) throw new Error("Invalid join request response.");
    return normalized;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not submit join request."));
  }
}

export async function approveEmployerJoinRequest(
  requestId: string,
): Promise<void> {
  const id = requestId.trim();
  if (!id) throw new Error("request id is required");
  try {
    await bffRequest(`/api/employer/join-requests/${encodeURIComponent(id)}/approve/`, {
      method: "POST",
      body: "{}",
    });
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not approve join request."));
  }
}

export function joinRequestDisplayName(r: EmployerJoinRequest): string {
  const name = [r.requester_name, r.requester_surname]
    .map((x) => x?.trim())
    .filter(Boolean)
    .join(" ");
  return name || r.requester_email || r.requester_user_id;
}
