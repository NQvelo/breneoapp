import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, CheckCircle2, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

export const PWAInstallCard: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isChrome, setIsChrome] = useState(false);

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

    // Detect platform and browser
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    const isChromeBrowser = /chrome/.test(userAgent) && !/edg/.test(userAgent);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsChrome(isChromeBrowser);

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
      // If no deferred prompt, try to trigger browser's native install dialog
      // by scrolling to instructions (for iOS) or doing nothing (browser will handle)
      const instructions = document.getElementById("pwa-instructions");
      if (instructions) {
        instructions.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
      return;
    }

    try {
      // Directly trigger the native browser install prompt - no alerts
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
      // Silently handle the outcome - no toast notifications
    } catch (error) {
      console.error("Error installing PWA:", error);
      // Silently handle errors - user can try again
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

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Install Breneo App</CardTitle>
              <CardDescription>
                Download our app for a better experience
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>Works offline</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>Faster loading</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>Home screen access</span>
          </div>
        </div>

        {/* Download/Install Button - Always visible */}
        <Button onClick={handleInstall} className="w-full" size="lg">
          <Download className="mr-2 h-4 w-4" />
          {deferredPrompt ? "Download & Install Now" : "Download App"}
        </Button>

        {/* Instructions Section */}
        <div id="pwa-instructions" className="space-y-3">
          {isIOS && !deferredPrompt && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
              <p className="text-sm font-medium">Install on iOS (Safari):</p>
              <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>
                  Tap the Share button{" "}
                  <span className="font-semibold text-foreground">(□↑)</span> at
                  the bottom of the screen
                </li>
                <li>
                  Scroll down and tap{" "}
                  <span className="font-semibold text-foreground">
                    "Add to Home Screen"
                  </span>
                </li>
                <li>
                  Tap{" "}
                  <span className="font-semibold text-foreground">"Add"</span>{" "}
                  in the top right corner
                </li>
              </ol>
            </div>
          )}

          {isAndroid && !deferredPrompt && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
              <p className="text-sm font-medium">Install on Android:</p>
              {isChrome ? (
                <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                  <li>
                    Tap the menu{" "}
                    <span className="font-semibold text-foreground">(⋮)</span>{" "}
                    in the top right
                  </li>
                  <li>
                    Select{" "}
                    <span className="font-semibold text-foreground">
                      "Install app"
                    </span>{" "}
                    or{" "}
                    <span className="font-semibold text-foreground">
                      "Add to Home screen"
                    </span>
                  </li>
                  <li>
                    Tap{" "}
                    <span className="font-semibold text-foreground">
                      "Install"
                    </span>{" "}
                    to confirm
                  </li>
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Use Chrome browser for the best installation experience. Look
                  for the install prompt in your browser menu.
                </p>
              )}
            </div>
          )}

          {!isIOS && !isAndroid && !deferredPrompt && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
              <p className="text-sm font-medium">Install Instructions:</p>
              {isChrome ? (
                <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                  <li>
                    Look for the install icon{" "}
                    <span className="font-semibold text-foreground">(⊕)</span>{" "}
                    in your browser's address bar
                  </li>
                  <li>
                    Or click the menu{" "}
                    <span className="font-semibold text-foreground">(⋮)</span>{" "}
                    and select{" "}
                    <span className="font-semibold text-foreground">
                      "Install Breneo"
                    </span>
                  </li>
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Look for the install icon in your browser's address bar, or
                  check the browser menu for installation options.
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
