import { Briefcase } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { normalizeNotificationLogoUrl } from "@/api/notifications/notificationDisplayUtils";

type NotificationCompanyLogoProps = {
  logo?: string;
  companyName?: string;
  className?: string;
};

function companyInitials(companyName?: string): string {
  if (!companyName?.trim()) return "";
  const parts = companyName.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function NotificationCompanyLogo({
  logo,
  companyName,
  className,
}: NotificationCompanyLogoProps) {
  const [imageError, setImageError] = useState(false);
  const initials = companyInitials(companyName);
  const normalizedLogo = normalizeNotificationLogoUrl(logo);
  const showLogo = Boolean(normalizedLogo) && !imageError;

  useEffect(() => {
    setImageError(false);
  }, [normalizedLogo]);

  return (
    <div
      className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-breneo-accent",
        className,
      )}
    >
      {showLogo ? (
        <img
          src={normalizedLogo}
          alt={companyName ? `${companyName} logo` : "Company logo"}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setImageError(true)}
        />
      ) : initials ? (
        <span className="text-sm font-semibold text-white">{initials}</span>
      ) : (
        <Briefcase className="h-5 w-5 text-white" />
      )}
    </div>
  );
}
