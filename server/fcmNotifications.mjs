import fs from "fs";
import admin from "firebase-admin";
import { listFcmTokensForUser, removeFcmToken } from "./fcmTokenStore.mjs";

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
  const app = getFirebaseAdmin();
  if (!app) {
    return { ok: false, sent: 0, reason: "not_configured" };
  }

  const recipientId = String(params.recipientId ?? "").trim();
  if (!recipientId) {
    return { ok: false, sent: 0, reason: "missing_recipient" };
  }

  const tokens = await listFcmTokensForUser(recipientId);
  if (tokens.length === 0) {
    return { ok: true, sent: 0, reason: "no_tokens" };
  }

  const title = String(params.title ?? "Breneo").trim() || "Breneo";
  const body = String(params.message ?? "").trim();
  const tag = String(params.tag ?? `breneo-${recipientId}`).trim();
  const url = String(params.url ?? "/notifications").trim() || "/notifications";

  const messaging = admin.messaging(app);
  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title,
      body,
    },
    data: {
      title,
      body,
      tag,
      url,
      icon: DEFAULT_ICON,
    },
    webpush: {
      fcmOptions: {
        link: url.startsWith("http") ? url : undefined,
      },
      notification: {
        icon: DEFAULT_ICON,
        badge: DEFAULT_ICON,
        tag,
      },
    },
  });

  const stale = [];
  response.responses.forEach((item, index) => {
    if (item.success) return;
    const code = item.error?.code || "";
    if (
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token"
    ) {
      stale.push(tokens[index]);
    }
  });

  await Promise.all(stale.map((token) => removeFcmToken(token)));

  return {
    ok: true,
    sent: response.successCount,
    failed: response.failureCount,
    staleRemoved: stale.length,
  };
}
