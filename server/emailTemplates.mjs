/**
 * HTML transactional email templates (table layout for client compatibility).
 */

import { readAppPublicUrl } from "./resendEmail.mjs";

const BRENEO_BLUE = "#1AADE8";
const BRENEO_BLUE_DARK = "#0E8FC4";
const TEXT_PRIMARY = "#0f172a";
const TEXT_MUTED = "#64748b";
const BORDER = "#e2e8f0";
const CARD_BG = "#ffffff";
const PAGE_BG = "#f1f5f9";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isLocalAppUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      host.endsWith(".local")
    );
  } catch {
    return true;
  }
}

/** Absolute logo URL for email clients (never localhost). */
export function readBreneoEmailLogoUrl() {
  const override = process.env.BRENEO_EMAIL_LOGO_URL?.trim();
  if (override) return override;

  const appUrl = readAppPublicUrl();
  const logoPath = "/lovable-uploads/Breneo-logo.png";
  if (!isLocalAppUrl(appUrl)) {
    return `${appUrl.replace(/\/$/, "")}${logoPath}`;
  }

  const productionDefault =
    process.env.BRENEO_EMAIL_LOGO_BASE_URL?.trim() ||
    "https://dashboard.breneo.app";
  return `${productionDefault.replace(/\/$/, "")}${logoPath}`;
}

/**
 * @param {{
 *   companyName: string;
 *   inviterName: string;
 *   joinUrl: string;
 *   inviteeEmail: string;
 * }} params
 */
export function buildEmployerMemberInviteEmail(params) {
  const companyName = escapeHtml(params.companyName.trim() || "your company");
  const inviterName = escapeHtml(
    params.inviterName.trim() || "A company administrator",
  );
  const inviteeEmail = escapeHtml(params.inviteeEmail.trim());
  const joinUrl = String(params.joinUrl ?? "").trim();
  const logoUrl = escapeHtml(readBreneoEmailLogoUrl());
  const appUrl = escapeHtml(readAppPublicUrl());
  const year = new Date().getFullYear();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Company invitation — Breneo</title>
</head>
<body style="margin:0;padding:0;background-color:${PAGE_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${PAGE_BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <img src="${logoUrl}" alt="Breneo" width="140" height="auto" style="display:block;border:0;max-width:140px;height:auto;" />
            </td>
          </tr>
          <tr>
            <td style="background-color:${CARD_BG};border:1px solid ${BORDER};border-radius:16px;padding:40px 32px;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${BRENEO_BLUE};">
                Company invitation
              </p>
              <h1 style="margin:0 0 20px;font-size:22px;line-height:1.35;font-weight:700;color:${TEXT_PRIMARY};">
                Join ${companyName} on Breneo
              </h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${TEXT_PRIMARY};">
                Hello,
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${TEXT_PRIMARY};">
                <strong>${inviterName}</strong> has invited you to join
                <strong>${companyName}</strong> as a team member on Breneo —
                the platform for hiring, jobs, and employer collaboration.
              </p>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:${TEXT_MUTED};">
                This invitation was sent to <strong style="color:${TEXT_PRIMARY};">${inviteeEmail}</strong>.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 32px;">
                <tr>
                  <td align="center" style="border-radius:10px;background-color:${BRENEO_BLUE};">
                    <a href="${joinUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 36px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;background-color:${BRENEO_BLUE};border:1px solid ${BRENEO_BLUE_DARK};">
                      Accept invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:${TEXT_MUTED};">
                This invitation link expires in <strong style="color:${TEXT_PRIMARY};">7 days</strong>.
                If the button does not work, copy and paste this URL into your browser:
              </p>
              <p style="margin:0 0 24px;font-size:12px;line-height:1.5;word-break:break-all;">
                <a href="${joinUrl}" style="color:${BRENEO_BLUE};text-decoration:underline;">${escapeHtml(joinUrl)}</a>
              </p>
              <hr style="border:none;border-top:1px solid ${BORDER};margin:0 0 20px;" />
              <p style="margin:0;font-size:12px;line-height:1.5;color:${TEXT_MUTED};">
                If you did not expect this invitation, you can safely ignore this email.
                No account changes will be made unless you accept.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 8px 8px;">
              <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:${TEXT_MUTED};">
                © ${year} Breneo · <a href="${appUrl}" style="color:${BRENEO_BLUE};text-decoration:none;">${appUrl}</a>
              </p>
              <p style="margin:0;font-size:11px;line-height:1.5;color:#94a3b8;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `Join ${params.companyName.trim() || "your company"} on Breneo`,
    "",
    `${params.inviterName.trim() || "A company administrator"} invited you to join ${params.companyName.trim() || "your company"} as a team member.`,
    `Invitation sent to: ${params.inviteeEmail.trim()}`,
    "",
    "Accept your invitation:",
    joinUrl,
    "",
    "This link expires in 7 days.",
    "",
    "If you did not expect this invitation, you can ignore this email.",
  ].join("\n");

  return {
    html,
    text,
    subject: `You're invited to join ${params.companyName.trim() || "a company"} on Breneo`,
  };
}
