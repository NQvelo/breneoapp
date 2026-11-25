import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type CompanyLogoProps = {
  src?: string | null;
  companyName?: string | null;
  className?: string;
  imageClassName?: string;
};

export function CompanyLogo({
  src,
  companyName,
  className,
  imageClassName,
}: CompanyLogoProps) {
  const [imageError, setImageError] = useState(false);
  const normalizedSrc = typeof src === "string" && src.trim() ? src.trim() : "";
  const initial =
    companyName?.trim().charAt(0).toUpperCase() ||
    "C";

  useEffect(() => {
    setImageError(false);
  }, [normalizedSrc]);

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-breneo-blue/10 text-breneo-blue",
        className,
      )}
      aria-label={companyName ? `${companyName} logo` : "Company logo"}
    >
      {normalizedSrc && !imageError ? (
        <img
          src={normalizedSrc}
          alt={companyName ? `${companyName} logo` : "Company logo"}
          className={cn("h-full w-full object-cover", imageClassName)}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
        />
      ) : (
        <span aria-hidden="true" className="text-sm font-semibold">
          {initial}
        </span>
      )}
    </div>
  );
}
