import type { Notification } from "./notificationsApi";
import { getNotificationKind } from "./notificationUtils";

/**
 * Shown in the Notifications tab.
 * Employer join requests use the dedicated employer inbox instead.
 */
export function isInboxNotification(
  notification: Pick<Notification, "kind" | "metadata" | "recipient_id">,
): boolean {
  const kind = getNotificationKind(notification);
  return kind !== "employer_join_request";
}

export function filterInboxNotifications(
  notifications: Notification[],
): Notification[] {
  return notifications.filter(isInboxNotification);
}
