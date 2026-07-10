import React from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/LanguageContext";
import {
  getSettingsSectionLabel,
  type SettingsSection,
} from "@/constants/settingsSections";

interface SettingsMobileHeaderProps {
  activeSection: SettingsSection | null;
  onBack: () => void;
}

export function SettingsMobileHeader({
  activeSection,
  onBack,
}: SettingsMobileHeaderProps) {
  const t = useTranslation();
  const showListView = activeSection === null;

  return (
    <div className="mb-4 md:hidden">
      {showListView ? (
        <h1 className="text-2xl font-semibold text-foreground">
          {t.settings.title}
        </h1>
      ) : (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label={t.common.back}
            className="relative h-10 w-10 shrink-0 rounded-full bg-gray-200 dark:bg-border/50 hover:bg-gray-300 dark:hover:bg-border/70 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="min-w-0 text-lg font-semibold text-foreground">
            {getSettingsSectionLabel(activeSection, t)}
          </h1>
        </div>
      )}
    </div>
  );
}
