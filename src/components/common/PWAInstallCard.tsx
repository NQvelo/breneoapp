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

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

export const PWAInstallCard: React.FC = () => {
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

  const isDark = theme === "dark";

  // Mobile App Illustration Component
  const MobileAppIllustration = () => (
    <div className="w-full h-32 flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 rounded-lg overflow-hidden relative">
      <svg
        viewBox="0 0 200 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Phone Frame */}
        <rect
          x="60"
          y="15"
          width="80"
          height="90"
          rx="8"
          fill={isDark ? "#1a1a1a" : "#ffffff"}
          stroke={isDark ? "#333333" : "#e5e5e5"}
          strokeWidth="2"
        />
        
        {/* Screen Content */}
        <rect
          x="65"
          y="25"
          width="70"
          height="75"
          rx="4"
          fill={isDark ? "#0a0a0a" : "#f5f5f5"}
        />
        
        {/* App Icon Grid */}
        <circle cx="82" cy="42" r="4" fill={isDark ? "#3b82f6" : "#2563eb"} />
        <circle cx="100" cy="42" r="4" fill={isDark ? "#10b981" : "#059669"} />
        <circle cx="118" cy="42" r="4" fill={isDark ? "#f59e0b" : "#d97706"} />
        
        <rect
          x="75"
          y="52"
          width="30"
          height="4"
          rx="2"
          fill={isDark ? "#374151" : "#9ca3af"}
        />
        <rect
          x="75"
          y="60"
          width="40"
          height="4"
          rx="2"
          fill={isDark ? "#4b5563" : "#6b7280"}
        />
        
        {/* Download Arrow */}
        <g transform="translate(135, 35)">
          <circle
            cx="0"
            cy="0"
            r="12"
            fill={isDark ? "#3b82f6" : "#2563eb"}
            opacity="0.2"
          />
          <path
            d="M-4 -2 L0 2 L4 -2 M0 2 L0 -6"
            stroke={isDark ? "#60a5fa" : "#3b82f6"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
        
        {/* Sparkles/Stars */}
        <circle
          cx="45"
          cy="35"
          r="2"
          fill={isDark ? "#fbbf24" : "#f59e0b"}
          opacity="0.6"
        />
        <circle
          cx="155"
          cy="55"
          r="1.5"
          fill={isDark ? "#60a5fa" : "#3b82f6"}
          opacity="0.6"
        />
        <circle
          cx="50"
          cy="75"
          r="1.5"
          fill={isDark ? "#a78bfa" : "#8b5cf6"}
          opacity="0.6"
        />
        <circle
          cx="150"
          cy="85"
          r="2"
          fill={isDark ? "#34d399" : "#10b981"}
          opacity="0.6"
        />
      </svg>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Install App</CardTitle>
        <CardDescription>
          Download our app for a better experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Illustration */}
        <MobileAppIllustration />

        {/* Features List */}
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

        {/* Download/Install Button */}
        <Button onClick={handleInstall} className="w-full">
          <Download className="mr-2 h-4 w-4" />
          {deferredPrompt ? "Download & Install Now" : "Download App"}
        </Button>
      </CardContent>
    </Card>
  );
};
