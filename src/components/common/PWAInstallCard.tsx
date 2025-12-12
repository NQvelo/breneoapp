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
import { toast } from "sonner";

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

export const PWAInstallCard: React.FC<PWAInstallCardProps> = ({
  compact = false,
}) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

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

    // Also check if service worker is ready and try to get prompt
    // Sometimes the event fires after a delay
    const checkInstallability = async () => {
      try {
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.ready;
          // The prompt might be available even if event hasn't fired
          // We'll wait a bit for it
        }
      } catch (error) {
        console.log("Service worker check:", error);
      }
    };

    // Wait a bit for the prompt to become available
    const timeoutId = setTimeout(() => {
      checkInstallability();
    }, 1000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timeoutId);
    };
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);

    // If we have a deferred prompt, use it immediately
    if (deferredPrompt) {
      try {
        // Directly trigger the native browser install prompt
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
          setIsInstalled(true);
          setDeferredPrompt(null);
          toast.success("App installation started!");
        } else {
          toast.info("Installation cancelled. You can try again later.");
        }
      } catch (error) {
        console.error("Error installing PWA:", error);
        toast.error(
          "Failed to trigger installation. Please try using your browser menu."
        );
      } finally {
        setIsInstalling(false);
      }
      return;
    }

    // If no prompt yet, wait a moment for it to become available
    // Sometimes the event fires with a delay
    let promptReceived = false;
    const waitForPrompt = new Promise<BeforeInstallPromptEvent | null>(
      (resolve) => {
        const handler = (e: Event) => {
          e.preventDefault();
          promptReceived = true;
          const prompt = e as BeforeInstallPromptEvent;
          setDeferredPrompt(prompt);
          resolve(prompt);
        };

        window.addEventListener("beforeinstallprompt", handler, { once: true });

        // Wait up to 2 seconds for the prompt
        setTimeout(() => {
          if (!promptReceived) {
            window.removeEventListener("beforeinstallprompt", handler);
            resolve(null);
          }
        }, 2000);
      }
    );

    const prompt = await waitForPrompt;

    if (prompt) {
      try {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;

        if (outcome === "accepted") {
          setIsInstalled(true);
          setDeferredPrompt(null);
          toast.success("App installation started!");
        } else {
          toast.info("Installation cancelled. You can try again later.");
        }
      } catch (error) {
        console.error("Error installing PWA:", error);
        toast.error(
          "Failed to trigger installation. Please try using your browser menu."
        );
      } finally {
        setIsInstalling(false);
      }
      return;
    }

    // If still no prompt, check if it's iOS (which doesn't support beforeinstallprompt)
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (isIOS) {
      // For iOS, we can't programmatically trigger install
      // But we can show a less intrusive message
      toast.info(
        "Tap the Share button (square with arrow), then select 'Add to Home Screen'",
        { duration: 4000 }
      );
      setIsInstalling(false);
      return;
    }

    // For other browsers, the app might not be installable yet
    // Check if service worker is registered
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        // Service worker is ready, but prompt didn't fire
        // This might mean the app isn't installable or was already dismissed
        toast.info(
          "Install prompt not available. Please check your browser's menu for 'Install' or 'Add to Home Screen' option.",
          { duration: 4000 }
        );
      }
    } catch (error) {
      console.error("Service worker check failed:", error);
    }

    setIsInstalling(false);
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
        src="/lovable-uploads/3dicons-rocket-front-color.png"
        alt="Install App Illustration"
        className={cn(
          "w-full h-auto object-contain",
          compact ? "max-h-24" : "max-h-40"
        )}
        onError={(e) => {
          console.error("Image failed to load:", e);
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
      <CardContent
        className={cn("space-y-4", compact && "space-y-3 px-4 pb-4")}
      >
        {/* Illustration */}
        <MobileAppIllustration />

        {/* Features List */}
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

        {/* Download/Install Button */}
        <Button
          onClick={handleInstall}
          disabled={isInstalling}
          className={cn("w-full", compact && "h-9")}
        >
          <Download className={cn("mr-2 h-4 w-4", compact && "h-3.5 w-3.5")} />
          {isInstalling
            ? "Preparing..."
            : deferredPrompt
            ? "Download & Install Now"
            : "Download App"}
        </Button>
      </CardContent>
    </Card>
  );
};
