/**
 * Employer company join requests (pending admin approval) + Supabase notifications.
 */
import { supabaseRest } from "./supabaseAdmin.mjs";

const JOIN_REQUEST_KIND = "employer_join_request";

/**
 * @param {object} deps
 * @param {typeof import("express").Express} deps.app
 * @param {() => Promise<{ auth: string; userId: string; email: string; firstName: string; lastName: string } | null>} deps.requireEmployerAuth
 * @param {string} deps.aggregatorStaffRoot
 * @param {string} deps.aggregatorKey
 * @param {(companyIdRaw: string | number, ctx: { userId: string; email?: string; firstName?: string; lastName?: string }) => Promise<{ ok: boolean; status: number; data: unknown }>} deps.postStaffMembershipForUser
 * @param {(companyId: number) => Promise<Array<{ external_user_id: string; is_admin?: boolean }>>} deps.fetchCompanyStaff
 */
export function registerEmployerJoinRequestRoutes(deps) {
  const { app, requireEmployerAuth, postStaffMembershipForUser, fetchCompanyStaff } =
    deps;

  async function insertNotification(row) {
    return supabaseRest("notifications", {
      method: "POST",
      body: row,
      prefer: "return=minimal",
    });
  }

  async function notifyCompanyAdmins(companyId, companyName, joinRequestId, requester) {
    const staff = await fetchCompanyStaff(companyId);
    const admins = staff.filter((m) => m.is_admin);
    const targets = admins.length > 0 ? admins : staff;
    const name = [requester.firstName, requester.lastName].filter(Boolean).join(" ").trim();
    const display = name || requester.email || "Someone";
    const message = JSON.stringify({
      kind: JOIN_REQUEST_KIND,
      join_request_id: joinRequestId,
      company_id: companyId,
      company_name: companyName,
      requester_user_id: requester.userId,
      requester_name: requester.firstName,
      requester_surname: requester.lastName,
      requester_email: requester.email,
    });
    for (const admin of targets) {
      const adminId = String(admin.external_user_id || "").trim();
      if (!adminId || adminId === requester.userId) continue;
      await insertNotification({
        title: "Company join request",
        message,
        type: "info",
        recipient_id: adminId,
        is_read: false,
      });
    }
  }

  async function notifyRequester(userId, title, message, type = "success") {
    await insertNotification({
      title,
      message,
      type,
      recipient_id: userId,
      is_read: false,
    });
  }

  app.post("/api/employer/join-requests", handleJoinRequestCreate);
  app.post("/api/employer/join-requests/", handleJoinRequestCreate);
  app.get("/api/employer/join-requests/me", handleJoinRequestMe);
  app.get("/api/employer/join-requests/me/", handleJoinRequestMe);
  app.get("/api/employer/join-requests/inbox", handleJoinRequestInbox);
  app.get("/api/employer/join-requests/inbox/", handleJoinRequestInbox);
  app.post("/api/employer/join-requests/:requestId/approve", handleJoinRequestApprove);
  app.post("/api/employer/join-requests/:requestId/approve/", handleJoinRequestApprove);
  app.post("/api/employer/join-requests/:requestId/reject", handleJoinRequestReject);
  app.post("/api/employer/join-requests/:requestId/reject/", handleJoinRequestReject);

  async function handleJoinRequestCreate(req, res) {
    try {
      const ctx = await requireEmployerAuth(req, res);
      if (!ctx) return;
      const raw =
        req.body && typeof req.body === "object" && !Array.isArray(req.body)
          ? /** @type {Record<string, unknown>} */ (req.body)
          : {};
      const companyId = Number(raw.company_id);
      const companyName = String(raw.company_name || "").trim();
      if (!Number.isFinite(companyId) || !companyName) {
        return res.status(400).json({
          detail: "company_id and company_name are required",
        });
      }

      const existingPending = await supabaseRest("employer_join_requests", {
        query: `requester_user_id=eq.${encodeURIComponent(ctx.userId)}&status=eq.pending&select=id&limit=1`,
      });
      if (
        existingPending.ok &&
        Array.isArray(existingPending.data) &&
        existingPending.data.length > 0
      ) {
        return res.status(409).json({
          detail: "You already have a pending join request.",
        });
      }

      const insert = await supabaseRest("employer_join_requests", {
        method: "POST",
        body: {
          company_id: companyId,
          company_name: companyName,
          requester_user_id: ctx.userId,
          requester_email: ctx.email || "",
          requester_name: ctx.firstName || "",
          requester_surname: ctx.lastName || "",
          status: "pending",
        },
        prefer: "return=representation",
      });
      if (!insert.ok) {
        return res.status(insert.status >= 400 ? insert.status : 502).json({
          detail:
            (insert.data && typeof insert.data === "object" && insert.data.message) ||
            "Could not create join request",
        });
      }
      const row = Array.isArray(insert.data) ? insert.data[0] : insert.data;
      const joinRequestId = row?.id ? String(row.id) : "";

      await notifyCompanyAdmins(companyId, companyName, joinRequestId, {
        userId: ctx.userId,
        email: ctx.email,
        firstName: ctx.firstName,
        lastName: ctx.lastName,
      });

      return res.status(201).json(row);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ detail: "Internal server error" });
    }
  }

  async function handleJoinRequestMe(req, res) {
    try {
      const ctx = await requireEmployerAuth(req, res);
      if (!ctx) return;
      const q = await supabaseRest("employer_join_requests", {
        query: `requester_user_id=eq.${encodeURIComponent(ctx.userId)}&status=eq.pending&select=*&order=created_at.desc&limit=1`,
      });
      if (!q.ok) {
        return res.status(q.status >= 400 ? q.status : 502).json({
          detail: "Could not load join request",
        });
      }
      const row = Array.isArray(q.data) && q.data.length > 0 ? q.data[0] : null;
      return res.status(200).json(row);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ detail: "Internal server error" });
    }
  }

  async function handleJoinRequestInbox(req, res) {
    try {
      const ctx = await requireEmployerAuth(req, res);
      if (!ctx) return;
      const staff = await fetchCompanyStaffForAdmin(ctx.userId);
      const adminCompanyIds = [
        ...new Set(
          staff
            .filter((m) => m.is_admin)
            .map((m) => Number(m.company_id))
            .filter((n) => Number.isFinite(n)),
        ),
      ];
      if (adminCompanyIds.length === 0) {
        return res.status(200).json([]);
      }
      const idList = adminCompanyIds.join(",");
      const q = await supabaseRest("employer_join_requests", {
        query: `status=eq.pending&company_id=in.(${idList})&select=*&order=created_at.desc`,
      });
      if (!q.ok) {
        return res.status(q.status >= 400 ? q.status : 502).json({
          detail: "Could not load join requests",
        });
      }
      return res.status(200).json(Array.isArray(q.data) ? q.data : []);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ detail: "Internal server error" });
    }
  }

  async function fetchCompanyStaffForAdmin(userId) {
    const url = new URL(deps.aggregatorStaffRoot.replace(/\/$/, ""));
    url.searchParams.set("external_user_id", userId);
    const upstream = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "X-Employer-Key": deps.aggregatorKey,
      },
    });
    const text = await upstream.text();
    let data = [];
    try {
      data = text ? JSON.parse(text) : [];
    } catch {
      return [];
    }
    if (!upstream.ok || !Array.isArray(data)) return [];
    return data;
  }

  async function loadJoinRequest(requestId) {
    const q = await supabaseRest("employer_join_requests", {
      query: `id=eq.${encodeURIComponent(requestId)}&select=*&limit=1`,
    });
    if (!q.ok || !Array.isArray(q.data) || q.data.length === 0) return null;
    return q.data[0];
  }

  async function assertAdminForCompany(ctx, companyId) {
    const staff = await fetchCompanyStaff(companyId);
    const isAdmin = staff.some(
      (m) =>
        String(m.external_user_id) === ctx.userId && Boolean(m.is_admin),
    );
    if (!isAdmin) {
      return false;
    }
    return true;
  }

  async function handleJoinRequestApprove(req, res) {
    try {
      const ctx = await requireEmployerAuth(req, res);
      if (!ctx) return;
      const requestId = String(req.params.requestId || "").trim();
      const row = await loadJoinRequest(requestId);
      if (!row || row.status !== "pending") {
        return res.status(404).json({ detail: "Join request not found" });
      }
      const companyId = Number(row.company_id);
      if (!(await assertAdminForCompany(ctx, companyId))) {
        return res.status(403).json({
          detail: "Only company admins can approve join requests.",
        });
      }

      const link = await postStaffMembershipForUser(companyId, {
        userId: String(row.requester_user_id),
        email: String(row.requester_email || ""),
        firstName: String(row.requester_name || ""),
        lastName: String(row.requester_surname || ""),
      });
      if (!link.ok) {
        return res.status(link.status >= 400 ? link.status : 502).json(
          typeof link.data === "object" && link.data !== null
            ? link.data
            : { detail: "Could not add staff membership" },
        );
      }

      await supabaseRest("employer_join_requests", {
        method: "PATCH",
        query: `id=eq.${encodeURIComponent(requestId)}`,
        body: {
          status: "approved",
          reviewed_by_user_id: ctx.userId,
          updated_at: new Date().toISOString(),
        },
        prefer: "return=minimal",
      });

      await notifyRequester(
        String(row.requester_user_id),
        "Join request approved",
        `You can now access ${row.company_name}. Open your employer dashboard to get started.`,
        "success",
      );

      return res.status(200).json({
        join_request: { ...row, status: "approved" },
        membership: link.data,
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ detail: "Internal server error" });
    }
  }

  async function handleJoinRequestReject(req, res) {
    try {
      const ctx = await requireEmployerAuth(req, res);
      if (!ctx) return;
      const requestId = String(req.params.requestId || "").trim();
      const row = await loadJoinRequest(requestId);
      if (!row || row.status !== "pending") {
        return res.status(404).json({ detail: "Join request not found" });
      }
      const companyId = Number(row.company_id);
      if (!(await assertAdminForCompany(ctx, companyId))) {
        return res.status(403).json({
          detail: "Only company admins can reject join requests.",
        });
      }

      await supabaseRest("employer_join_requests", {
        method: "PATCH",
        query: `id=eq.${encodeURIComponent(requestId)}`,
        body: {
          status: "rejected",
          reviewed_by_user_id: ctx.userId,
          updated_at: new Date().toISOString(),
        },
        prefer: "return=minimal",
      });

      await notifyRequester(
        String(row.requester_user_id),
        "Join request declined",
        `Your request to join ${row.company_name} was declined. You can search for another company.`,
        "warning",
      );

      return res.status(200).json({ ...row, status: "rejected" });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ detail: "Internal server error" });
    }
  }
}
