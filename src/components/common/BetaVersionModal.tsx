import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "@/components/icons";
import { useMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePwaUpdate } from "@/hooks/usePwaUpdate";
import { cn } from "@/lib/utils";

export const BetaVersionModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const isMobile = useMobile();
  const { t } = useLanguage();
  const { isAppUpdateReady, remoteVersion, applyUpdate } = usePwaUpdate();

  useEffect(() => {
    if (!isAppUpdateReady) {
      setIsOpen(false);
      setDismissed(false);
      return;
    }

    if (dismissed) return;

    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [isAppUpdateReady, dismissed]);

  useEffect(() => {
    if (!isOpen || isMobile || isUpdating) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setDismissed(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isMobile, isUpdating]);

  const handleDismiss = (open: boolean) => {
    if (open || isUpdating) return;
    setIsOpen(false);
    setDismissed(true);
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await applyUpdate();
    } catch {
      setIsUpdating(false);
    }
  };

  const message = remoteVersion
    ? t.appUpdate.message.replace("{version}", remoteVersion)
    : t.appUpdate.messageGeneric;

  const updateButton = (
    <Button
      variant="default"
      size="default"
      className="w-full"
      onClick={() => void handleUpdate()}
      disabled={isUpdating}
    >
      <RefreshCw className={cn("mr-2 h-4 w-4", isUpdating && "animate-spin")} />
      {isUpdating ? t.appUpdate.updating : t.appUpdate.update}
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleDismiss}>
        <DrawerContent className="max-h-[85vh]">
          <div className="px-6 pb-0">
            <div className="flex flex-col items-center justify-center pb-4">
              <img
                src="/lovable-uploads/3dicons-rocket-front-color.png"
                alt=""
                className="h-32 w-32 object-contain"
              />
            </div>
            <DrawerHeader className="px-0 pt-0 pb-4">
              <DrawerTitle className="text-xl font-bold">
                {t.appUpdate.title}
              </DrawerTitle>
            </DrawerHeader>
            <DrawerDescription className="text-base">
              {message}
            </DrawerDescription>
          </div>
          <div className="px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-10">
            {updateButton}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-labelledby="app-update-title"
      aria-describedby="app-update-message"
      className="fixed bottom-6 right-6 z-[70] w-[min(20rem,calc(100vw-3rem))] rounded-2xl border bg-background p-4 shadow-lg animate-in fade-in-0 slide-in-from-bottom-2"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-3 top-3 text-black hover:text-black dark:text-white dark:hover:text-white"
        onClick={() => handleDismiss(false)}
        aria-label={t.common.close}
      >
        <X className="h-5 w-5" />
      </Button>
      <h2 id="app-update-title" className="pr-6 text-sm font-semibold">
        {t.appUpdate.title}
      </h2>
      <p
        id="app-update-message"
        className="mt-1 text-sm leading-snug text-muted-foreground"
      >
        {message}
      </p>
      <div className="mt-3">{updateButton}</div>
    </div>,
    document.body,
  );
};
