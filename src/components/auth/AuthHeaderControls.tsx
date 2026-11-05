import React from "react";
import { useTheme } from "next-themes";
import { Check, Globe, Moon, Sun } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage, type Language } from "@/contexts/LanguageContext";

const pillClassName =
  "relative h-10 rounded-full bg-gray-200 dark:bg-border/50 hover:bg-gray-300 dark:hover:bg-border/70 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors";

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ka", label: "ქართული" },
];

export function AuthHeaderControls() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={`${pillClassName} px-3 text-sm font-medium flex items-center gap-2`}
          >
            <Globe className="h-4 w-4" />
            <span>{language.toUpperCase()}</span>
            <span className="sr-only">Change language</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[10rem]">
          {LANGUAGE_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setLanguage(option.value)}
              className="flex items-center justify-between"
            >
              {option.label}
              {language === option.value && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className={`${pillClassName} w-10`}
      >
        {mounted && theme === "dark" ? (
          <Moon className="h-5 w-5" />
        ) : (
          <Sun className="h-5 w-5" />
        )}
        <span className="sr-only">Toggle theme</span>
      </Button>
    </div>
  );
}
