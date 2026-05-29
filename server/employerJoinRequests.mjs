/**
 * Employer join requests — BFF (Supabase source of truth).
 */
import { createDjangoNotification } from "./djangoNotifications.mjs";
import { hasSupabaseServiceRole, supabaseRest } from "./supabaseAdmin.mjs";

function toArray(data) {
  return Array.isArray(data) ? data : [];
}

function sanitizeRequestRow(row) {
  if (!row || typeof row !== "object") return null;
  const r = row;
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
    status: String(r.status ?? "pending"),
    reviewed_by_user_id:
      r.reviewed_by_user_id != null ? String(r.reviewed_by_user_id) : null,
    created_at: String(r.created_at ?? new Date().toISOString()),
    updated_at: r.updated_at ? String(r.updated_at) : undefined,
  };
}

/**
 * @param {unknown[]} memberships
 * @param {string} userId
 */
function membershipStatusFromRow(row) {
  if (!row || typeof row !== "object") return "member";
  const r = row;
  const raw = String(r.status ?? "")
    .trim()
    .toLowerCase();
  if (raw === "panding" || raw === "pending") return "pending";
  if (raw === "admin") return "admin";
  if (raw === "member") return "member";
  if (Boolean(r.is_admin)) return "admin";
  return "member";
}

function isActiveMembershipRow(row) {
  const s = membershipStatusFromRow(row);
  return s === "member" || s === "admin";
}

function isPendingMembershipRow(row) {
  return membershipStatusFromRow(row) === "pending";
}

function joinRequestShapeFromMembership(row, companyName = "") {
  if (!row || typeof row !== "object") return null;
  const r = row;
  const id = r.id != null ? String(r.id) : "";
  if (!id) return null;
  const company_id = Number(r.company_id) || 0;
  return {
    id,
    company_id,
    company_name:
      companyName ||
      String(r.company_name ?? "").trim() ||
      (company_id ? `Company ${company_id}` : "Company"),
    requester_user_id: String(r.external_user_id ?? ""),
    requester_email: String(r.external_user_email ?? ""),
    requester_name: String(r.external_user_name ?? ""),
    requester_surname: String(r.external_user_surname ?? ""),
    status: "pending",
    created_at: String(r.created_at ?? new Date().toISOString()),
  };
}

