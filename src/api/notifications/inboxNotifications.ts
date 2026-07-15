import type { Notification } from "./notificationsApi";
import { getNotificationKind } from "./notificationUtils";

/**
 * Shown in the Notifications tab: manual sends + broadcasts (all users).
 * CV views use the CV views tab. Employer join requests use the employer inbox.
 */
export function isInboxNotification(
  notification: Pick<Notification, "kind" | "metadata" | "recipient_id">,
): boolean {
  const kind = getNotificationKind(notification);
  if (kind === "manual" || kind === "broadcast") {
    return true;
  }
  // True Django broadcasts (recipient null) even if kind wasn't set.
  return notification.recipient_id == null || notification.recipient_id === "";
}

export function filterInboxNotifications(
  notifications: Notification[],
): Notification[] {
  return notifications.filter(isInboxNotification);
}
