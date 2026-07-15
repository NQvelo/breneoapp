/**
 * Create in-app notifications via Django internal API (replaces Supabase inserts).
 */

import {
  isFcmConfigured,
  sendFcmBroadcast,
  sendFcmToUser,
} from "./fcmNotifications.mjs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKENS_PATH = path.resolve(__dirname, "../.data/fcm_tokens.json");

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
  // Join requests have a dedicated employer inbox; skip noisy admin pushes.
  if (kind === "employer_join_request") return false;
  return true;
}

function recipientRejectedNull(status, data) {
  if (status !== 400 || !data || typeof data !== "object") return false;
  const rid = /** @type {Record<string, unknown>} */ (data).recipient_id;
  const msg = Array.isArray(rid) ? String(rid[0] ?? "") : String(rid ?? "");
  return /null|blank|required/i.test(msg);
}

/**
 * Django currently rejects recipient_id: null, so true broadcasts aren't supported
 * until the API allows null. Fall back to unique FCM-known user ids (+ optional env).
 * @returns {Promise<string[]>}
 */
async function resolveBroadcastRecipientIds() {
  const fromEnv = String(process.env.NOTIFICATIONS_BROADCAST_USER_IDS ?? "")
    .split(/[,\s]+/)
    .map((id) => id.trim())
    .filter(Boolean);

  /** @type {Set<string>} */
  const ids = new Set(fromEnv);

  try {
    const raw = await fs.readFile(TOKENS_PATH, "utf8");
    const rows = JSON.parse(raw);
    if (Array.isArray(rows)) {
      for (const row of rows) {
        const uid = String(row?.userId ?? "").trim();
        if (uid) ids.add(uid);
      }
    }
  } catch {
    // Token store optional.
  }

  return Array.from(ids);
}

/**
 * @param {{
 *   recipientId: string | null;
 *   title: string;
 *   message: string;
 *   type?: string;
 *   metadata?: Record<string, unknown>;
 *   kind?: string;
 * }} body
 */
async function postInternalNotification(body) {
  const key = process.env.NOTIFICATIONS_INTERNAL_KEY?.trim();
  if (!key) {
    return { ok: false, status: 0, data: null };
  }

  const base = readMainApiBaseUrl();
  const kind =
    String(body.kind ?? body.metadata?.kind ?? "").trim() || undefined;

  const res = await fetch(`${base}/api/internal/notifications/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Key": key,
      Accept: "application/json",
    },
    body: JSON.stringify({
      recipient_id: body.recipientId,
      title: body.title,
      message: body.message,
      type: body.type ?? "info",
      ...(kind ? { kind } : {}),
      metadata: body.metadata ?? {},
    }),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { ok: res.ok, status: res.status, data };
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

  const broadcast =
    params.broadcast === true || isBroadcastRecipient(params.recipientId);
  const recipientId = String(params.recipientId ?? "").trim();
  const kind = String(params.metadata?.kind ?? "").trim() ||
    (broadcast ? "broadcast" : "manual");
  const metadata = {
    ...(params.metadata ?? {}),
    kind: params.metadata?.kind ?? kind,
  };

  if (!broadcast && !recipientId) {
    return { ok: false, status: 400, data: { detail: "recipientId required" } };
  }

  try {
    /** @type {{ ok: boolean; status: number; data: unknown; broadcast?: boolean }} */
    let result;

    if (broadcast) {
      // Prefer true broadcast (recipient null) when Django supports it.
      const nullAttempt = await postInternalNotification({
        recipientId: null,
        title: params.title,
        message: params.message,
        type: params.type,
        metadata,
        kind: "broadcast",
      });

      if (nullAttempt.ok) {
        result = { ...nullAttempt, broadcast: true };
      } else if (recipientRejectedNull(nullAttempt.status, nullAttempt.data)) {
        const userIds = await resolveBroadcastRecipientIds();
        if (userIds.length === 0) {
          console.warn(
            "[notifications] Django rejects null recipient_id (broadcast unsupported). " +
              "No FCM-known users to fan out to. Create with --recipient <id>, or set " +
              "NOTIFICATIONS_BROADCAST_USER_IDS, or fix Django to allow recipient_id=null.",
            nullAttempt.data,
          );
          return {
            ok: false,
            status: nullAttempt.status,
            data: {
              detail:
                "Broadcast requires recipient_id=null on Django, or known user ids to fan out.",
              django: nullAttempt.data,
            },
          };
        }

        console.warn(
          `[notifications] Django rejects null recipient_id; fanning out to ${userIds.length} user(s).`,
        );

        let lastOk = null;
        let failures = 0;
        for (const userId of userIds) {
          const one = await postInternalNotification({
            recipientId: userId,
            title: params.title,
            message: params.message,
            type: params.type,
            metadata: { ...metadata, kind: "broadcast" },
            kind: "broadcast",
          });
          if (one.ok) lastOk = one;
          else failures += 1;
        }

        if (!lastOk) {
          return {
            ok: false,
            status: 400,
            data: { detail: "Broadcast fan-out failed for all recipients." },
          };
        }

        result = {
          ...lastOk,
          broadcast: true,
          data: {
            ...(typeof lastOk.data === "object" && lastOk.data
              ? lastOk.data
              : {}),
            fan_out: { recipients: userIds.length, failures },
          },
        };
      } else {
        console.warn(
          "[notifications] Django internal create failed:",
          nullAttempt.status,
          nullAttempt.data,
        );
        return nullAttempt;
      }
    } else {
      result = await postInternalNotification({
        recipientId,
        title: params.title,
        message: params.message,
        type: params.type,
        metadata,
        kind,
      });
      if (!result.ok) {
        console.warn(
          "[notifications] Django internal create failed:",
          result.status,
          result.data,
        );
        return result;
      }
    }

    if (isFcmConfigured() && shouldSendPushForNotification(params, broadcast)) {
      const notificationId = extractCreatedNotificationId(result.data);
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

    return { ...result, broadcast };
  } catch (e) {
    console.warn("[notifications] Django internal create error:", e);
    return { ok: false, status: 0, data: null };
  }
}
