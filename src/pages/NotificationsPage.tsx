import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Bell, Users, User, Clock, CheckCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  sender_id: string;
  recipient_id: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

const NotificationsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch notifications for current user
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["user-notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .or(`recipient_id.is.null,recipient_id.eq.${user?.id}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("recipient_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user-notifications", user?.id],
      });
    },
    onError: (error) => {
      console.error("Error marking notification as read:", error);
    },
  });

  // Set up realtime subscription for new notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("user-notifications-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id.is.null,recipient_id.eq.${user.id}`,
        },
        (payload) => {
          console.log("New notification received:", payload);
          queryClient.invalidateQueries({
            queryKey: ["user-notifications", user.id],
          });

          // Show toast for new notifications
          if (payload.new) {
            toast({
              title: payload.new.title,
              description: payload.new.message,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id, toast]);

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-100 text-green-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const unreadCount =
    notifications?.filter((n) => !n.is_read && n.recipient_id === user?.id)
      .length || 0;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bell className="h-8 w-8 text-primary" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">{unreadCount} new</Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-2">
            Stay updated with the latest platform notifications
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              All Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading notifications...
                </div>
              ) : notifications?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No notifications yet</p>
                  <p className="text-sm">
                    You'll see new notifications here when they arrive
                  </p>
                </div>
              ) : (
                notifications?.map((notification) => (
                  <div
                    key={notification.id}
                    className={`border rounded-lg p-4 space-y-3 transition-all hover:shadow-md ${
                      !notification.is_read &&
                      notification.recipient_id === user?.id
                        ? "bg-blue-50 border-blue-200"
                        : "bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-lg">
                        {notification.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge className={getTypeColor(notification.type)}>
                          {notification.type}
                        </Badge>
                        {notification.recipient_id ? (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Personal
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Broadcast
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-muted-foreground">
                      {notification.message}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {formatDate(notification.created_at)}
                      </div>

                      {!notification.is_read &&
                        notification.recipient_id === user?.id && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
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
