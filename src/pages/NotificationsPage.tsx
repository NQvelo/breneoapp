import React, { useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  Users,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Define the shape of a notification
interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  recipient_id: string | null;
  is_read: boolean;
  created_at: string;
}

const NotificationsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["user-notifications", user?.id];

  // Fetch all notifications for the current user (personal and broadcast)
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey,
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .or(`recipient_id.is.null,recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
        throw new Error("Could not fetch notifications.");
      }
      return data;
    },
    enabled: !!user?.id,
  });

  // Mutation to mark a notification as read with optimistic updates
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) throw new Error("User not authenticated.");
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("recipient_id", user.id);

      if (error) throw error;
    },
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previousNotifications =
        queryClient.getQueryData<Notification[]>(queryKey) || [];

      queryClient.setQueryData<Notification[]>(queryKey, (old) =>
        (old || []).map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      return { previousNotifications };
    },
    onError: (err, _, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(queryKey, context.previousNotifications);
      }
      toast({
        title: "Error",
        description: "Could not mark notification as read.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Set up a real-time subscription to listen for new notifications
  useEffect(() => {
    if (!user?.id) return;

    const handleNewNotification = (payload: any) => {
      queryClient.invalidateQueries({ queryKey });
      if (payload.new) {
        toast({
          title: payload.new.title,
          description: payload.new.message,
        });
      }
    };

    const personalChannel = supabase
      .channel("personal-user-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${user.id}`,
        },
        handleNewNotification
      )
      .subscribe();

    const broadcastChannel = supabase
      .channel("broadcast-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: "recipient_id=is.null",
        },
        handleNewNotification
      )
      .subscribe();

    return () => {
      supabase.removeChannel(personalChannel);
      supabase.removeChannel(broadcastChannel);
    };
  }, [queryClient, user?.id, toast, queryKey]);

  // Helper function to get an icon based on notification type
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

  const unreadCount = notifications.filter(
    (n) => !n.is_read && n.recipient_id === user?.id
  ).length;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bell className="h-8 w-8 text-primary" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">{unreadCount} new</Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-2">
            Stay updated with the latest platform notifications.
          </p>
        </div> */}

        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading...
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>You have no new notifications.</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 transition-colors ${
                      !notification.is_read &&
                      notification.recipient_id === user?.id
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
                            notification.created_at
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      {!notification.is_read &&
                        notification.recipient_id === user?.id && (
                          <button
                            onClick={() =>
                              markAsReadMutation.mutate(notification.id)
                            }
                            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-2 disabled:opacity-50"
                            disabled={markAsReadMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4" />
                            Mark as read
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
