import React, { useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const PWAInstallCard: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isChrome, setIsChrome] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if app is installed on iOS
    const nav = window.navigator as Navigator & { standalone?: boolean };
    if (nav.standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Detect platform and browser
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    const isChromeBrowser = /chrome/.test(userAgent) && !/edg/.test(userAgent);
    const isEdgeBrowser = /edg/.test(userAgent);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsChrome(isChromeBrowser || isEdgeBrowser);

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
      const prompt = e as BeforeInstallPromptEvent;
      deferredPromptRef.current = prompt;
      setDeferredPrompt(prompt);
    };

    // Listen for the beforeinstallprompt event
    window.addEventListener("beforeinstallprompt", handler);

    // Also check if prompt is already available (for cases where event fired before component mounted)
    // This is a workaround - we can't directly access it, but we can set up the listener

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);

    // Check if we have the deferred prompt (using ref for immediate check)
    const currentPrompt = deferredPromptRef.current || deferredPrompt;

    // If we have the deferred prompt, use it immediately
    if (currentPrompt) {
      try {
        currentPrompt.prompt();
        const { outcome } = await currentPrompt.userChoice;

        if (outcome === "accepted") {
          setIsInstalled(true);
          setDeferredPrompt(null);
          deferredPromptRef.current = null;
          toast.success("App installed successfully!", {
            description: "Breneo is now available on your device",
          });
        } else {
          toast.info("Installation cancelled", {
            description: "You can install the app anytime from your browser",
          });
        }
      } catch (error) {
        console.error("Error installing PWA:", error);
        toast.error("Installation failed", {
          description: "Please try again or follow the manual instructions",
        });
      } finally {
        setIsInstalling(false);
      }
      return;
    }

    // Wait a brief moment to see if the prompt becomes available
    // Sometimes the beforeinstallprompt event fires on user interaction
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Check again if prompt is now available (using ref for immediate access)
    const promptAfterWait = deferredPromptRef.current || deferredPrompt;
    if (promptAfterWait) {
      try {
        promptAfterWait.prompt();
        const { outcome } = await promptAfterWait.userChoice;

        if (outcome === "accepted") {
          setIsInstalled(true);
          setDeferredPrompt(null);
          deferredPromptRef.current = null;
          toast.success("App installed successfully!", {
            description: "Breneo is now available on your device",
          });
        } else {
          toast.info("Installation cancelled", {
            description: "You can install the app anytime from your browser",
          });
        }
      } catch (error) {
        console.error("Error installing PWA:", error);
        toast.error("Installation failed", {
          description: "Please try again or follow the manual instructions",
        });
      } finally {
        setIsInstalling(false);
      }
      return;
    }

    // For iOS - show instructions immediately
    if (isIOS) {
      const instructions = document.getElementById("pwa-instructions");
      if (instructions) {
        instructions.scrollIntoView({ behavior: "smooth", block: "center" });
        instructions.classList.add("ring-2", "ring-primary", "ring-offset-2");
        setTimeout(() => {
          instructions.classList.remove(
            "ring-2",
            "ring-primary",
            "ring-offset-2"
          );
        }, 3000);
      }
      toast.info("Install on iOS", {
        description: "Use Safari's Share button → Add to Home Screen",
        duration: 5000,
      });
      setIsInstalling(false);
      return;
    }

    // For Android Chrome - show instructions
    if (isAndroid) {
      toast.info("Installing...", {
        description: isChrome
          ? "Check for install prompt, or use Chrome menu → Install app"
          : "Use Chrome browser for the best installation experience",
        duration: 4000,
      });

      // Scroll to instructions
      const instructions = document.getElementById("pwa-instructions");
      if (instructions) {
        setTimeout(() => {
          instructions.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 500);
      }
      setIsInstalling(false);
      return;
    }

    // For desktop browsers - show instructions
    toast.info("Installing app...", {
      description: "Look for the install prompt, or check your browser menu",
      duration: 4000,
    });

    // Scroll to instructions
    const instructions = document.getElementById("pwa-instructions");
    if (instructions) {
      setTimeout(() => {
        instructions.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
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

        {/* Download/Install Button - Always visible and triggers install directly */}
        <Button
          onClick={handleInstall}
          className="w-full"
          size="lg"
          disabled={isInstalling}
        >
          <Download className="mr-2 h-4 w-4" />
          {isInstalling
            ? "Installing..."
            : deferredPrompt
            ? "Download & Install Now"
            : "Download App"}
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
