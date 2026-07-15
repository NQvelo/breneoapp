import { useCallback, useEffect, useState } from "react";
import {
  getBrowserNotificationPermission,
  getPushNotificationsPreference,
  enableBrowserNotifications,
  disableBrowserNotifications,
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
    const result = await enableBrowserNotifications();
    setPermission(getBrowserNotificationPermission());
    setPushEnabled(result);
    return result;
  }, []);

  const disable = useCallback(async () => {
    await disableBrowserNotifications();
    setPermission(getBrowserNotificationPermission());
    setPushEnabled(false);
  }, []);

  const notify = useCallback((payload: BrowserNotificationPayload) => {
    void showBrowserNotification(payload);
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
