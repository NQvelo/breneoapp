import React from "react";
import { useFontSize } from "@/contexts/FontSizeContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Type } from "lucide-react";
import { cn } from "@/lib/utils";

export function FontSizeSelector() {
  const { fontSize, setFontSize } = useFontSize();

  const fontSizeLabels: Record<typeof fontSize, string> = {
    small: "Small",
    medium: "Medium",
    big: "Big",
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full bg-gray-200 dark:bg-border/50 hover:bg-gray-300 dark:hover:bg-border/70
                     text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          aria-label="Font size selector"
        >
          <Type className="h-5 w-5" />
          <span className="sr-only">Font size</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem
          onClick={() => setFontSize("small")}
          className={cn(
            "cursor-pointer",
            fontSize === "small" && "bg-accent"
          )}
        >
          <span className="text-sm">Small</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setFontSize("medium")}
          className={cn(
            "cursor-pointer",
            fontSize === "medium" && "bg-accent"
          )}
        >
          <span className="text-base">Medium</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setFontSize("big")}
          className={cn(
            "cursor-pointer",
            fontSize === "big" && "bg-accent"
          )}
        >
          <span className="text-lg">Big</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

