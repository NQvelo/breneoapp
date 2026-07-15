import React, { useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/LanguageContext";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { usePwaUpdate } from "@/hooks/usePwaUpdate";
import { cn } from "@/lib/utils";

type SettingsPwaAppCardVariant = "sidebar" | "compact";

interface SettingsPwaAppCardProps {
  variant?: SettingsPwaAppCardVariant;
}

export function SettingsPwaAppCard({
  variant = "sidebar",
}: SettingsPwaAppCardProps) {
  const t = useTranslation();
  const { install, isInstalled, isInstalling, canInstall } = usePwaInstall();
  const { isUpdateAvailable, remoteVersion, applyUpdate } = usePwaUpdate();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await applyUpdate();
    } finally {
      setIsUpdating(false);
    }
  };

  if (isInstalled && isUpdateAvailable) {
    const updateDescription = t.settings.updateApp.description.replace(
      "{version}",
      remoteVersion ?? "",
    );

    if (variant === "compact") {
      return (
        <div className="overflow-hidden rounded-3xl border-0 bg-white dark:bg-[#242424]">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center">
              <img
                src="/lovable-uploads/download-app-illustration.png"
                alt=""
                className="h-full w-full object-contain"
              />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">
                  {t.settings.updateApp.title}
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {updateDescription}
                </p>
              </div>

              <Button
                onClick={() => void handleUpdate()}
                disabled={isUpdating}
                size="sm"
                className="h-8 w-fit rounded-full bg-breneo-blue px-3 text-xs text-white hover:bg-breneo-blue/90"
              >
                <RefreshCw
                  className={cn(
                    "mr-1.5 h-3.5 w-3.5",
                    isUpdating && "animate-spin",
                  )}
                />
                {isUpdating
                  ? t.settings.updateApp.updating
                  : t.settings.updateApp.updateApp}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl border-0 bg-white p-6 shadow-sm",
          "dark:bg-[#242424]",
        )}
      >
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-sky-200/50 blur-3xl dark:bg-sky-500/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-breneo-blue/10 blur-2xl"
          aria-hidden
        />

        <div className="relative">
          <div className="relative mx-auto mb-5 w-full">
            <img
              src="/lovable-uploads/download-app-illustration.png"
              alt=""
              className="w-full object-contain"
            />
          </div>

          <div className="space-y-2 text-center">
            <h3 className="text-xl font-bold text-foreground">
              {t.settings.updateApp.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {updateDescription}
            </p>
          </div>

          <Button
            onClick={() => void handleUpdate()}
            disabled={isUpdating}
            className="mt-6 h-11 w-full rounded-full bg-breneo-blue text-white hover:bg-breneo-blue/90"
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", isUpdating && "animate-spin")}
            />
            {isUpdating
              ? t.settings.updateApp.updating
              : t.settings.updateApp.updateApp}
          </Button>
        </div>
      </div>
    );
  }

  if (isInstalled) {
    return null;
  }

  const buttonLabel = isInstalling
    ? t.settings.downloadApp.preparing
    : canInstall
      ? t.settings.downloadApp.installNow
      : t.settings.downloadApp.downloadApp;

  if (variant === "compact") {
    return (
      <div className="overflow-hidden rounded-3xl border-0 bg-white dark:bg-[#242424]">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center">
            <img
              src="/lovable-uploads/download-app-illustration.png"
              alt=""
              className="h-full w-full object-contain"
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">
                {t.settings.downloadApp.title}
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t.settings.downloadApp.description}
              </p>
            </div>

            <Button
              onClick={install}
              disabled={isInstalling}
              size="sm"
              className="h-8 w-fit rounded-full bg-breneo-blue px-3 text-xs text-white hover:bg-breneo-blue/90"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              {buttonLabel}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border-0 bg-white p-6 shadow-sm",
        "dark:bg-[#242424]",
      )}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-sky-200/50 blur-3xl dark:bg-sky-500/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-breneo-blue/10 blur-2xl"
        aria-hidden
      />

      <div className="relative">
        <div className="relative mx-auto mb-5 w-full">
          <img
            src="/lovable-uploads/download-app-illustration.png"
            alt=""
            className="w-full object-contain"
          />
        </div>

        <div className="space-y-2 text-center">
          <h3 className="text-xl font-bold text-foreground">
            {t.settings.downloadApp.title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t.settings.downloadApp.description}
          </p>
        </div>

        <Button
          onClick={install}
          disabled={isInstalling}
          className="mt-6 h-11 w-full rounded-full bg-breneo-blue text-white hover:bg-breneo-blue/90"
        >
          <Download className="mr-2 h-4 w-4" />
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}
