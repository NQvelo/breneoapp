/**
 * Create in-app notifications via Django internal API (replaces Supabase inserts).
 */

function readMainApiBaseUrl() {
  if (process.env.MAIN_API_BASE_URL?.trim()) {
    return process.env.MAIN_API_BASE_URL.trim().replace(/\/$/, "");
  }
  if (process.env.VITE_DEV_SAME_ORIGIN_BRENEO_API === "1") {
    return "https://breneo.onrender.com";
  }
  const fromVite =
    process.env.VITE_BRENEO_API_BASE_URL?.trim() ||
    process.env.VITE_API_BASE_URL?.trim();
  if (fromVite) return fromVite.replace(/\/$/, "");
  return "https://web-production-80ed8.up.railway.app";
}

export function hasNotificationsInternalKey() {
  return Boolean(process.env.NOTIFICATIONS_INTERNAL_KEY?.trim());
}

/**
 * @param {{
 *   recipientId: string;
 *   title: string;
 *   message: string;
 *   type?: string;
 *   metadata?: Record<string, unknown>;
 * }} params
 */
export async function createDjangoNotification(params) {
  const key = process.env.NOTIFICATIONS_INTERNAL_KEY?.trim();
  if (!key) {
    console.warn(
      "[notifications] NOTIFICATIONS_INTERNAL_KEY not set; skipping Django notification.",
    );
    return { ok: false, status: 0, data: null };
  }

  const base = readMainApiBaseUrl();
  const recipientId = String(params.recipientId ?? "").trim();
  if (!recipientId) {
    return { ok: false, status: 400, data: { detail: "recipientId required" } };
  }

  try {
    const res = await fetch(`${base}/api/internal/notifications/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": key,
        Accept: "application/json",
      },
      body: JSON.stringify({
        recipient_id: recipientId,
        title: params.title,
        message: params.message,
        type: params.type ?? "info",
        metadata: params.metadata ?? {},
      }),
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      console.warn(
        "[notifications] Django internal create failed:",
        res.status,
        data,
      );
    }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    console.warn("[notifications] Django internal create error:", e);
    return { ok: false, status: 0, data: null };
  }
}
