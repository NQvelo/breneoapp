import fs from "fs";
import admin from "firebase-admin";
import {
  listAllFcmTokens,
  listFcmTokensForUser,
  removeFcmToken,
} from "./fcmTokenStore.mjs";
import {
  recordFcmPushSent,
  shouldSendFcmPush,
} from "./fcmPushDedup.mjs";

const DEFAULT_ICON = "/lovable-uploads/Breneo-logo.png";

/** @type {admin.app.App | null} */
let firebaseApp = null;

function readServiceAccount() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    try {
      return JSON.parse(json);
    } catch (e) {
      console.warn("[fcm] FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON:", e);
      return null;
    }
  }

  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  if (path) {
    try {
      return JSON.parse(fs.readFileSync(path, "utf8"));
    } catch (e) {
      console.warn("[fcm] Failed to read FIREBASE_SERVICE_ACCOUNT_PATH:", e);
      return null;
    }
  }

  return null;
}

export function isFcmConfigured() {
  return Boolean(readServiceAccount());
}

function getFirebaseAdmin() {
  if (firebaseApp) {
    return firebaseApp;
  }

  const serviceAccount = readServiceAccount();
  if (!serviceAccount) {
    return null;
  }

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  return firebaseApp;
}

const FCM_MULTICAST_BATCH_SIZE = 500;

/**
 * Data-only web push so the service worker onBackgroundMessage always runs
 * when the app/PWA is closed.
 *
 * @param {{
 *   title: string;
 *   message: string;
 *   tag?: string;
 *   url?: string;
 *   tokens: string[];
 * }} params
 */
async function sendFcmMulticast(params) {
  const app = getFirebaseAdmin();
  if (!app) {
    return { ok: false, sent: 0, failed: 0, reason: "not_configured" };
  }

  const tokens = params.tokens.filter(Boolean);
  if (tokens.length === 0) {
    return { ok: true, sent: 0, failed: 0, reason: "no_tokens" };
  }

  const title = String(params.title ?? "Breneo").trim() || "Breneo";
  const body = String(params.message ?? "").trim();
  const tag = String(params.tag ?? "breneo-broadcast").trim();
  const url = String(params.url ?? "/notifications").trim() || "/notifications";

  const canSend = await shouldSendFcmPush(tag);
  if (!canSend) {
    return { ok: true, sent: 0, failed: 0, reason: "deduped", tag };
  }

  const messaging = admin.messaging(app);

  let sent = 0;
  let failed = 0;
  const stale = [];

  for (let i = 0; i < tokens.length; i += FCM_MULTICAST_BATCH_SIZE) {
    const batch = tokens.slice(i, i + FCM_MULTICAST_BATCH_SIZE);
    const response = await messaging.sendEachForMulticast({
      tokens: batch,
      data: {
        title,
        body,
        tag,
        url,
        icon: DEFAULT_ICON,
      },
      webpush: {
        headers: {
          Urgency: "high",
        },
        fcmOptions: {
          link: url.startsWith("http") ? url : undefined,
        },
      },
    });

    sent += response.successCount;
    failed += response.failureCount;
    response.responses.forEach((item, index) => {
      if (item.success) return;
      const code = item.error?.code || "";
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token"
      ) {
        stale.push(batch[index]);
      }
    });
  }

  if (sent > 0) {
    await recordFcmPushSent(tag);
  }

  await Promise.all(stale.map((token) => removeFcmToken(token)));

  return {
    ok: true,
    sent,
    failed,
    staleRemoved: stale.length,
    tag,
  };
}

/**
 * @param {{
 *   recipientId: string;
 *   title: string;
 *   message: string;
 *   tag?: string;
 *   url?: string;
 * }} params
 */
export async function sendFcmToUser(params) {
  const recipientId = String(params.recipientId ?? "").trim();
  if (!recipientId) {
    return { ok: false, sent: 0, reason: "missing_recipient" };
  }

  const tokens = await listFcmTokensForUser(recipientId);
  return sendFcmMulticast({
    tokens,
    title: params.title,
    message: params.message,
    tag: params.tag ?? `breneo-${recipientId}`,
    url: params.url,
  });
}

/**
 * @param {{
 *   title: string;
 *   message: string;
 *   tag?: string;
 *   url?: string;
 * }} params
 */
export async function sendFcmBroadcast(params) {
  const tokens = await listAllFcmTokens();
  return sendFcmMulticast({
    tokens,
    title: params.title,
    message: params.message,
    tag: params.tag ?? "breneo-broadcast",
    url: params.url,
  });
}
