import React from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface BreneoLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
}

const LIGHT_LOGO = "/lovable-uploads/Breneo-logo.png";
const DARK_LOGO = "/lovable-uploads/Breneo-logo-dark.png";

/**
 * Theme-aware Breneo logo. Shows Breneo-logo.png in light mode and
 * Breneo-logo-dark.png in dark mode.
 */
export function BreneoLogo({ className, ...props }: BreneoLogoProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && (resolvedTheme ?? theme) === "dark";
  const logoSrc = isDark ? DARK_LOGO : LIGHT_LOGO;

  return (
    <img
      src={logoSrc}
      alt="Breneo Logo"
      className={cn("object-contain", className)}
      {...props}
    />
  );
}
