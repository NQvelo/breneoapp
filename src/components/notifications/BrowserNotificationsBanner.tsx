import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/LanguageContext";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { isBrowserNotificationSupported } from "@/lib/browserNotifications";
import { cn } from "@/lib/utils";

export function BrowserNotificationsBanner() {
  const t = useTranslation();
  const { permission, isEnabled, enable } = useBrowserNotifications();

  if (!isBrowserNotificationSupported()) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-3xl border px-4 py-4 sm:px-5",
        isEnabled
          ? "border-green-200/80 bg-green-50 dark:border-green-800/50 dark:bg-green-950/30"
          : "border-sky-200/80 bg-sky-50 dark:border-sky-800/50 dark:bg-sky-950/25",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          {isEnabled ? (
            <Bell className="mt-0.5 h-5 w-5 shrink-0 text-green-700 dark:text-green-300" />
          ) : (
            <BellOff className="mt-0.5 h-5 w-5 shrink-0 text-sky-700 dark:text-sky-300" />
          )}
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {isEnabled
                ? t.notifications.browserNotifications
                : t.notifications.enableBrowserNotifications}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isEnabled
                ? t.notifications.notificationPermissionGranted
                : permission === "denied"
                  ? t.notifications.notificationPermissionDenied
                  : t.notifications.browserNotificationsDescription}
            </p>
          </div>
        </div>
        {!isEnabled && permission !== "denied" ? (
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            onClick={() => void enable()}
          >
            {t.notifications.requestPermission}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
