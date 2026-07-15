import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
} from "firebase/messaging";
import { TokenManager } from "@/api/auth/tokenManager";
import { getFirebaseApp, getFirebaseWebConfig } from "@/lib/firebase";
import { showBrowserNotification } from "@/lib/browserNotifications";

const FCM_SW_PATH = "/firebase-messaging-sw.js";

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }
  return "";
}

function authHeaders(): HeadersInit {
  const token = TokenManager.getAccessToken();
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function getFcmServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (import.meta.env.DEV) {
    const existing = await navigator.serviceWorker.getRegistration("/");
    if (existing?.active?.scriptURL?.includes("firebase-messaging-sw.js")) {
      await navigator.serviceWorker.ready;
      return existing;
    }

    const registration = await navigator.serviceWorker.register(FCM_SW_PATH);
    await navigator.serviceWorker.ready;
    return registration;
  }

  return navigator.serviceWorker.ready;
}

async function getMessagingInstance(): Promise<Messaging | null> {
  if (!(await isSupported())) {
    return null;
  }

  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  return getMessaging(app);
}

export async function registerFcmToken(): Promise<boolean> {
  if (!getFirebaseWebConfig()) {
    return false;
  }

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim();
  if (!vapidKey) {
    console.warn(
      "[fcm] VITE_FIREBASE_VAPID_KEY is missing. Add it from Firebase Console → Cloud Messaging → Web Push certificates.",
    );
    return false;
  }

  try {
    const registration = await getFcmServiceWorkerRegistration();
    await navigator.serviceWorker.ready;

    const messaging = await getMessagingInstance();
    if (!messaging) {
      return false;
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      return false;
    }

    const res = await fetch(`${getApiBaseUrl()}/api/me/fcm-tokens/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ token, platform: "web" }),
    });

    return res.ok;
  } catch (error) {
    console.warn("[fcm] register token failed:", error);
    return false;
  }
}

export async function unregisterFcmToken(): Promise<void> {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) {
      return;
    }

    const token = await getToken(messaging);
    if (token) {
      await fetch(`${getApiBaseUrl()}/api/me/fcm-tokens/`, {
        method: "DELETE",
        headers: authHeaders(),
        body: JSON.stringify({ token }),
      });
      await deleteToken(messaging);
    }
  } catch (error) {
    console.warn("[fcm] unregister token failed:", error);
  }
}

let foregroundListenerAttached = false;

export async function initFcmForegroundListener(): Promise<void> {
  if (foregroundListenerAttached || !getFirebaseWebConfig()) {
    return;
  }

  const messaging = await getMessagingInstance();
  if (!messaging) {
    return;
  }

  foregroundListenerAttached = true;

  onMessage(messaging, (payload) => {
    const title =
      payload.notification?.title || payload.data?.title || "Breneo";
    const body = payload.notification?.body || payload.data?.body || "";

    void showBrowserNotification({
      title,
      body,
      tag: payload.data?.tag || "breneo-fcm-foreground",
      icon: payload.notification?.icon || payload.data?.icon,
    });
  });
}

export async function refreshFcmTokenIfEnabled(): Promise<void> {
  const { areBrowserNotificationsEnabled } = await import(
    "@/lib/browserNotifications"
  );
  if (!areBrowserNotificationsEnabled()) {
    return;
  }

  await registerFcmToken();
}
