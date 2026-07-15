import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMyNotifications } from "@/api/notifications/notificationsApi";
import { filterInboxNotifications } from "@/api/notifications/inboxNotifications";
import { fetchEmployerJoinRequestInbox } from "@/api/employer/employerJoinRequests";
import { cvViewIsUnacknowledged } from "@/api/jobs/cvViewsApi";
import { useMyCvViews } from "@/hooks/useMyCvViews";

function resolveIsEmployer(userType?: string): boolean {
  return (
    userType === "employer" ||
    (typeof window !== "undefined" &&
      localStorage.getItem("userRole") === "employer")
  );
}

export function useUnreadNotificationCount() {
  const { user } = useAuth();
  const userId = user?.id;
  const isEmployer = resolveIsEmployer(user?.user_type);
  const isRegularUser = user?.user_type !== "academy" && !isEmployer;

  const notificationsQuery = useQuery({
    queryKey: ["user-notifications", userId],
    queryFn: fetchMyNotifications,
    enabled: Boolean(userId) && !isEmployer,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const { data: cvViews = [] } = useMyCvViews(isRegularUser && Boolean(userId));

  const employerInboxQuery = useQuery({
    queryKey: ["employer-join-request-inbox", userId],
    queryFn: fetchEmployerJoinRequestInbox,
    enabled: Boolean(userId) && isEmployer,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const count = useMemo(() => {
    if (isEmployer) {
      return employerInboxQuery.data?.length ?? 0;
    }

    const userIdStr = userId != null ? String(userId) : "";
    const unreadNotifications = filterInboxNotifications(
      notificationsQuery.data ?? [],
    ).filter(
      (notification) =>
        !notification.is_read &&
        (notification.recipient_id === userIdStr ||
          notification.recipient_id === null),
    ).length;
    const unacknowledgedCvViews = isRegularUser
      ? cvViews.filter(cvViewIsUnacknowledged).length
      : 0;

    return unreadNotifications + unacknowledgedCvViews;
  }, [
    isEmployer,
    isRegularUser,
    userId,
    notificationsQuery.data,
    employerInboxQuery.data,
    cvViews,
  ]);

  return { count };
}
