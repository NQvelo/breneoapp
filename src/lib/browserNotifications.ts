const DEFAULT_ICON = "/lovable-uploads/Breneo-logo.png";

export const PUSH_NOTIFICATIONS_PREF_KEY = "notif_push";
export const PUSH_NOTIFICATIONS_CHANGED_EVENT = "breneo:push-notifications-changed";

export type BrowserNotificationPayload = {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  onClick?: () => void;
};

export function notifyPushNotificationsChanged(): void {
  window.dispatchEvent(new CustomEvent(PUSH_NOTIFICATIONS_CHANGED_EVENT));
}

export function setPushNotificationsPreference(enabled: boolean): void {
  localStorage.setItem(PUSH_NOTIFICATIONS_PREF_KEY, JSON.stringify(enabled));
}

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getPushNotificationsPreference(): boolean {
  try {
    const saved = localStorage.getItem(PUSH_NOTIFICATIONS_PREF_KEY);
    if (saved !== null) {
      return JSON.parse(saved) === true;
    }
  } catch {
    // ignore malformed preference
  }
  return false;
}

export function getBrowserNotificationPermission(): NotificationPermission {
  if (!isBrowserNotificationSupported()) {
    return "denied";
  }
  return Notification.permission;
}

export function areBrowserNotificationsEnabled(): boolean {
  return (
    isBrowserNotificationSupported() &&
    getBrowserNotificationPermission() === "granted" &&
    getPushNotificationsPreference()
  );
}

async function showServiceWorkerNotification(
  payload: BrowserNotificationPayload,
): Promise<boolean> {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const swPayload = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon ?? DEFAULT_ICON,
      tag: payload.tag,
      url: "/notifications",
    };

    if (registration.active) {
      registration.active.postMessage({
        type: "SHOW_NOTIFICATION",
        payload: swPayload,
      });
      return true;
    }

    await registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon ?? DEFAULT_ICON,
      badge: DEFAULT_ICON,
      tag: payload.tag,
      data: { url: "/notifications" },
    });
    return true;
  } catch {
    return false;
  }
}

export async function showBrowserNotification(
  payload: BrowserNotificationPayload,
): Promise<void> {
  if (!areBrowserNotificationsEnabled()) {
    return;
  }

  const shownViaServiceWorker = await showServiceWorkerNotification(payload);
  if (shownViaServiceWorker) {
    return;
  }

  if (!isBrowserNotificationSupported()) {
    return;
  }

  const notification = new Notification(payload.title, {
    body: payload.body,
    icon: payload.icon ?? DEFAULT_ICON,
    badge: DEFAULT_ICON,
    tag: payload.tag,
    requireInteraction: false,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
    payload.onClick?.();
  };

  setTimeout(() => {
    notification.close();
  }, 5000);
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!isBrowserNotificationSupported()) {
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  return Notification.requestPermission();
}

export async function enableBrowserNotifications(): Promise<boolean> {
  const permission = await requestBrowserNotificationPermission();
  if (permission !== "granted") {
    return false;
  }

  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.ready;
    } catch {
      // Continue when service worker is unavailable.
    }
  }

  setPushNotificationsPreference(true);
  notifyPushNotificationsChanged();

  try {
    const { registerFcmToken } = await import("@/lib/fcmClient");
    await registerFcmToken();
  } catch {
    // FCM is optional; polling alerts still work when the app is open.
  }

  return true;
}

export async function disableBrowserNotifications(): Promise<void> {
  try {
    const { unregisterFcmToken } = await import("@/lib/fcmClient");
    await unregisterFcmToken();
  } catch {
    // ignore
  }

  setPushNotificationsPreference(false);
  notifyPushNotificationsChanged();
}
