import { useEffect, useState } from "react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    if ((window.navigator as NavigatorStandalone).standalone === true) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    setIsInstalling(true);

    if (deferredPrompt) {
      try {
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
          "Failed to trigger installation. Please try using your browser menu.",
        );
      } finally {
        setIsInstalling(false);
      }
      return;
    }

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

        setTimeout(() => {
          if (!promptReceived) {
            window.removeEventListener("beforeinstallprompt", handler);
            resolve(null);
          }
        }, 2000);
      },
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
          "Failed to trigger installation. Please try using your browser menu.",
        );
      } finally {
        setIsInstalling(false);
      }
      return;
    }

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (isIOS) {
      toast.info(
        "Tap the Share button, then select 'Add to Home Screen'",
        { duration: 4000 },
      );
      setIsInstalling(false);
      return;
    }

    try {
      if ("serviceWorker" in navigator) {
        await navigator.serviceWorker.ready;
        toast.info(
          "Install prompt not available. Check your browser menu for 'Install' or 'Add to Home Screen'.",
          { duration: 4000 },
        );
      }
    } catch (error) {
      console.error("Service worker check failed:", error);
    }

    setIsInstalling(false);
  };

  return {
    install,
    isInstalled,
    isInstalling,
    canInstall: Boolean(deferredPrompt),
  };
}