function adminCompanyIdsFromMemberships(memberships, userId) {
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

/**
 * @param {import("express").Express} app
 * @param {{
 *  requireEmployerAuth: (req: import("express").Request, res: import("express").Response) => Promise<{ userId: string; email?: string; firstName?: string; lastName?: string } | null>;
 *  aggregatorStaffRoot: string;
 *  aggregatorKey: string;
 *  postStaffMembershipForUser: (companyIdRaw: string | number, userCtx: { userId: string; email?: string; firstName?: string; lastName?: string }) => Promise<{ ok: boolean; status: number; data: unknown }>;
 *  fetchStaffForCompany: (companyId: number) => Promise<unknown[]>;
 * }} deps
 */
export function registerEmployerJoinRequestRoutes(app, deps) {
  async function fetchMembershipsForUser(userId) {
    const url = new URL(deps.aggregatorStaffRoot.replace(/\/$/, ""));
    url.searchParams.set("external_user_id", String(userId));
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "X-Employer-Key": deps.aggregatorKey || "",
      },
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => []);
    return toArray(data);
  }

  async function resolveAdminCompanyIds(userId) {
    const memberships = await fetchMembershipsForUser(userId);
    return adminCompanyIdsFromMemberships(memberships, userId);
  }

  const handleAccessState = async (req, res) => {
    const auth = await deps.requireEmployerAuth(req, res);
    if (!auth) return;
    const memberships = await fetchMembershipsForUser(auth.userId);
    const active = memberships.filter(isActiveMembershipRow);
    if (active.length > 0) {
      return res.json({
        state: "active",
        membership: active[0],
      });
    }
    const pendingMembership = memberships.find(isPendingMembershipRow);
    if (pendingMembership) {
      const request = joinRequestShapeFromMembership(pendingMembership);
      if (request) {
        return res.json({ state: "pending", request, membership: pendingMembership });
      }
    }
    if (hasSupabaseServiceRole()) {
      const mine = await supabaseRest(
        `employer_join_requests?requester_user_id=eq.${encodeURIComponent(String(auth.userId))}&status=eq.pending&order=created_at.desc&limit=1`,
        { method: "GET" },
      );
      const request = sanitizeRequestRow(toArray(mine.data)[0]);
      if (request) return res.json({ state: "pending", request });
    }
    return res.json({ state: "needs_company", request: null });
  };
  app.get("/api/employer/access-state", handleAccessState);
  app.get("/api/employer/access-state/", handleAccessState);

  const handleMyRequest = async (req, res) => {
    const auth = await deps.requireEmployerAuth(req, res);
    if (!auth) return;
    const memberships = await fetchMembershipsForUser(auth.userId);
    const pendingMembership = memberships.find(isPendingMembershipRow);
    if (pendingMembership) {
      return res.json({
        request: joinRequestShapeFromMembership(pendingMembership),
      });
    }
    if (!hasSupabaseServiceRole()) {
      return res.json({ request: null });
    }
    const mine = await supabaseRest(
      `employer_join_requests?requester_user_id=eq.${encodeURIComponent(String(auth.userId))}&status=eq.pending&order=created_at.desc&limit=1`,
      { method: "GET" },
    );
    if (!mine.ok) return res.status(mine.status).json(mine.data || {});
    const request = sanitizeRequestRow(toArray(mine.data)[0]);
    return res.json({ request });
  };
  app.get("/api/employer/join-requests/me", handleMyRequest);
  app.get("/api/employer/join-requests/me/", handleMyRequest);

  const handleInbox = async (req, res) => {
    const auth = await deps.requireEmployerAuth(req, res);
    if (!auth) return;
    const companyIds = await resolveAdminCompanyIds(auth.userId);
    if (companyIds.length === 0) return res.json({ requests: [] });
    const list = await supabaseRest(
      `employer_join_requests?status=eq.pending&company_id=in.(${companyIds.join(",")})&order=created_at.desc`,
      { method: "GET" },
    );
    if (!list.ok) return res.status(list.status).json(list.data || {});
    return res.json({
      requests: toArray(list.data).map(sanitizeRequestRow).filter(Boolean),
    });
  };
  app.get("/api/employer/join-requests/inbox", handleInbox);
  app.get("/api/employer/join-requests/inbox/", handleInbox);

  const handleCreate = async (req, res) => {
    const auth = await deps.requireEmployerAuth(req, res);
    if (!auth) return;
    const companyId = Number(req.body?.company_id);
    const companyName = String(req.body?.company_name ?? "").trim();
    if (!Number.isFinite(companyId) || !companyName) {
      return res.status(400).json({ detail: "company_id and company_name are required." });
    }
    const insert = await supabaseRest("employer_join_requests", {
      method: "POST",
      body: JSON.stringify({
        company_id: companyId,
        company_name: companyName,
        requester_user_id: String(auth.userId),
        requester_email: auth.email ?? "",
        requester_name: auth.firstName ?? "",
        requester_surname: auth.lastName ?? "",
      }),
    });
    if (!insert.ok) return res.status(insert.status).json(insert.data || {});
    const request = sanitizeRequestRow(toArray(insert.data)[0]);
    if (request) {
      const staff = await deps.fetchStaffForCompany(companyId).catch(() => []);
      const adminIds = new Set();
      for (const row of toArray(staff)) {
        if (!row || typeof row !== "object" || !row.is_admin) continue;
        const adminId = String(row.external_user_id ?? "").trim();
        if (adminId) adminIds.add(adminId);
      }
      await Promise.all(
        Array.from(adminIds).map((adminId) =>
          createDjangoNotification({
            recipientId: adminId,
            title: "Company join request",
            message: `employer_join_request:${request.id}|${auth.firstName || "A user"} wants to join ${companyName}. Open Notifications to approve.`,
            type: "info",
            metadata: {
              kind: "employer_join_request",
              request_id: request.id,
              company_id: companyId,
            },
          }),
        ),
      );
    }
    return res.status(201).json({ request });
  };
  app.post("/api/employer/join-requests", handleCreate);
  app.post("/api/employer/join-requests/", handleCreate);

  const handleApprove = async (req, res) => {
    const auth = await deps.requireEmployerAuth(req, res);
    if (!auth) return;
    const requestId = String(req.params.requestId || "").trim();
    if (!requestId) return res.status(400).json({ detail: "request id is required." });
    const fetchReq = await supabaseRest(
      `employer_join_requests?id=eq.${encodeURIComponent(requestId)}&limit=1`,
      { method: "GET" },
    );
    if (!fetchReq.ok) return res.status(fetchReq.status).json(fetchReq.data || {});
    const request = sanitizeRequestRow(toArray(fetchReq.data)[0]);
    if (!request) return res.status(404).json({ detail: "Join request not found." });
    const adminCompanyIds = await resolveAdminCompanyIds(auth.userId);
    if (!adminCompanyIds.includes(request.company_id)) {
      return res.status(403).json({ detail: "Only company admins can approve this request." });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ detail: "Join request is not pending." });
    }
    const staff = await deps.fetchStaffForCompany(request.company_id).catch(() => []);
    const pendingRow = toArray(staff).find(
      (row) =>
        row &&
        typeof row === "object" &&
        String(row.external_user_id ?? "").trim() ===
          String(request.requester_user_id).trim() &&
        isPendingMembershipRow(row),
    );
    let membershipOk = false;
    if (pendingRow && pendingRow.id != null && deps.patchStaffMembershipStatus) {
      const patched = await deps.patchStaffMembershipStatus(
        pendingRow.id,
        auth.userId,
        "member",
      );
      membershipOk = patched.ok;
      if (!membershipOk) {
        return res.status(patched.status || 400).json(
          patched.data || { detail: "Could not approve pending team member." },
        );
      }
    } else {
      const membership = await deps.postStaffMembershipForUser(
        request.company_id,
        {
          userId: request.requester_user_id,
          email: request.requester_email,
          firstName: request.requester_name,
          lastName: request.requester_surname,
        },
        { status: "member" },
      );
      membershipOk = membership.ok;
      if (!membershipOk) {
        return res.status(membership.status || 400).json(
          membership.data || { detail: "Could not add requester to company members." },
        );
      }
    }
    const upd = await supabaseRest(`employer_join_requests?id=eq.${encodeURIComponent(request.id)}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "approved",
        reviewed_by_user_id: String(auth.userId),
        updated_at: new Date().toISOString(),
      }),
    });
    if (!upd.ok) return res.status(upd.status).json(upd.data || {});
    await createDjangoNotification({
      recipientId: request.requester_user_id,
      title: "Join request approved",
      message: `Your request to join ${request.company_name} was approved.`,
      type: "success",
      metadata: {
        kind: "employer_join_approved",
        request_id: request.id,
        company_id: request.company_id,
      },
    });
    return res.json({ ok: true });
  };
  app.post("/api/employer/join-requests/:requestId/approve", handleApprove);
  app.post("/api/employer/join-requests/:requestId/approve/", handleApprove);
}
