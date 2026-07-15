/**
 * Create in-app notifications via Django internal API (replaces Supabase inserts).
 */

import {
  isFcmConfigured,
  sendFcmBroadcast,
  sendFcmToUser,
} from "./fcmNotifications.mjs";

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

function isBroadcastRecipient(recipientId) {
  const value = String(recipientId ?? "")
    .trim()
    .toLowerCase();
  return value === "" || value === "all" || value === "*" || value === "everyone";
}

function extractCreatedNotificationId(data) {
  if (!data || typeof data !== "object") return null;
  const row = /** @type {Record<string, unknown>} */ (data);
  if (row.id != null && String(row.id).trim()) return String(row.id).trim();
  const nested = row.notification;
  if (
    nested &&
    typeof nested === "object" &&
    !Array.isArray(nested) &&
    "id" in nested &&
    nested.id != null &&
    String(nested.id).trim()
  ) {
    return String(nested.id).trim();
  }
  return null;
}

function shouldSendPushForNotification(params, broadcast) {
  if (broadcast) return true;
  const kind = String(params.metadata?.kind ?? "").trim();
  return kind === "manual" || kind === "broadcast";
}

/**
 * @param {{
 *   recipientId?: string;
 *   broadcast?: boolean;
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
  const broadcast =
    params.broadcast === true || isBroadcastRecipient(params.recipientId);
  const recipientId = String(params.recipientId ?? "").trim();

  if (!broadcast && !recipientId) {
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
        recipient_id: broadcast ? null : recipientId,
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
      return { ok: res.ok, status: res.status, data };
    }

    if (isFcmConfigured() && shouldSendPushForNotification(params, broadcast)) {
      const notificationId = extractCreatedNotificationId(data);
      const pushTag = broadcast
        ? notificationId
          ? `broadcast:${notificationId}`
          : `broadcast:${params.title}:${params.message}`
        : notificationId
          ? `django:${notificationId}`
          : `breneo-notif-${recipientId}:${params.title}:${params.message}`;

      const pushPayload = {
        title: params.title,
        message: params.message,
        tag: pushTag,
        url: "/notifications?tab=notifications",
      };

      try {
        const pushResult = broadcast
          ? await sendFcmBroadcast(pushPayload)
          : await sendFcmToUser({ recipientId, ...pushPayload });

        if (pushResult.sent === 0) {
          console.warn("[notifications] FCM push skipped:", pushResult.reason);
        }
      } catch (e) {
        console.warn("[notifications] FCM send failed:", e);
      }
    }

    return { ok: res.ok, status: res.status, data, broadcast };
  } catch (e) {
    console.warn("[notifications] Django internal create error:", e);
    return { ok: false, status: 0, data: null };
  }
}
