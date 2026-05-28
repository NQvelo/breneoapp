/**
 * Employer member invites — BFF (email via Resend, accept via token).
 */

import { TokenManager } from "@/api/auth/tokenManager";
import { getEmployerJobsApiBaseUrl } from "@/api/employer/employerJobsApiBase";

export type EmployerMemberInvite = {
  id: string;
  company_id: number;
  company_name: string;
  invitee_email: string;
  status: string;
  token?: string;
  created_at?: string;
  expires_at?: string;
};

export type MemberInvitePreview = {
  company_id: number;
  company_name: string;
  invitee_email: string;
  status: string;
  expired: boolean;
};

function bffUrl(path: string): string {
  const base = getEmployerJobsApiBaseUrl().replace(/\/$/, "");
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${base}${clean}`;
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

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessage(data: unknown, fallback: string): string {
  if (data instanceof Error && data.message) return data.message;
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (typeof o.detail === "string" && o.detail.trim()) return o.detail;
    if (Array.isArray(o.detail) && o.detail[0]) return String(o.detail[0]);
  }
  if (typeof data === "string" && data.trim()) return data;
  return fallback;
}

export async function createEmployerMemberInvite(params: {
  companyId: number;
  companyName: string;
  email: string;
}): Promise<{ invite: EmployerMemberInvite; email_sent: boolean }> {
  const res = await fetch(
    bffUrl(`/api/employer/companies/${params.companyId}/member-invites/`),
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        email: params.email.trim(),
        company_name: params.companyName.trim(),
      }),
    },
  );
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(errorMessage(data, "Could not send invite."));
  }
  const o = (data && typeof data === "object" ? data : {}) as Record<
    string,
    unknown
  >;
  return {
    invite: o.invite as EmployerMemberInvite,
    email_sent: Boolean(o.email_sent),
  };
}

function normalizePreview(data: unknown): MemberInvitePreview {
  const o = (data && typeof data === "object" ? data : {}) as Record<
    string,
    unknown
  >;
  return {
    company_id: Number(o.company_id) || 0,
    company_name: String(o.company_name ?? "Company"),
    invitee_email: String(o.invitee_email ?? "").trim().toLowerCase(),
    status: String(o.status ?? "pending"),
    expired: Boolean(o.expired),
  };
}

export async function fetchMemberInvitePreview(
  token: string,
): Promise<MemberInvitePreview> {
  const url = new URL(bffUrl("/api/employer/member-invites/preview/"));
  url.searchParams.set("token", token.trim());
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(errorMessage(data, "Could not load invite."));
  }
  return normalizePreview(data);
}

export async function acceptEmployerMemberInvite(
  token: string,
): Promise<{ company_id: number; company_name: string }> {
  const res = await fetch(bffUrl("/api/employer/member-invites/accept/"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ token: token.trim() }),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(errorMessage(data, "Could not accept invite."));
  }
  const o = (data && typeof data === "object" ? data : {}) as Record<
    string,
    unknown
  >;
  return {
    company_id: Number(o.company_id) || 0,
    company_name: String(o.company_name ?? ""),
  };
}
