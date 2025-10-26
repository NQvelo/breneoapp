import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Handle mounted state to avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-10 w-10">
        <Sun size={22} />
      </Button>
    );
  }

  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Moon size={22} /> : <Sun size={22} />}
    </Button>
  );
}
