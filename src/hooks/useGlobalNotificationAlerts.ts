import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { useMyCvViews } from "@/hooks/useMyCvViews";
import {
  fetchMyNotifications,
} from "@/api/notifications/notificationsApi";
import {
  getNotificationItemId,
  getNotificationItemMessage,
  getNotificationItemTitle,
  isNotificationItemUnread,
  mergeNotificationListItems,
} from "@/api/notifications/notificationDisplayUtils";

const POLL_INTERVAL_MS = 60_000;

export function useGlobalNotificationAlerts() {
  const { user } = useAuth();
  const userId = user?.id;
  const { isEnabled, notify } = useBrowserNotifications();
  const seenIdsRef = useRef<Set<string> | null>(null);
  const isRegularUser = user?.user_type !== "academy";

  const { data: notifications = [] } = useQuery({
    queryKey: ["user-notifications", userId],
    queryFn: fetchMyNotifications,
    enabled: Boolean(userId) && isEnabled,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  const { data: cvViews = [] } = useMyCvViews(
    isRegularUser && Boolean(userId) && isEnabled,
    { refetchInterval: POLL_INTERVAL_MS },
  );

  const items = useMemo(
    () =>
      mergeNotificationListItems(
        notifications,
        cvViews,
        isRegularUser && Boolean(userId),
      ),
    [notifications, cvViews, isRegularUser, userId],
  );

  useEffect(() => {
    seenIdsRef.current = null;
  }, [userId]);

  useEffect(() => {
    if (!userId || !isEnabled) {
      return;
    }

    if (seenIdsRef.current === null) {
      seenIdsRef.current = new Set(items.map((item) => getNotificationItemId(item)));
      return;
    }

    for (const item of items) {
      const itemId = getNotificationItemId(item);
      if (seenIdsRef.current.has(itemId)) {
        continue;
      }

      seenIdsRef.current.add(itemId);

      if (!isNotificationItemUnread(item, userId)) {
        continue;
      }

      notify({
        title: getNotificationItemTitle(item),
        body: getNotificationItemMessage(item),
        tag: itemId,
        onClick: () => {
          window.location.href = "/notifications";
        },
      });
    }
  }, [items, userId, isEnabled, notify]);
}
