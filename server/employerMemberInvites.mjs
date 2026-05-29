/**
 * Employer member invites — invite by email (Resend), accept via signed token + JWT.
 * No Supabase required for this flow.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { readAppPublicUrl, sendResendEmail } from "./resendEmail.mjs";
import { buildEmployerMemberInviteEmail } from "./emailTemplates.mjs";
import { createDjangoNotification } from "./djangoNotifications.mjs";

function normalizeEmail(email) {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function readInviteTokenSecret() {
  const secret =
    process.env.EMPLOYER_INVITE_TOKEN_SECRET?.trim() ||
    process.env.NOTIFICATIONS_INTERNAL_KEY?.trim();
  if (!secret) {
    throw new Error(
      "EMPLOYER_INVITE_TOKEN_SECRET (or NOTIFICATIONS_INTERNAL_KEY) is required on the BFF.",
    );
  }
  return secret;
}

function base64urlEncode(raw) {
  return Buffer.from(raw, "utf8").toString("base64url");
}

function base64urlDecode(raw) {
  return Buffer.from(raw, "base64url").toString("utf8");
}

function signPayload(payloadB64, secret) {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

function buildInviteToken(payload, secret) {
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const sig = signPayload(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

function isInvitePayload(value) {
  return (
    value != null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function verifyInviteToken(token, secret) {
  const raw = String(token ?? "").trim();
  const dot = raw.indexOf(".");
  if (dot <= 0) {
    throw new Error("Invalid invite token.");
  }
  const payloadB64 = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!payloadB64 || !sig) {
    throw new Error("Invalid invite token.");
  }
  const expected = signPayload(payloadB64, secret);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new Error("Invalid invite token signature.");
  }
  const decoded = JSON.parse(base64urlDecode(payloadB64));
  if (!isInvitePayload(decoded)) {
    throw new Error("Invalid invite token payload.");
  }
  if (!Number.isFinite(Number(decoded.exp))) {
    throw new Error("Invalid invite token expiry.");
  }
  return decoded;
}

function previewFromTokenPayload(payload) {
  if (!isInvitePayload(payload)) {
    throw new Error("Invalid invite token payload.");
  }
  const nowSec = Math.floor(Date.now() / 1000);
  const exp = Number(payload.exp);
  const expired = !Number.isFinite(exp) || exp <= nowSec;
  return {
    company_id: Number(payload.company_id) || 0,
    company_name: String(payload.company_name ?? "Company"),
    invitee_email: normalizeEmail(payload.invitee_email),
    status: expired ? "expired" : "pending",
    expired,
  };
}

function toArray(data) {
  return Array.isArray(data) ? data : [];
}

function isMemberEmail(staffRow, email) {
  return (
    staffRow &&
    typeof staffRow === "object" &&
    normalizeEmail(staffRow.external_user_email) === email
  );
}

function createInviteExpiresAtSeconds() {
  return Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
}

/**
 * @param {unknown[]} memberships
 * @param {string} userId
 */
function adminCompanyIdsFromMemberships(memberships, userId) {
  const uid = String(userId).trim();
  const ids = new Set();
  for (const row of memberships) {
    if (!row || typeof row !== "object") continue;
    const r = row;
    if (
      String(r.external_user_id ?? "").trim() === uid &&
      Boolean(r.is_admin) &&
      Number.isFinite(Number(r.company_id))
    ) {
      ids.add(Number(r.company_id));
    }
  }
  return Array.from(ids);
}

/**
 * @param {import("express").Express} app
 * @param {{
 *   requireEmployerAuth: Function;
 *   aggregatorStaffRoot: string;
 *   aggregatorKey: string;
 *   postStaffMembershipForUser: Function;
 *   fetchStaffForCompany: Function;
 *   fetchMembershipsForUser: (userId: string) => Promise<unknown[]>;
 * }} deps
 */
