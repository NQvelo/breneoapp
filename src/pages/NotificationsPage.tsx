import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Bell, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useJobNotifications } from "@/hooks/useJobNotifications";
import { useMyCvViews } from "@/hooks/useMyCvViews";
import { CvViewNotificationsSection } from "@/components/notifications/CvViewNotificationsSection";
import {
  fetchMyNotifications,
  formatNotificationMessage,
  markNotificationRead,
  type Notification,
} from "@/api/notifications/notificationsApi";
import { cvViewIsUnacknowledged } from "@/api/jobs/cvViewsApi";

const NotificationsPage = () => {
  const { user } = useAuth();
  const t = useTranslation();
  const queryClient = useQueryClient();
  const queryKey = ["user-notifications", user?.id];

  const isRegularUser = user?.user_type !== "academy";
  useJobNotifications({
    enabled: isRegularUser && !!user?.id,
    checkInterval: 30 * 60 * 1000,
  });

  const { data: cvViews = [], isLoading: cvViewsLoading } = useMyCvViews(
    isRegularUser && !!user?.id,
  );

  const {
    data: notifications = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Notification[]>({
    queryKey,
    queryFn: () => fetchMyNotifications(),
    enabled: !!user?.id,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) throw new Error("User not authenticated.");
      await markNotificationRead(notificationId);
    },
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previousNotifications =
        queryClient.getQueryData<Notification[]>(queryKey) || [];

      queryClient.setQueryData<Notification[]>(queryKey, (old) =>
        (old || []).map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n,
        ),
      );
      return { previousNotifications };
    },
    onError: (_err, _, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(queryKey, context.previousNotifications);
      }
      toast.error("Could not mark notification as read.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return (
          <div className="bg-green-100 rounded-full p-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
        );
      case "warning":
        return (
          <div className="bg-yellow-100 rounded-full p-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          </div>
        );
      case "error":
        return (
          <div className="bg-red-100 rounded-full p-2">
            <XCircle className="h-5 w-5 text-red-600" />
          </div>
        );
      default:
        return (
          <div className="bg-blue-100 rounded-full p-2">
            <Bell className="h-5 w-5 text-blue-600" />
          </div>
        );
    }
  };

  const userIdStr = user?.id != null ? String(user.id) : "";
  const isOwnNotification = (n: Notification) => n.recipient_id === userIdStr;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              <CvViewNotificationsSection
                cvViews={cvViews}
                isLoading={cvViewsLoading}
              />
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  {t.common.loading}
                </div>
              ) : isError ? (
                <div className="text-center py-12 space-y-3">
                  <p className="text-sm text-destructive">
                    {error instanceof Error
                      ? error.message
                      : "Could not load notifications."}
                  </p>
                  <button
                    type="button"
                    className="text-sm text-breneo-blue hover:underline"
                    onClick={() => void refetch()}
                  >
                    Try again
                  </button>
                </div>
              ) : notifications.length === 0 &&
                !cvViews.some(cvViewIsUnacknowledged) ? (
                <div className="text-center py-12 text-muted-foreground">
                  <img
                    src="/lovable-uploads/3dicons-bell-dynamic-color.png"
                    alt="No notifications"
                    className="mx-auto h-48 w-48 mb-4 object-contain"
                  />
                  <p>{t.notifications.noNotifications}</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 transition-colors ${
                      !notification.is_read && isOwnNotification(notification)
                        ? "bg-blue-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-gray-900">
                          {notification.title}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {new Date(
                            notification.created_at,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatNotificationMessage(notification.message)}
                      </p>
                      {!notification.is_read &&
                        isOwnNotification(notification) && (
                          <button
                            onClick={() =>
                              markAsReadMutation.mutate(notification.id)
                            }
                            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-2 disabled:opacity-50"
                            disabled={markAsReadMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4" />
                            {t.notifications.markAsRead}
                          </button>
                        )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;
