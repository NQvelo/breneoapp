import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BrowserNotificationsBanner } from "@/components/notifications/BrowserNotificationsBanner";
import { NotificationCompanyLogo } from "@/components/notifications/NotificationCompanyLogo";
import {
  NotificationsTabSwitcher,
  type NotificationsTab,
} from "@/components/notifications/NotificationsTabSwitcher";
import {
  fetchMyNotifications,
  markJoinRequestNotificationsRead,
  markNotificationsRead,
  removeNotifications,
  type Notification,
} from "@/api/notifications/notificationsApi";
import { filterInboxNotifications } from "@/api/notifications/inboxNotifications";
import {
  getNotificationItemDate,
  getNotificationItemId,
  getNotificationItemMessage,
  getNotificationItemTitle,
  listDjangoNotificationItems,
  type NotificationListItem,
} from "@/api/notifications/notificationDisplayUtils";
import {
  approveEmployerJoinRequest,
  fetchEmployerJoinRequestInbox,
  joinRequestDisplayName,
  type EmployerJoinRequest,
} from "@/api/employer/employerJoinRequests";

function formatNotificationDate(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const JOIN_REQUESTS_QUERY_KEY = ["employer-join-request-inbox"] as const;

export default function EmployerNotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const t = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const notificationsQueryKey = ["employer-notifications", user?.id];
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actingId, setActingId] = useState<string | null>(null);

  const activeTab: NotificationsTab =
    searchParams.get("tab") === "join_requests"
      ? "join_requests"
      : "notifications";

  const {
    data: notifications = [],
    isLoading: notificationsLoading,
    isError: notificationsError,
    error: notificationsErrorValue,
    refetch: refetchNotifications,
  } = useQuery<Notification[]>({
    queryKey: notificationsQueryKey,
    queryFn: () => fetchMyNotifications(),
    enabled: !!user?.id && !authLoading,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const {
    data: joinRequests = [],
    isLoading: joinRequestsLoading,
    isError: joinRequestsError,
    error: joinRequestsErrorValue,
    refetch: refetchJoinRequests,
  } = useQuery<EmployerJoinRequest[]>({
    queryKey: JOIN_REQUESTS_QUERY_KEY,
    queryFn: () => fetchEmployerJoinRequestInbox(),
    enabled: !!user?.id && !authLoading,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const djangoItems = useMemo(
    () => listDjangoNotificationItems(filterInboxNotifications(notifications)),
    [notifications],
  );

  const notificationTabs = useMemo(
    () => [
      {
        value: "notifications" as const,
        label: `${t.notifications.tabNotifications} (${djangoItems.length})`,
      },
      {
        value: "join_requests" as const,
        label: `${t.notifications.tabJoinRequests} (${joinRequests.length})`,
      },
    ],
    [t, djangoItems.length, joinRequests.length],
  );

  const setActiveTab = useCallback(
    (tab: NotificationsTab) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (tab === "notifications") {
            next.delete("tab");
          } else {
            next.set("tab", tab);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab]);

  const toggleSelected = (itemId: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedDjangoIds = useMemo(() => {
    const ids: string[] = [];
    for (const item of djangoItems) {
      const itemId = getNotificationItemId(item);
      if (selectedIds.has(itemId) && item.kind === "django") {
        ids.push(item.notification.id);
      }
    }
    return ids;
  }, [djangoItems, selectedIds]);

  const markSelectedMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length > 0) await markNotificationsRead(ids);
    },
    onSuccess: () => {
      clearSelection();
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    },
    onError: () => {
      toast.error("Could not mark selected notifications as read.");
    },
  });

  const removeSelectedMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length > 0) await removeNotifications(ids);
    },
    onSuccess: () => {
      clearSelection();
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    },
    onError: () => {
      toast.error("Could not remove selected notifications.");
    },
  });

  const handleApprove = async (row: EmployerJoinRequest) => {
    setActingId(row.id);
    try {
      await approveEmployerJoinRequest(row.id);
      if (user?.id) {
        try {
          await markJoinRequestNotificationsRead(row.id);
        } catch {
          /* non-blocking */
        }
      }
      toast.success(
        t.notifications.joinRequestApproved.replace(
          "{name}",
          joinRequestDisplayName(row),
        ),
      );
      void queryClient.invalidateQueries({ queryKey: JOIN_REQUESTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not approve join request.",
      );
    } finally {
      setActingId(null);
    }
  };

  const selectedCount = selectedIds.size;
  const bulkActionPending =
    markSelectedMutation.isPending || removeSelectedMutation.isPending;
  const listLoading =
    activeTab === "join_requests" ? joinRequestsLoading : notificationsLoading;
  const isError =
    activeTab === "join_requests" ? joinRequestsError : notificationsError;
  const error =
    activeTab === "join_requests"
      ? joinRequestsErrorValue
      : notificationsErrorValue;

  const refetch = () => {
    if (activeTab === "join_requests") void refetchJoinRequests();
    else void refetchNotifications();
  };

  const emptyMessage =
    activeTab === "join_requests"
      ? t.notifications.noJoinRequests
      : t.notifications.noNotifications;

  const isEmpty =
    activeTab === "join_requests"
      ? joinRequests.length === 0
      : djangoItems.length === 0;

  return (
    <div className="max-w-7xl mx-auto py-6 pb-28 md:pb-6 px-2 sm:px-6 lg:px-8">
      <div className="space-y-4">
        <NotificationsTabSwitcher
          tabs={notificationTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <BrowserNotificationsBanner />

        <div className="rounded-3xl bg-white dark:bg-[#242424] overflow-hidden">
          {activeTab === "notifications" && selectedCount > 0 ? (
            <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t.notifications.selectedCount.replace(
                    "{count}",
                    String(selectedCount),
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={bulkActionPending}
                    className="h-9 px-3 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                    onClick={() =>
                      markSelectedMutation.mutate(selectedDjangoIds)
                    }
                  >
                    {markSelectedMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {t.notifications.markAsRead}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={bulkActionPending}
                    className="h-9 w-9 text-gray-500 hover:text-destructive dark:text-gray-400 dark:hover:text-red-400"
                    onClick={() =>
                      removeSelectedMutation.mutate(selectedDjangoIds)
                    }
                    aria-label={t.notifications.removeSelected}
                  >
                    {removeSelectedMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {listLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
              <p className="text-sm text-gray-500">{t.common.loading}</p>
            </div>
          ) : isError ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm text-destructive">
                {error instanceof Error
                  ? error.message
                  : "Could not load notifications."}
              </p>
              <button
                type="button"
                className="text-sm text-breneo-blue hover:underline"
                onClick={() => refetch()}
              >
                Try again
              </button>
            </div>
          ) : isEmpty ? (
            <div className="p-12 text-center text-muted-foreground">
              <img
                src="/lovable-uploads/3dicons-bell-dynamic-color.png"
                alt="No notifications"
                className="mx-auto h-40 w-40 mb-4 object-contain"
              />
              <p>{emptyMessage}</p>
            </div>
          ) : activeTab === "join_requests" ? (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {joinRequests.map((row) => {
                const name = joinRequestDisplayName(row);
                const when = formatNotificationDate(row.created_at);
                return (
                  <li
                    key={row.id}
                    className="bg-white px-4 py-4 transition-colors hover:bg-gray-50/80 dark:bg-[#242424] dark:hover:bg-gray-800/40 md:px-6"
                  >
                    <div className="flex items-start gap-3 md:gap-4">
                      <NotificationCompanyLogo companyName={name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            {row.requester_email ? (
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {row.requester_email}
                              </p>
                            ) : null}
                            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                              {name}
                            </h2>
                          </div>
                          {when ? (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {when}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t.notifications.joinRequestWantsToJoin.replace(
                            "{company}",
                            row.company_name || "your company",
                          )}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-1 shrink-0 rounded-full"
                        disabled={actingId === row.id}
                        onClick={() => void handleApprove(row)}
                      >
                        {actingId === row.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {t.notifications.acceptJoinRequest}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {djangoItems.map((item: NotificationListItem) => {
                const itemId = getNotificationItemId(item);
                const when = formatNotificationDate(
                  getNotificationItemDate(item),
                );

                return (
                  <li
                    key={itemId}
                    className="bg-white px-4 py-4 transition-colors hover:bg-gray-50/80 dark:bg-[#242424] dark:hover:bg-gray-800/40 md:px-6"
                  >
                    <div className="flex items-start gap-3 md:gap-4">
                      <NotificationCompanyLogo
                        companyName={getNotificationItemTitle(item)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                              {getNotificationItemTitle(item)}
                            </h2>
                          </div>
                          {when ? (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {when}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {getNotificationItemMessage(item)}
                        </p>
                      </div>
                      <Checkbox
                        checked={selectedIds.has(itemId)}
                        onCheckedChange={(checked) =>
                          toggleSelected(itemId, checked === true)
                        }
                        aria-label={`Select ${getNotificationItemTitle(item)}`}
                        className="mt-1"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
