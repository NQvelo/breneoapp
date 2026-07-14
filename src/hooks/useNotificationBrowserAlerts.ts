import { useEffect, useRef } from "react";
import {
  formatNotificationMessage,
  type Notification,
} from "@/api/notifications/notificationsApi";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";

type UseNotificationBrowserAlertsOptions = {
  enabled?: boolean;
};

export function useNotificationBrowserAlerts(
  notifications: Notification[],
  userId: string | undefined,
  options: UseNotificationBrowserAlertsOptions = {},
) {
  const { enabled = true } = options;
  const { isEnabled, notify } = useBrowserNotifications();
  const seenIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!enabled || !userId || !isEnabled) {
      return;
    }

    const userIdStr = String(userId);
    const ownNotifications = notifications.filter(
      (notification) => notification.recipient_id === userIdStr,
    );

    if (seenIdsRef.current === null) {
      seenIdsRef.current = new Set(ownNotifications.map((n) => n.id));
      return;
    }

    for (const notification of ownNotifications) {
      if (seenIdsRef.current.has(notification.id)) {
        continue;
      }

      seenIdsRef.current.add(notification.id);

      if (!notification.is_read) {
        notify({
          title: notification.title,
          body: formatNotificationMessage(notification.message),
          tag: `notification-${notification.id}`,
          onClick: () => {
            window.location.href = "/notifications";
          },
        });
      }
    }
  }, [notifications, userId, enabled, isEnabled, notify]);
}
