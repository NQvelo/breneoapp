import type { Notification } from "./notificationsApi";

const JOIN_REQUEST_PREFIX = "employer_join_request:";

/** Human-readable body (strips BFF prefix `employer_join_request:{id}|`). */
export function formatNotificationMessage(message: string): string {
  if (!message.startsWith(JOIN_REQUEST_PREFIX)) return message;
  const pipe = message.indexOf("|");
  if (pipe === -1) return message;
  return message.slice(pipe + 1).trim();
}

export function getNotificationKind(
  notification: Pick<Notification, "kind" | "metadata">,
): string {
  const fromMeta = notification.metadata?.kind;
  if (typeof fromMeta === "string" && fromMeta.trim()) return fromMeta.trim();
  return notification.kind?.trim() ?? "";
}

export function getJoinRequestIdFromNotification(
  notification: Pick<Notification, "message" | "metadata">,
): string | null {
  const fromMeta = notification.metadata?.request_id;
  if (fromMeta != null && String(fromMeta).trim()) {
    return String(fromMeta).trim();
  }
  const msg = notification.message;
  if (!msg.startsWith(JOIN_REQUEST_PREFIX)) return null;
  const pipe = msg.indexOf("|");
  if (pipe === -1) return null;
  const idPart = msg.slice(JOIN_REQUEST_PREFIX.length, pipe).trim();
  return idPart || null;
}
