import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Users } from "lucide-react";
import { toast } from "sonner";
import {
  approveEmployerJoinRequest,
  fetchEmployerJoinRequestInbox,
  joinRequestDisplayName,
  type EmployerJoinRequest,
} from "@/api/employer/employerJoinRequests";
import { markJoinRequestNotificationsRead } from "@/api/notifications/notificationsApi";
import { useAuth } from "@/contexts/AuthContext";

export default function EmployerNotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<EmployerJoinRequest[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (authLoading || !user) return;
    setLoading(true);
    try {
      const rows = await fetchEmployerJoinRequestInbox();
      setRequests(rows);
    } catch (e) {
      setRequests([]);
      toast.error(
        e instanceof Error ? e.message : "Could not load join requests.",
      );
    } finally {
      setLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    void load();
  }, [load, authLoading, user]);

  const handleApprove = async (row: EmployerJoinRequest) => {
    setActingId(row.id);
    try {
      await approveEmployerJoinRequest(row.id);
      if (user?.id) {
        try {
          await markJoinRequestNotificationsRead(row.id);
        } catch {
          /* non-blocking — inbox action already succeeded */
        }
      }
      toast.success(
        `${joinRequestDisplayName(row)} was added to your company.`,
      );
      setRequests((prev) => prev.filter((r) => r.id !== row.id));
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not approve join request.",
      );
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6 md:px-6 lg:px-8 pb-24 md:pb-8">
        <Card>
          <CardHeader className="p-6 pb-4">
            <div className="flex items-start gap-3">
              <Bell className="h-6 w-6 text-breneo-blue shrink-0 mt-0.5" />
              <div>
                <CardTitle className="text-lg">Notifications</CardTitle>
                <p className="text-sm text-muted-foreground font-normal mt-1">
                  Review and approve team members who want to join your company.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : requests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No pending join requests.
              </p>
            ) : (
              <div className="space-y-3">
                {requests.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-border/60 p-4 bg-muted/20"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Users className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {joinRequestDisplayName(row)}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {row.requester_email || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Wants to join{" "}
                          <span className="font-medium text-foreground">
                            {row.company_name}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary">Pending</Badge>
                      <Button
                        type="button"
                        size="sm"
                        disabled={actingId === row.id}
                        onClick={() => void handleApprove(row)}
                      >
                        Accept
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