export function registerEmployerMemberInviteRoutes(app, deps) {
  async function resolveAdminCompanyIds(userId) {
    const memberships = await deps.fetchMembershipsForUser(userId);
    return adminCompanyIdsFromMemberships(memberships, userId);
  }

  async function assertAdminForCompany(req, res, companyId) {
    const auth = await deps.requireEmployerAuth(req, res);
    if (!auth) return null;
    const adminIds = await resolveAdminCompanyIds(auth.userId);
    if (!adminIds.includes(companyId)) {
      res.status(403).json({
        detail: "Only company admins can invite members.",
      });
      return null;
    }
    return auth;
  }

  const handleCreateInvite = async (req, res) => {
    const companyId = Number(req.params.companyId);
    if (!Number.isFinite(companyId)) {
      return res.status(400).json({ detail: "Invalid company id." });
    }

    const auth = await assertAdminForCompany(req, res, companyId);
    if (!auth) return;

    const inviteeEmail = normalizeEmail(req.body?.email ?? req.body?.invitee_email);
    if (!isValidEmail(inviteeEmail)) {
      return res.status(400).json({ detail: "A valid work email is required." });
    }

    const companyName = String(
      req.body?.company_name ?? req.body?.companyName ?? "",
    ).trim();
    if (!companyName) {
      return res.status(400).json({ detail: "company_name is required." });
    }

    const staff = await deps.fetchStaffForCompany(companyId).catch(() => []);
    const alreadyMember = toArray(staff).some((row) =>
      isMemberEmail(row, inviteeEmail),
    );
    if (alreadyMember) {
      return res.status(400).json({
        detail: "This email is already a member of your company.",
      });
    }
    let token;
    let expiresAtIso;
    try {
      const exp = createInviteExpiresAtSeconds();
      expiresAtIso = new Date(exp * 1000).toISOString();
      token = buildInviteToken(
        {
          company_id: companyId,
          company_name: companyName,
          invitee_email: inviteeEmail,
          invited_by_user_id: String(auth.userId),
          iat: Math.floor(Date.now() / 1000),
          exp,
        },
        readInviteTokenSecret(),
      );
    } catch (e) {
      return res.status(500).json({
        detail: e instanceof Error ? e.message : "Could not create invite token.",
      });
    }

    const joinUrl = `${readAppPublicUrl()}/employer/accept-invite?token=${encodeURIComponent(token)}`;
    const inviterName = [auth.firstName, auth.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    const inviteEmail = buildEmployerMemberInviteEmail({
      companyName,
      inviterName: inviterName || "A company administrator",
      joinUrl,
      inviteeEmail,
    });
    const emailResult = await sendResendEmail({
      to: inviteeEmail,
      subject: inviteEmail.subject,
      html: inviteEmail.html,
      text: inviteEmail.text,
    });

    if (!emailResult.ok) {
      console.warn("[member-invite] Resend failed:", emailResult.error, emailResult.data);
      return res.status(502).json({
        detail:
          typeof emailResult.error === "string"
            ? emailResult.error
            : "Invite email could not be sent.",
      });
    }
    return res.status(201).json({
      invite: {
        id: token,
        company_id: companyId,
        company_name: companyName,
        invitee_email: inviteeEmail,
        status: "pending",
        token,
        expires_at: expiresAtIso,
      },
      email_sent: true,
    });
  };

  app.post("/api/employer/companies/:companyId/member-invites", handleCreateInvite);
  app.post("/api/employer/companies/:companyId/member-invites/", handleCreateInvite);

  const handlePreviewInvite = async (req, res) => {
    const token = String(req.query.token ?? req.params.token ?? "").trim();
    if (!token) {
      return res.status(400).json({ detail: "token is required." });
    }
    try {
      const payload = verifyInviteToken(token, readInviteTokenSecret());
      return res.json(previewFromTokenPayload(payload));
    } catch (e) {
      return res.status(400).json({
        detail: e instanceof Error ? e.message : "Invalid invite token.",
      });
    }
  };

  app.get("/api/employer/member-invites/preview", handlePreviewInvite);
  app.get("/api/employer/member-invites/preview/", handlePreviewInvite);

  const handleAcceptInvite = async (req, res) => {
    const auth = await deps.requireEmployerAuth(req, res);
    if (!auth) return;

    const token = String(req.body?.token ?? req.query?.token ?? "").trim();
    if (!token) {
      return res.status(400).json({ detail: "token is required." });
    }

    const userEmail = normalizeEmail(auth.email);
    if (!userEmail) {
      return res.status(400).json({
        detail: "Your account must have an email before accepting an invite.",
      });
    }

    let invite;
    try {
      invite = verifyInviteToken(token, readInviteTokenSecret());
    } catch (e) {
      return res.status(400).json({
        detail: e instanceof Error ? e.message : "Invalid invite token.",
      });
    }

    if (Number(invite.exp) <= Math.floor(Date.now() / 1000)) {
      return res.status(400).json({ detail: "Invite has expired." });
    }

    if (userEmail !== normalizeEmail(invite.invitee_email)) {
      return res.status(403).json({
        detail: `Sign in with ${normalizeEmail(invite.invitee_email)} to accept this invite.`,
      });
    }

    const membership = await deps.postStaffMembershipForUser(
      Number(invite.company_id),
      {
        userId: auth.userId,
        email: auth.email,
        firstName: auth.firstName,
        lastName: auth.lastName,
      },
      { status: "member" },
    );
    if (!membership.ok) {
      return res.status(membership.status || 400).json(
        membership.data || { detail: "Could not add you to the company." },
      );
    }

    await createDjangoNotification({
      recipientId: String(auth.userId),
      title: "Welcome to your company",
      message: `You joined ${invite.company_name} on Breneo.`,
      type: "success",
      metadata: {
        kind: "employer_join_approved",
        company_id: Number(invite.company_id),
      },
    });

    return res.json({
      ok: true,
      company_id: Number(invite.company_id),
      company_name: invite.company_name,
    });
  };

  app.post("/api/employer/member-invites/accept", handleAcceptInvite);
  app.post("/api/employer/member-invites/accept/", handleAcceptInvite);
}
