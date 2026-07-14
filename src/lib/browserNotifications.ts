export const PUSH_NOTIFICATIONS_PREF_KEY = "notif_push";
export const PUSH_NOTIFICATIONS_CHANGED_EVENT = "breneo:push-notifications-changed";

const DEFAULT_ICON = "/lovable-uploads/Breneo-logo.png";

export function notifyPushNotificationsChanged(): void {
  window.dispatchEvent(new CustomEvent(PUSH_NOTIFICATIONS_CHANGED_EVENT));
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

export function setPushNotificationsPreference(enabled: boolean): void {
  localStorage.setItem(PUSH_NOTIFICATIONS_PREF_KEY, JSON.stringify(enabled));
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

export type BrowserNotificationPayload = {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  onClick?: () => void;
};

export function showBrowserNotification(
  payload: BrowserNotificationPayload,
): void {
  if (!areBrowserNotificationsEnabled()) {
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
