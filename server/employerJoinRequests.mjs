/**
 * Employer join requests + admin notifications (Supabase + aggregator staff-memberships).
 */
import { supabaseRest, hasSupabaseServiceRole } from "./supabaseAdmin.mjs";

const JOIN_NOTIF_PREFIX = "employer_join_request:";

/**
 * @param {import("express").Express} app
 * @param {{
 *   requireEmployerAuth: (req: import("express").Request, res: import("express").Response) => Promise<{ userId: string; email: string; firstName: string; lastName: string } | null>;
 *   aggregatorStaffRoot: string;
 *   aggregatorKey: string;
 *   postStaffMembershipForUser: (companyIdRaw: string | number, ctx: { userId: string; email?: string; firstName?: string; lastName?: string }) => Promise<{ ok: boolean; status: number; data: unknown }>;
 *   fetchStaffForCompany: (companyId: number) => Promise<Array<{ external_user_id: string; is_admin?: boolean }>>;
 * }} deps
 */
export function registerEmployerJoinRequestRoutes(app, deps) {
  const {
    requireEmployerAuth,
    postStaffMembershipForUser,
    fetchStaffForCompany,
  } = deps;

  app.get("/api/employer/access-state", handleAccessState);
  app.get("/api/employer/access-state/", handleAccessState);

  app.get("/api/employer/join-requests/me", handleJoinRequestMe);
  app.get("/api/employer/join-requests/me/", handleJoinRequestMe);

  app.get("/api/employer/join-requests/inbox", handleJoinRequestInbox);
  app.get("/api/employer/join-requests/inbox/", handleJoinRequestInbox);

  app.post("/api/employer/join-requests", handleJoinRequestCreate);
  app.post("/api/employer/join-requests/", handleJoinRequestCreate);

  app.post("/api/employer/join-requests/:requestId/approve", handleJoinRequestApprove);
  app.post(
    "/api/employer/join-requests/:requestId/approve/",
    handleJoinRequestApprove,
  );

  async function handleAccessState(req, res) {
    try {
      const ctx = await requireEmployerAuth(req, res);
      if (!ctx) return;
      const state = await resolveEmployerAccessState(ctx.userId);
      return res.status(200).json(state);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ detail: "Internal server error" });
    }
  }

  async function handleJoinRequestMe(req, res) {
    try {
      const ctx = await requireEmployerAuth(req, res);
      if (!ctx) return;
      if (!hasSupabaseServiceRole()) {
        return res.status(500).json({
          detail: "Join requests require SUPABASE_SERVICE_ROLE_KEY on the BFF.",
        });
      }
      const row = await getLatestJoinRequestForUser(ctx.userId);
      return res.status(200).json({ request: row });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ detail: "Internal server error" });
    }
  }

  async function handleJoinRequestInbox(req, res) {
    try {
      const ctx = await requireEmployerAuth(req, res);
      if (!ctx) return;
      if (!hasSupabaseServiceRole()) {
        return res.status(500).json({
          detail: "Join requests require SUPABASE_SERVICE_ROLE_KEY on the BFF.",
        });
      }
      const adminCompanyIds = await listAdminCompanyIdsForUser(ctx.userId);
      if (adminCompanyIds.length === 0) {
        return res.status(200).json({ requests: [] });
      }
      const companyFilter = adminCompanyIds.join(",");
      const pending = await supabaseRest(
        `employer_join_requests?status=eq.pending&company_id=in.(${companyFilter})&order=created_at.desc`,
        { method: "GET" },
      );
      if (!pending.ok) {
        return res
          .status(pending.status >= 400 ? pending.status : 502)
          .json(pending.data ?? { detail: "Could not load join requests." });
      }
      const requests = Array.isArray(pending.data) ? pending.data : [];
      return res.status(200).json({ requests });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ detail: "Internal server error" });
    }
  }

  async function handleJoinRequestCreate(req, res) {
    try {
      const ctx = await requireEmployerAuth(req, res);
      if (!ctx) return;
      if (!hasSupabaseServiceRole()) {
        return res.status(500).json({
          detail: "Join requests require SUPABASE_SERVICE_ROLE_KEY on the BFF.",
        });
      }
      const raw =
        req.body && typeof req.body === "object" && !Array.isArray(req.body)
          ? /** @type {Record<string, unknown>} */ (req.body)
          : {};
      const companyId = Number(raw.company_id ?? raw.companyId);
      const companyName = String(raw.company_name ?? raw.companyName ?? "").trim();
      if (!Number.isFinite(companyId) || companyId <= 0) {
        return res.status(400).json({ detail: "company_id is required" });
      }
      if (!companyName) {
        return res.status(400).json({ detail: "company_name is required" });
      }

      const access = await resolveEmployerAccessState(ctx.userId);
      if (access.state === "active") {
        return res.status(400).json({
          detail: "You are already a member of a company.",
        });
      }
      if (access.state === "pending" && access.request) {
        return res.status(200).json({ request: access.request });
      }

      const staff = await fetchStaffForCompany(companyId);
      const alreadyMember = staff.some(
        (m) => String(m.external_user_id) === String(ctx.userId),
      );
      if (alreadyMember) {
        return res.status(400).json({
          detail: "You are already a member of this company.",
        });
      }

      const insert = await supabaseRest("employer_join_requests", {
        method: "POST",
        body: JSON.stringify({
          company_id: companyId,
          company_name: companyName,
          requester_user_id: ctx.userId,
          requester_email: ctx.email ?? "",
          requester_name: ctx.firstName ?? "",
          requester_surname: ctx.lastName ?? "",
          status: "pending",
        }),
      });
      if (!insert.ok) {
        return res
          .status(insert.status >= 400 ? insert.status : 502)
          .json(insert.data ?? { detail: "Could not create join request." });
      }
      const row = Array.isArray(insert.data) ? insert.data[0] : insert.data;
      await notifyCompanyAdminsOfJoinRequest(row, ctx);
      return res.status(201).json({ request: row });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ detail: "Internal server error" });
    }
  }

  async function handleJoinRequestApprove(req, res) {
    try {
      const ctx = await requireEmployerAuth(req, res);
      if (!ctx) return;
      if (!hasSupabaseServiceRole()) {
        return res.status(500).json({
          detail: "Join requests require SUPABASE_SERVICE_ROLE_KEY on the BFF.",
        });
      }
      const requestId = String(req.params.requestId || "").trim();
      if (!requestId) {
        return res.status(400).json({ detail: "request id is required" });
      }

      const get = await supabaseRest(
        `employer_join_requests?id=eq.${encodeURIComponent(requestId)}&limit=1`,
        { method: "GET" },
      );
      if (!get.ok || !Array.isArray(get.data) || get.data.length === 0) {
        return res.status(404).json({ detail: "Join request not found." });
      }
      const row = /** @type {Record<string, unknown>} */ (get.data[0]);
      if (String(row.status) !== "pending") {
        return res.status(400).json({ detail: "Join request is no longer pending." });
      }

      const companyId = Number(row.company_id);
      const adminCompanyIds = await listAdminCompanyIdsForUser(ctx.userId);
      if (!adminCompanyIds.includes(companyId)) {
        return res.status(403).json({
          detail: "Only company admins can approve join requests.",
        });
      }

      const requesterId = String(row.requester_user_id ?? "");
      const link = await postStaffMembershipForUser(companyId, {
        userId: requesterId,
        email: String(row.requester_email ?? ""),
        firstName: String(row.requester_name ?? ""),
        lastName: String(row.requester_surname ?? ""),
      });
      if (!link.ok) {
        return res
          .status(link.status >= 400 ? link.status : 502)
          .json(
            typeof link.data === "object" && link.data !== null
              ? link.data
              : { detail: "Could not add member to company." },
          );
      }

      const patch = await supabaseRest(
        `employer_join_requests?id=eq.${encodeURIComponent(requestId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "approved",
            reviewed_by_user_id: ctx.userId,
            updated_at: new Date().toISOString(),
          }),
        },
      );
      if (!patch.ok) {
        return res
          .status(patch.status >= 400 ? patch.status : 502)
          .json(patch.data ?? { detail: "Member added but request update failed." });
      }

      const requesterName = [row.requester_name, row.requester_surname]
        .map((x) => String(x ?? "").trim())
        .filter(Boolean)
        .join(" ");
      await supabaseRest("notifications", {
        method: "POST",
        body: JSON.stringify({
          title: "Company join approved",
          message: `Your request to join ${row.company_name} was approved. You can now use the employer dashboard.`,
          type: "success",
          recipient_id: requesterId,
          is_read: false,
        }),
      });

      return res.status(200).json({
        request: Array.isArray(patch.data) ? patch.data[0] : patch.data,
        membership: link.data,
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ detail: "Internal server error" });
    }
  }

  async function resolveEmployerAccessState(userId) {
    const staffUrl = new URL(
      `${deps.aggregatorStaffRoot.replace(/\/$/, "")}`,
    );
    staffUrl.searchParams.set("external_user_id", userId);
    const staffRes = await fetch(staffUrl.toString(), {
      headers: {
        Accept: "application/json",
        "X-Employer-Key": deps.aggregatorKey || "",
      },
    });
    if (staffRes.ok) {
      const data = await staffRes.json().catch(() => []);
      const rows = Array.isArray(data) ? data : [];
      if (rows.length > 0) {
        return { state: "active", membership: rows[0] };
      }
    }

    const pending = await getLatestJoinRequestForUser(userId);
    if (pending && String(pending.status) === "pending") {
      return { state: "pending", request: pending };
    }
    if (pending && String(pending.status) === "approved") {
      return { state: "active", request: pending };
    }

    return { state: "needs_company", request: pending };
  }

  async function getLatestJoinRequestForUser(userId) {
    const res = await supabaseRest(
      `employer_join_requests?requester_user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=1`,
      { method: "GET" },
    );
    if (!res.ok || !Array.isArray(res.data) || res.data.length === 0) {
      return null;
    }
    return res.data[0];
  }

  async function listAdminCompanyIdsForUser(userId) {
    const staffUrl = new URL(
      `${deps.aggregatorStaffRoot.replace(/\/$/, "")}`,
    );
    staffUrl.searchParams.set("external_user_id", userId);
    const staffRes = await fetch(staffUrl.toString(), {
      headers: {
        Accept: "application/json",
        "X-Employer-Key": deps.aggregatorKey || "",
      },
    });
    if (!staffRes.ok) return [];
    const memberships = await staffRes.json().catch(() => []);
    const rows = Array.isArray(memberships) ? memberships : [];
    const adminCompanyIds = rows
      .filter((m) => m && m.is_admin && m.company_id != null)
      .map((m) => Number(m.company_id))
      .filter((n) => Number.isFinite(n));
    return [...new Set(adminCompanyIds)];
  }

  async function notifyCompanyAdminsOfJoinRequest(requestRow, requesterCtx) {
    if (!requestRow || typeof requestRow !== "object") return;
    const companyId = Number(
      /** @type {Record<string, unknown>} */ (requestRow).company_id,
    );
    if (!Number.isFinite(companyId)) return;
    const staff = await fetchStaffForCompany(companyId);
    const admins = staff.filter((m) => m.is_admin && m.external_user_id);
    const companyName = String(
      /** @type {Record<string, unknown>} */ (requestRow).company_name ?? "",
    );
    const requesterLabel =
      [requesterCtx.firstName, requesterCtx.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      requesterCtx.email ||
      requesterCtx.userId;
    const requestId = String(
      /** @type {Record<string, unknown>} */ (requestRow).id ?? "",
    );

    for (const admin of admins) {
      const adminId = String(admin.external_user_id);
      if (adminId === requesterCtx.userId) continue;
      await supabaseRest("notifications", {
        method: "POST",
        body: JSON.stringify({
          title: "Company join request",
          message: `${JOIN_NOTIF_PREFIX}${requestId}|${requesterLabel} wants to join ${companyName}. Open Notifications to approve.`,
          type: "info",
          recipient_id: adminId,
          is_read: false,
        }),
      });
    }
  }
}
