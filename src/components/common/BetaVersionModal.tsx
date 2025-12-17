import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";

const BETA_MODAL_SHOWN_KEY = "betaVersionModalShown";

export const BetaVersionModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useMobile();
  const { t } = useLanguage();

  useEffect(() => {
    // Check if modal has been shown in this session
    const hasBeenShown = sessionStorage.getItem(BETA_MODAL_SHOWN_KEY);
    if (!hasBeenShown) {
      // Small delay to ensure the app is fully loaded
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // Mark as shown in this session so it doesn't appear again
    sessionStorage.setItem(BETA_MODAL_SHOWN_KEY, "true");
  };

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleClose}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle className="text-xl font-bold">
              {t.beta.title}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-6 pb-2">
            <div className="flex-1 px-6 pb-4 flex flex-col items-center justify-center">
              <img
                src="/lovable-uploads/3dicons-rocket-front-color.png"
                alt="Rocket"
                className="w-32 h-32 md:w-40 md:h-40 object-contain mt-4"
              />
            </div>
            <DrawerDescription className="text-base">
              {t.beta.message}
            </DrawerDescription>
          </div>

          <div className="p-4">
            <DrawerClose asChild>
              <Button variant="default" className="w-full">
                {t.common.close}
              </Button>
            </DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {t.beta.title}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-4">
          <img
            src="/lovable-uploads/3dicons-rocket-front-color.png"
            alt="Rocket"
            className="w-32 h-32 md:w-40 md:h-40 object-contain"
          />
        </div>
        <div className="px-0 pb-2">
          <DialogDescription className="text-base">
            {t.beta.message}
          </DialogDescription>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="default" onClick={handleClose}>
            {t.common.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
