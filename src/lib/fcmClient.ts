import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
} from "firebase/messaging";
import { TokenManager } from "@/api/auth/tokenManager";
import { getEmployerJobsApiBaseUrl } from "@/api/employer/employerJobsApiBase";
import { getFirebaseApp, getFirebaseWebConfig } from "@/lib/firebase";
import { showBrowserNotification } from "@/lib/browserNotifications";
import { initPwaUpdate } from "@/lib/pwaUpdate";

const FCM_SW_PATH = "/firebase-messaging-sw.js";

/** FCM token routes live on the employer-jobs BFF (`/api/me/fcm-tokens`), not the static SPA host. */
function getFcmApiBaseUrl(): string {
  return getEmployerJobsApiBaseUrl().replace(/\/$/, "");
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

function isFirebaseMessagingSw(scriptUrl: string): boolean {
  return scriptUrl.includes("firebase-messaging-sw.js");
}

function isPwaServiceWorker(scriptUrl: string): boolean {
  return (
    scriptUrl.includes("/sw.js") ||
    scriptUrl.includes("workbox") ||
    scriptUrl.includes("dev-sw.js")
  );
}

async function getFcmServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported");
  }

  initPwaUpdate();

  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    const registrations = await navigator.serviceWorker.getRegistrations();

    const pwaRegistration = registrations.find((registration) => {
      const scriptUrl =
        registration.active?.scriptURL ??
        registration.waiting?.scriptURL ??
        registration.installing?.scriptURL ??
        "";
      return scriptUrl && isPwaServiceWorker(scriptUrl);
    });
    if (pwaRegistration?.active) {
      return pwaRegistration;
    }

    const firebaseRegistration = registrations.find((registration) => {
      const scriptUrl =
        registration.active?.scriptURL ??
        registration.waiting?.scriptURL ??
        registration.installing?.scriptURL ??
        "";
      return scriptUrl && isFirebaseMessagingSw(scriptUrl);
    });
    if (firebaseRegistration?.active) {
      return firebaseRegistration;
    }

    if (import.meta.env.DEV && registrations.length === 0) {
      const registration = await navigator.serviceWorker.register(FCM_SW_PATH);
      await navigator.serviceWorker.ready;
      return registration;
    }

    await navigator.serviceWorker.ready;
    await new Promise((resolve) => window.setTimeout(resolve, 250));
  }

  const fallback = await navigator.serviceWorker.ready;
  return fallback;
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

    const res = await fetch(`${getFcmApiBaseUrl()}/api/me/fcm-tokens/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ token, platform: "web" }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(
        "[fcm] register token failed:",
        res.status,
        detail || res.statusText,
      );
      return false;
    }

    return true;
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

    const registration = await getFcmServiceWorkerRegistration();
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim(),
      serviceWorkerRegistration: registration,
    });
    if (token) {
      await fetch(`${getFcmApiBaseUrl()}/api/me/fcm-tokens/`, {
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
