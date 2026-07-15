import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/LanguageContext";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { usePwaUpdate } from "@/hooks/usePwaUpdate";

interface PWAUpdateCardProps {
  compact?: boolean;
}

export const PWAUpdateCard: React.FC<PWAUpdateCardProps> = ({
  compact = false,
}) => {
  const t = useTranslation();
  const { isInstalled } = usePwaInstall();
  const { isUpdateAvailable, remoteVersion, applyUpdate } = usePwaUpdate();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isInstalled || !isUpdateAvailable) {
    return null;
  }

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await applyUpdate();
    } finally {
      setIsUpdating(false);
    }
  };

  const description = t.settings.updateApp.description.replace(
    "{version}",
    remoteVersion ?? "",
  );

  return (
    <Card className={cn(compact && "p-0")}>
      <CardHeader className={cn(compact && "pb-3 px-4 pt-4")}>
        <CardTitle className="text-lg">{t.settings.updateApp.title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className={cn(compact && "px-4 pb-4")}>
        <Button
          onClick={() => void handleUpdate()}
          disabled={isUpdating}
          className={cn("w-full", compact && "h-9")}
        >
          <RefreshCw
            className={cn(
              "mr-2 h-4 w-4",
              compact && "h-3.5 w-3.5",
              isUpdating && "animate-spin",
            )}
          />
          {isUpdating
            ? t.settings.updateApp.updating
            : t.settings.updateApp.updateApp}
        </Button>
      </CardContent>
    </Card>
  );
};
