import { useEffect } from "react";
import { useTheme } from "next-themes";

/**
 * Component that updates mobile status bar and theme colors based on current theme
 */
export const ThemeMetaUpdater: React.FC = () => {
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    // Use resolvedTheme to handle initial load correctly
    const currentTheme = resolvedTheme || theme || "light";
    const isDark = currentTheme === "dark";

    // Update theme-color meta tag for mobile browsers
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", isDark ? "#000000" : "#FFFFFF");
    } else {
      // Create if it doesn't exist
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = isDark ? "#000000" : "#FFFFFF";
      document.getElementsByTagName("head")[0].appendChild(meta);
    }

    // Update iOS status bar style
    // "default" = dark text on light status bar (for light backgrounds)
    // "black" = light text on dark status bar (for dark backgrounds)
    const iosStatusBarMeta = document.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]'
    );
    if (iosStatusBarMeta) {
      iosStatusBarMeta.setAttribute(
        "content",
        isDark ? "black" : "default"
      );
    }

    // Update msapplication-TileColor for Windows
    const tileColorMeta = document.querySelector(
      'meta[name="msapplication-TileColor"]'
    );
    if (tileColorMeta) {
      tileColorMeta.setAttribute("content", isDark ? "#000000" : "#FFFFFF");
    }
  }, [theme, resolvedTheme]);

  return null; // This component doesn't render anything
};

