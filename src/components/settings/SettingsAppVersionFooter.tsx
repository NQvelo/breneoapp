import React from "react";
import { useTranslation } from "@/contexts/LanguageContext";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { usePwaUpdate } from "@/hooks/usePwaUpdate";

export function SettingsAppVersionFooter() {
  const t = useTranslation();
  const { isInstalled } = usePwaInstall();
  const { isUpdateAvailable, applyUpdate } = usePwaUpdate();

  return (
    <p className="pt-6 text-center text-xs text-gray-500 dark:text-gray-400">
      {t.settings.appVersion.version.replace("{version}", __APP_VERSION__)}
      {isInstalled && isUpdateAvailable ? (
        <>
          {" · "}
          <button
            type="button"
            onClick={() => void applyUpdate()}
            className="font-medium text-breneo-blue hover:underline"
          >
            {t.settings.appVersion.updateApp}
          </button>
        </>
      ) : null}
    </p>
  );
}
