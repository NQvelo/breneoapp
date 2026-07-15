import React, { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useJobNotifications } from "@/hooks/useJobNotifications";
import { useMyCvViews, MY_CV_VIEWS_QUERY_KEY } from "@/hooks/useMyCvViews";
import { useMyApplications } from "@/hooks/useMyApplications";
import { BrowserNotificationsBanner } from "@/components/notifications/BrowserNotificationsBanner";
import { NotificationCompanyLogo } from "@/components/notifications/NotificationCompanyLogo";
import {
  fetchMyNotifications,
  markNotificationsRead,
  removeNotifications,
  type Notification,
} from "@/api/notifications/notificationsApi";
import {
  buildJobBrandLookup,
  getNotificationItemCompanyName,
  getNotificationItemDate,
  getNotificationItemId,
  getNotificationItemJobId,
  getNotificationItemLogo,
  getNotificationItemMessage,
  getNotificationItemTitle,
  mergeNotificationListItems,
  normalizeNotificationLogoUrl,
  type JobBrandLookup,
  type NotificationListItem,
} from "@/api/notifications/notificationDisplayUtils";
import { acknowledgeCvView } from "@/api/jobs/cvViewsApi";
import { fetchJobDetail } from "@/api/jobs/jobService";

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

function parseSelectedItems(
  selectedIds: Set<string>,
  items: NotificationListItem[],
): {
  djangoIds: string[];
  cvViewIds: Array<string | number>;
} {
  const djangoIds: string[] = [];
  const cvViewIds: Array<string | number> = [];

  for (const item of items) {
    const itemId = getNotificationItemId(item);
    if (!selectedIds.has(itemId)) continue;

    if (item.kind === "django") {
      djangoIds.push(item.notification.id);
    } else {
      cvViewIds.push(item.view.id);
    }
  }

  return { djangoIds, cvViewIds };
}

