import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/contexts/LanguageContext";
import {
  canInstallPwa,
  initPwaInstall,
  installPwa,
  isPwaInstalled,
  subscribePwaInstall,
} from "@/lib/pwaInstall";

export function usePwaInstall() {
  const t = useTranslation();
  const [isInstalled, setIsInstalled] = useState(isPwaInstalled);
  const [canInstall, setCanInstall] = useState(canInstallPwa);
  const [isInstalling, setIsInstalling] = useState(false);

  const syncState = useCallback(() => {
    setIsInstalled(isPwaInstalled());
    setCanInstall(canInstallPwa());
  }, []);

  useEffect(() => {
    initPwaInstall();
    syncState();
    return subscribePwaInstall(syncState);
  }, [syncState]);

  const install = useCallback(async () => {
    setIsInstalling(true);

    try {
      const result = await installPwa();

      switch (result) {
        case "accepted":
        case "already-installed":
          setIsInstalled(true);
          toast.success(t.settings.downloadApp.installStarted);
          break;
        case "redirected":
          toast.info(t.settings.downloadApp.openingBrowser);
          break;
        case "ios-manual":
          // Guide is opened by installPwa()
          break;
        case "dismissed":
          toast.info(t.settings.downloadApp.installCancelled);
          break;
        case "unavailable":
          toast.error(t.settings.downloadApp.installUnavailable);
          break;
      }
    } finally {
      setIsInstalling(false);
      syncState();
    }
  }, [syncState, t]);

  return {
    install,
    isInstalled,
    isInstalling,
    canInstall,
  };
}
