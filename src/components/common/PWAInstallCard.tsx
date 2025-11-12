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
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

interface PWAInstallCardProps {
  compact?: boolean;
}

export const PWAInstallCard: React.FC<PWAInstallCardProps> = ({ compact = false }) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if app is installed on iOS
    if ((window.navigator as NavigatorStandalone).standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed
    const dismissed = localStorage.getItem("pwa-install-card-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const daysSinceDismissal =
        (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissal < 30) {
        setIsDismissed(true);
        return;
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // If no deferred prompt, browser will handle it natively
      return;
    }

    try {
      // Directly trigger the native browser install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error("Error installing PWA:", error);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("pwa-install-card-dismissed", Date.now().toString());
  };

  // Don't show if installed or dismissed
  if (isInstalled || isDismissed) {
    return null;
  }

  // Wait for theme to be mounted to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  // Mobile App Illustration Component
  const MobileAppIllustration = () => {
    return (
      <img
        src="/lovable-uploads/Bring-Solutions-To-Problems--Streamline-New-York (1).png"
        alt="Install App Illustration"
        className={cn(
          "w-full h-auto object-contain",
          compact ? "max-h-24" : "max-h-40"
        )}
        onError={(e) => {
          console.error('Image failed to load:', e);
        }}
      />
    );
  };

  return (
    <Card className={cn(compact && "p-0")}>
      <CardHeader className={cn(compact && "pb-3 px-4 pt-4")}>
        <CardTitle className="text-lg">Install App</CardTitle>
        <CardDescription>
          Download our app for a better experience
        </CardDescription>
      </CardHeader>
      <CardContent className={cn("space-y-4", compact && "space-y-3 px-4 pb-4")}>
        {/* Illustration */}
        <MobileAppIllustration />

        {/* Features List */}
        <div className={cn("space-y-2", compact && "space-y-1.5")}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className={cn("h-4 w-4 text-primary", compact && "h-3.5 w-3.5")} />
            <span>Works offline</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className={cn("h-4 w-4 text-primary", compact && "h-3.5 w-3.5")} />
            <span>Faster loading</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className={cn("h-4 w-4 text-primary", compact && "h-3.5 w-3.5")} />
            <span>Home screen access</span>
          </div>
        </div>

        {/* Download/Install Button */}
        <Button onClick={handleInstall} className={cn("w-full", compact && "h-9")}>
          <Download className={cn("mr-2 h-4 w-4", compact && "h-3.5 w-3.5")} />
          {deferredPrompt ? "Download & Install Now" : "Download App"}
        </Button>
      </CardContent>
    </Card>
  );
};
