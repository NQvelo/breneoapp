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
    // Check if modal has been shown before
    const hasBeenShown = localStorage.getItem(BETA_MODAL_SHOWN_KEY);
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
    // Mark as shown so it doesn't appear again
    localStorage.setItem(BETA_MODAL_SHOWN_KEY, "true");
  };

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleClose}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle className="text-xl font-semibold">
              {t.beta?.title || "Beta Version"}
            </DrawerTitle>
            <DrawerDescription className="text-base mt-2">
              {t.beta?.message || "This is a beta version and we are working on updates."}
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="pt-4">
            <DrawerClose asChild>
              <Button 
                onClick={handleClose} 
                className="w-full"
                size="lg"
              >
                {t.common?.close || "Close"}
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {t.beta?.title || "Beta Version"}
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            {t.beta?.message || "This is a beta version and we are working on updates."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-4">
          <Button 
            onClick={handleClose} 
            className="w-full sm:w-auto"
            size="lg"
          >
            {t.common?.close || "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