const NotificationsPage = () => {
  const { user } = useAuth();
  const t = useTranslation();
  const queryClient = useQueryClient();
  const queryKey = ["user-notifications", user?.id];
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isRegularUser = user?.user_type !== "academy";
  useJobNotifications({
    enabled: isRegularUser && !!user?.id,
    checkInterval: 30 * 60 * 1000,
  });

  const { data: cvViews = [], isLoading: cvViewsLoading } = useMyCvViews(
    isRegularUser && !!user?.id,
  );
  const { data: myApplications } = useMyApplications(
    isRegularUser && !!user?.id,
  );

  const jobBrandLookup = useMemo(
    () => buildJobBrandLookup(myApplications?.applications ?? []),
    [myApplications?.applications],
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

  const items = useMemo(
    () =>
      mergeNotificationListItems(
        notifications,
        cvViews,
        isRegularUser && !!user?.id,
      ),
    [notifications, cvViews, isRegularUser, user?.id],
  );

  const missingJobIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of items) {
      if (getNotificationItemLogo(item, jobBrandLookup)) continue;
      const jobId = getNotificationItemJobId(item);
      if (jobId) ids.add(jobId);
    }
    return Array.from(ids).slice(0, 8);
  }, [items, jobBrandLookup]);

  const { data: fetchedJobBrands } = useQuery({
    queryKey: ["notification-job-brands", missingJobIds.join(",")],
    queryFn: async (): Promise<JobBrandLookup> => {
      const lookup: JobBrandLookup = new Map();

      for (const jobId of missingJobIds) {
        try {
          const job = await fetchJobDetail(jobId);
          const logo = normalizeNotificationLogoUrl(
            job.company_logo || job.companyLogo,
          );
          const companyName =
            (typeof job.company_name === "string" && job.company_name.trim()) ||
            (typeof job.employer_name === "string" && job.employer_name.trim()) ||
            (typeof job.company === "string" && job.company.trim()) ||
            undefined;

          if (logo || companyName) {
            lookup.set(jobId, { logo, companyName });
          }
        } catch {
          // Skip jobs we cannot resolve.
        }
      }

      return lookup;
    },
    enabled: missingJobIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const combinedJobBrandLookup = useMemo(() => {
    const merged: JobBrandLookup = new Map(jobBrandLookup);
    fetchedJobBrands?.forEach((brand, jobId) => {
      const existing = merged.get(jobId);
      merged.set(jobId, {
        logo: brand.logo ?? existing?.logo,
        companyName: brand.companyName ?? existing?.companyName,
      });
    });
    return merged;
  }, [jobBrandLookup, fetchedJobBrands]);

  const selectedCount = selectedIds.size;
  const listLoading = isLoading || (isRegularUser && cvViewsLoading);

  const toggleSelected = (itemId: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const markSelectedMutation = useMutation({
    mutationFn: async (ids: Set<string>) => {
      const { djangoIds, cvViewIds } = parseSelectedItems(ids, items);

      if (djangoIds.length > 0) {
        await markNotificationsRead(djangoIds);
      }

      if (cvViewIds.length > 0) {
        await Promise.all(cvViewIds.map((id) => acknowledgeCvView(id)));
      }
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey });
      const previousNotifications =
        queryClient.getQueryData<Notification[]>(queryKey) || [];
      const { djangoIds } = parseSelectedItems(ids, items);

      queryClient.setQueryData<Notification[]>(queryKey, (old) =>
        (old || []).map((notification) =>
          djangoIds.includes(notification.id)
            ? { ...notification, is_read: true }
            : notification,
        ),
      );

      return { previousNotifications };
    },
    onSuccess: () => {
      clearSelection();
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: MY_CV_VIEWS_QUERY_KEY });
    },
    onError: (_error, _ids, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(queryKey, context.previousNotifications);
      }
      toast.error("Could not mark selected notifications as read.");
    },
  });

  const removeSelectedMutation = useMutation({
    mutationFn: async (ids: Set<string>) => {
      const { djangoIds, cvViewIds } = parseSelectedItems(ids, items);

      if (djangoIds.length > 0) {
        await removeNotifications(djangoIds);
      }

      if (cvViewIds.length > 0) {
        await Promise.all(cvViewIds.map((id) => acknowledgeCvView(id)));
      }
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey });
      const previousNotifications =
        queryClient.getQueryData<Notification[]>(queryKey) || [];
      const { djangoIds } = parseSelectedItems(ids, items);

      queryClient.setQueryData<Notification[]>(queryKey, (old) =>
        (old || []).filter((notification) => !djangoIds.includes(notification.id)),
      );

      return { previousNotifications };
    },
    onSuccess: () => {
      clearSelection();
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: MY_CV_VIEWS_QUERY_KEY });
    },
    onError: (_error, _ids, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(queryKey, context.previousNotifications);
      }
      toast.error("Could not remove selected notifications.");
    },
  });

  const bulkActionPending =
    markSelectedMutation.isPending || removeSelectedMutation.isPending;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 pb-20 md:pb-6 px-2 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <BrowserNotificationsBanner />

          <div className="rounded-3xl bg-white dark:bg-[#242424] overflow-hidden">
            {selectedCount > 0 ? (
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
                      onClick={() => markSelectedMutation.mutate(selectedIds)}
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
                      onClick={() => removeSelectedMutation.mutate(selectedIds)}
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
                  onClick={() => void refetch()}
                >
                  Try again
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <img
                  src="/lovable-uploads/3dicons-bell-dynamic-color.png"
                  alt="No notifications"
                  className="mx-auto h-40 w-40 mb-4 object-contain"
                />
                <p>{t.notifications.noNotifications}</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {items.map((item) => {
                  const itemId = getNotificationItemId(item);
                  const companyName = getNotificationItemCompanyName(
                    item,
                    combinedJobBrandLookup,
                  );
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
                          logo={getNotificationItemLogo(
                            item,
                            combinedJobBrandLookup,
                          )}
                          companyName={companyName}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              {companyName ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                  {companyName}
                                </p>
                              ) : null}
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
    </DashboardLayout>
  );
};

export default NotificationsPage;
