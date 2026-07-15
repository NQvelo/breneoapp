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

/** FCM token routes live on the BFF (`/api/me/fcm-tokens`). Prefer same-origin so Vite proxy / production.mjs receive them. */
function getFcmApiBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    const host = window.location.hostname;
    const local =
      /^localhost$|^127\.0\.0\.1$/i.test(host) || host === "[::1]";
    // Local Vite: always hit same-origin → proxy → employer-jobs-proxy :8787
    if (local || import.meta.env.DEV) {
      return window.location.origin.replace(/\/$/, "");
    }
    // Static dashboard SPA has no same-origin BFF — use configured employer BFF.
    if (host === "dashboard.breneo.app") {
      return getEmployerJobsApiBaseUrl().replace(/\/$/, "");
    }
    // Hosts that run production.mjs (e.g. Railway app) expose /api/me/fcm-tokens same-origin.
    return window.location.origin.replace(/\/$/, "");
  }
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

function scriptUrlOf(registration: ServiceWorkerRegistration): string {
  return (
    registration.active?.scriptURL ??
    registration.waiting?.scriptURL ??
    registration.installing?.scriptURL ??
    ""
  );
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

function hasPushManager(
  registration: ServiceWorkerRegistration | null | undefined,
): registration is ServiceWorkerRegistration {
  return Boolean(registration && registration.pushManager);
}

async function waitForActiveWorker(
  registration: ServiceWorkerRegistration,
  timeoutMs = 10_000,
): Promise<ServiceWorkerRegistration> {
  if (registration.active) {
    return registration;
  }

  const worker = registration.installing || registration.waiting;
  if (worker) {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        reject(new Error("Service worker activate timeout"));
      }, timeoutMs);

      worker.addEventListener("statechange", () => {
        if (worker.state === "activated") {
          window.clearTimeout(timer);
          resolve();
        }
        if (worker.state === "redundant") {
          window.clearTimeout(timer);
          reject(new Error("Service worker became redundant"));
        }
      });
    });
  }

  const ready = await navigator.serviceWorker.ready;
  return ready;
}

/**
 * Resolve a ServiceWorkerRegistration that Firebase getToken() can use.
 * Must expose pushManager (secure context: localhost / HTTPS).
 */
async function getFcmServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported in this browser");
  }

  if (typeof window !== "undefined" && !window.isSecureContext) {
    throw new Error(
      "Push requires a secure context. Open the app via http://localhost:8080 (not a LAN IP like http://192.168.x.x).",
    );
  }

  // Production PWA SW (importScripts firebase-messaging-sw.js) is preferred when active.
  if (!import.meta.env.DEV) {
    initPwaUpdate();
  }

  const registrations = await navigator.serviceWorker.getRegistrations();

  const pwaRegistration = registrations.find((registration) => {
    const scriptUrl = scriptUrlOf(registration);
    return scriptUrl && isPwaServiceWorker(scriptUrl);
  });
  if (pwaRegistration) {
    const active = await waitForActiveWorker(pwaRegistration);
    if (hasPushManager(active)) {
      return active;
    }
  }

  const existingFirebase = registrations.find((registration) => {
    const scriptUrl = scriptUrlOf(registration);
    return scriptUrl && isFirebaseMessagingSw(scriptUrl);
  });
  if (existingFirebase) {
    const active = await waitForActiveWorker(existingFirebase);
    if (hasPushManager(active)) {
      return active;
    }
  }

  // Dev (PWA SW disabled) and fallback: register the dedicated FCM service worker.
  const registration = await navigator.serviceWorker.register(FCM_SW_PATH, {
    scope: "/",
  });
  const active = await waitForActiveWorker(registration);

  if (!hasPushManager(active)) {
    throw new Error(
      "Service worker has no pushManager. Use https:// or http://localhost (not a raw LAN IP).",
    );
  }

  return active;
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

/** Firebase Web Push public keys are ~87 chars (base64url). Shorter values are usually wrong. */
function isLikelyValidVapidKey(vapidKey: string): boolean {
  return /^[A-Za-z0-9_-]{80,}$/.test(vapidKey);
}

export async function registerFcmToken(): Promise<boolean> {
  if (!getFirebaseWebConfig()) {
    console.warn("[fcm] Firebase web config missing (VITE_FIREBASE_*).");
    return false;
  }

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim();
  if (!vapidKey) {
    console.warn(
      "[fcm] VITE_FIREBASE_VAPID_KEY is missing. Add it from Firebase Console → Project settings → Cloud Messaging → Web Push certificates → Key pair.",
    );
    return false;
  }

  if (!isLikelyValidVapidKey(vapidKey)) {
    console.error(
      `[fcm] VITE_FIREBASE_VAPID_KEY looks invalid (length ${vapidKey.length}). ` +
        "Copy the full Web Push certificate Key pair from Firebase Console " +
        '(usually ~87 characters, often starts with "B").',
    );
    return false;
  }

  try {
    const registration = await getFcmServiceWorkerRegistration();
    console.info(
      "[fcm] Using service worker:",
      registration.active?.scriptURL || registration.scope,
    );

    const messaging = await getMessagingInstance();
    if (!messaging) {
      console.warn("[fcm] Firebase Messaging not supported in this browser.");
      return false;
    }

    if (!registration.pushManager) {
      console.error(
        "[fcm] registration.pushManager is missing. Open http://localhost:8080 (secure context).",
      );
      return false;
    }

    // Passing the same registration Firebase will use avoids an internal
    // deleteToken race (pushManager of undefined in token-manager.ts).
    await navigator.serviceWorker.ready;

    let token: string | null = null;
    try {
      token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });
    } catch (tokenError) {
      // Firebase may throw during old-token cleanup while still returning a usable subscription.
      console.warn("[fcm] getToken warning (retrying once):", tokenError);
      token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });
    }

    if (!token) {
      console.warn(
        "[fcm] getToken() returned empty — check notification permission and VAPID key.",
      );
      return false;
    }

    const endpoint = `${getFcmApiBaseUrl()}/api/me/fcm-tokens/`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ token, platform: "web" }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(
        "[fcm] register token API failed:",
        endpoint,
        res.status,
        detail || res.statusText,
      );
      return false;
    }

    console.info("[fcm] Token registered successfully");
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
