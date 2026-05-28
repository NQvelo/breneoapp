/**
 * Notifications API — Django backend (replaces Supabase notifications tables).
 */

import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import axios from "axios";
import { getJoinRequestIdFromNotification } from "./notificationUtils";

export {
  formatNotificationMessage,
  getNotificationKind,
  getJoinRequestIdFromNotification,
} from "./notificationUtils";

export type NotificationType = "info" | "success" | "warning" | "error";

export type Notification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  recipient_id: string | null;
  is_read: boolean;
  kind: string;
  created_at: string;
  updated_at?: string;
  metadata?: Record<string, unknown>;
};

type NotificationRow = {
  id?: string | number;
  title?: string;
  message?: string;
  type?: string;
  recipient_id?: string | number | null;
  is_read?: boolean;
  kind?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, unknown>;
};

function normalizeNotification(row: NotificationRow): Notification {
  const type = row.type;
  const allowed: NotificationType[] = ["info", "success", "warning", "error"];
  const metadata =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  const kindFromMeta =
    typeof metadata.kind === "string" ? metadata.kind.trim() : "";
  const kind = String(row.kind ?? kindFromMeta ?? "").trim();

  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    message: String(row.message ?? ""),
    type: allowed.includes(type as NotificationType)
      ? (type as NotificationType)
      : "info",
    recipient_id:
      row.recipient_id == null || row.recipient_id === ""
        ? null
        : String(row.recipient_id),
    is_read: Boolean(row.is_read),
    kind,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
    metadata,
  };
}

function extractNotificationList(data: unknown): Notification[] {
  if (Array.isArray(data)) {
    return data.map((row) => normalizeNotification(row as NotificationRow));
  }
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const results = o.results ?? o.notifications ?? o.data;
    if (Array.isArray(results)) {
      return results.map((row) =>
        normalizeNotification(row as NotificationRow),
      );
    }
  }
  return [];
}

function extractJobIds(data: unknown): string[] {
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const ids = o.job_ids ?? o.jobIds;
    if (Array.isArray(ids)) {
      return ids.map((id) => String(id)).filter(Boolean);
    }
  }
  if (Array.isArray(data)) {
    return data.map((id) => String(id)).filter(Boolean);
  }
  return [];
}

function extractApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (data && typeof data === "object") {
      const o = data as Record<string, unknown>;
      if (typeof o.detail === "string" && o.detail.trim()) return o.detail;
      if (Array.isArray(o.detail) && o.detail[0]) {
        return String(o.detail[0]);
      }
      const firstKey = Object.keys(o)[0];
      const val = firstKey ? o[firstKey] : null;
      if (Array.isArray(val) && val[0]) return String(val[0]);
      if (typeof val === "string") return val;
    }
    if (err.message) return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export async function fetchMyNotifications(): Promise<Notification[]> {
  try {
    const res = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.LIST);
    return extractNotificationList(res.data);
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, "Could not fetch notifications."),
    );
  }
}

export async function markNotificationRead(
  notificationId: string,
): Promise<void> {
  const id = notificationId.trim();
  if (!id) throw new Error("Notification id is required.");
  const path = API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id);
  try {
    await apiClient.patch(path, {});
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 405) {
      await apiClient.put(path, {});
      return;
    }
    throw new Error(
      extractApiErrorMessage(err, "Could not mark notification as read."),
    );
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  try {
    await apiClient.patch(API_ENDPOINTS.NOTIFICATIONS.READ_ALL, {});
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 405) {
      await apiClient.put(API_ENDPOINTS.NOTIFICATIONS.READ_ALL, {});
      return;
    }
    throw new Error(
      extractApiErrorMessage(err, "Could not mark all notifications as read."),
    );
  }
}

export async function markJoinRequestNotificationsRead(
  requestId: string,
): Promise<void> {
  const id = requestId.trim();
  if (!id) return;
  const notifications = await fetchMyNotifications();
  const matches = notifications.filter(
    (n) => !n.is_read && getJoinRequestIdFromNotification(n) === id,
  );
  await Promise.all(matches.map((n) => markNotificationRead(n.id)));
}

export async function createMyNotification(params: {
  title: string;
  message: string;
  type?: NotificationType;
  kind?: string;
  metadata?: Record<string, unknown>;
}): Promise<Notification> {
  const metadata = params.metadata ?? {};
  const kind =
    params.kind ??
    (typeof metadata.kind === "string" ? metadata.kind : "job_match");

  try {
    const res = await apiClient.post(API_ENDPOINTS.NOTIFICATIONS.CREATE, {
      title: params.title,
      message: params.message,
      type: params.type ?? "info",
      kind,
      metadata: { ...metadata, kind },
    });
    const row =
      res.data && typeof res.data === "object" && "id" in (res.data as object)
        ? (res.data as NotificationRow)
        : res.data &&
            typeof res.data === "object" &&
            "notification" in (res.data as object)
          ? (res.data as { notification: NotificationRow }).notification
          : (res.data as NotificationRow);
    return normalizeNotification(row);
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, "Could not create notification."),
    );
  }
}

export async function fetchNotifiedJobIds(): Promise<Set<string>> {
  try {
    const res = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.JOB_IDS);
    return new Set(extractJobIds(res.data));
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, "Could not load notified jobs."),
    );
  }
}

export async function markJobNotified(jobId: string): Promise<void> {
  const id = jobId.trim();
  if (!id) return;
  try {
    await apiClient.post(API_ENDPOINTS.NOTIFICATIONS.JOB_MARK, { job_id: id });
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, "Could not save job notification."),
    );
  }
}
