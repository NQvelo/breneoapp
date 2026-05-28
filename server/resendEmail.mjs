/**
 * Send transactional email via Resend (server-only).
 */

/**
 * @param {{ to: string; subject: string; html: string; text?: string }} params
 */
export async function sendResendEmail(params) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      status: 0,
      error: "RESEND_API_KEY is not configured on the BFF.",
    };
  }

  const fromRaw =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.DEFAULT_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    "noreply@breneo.app";
  const from = fromRaw.includes("<")
    ? fromRaw
    : `Breneo <${fromRaw}>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error:
          (data && typeof data === "object" && data.message) ||
          "Resend API request failed.",
        data,
      };
    }
    return { ok: true, status: res.status, data };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error: e instanceof Error ? e.message : "Resend request error.",
    };
  }
}

export function readAppPublicUrl() {
  const raw =
    process.env.APP_PUBLIC_URL?.trim() ||
    process.env.VITE_APP_URL?.trim() ||
    process.env.VITE_PUBLIC_APP_URL?.trim() ||
    "http://localhost:8080";
  return raw.replace(/\/$/, "");
}
