import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Bell, CheckCircle, UserPlus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  approveEmployerJoinRequest,
  parseJoinRequestNotification,
  rejectEmployerJoinRequest,
  EMPLOYER_JOIN_REQUEST_NOTIFICATION_KIND,
} from "@/api/employer/employerJoinRequests";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  recipient_id: string | null;
  is_read: boolean;
  created_at: string;
}

function JoinRequestActions({
  joinRequestId,
  onDone,
}: {
  joinRequestId: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  const handleApprove = async () => {
    setBusy("approve");
    try {
      await approveEmployerJoinRequest(joinRequestId);
      toast.success("Member approved and added to your company.");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not approve.");
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async () => {
    setBusy("reject");
    try {
      await rejectEmployerJoinRequest(joinRequestId);
      toast.success("Join request declined.");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not decline.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      <Button
        size="sm"
        disabled={busy != null}
        onClick={() => void handleApprove()}
      >
        {busy === "approve" ? "Approving…" : "Accept"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={busy != null}
        onClick={() => void handleReject()}
      >
        {busy === "reject" ? "Declining…" : "Decline"}
      </Button>
    </div>
  );
}

export default function EmployerNotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["employer-notifications", user?.id];

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey,
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("notifications" as "notifications")
        .select("*")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
        throw new Error("Could not fetch notifications.");
      }
      return (data || []) as Notification[];
    },
    enabled: !!user?.id,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) throw new Error("User not authenticated.");
      const { error } = await supabase
        .from("notifications" as "notifications")
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("recipient_id", user.id);

      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`employer-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, queryKey, user?.id]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <DashboardLayout>
      <div className="space-y-6 md:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground text-sm">
              Company join requests and updates
            </p>
          </div>
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} unread</Badge>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5" />
              Inbox
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No notifications yet.
              </p>
            ) : (
              notifications.map((notification, index) => {
                const joinPayload = parseJoinRequestNotification(
                  notification.message,
                );
                const isJoinRequest =
                  joinPayload?.kind === EMPLOYER_JOIN_REQUEST_NOTIFICATION_KIND;

                let displayMessage = notification.message;
                if (isJoinRequest && joinPayload) {
                  const name = [
                    joinPayload.requester_name,
                    joinPayload.requester_surname,
                  ]
                    .filter(Boolean)
                    .join(" ")
                    .trim();
                  displayMessage = `${name || joinPayload.requester_email || "Someone"} wants to join ${joinPayload.company_name || "your company"}.`;
                }

                return (
                  <div key={notification.id}>
                    {index > 0 && <Separator className="mb-4" />}
                    <div
                      className={`rounded-lg p-4 ${!notification.is_read ? "bg-muted/50" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        {isJoinRequest ? (
                          <UserPlus className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                        ) : notification.type === "success" ? (
                          <CheckCircle className="h-5 w-5 mt-0.5 text-green-600 shrink-0" />
                        ) : (
                          <Bell className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {displayMessage}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                          {isJoinRequest && joinPayload?.join_request_id ? (
                            <JoinRequestActions
                              joinRequestId={joinPayload.join_request_id}
                              onDone={() => {
                                markAsReadMutation.mutate(notification.id);
                                queryClient.invalidateQueries({ queryKey });
                              }}
                            />
                          ) : !notification.is_read ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-8"
                              onClick={() =>
                                markAsReadMutation.mutate(notification.id)
                              }
                            >
                              Mark as read
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
