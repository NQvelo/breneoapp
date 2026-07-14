import { useCallback, useEffect, useState } from "react";
import {
  getBrowserNotificationPermission,
  getPushNotificationsPreference,
  notifyPushNotificationsChanged,
  requestBrowserNotificationPermission,
  setPushNotificationsPreference,
  showBrowserNotification,
  type BrowserNotificationPayload,
  PUSH_NOTIFICATIONS_PREF_KEY,
  PUSH_NOTIFICATIONS_CHANGED_EVENT,
} from "@/lib/browserNotifications";

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    getBrowserNotificationPermission(),
  );
  const [pushEnabled, setPushEnabled] = useState(() =>
    getPushNotificationsPreference(),
  );

  useEffect(() => {
    const syncState = () => {
      setPermission(getBrowserNotificationPermission());
      setPushEnabled(getPushNotificationsPreference());
    };

    const syncPreference = (event: StorageEvent) => {
      if (event.key === PUSH_NOTIFICATIONS_PREF_KEY) {
        syncState();
      }
    };

    window.addEventListener("storage", syncPreference);
    window.addEventListener(PUSH_NOTIFICATIONS_CHANGED_EVENT, syncState);
    return () => {
      window.removeEventListener("storage", syncPreference);
      window.removeEventListener(PUSH_NOTIFICATIONS_CHANGED_EVENT, syncState);
    };
  }, []);

  const isEnabled = permission === "granted" && pushEnabled;

  const enable = useCallback(async (): Promise<boolean> => {
    const result = await requestBrowserNotificationPermission();
    setPermission(result);

    if (result === "granted") {
      setPushNotificationsPreference(true);
      setPushEnabled(true);
      notifyPushNotificationsChanged();
      return true;
    }

    return false;
  }, []);

  const disable = useCallback(() => {
    setPushNotificationsPreference(false);
    setPushEnabled(false);
    notifyPushNotificationsChanged();
  }, []);

  const notify = useCallback((payload: BrowserNotificationPayload) => {
    showBrowserNotification(payload);
  }, []);

  return {
    permission,
    pushEnabled,
    isEnabled,
    enable,
    disable,
    notify,
  };
}
