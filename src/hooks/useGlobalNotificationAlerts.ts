import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { useMyCvViews } from "@/hooks/useMyCvViews";
import { fetchMyNotifications } from "@/api/notifications/notificationsApi";
import { filterInboxNotifications } from "@/api/notifications/inboxNotifications";
import {
  getNotificationItemId,
  getNotificationItemMessage,
  getNotificationItemTitle,
  isNotificationItemUnread,
  listCvViewNotificationItems,
  listDjangoNotificationItems,
} from "@/api/notifications/notificationDisplayUtils";
import {
  consumeNotificationBootstrap,
  loadAlertedNotificationIds,
  markNotificationAlerted,
  markNotificationsAlerted,
} from "@/lib/notificationAlerts";

const POLL_INTERVAL_MS = 60_000;

export function useGlobalNotificationAlerts() {
  const { user } = useAuth();
  const userId = user?.id;
  const { isEnabled, notify } = useBrowserNotifications();
  const bootstrapDoneRef = useRef(false);
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

  const inboxItems = useMemo(
    () =>
      listDjangoNotificationItems(filterInboxNotifications(notifications)),
    [notifications],
  );

  const cvItems = useMemo(
    () =>
      listCvViewNotificationItems(
        cvViews,
        isRegularUser && Boolean(userId),
      ),
    [cvViews, isRegularUser, userId],
  );

  const alertItems = useMemo(
    () => [...inboxItems, ...cvItems],
    [inboxItems, cvItems],
  );

  useEffect(() => {
    bootstrapDoneRef.current = false;
  }, [userId]);

  useEffect(() => {
    if (!userId || !isEnabled) {
      return;
    }

    if (!bootstrapDoneRef.current) {
      bootstrapDoneRef.current = true;

      if (consumeNotificationBootstrap(userId)) {
        markNotificationsAlerted(
          userId,
          alertItems.map((item) => getNotificationItemId(item)),
        );
        return;
      }
    }

    const alertedIds = loadAlertedNotificationIds(userId);

    for (const item of alertItems) {
      const itemId = getNotificationItemId(item);
      if (alertedIds.has(itemId)) {
        continue;
      }

      if (!isNotificationItemUnread(item, userId)) {
        markNotificationAlerted(userId, itemId);
        continue;
      }

      markNotificationAlerted(userId, itemId);

      notify({
        title: getNotificationItemTitle(item),
        body: getNotificationItemMessage(item),
        tag: itemId,
        onClick: () => {
          const tab =
            item.kind === "cv_view" ? "cv_views" : "notifications";
          window.location.href = `/notifications?tab=${tab}`;
        },
      });
    }
  }, [alertItems, userId, isEnabled, notify]);
}
