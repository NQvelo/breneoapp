import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePwaInstall } from "@/hooks/usePwaInstall";

interface PWAInstallCardProps {
  compact?: boolean;
}

export const PWAInstallCard: React.FC<PWAInstallCardProps> = ({
  compact = false,
}) => {
  const [mounted, setMounted] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { install, isInstalled, isInstalling, canInstall } = usePwaInstall();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const dismissed = localStorage.getItem("pwa-install-card-dismissed");
    if (!dismissed) return;

    const dismissedTime = parseInt(dismissed, 10);
    const daysSinceDismissal =
      (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
    if (daysSinceDismissal < 30) {
      setIsDismissed(true);
    }
  }, []);

  if (isInstalled || isDismissed || !mounted) {
    return null;
  }

  return (
    <Card className={cn(compact && "p-0")}>
      <CardHeader className={cn(compact && "pb-3 px-4 pt-4")}>
        <CardTitle className="text-lg">Install App</CardTitle>
        <CardDescription>
          Download our app for a better experience
        </CardDescription>
      </CardHeader>
      <CardContent
        className={cn("space-y-4", compact && "space-y-3 px-4 pb-4")}
      >
        <img
          src="/lovable-uploads/3dicons-rocket-front-color.png"
          alt="Install App Illustration"
          className={cn(
            "w-full h-auto object-contain",
            compact ? "max-h-24" : "max-h-40",
          )}
        />

        <div className={cn("space-y-2", compact && "space-y-1.5")}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2
              className={cn("h-4 w-4 text-primary", compact && "h-3.5 w-3.5")}
            />
            <span>Works offline</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2
              className={cn("h-4 w-4 text-primary", compact && "h-3.5 w-3.5")}
            />
            <span>Faster loading</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2
              className={cn("h-4 w-4 text-primary", compact && "h-3.5 w-3.5")}
            />
            <span>Home screen access</span>
          </div>
        </div>

        <Button
          onClick={install}
          disabled={isInstalling}
          className={cn("w-full", compact && "h-9")}
        >
          <Download className={cn("mr-2 h-4 w-4", compact && "h-3.5 w-3.5")} />
          {isInstalling
            ? "Preparing..."
            : canInstall
              ? "Download & Install Now"
              : "Download App"}
        </Button>
      </CardContent>
    </Card>
  );
};
