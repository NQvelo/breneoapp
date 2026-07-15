import type { Notification } from "./notificationsApi";
import { getNotificationKind } from "./notificationUtils";

/** Shown in Notifications tab: manual sends + broadcast (all users). */
export function isInboxNotification(
  notification: Pick<Notification, "kind" | "metadata" | "recipient_id">,
): boolean {
  const kind = getNotificationKind(notification);
  if (kind === "manual" || kind === "broadcast") {
    return true;
  }
  return notification.recipient_id == null || notification.recipient_id === "";
}

export function filterInboxNotifications(notifications: Notification[]): Notification[] {
  return notifications.filter(isInboxNotification);
}
