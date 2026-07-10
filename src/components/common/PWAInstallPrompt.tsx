import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, X } from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";

export const PWAInstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const { install, isInstalled, canInstall } = usePwaInstall();

  useEffect(() => {
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const daysSinceDismissal =
        (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissal < 7) {
        return;
      }
    }

    if (canInstall) {
      const timeoutId = window.setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => window.clearTimeout(timeoutId);
    }
  }, [canInstall]);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  if (isInstalled || !canInstall || !showPrompt) {
    return null;
  }

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Install Breneo App
          </DialogTitle>
          <DialogDescription>
            Install Breneo as an app on your device for a better experience.
            Get quick access, work offline, and receive updates automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={async () => {
              await install();
              setShowPrompt(false);
            }}
            className="flex-1"
          >
            <Download className="mr-2 h-4 w-4" />
            Install Now
          </Button>
          <Button onClick={handleDismiss} variant="outline" className="flex-1">
            <X className="mr-2 h-4 w-4" />
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
