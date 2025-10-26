import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Handle mounted state to avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Sun size={22} />;
  }

  const isDark = theme === "dark";

  return isDark ? <Moon size={22} /> : <Sun size={22} />;
}
