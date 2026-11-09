import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "@/components/icons";
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
      className="w-full"
      onClick={() => void handleUpdate()}
      disabled={isUpdating}
    >
      <RefreshCw className={cn("mr-2 h-4 w-4", isUpdating && "animate-spin")} />
      {isUpdating ? t.appUpdate.updating : t.appUpdate.update}
    </Button>
  );

  const rocket = (
    <img
      src="/lovable-uploads/3dicons-rocket-front-color.png"
      alt=""
      className="w-32 h-32 md:w-40 md:h-40 object-contain"
    />
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleDismiss}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle className="text-xl font-bold">
              {t.appUpdate.title}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-6 pb-2">
            <div className="flex flex-col items-center justify-center pb-4">
              {rocket}
            </div>
            <DrawerDescription className="text-base">
              {message}
            </DrawerDescription>
          </div>
          <div className="p-4">{updateButton}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDismiss}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {t.appUpdate.title}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-4">
          {rocket}
        </div>
        <DialogDescription className="text-base">{message}</DialogDescription>
        <div className="pt-4">{updateButton}</div>
      </DialogContent>
    </Dialog>
  );
};
