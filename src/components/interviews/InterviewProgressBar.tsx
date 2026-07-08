import React from "react";
import { cn } from "@/lib/utils";

interface InterviewProgressBarProps {
  current: number;
  total: number;
  completed: number;
}

export function InterviewProgressBar({
  current,
  total,
  completed,
}: InterviewProgressBarProps) {
  const safeTotal = Math.max(1, total);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-foreground">
          კითხვა {current} / {safeTotal}
        </span>
        <span className="text-muted-foreground">
          {completed} დასრულებული
        </span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: safeTotal }, (_, index) => {
          const n = index + 1;
          const isDone = n <= completed;
          const isCurrent = n === current;
          return (
            <div
              key={n}
              className={cn(
                "h-2 flex-1 rounded-full transition-colors duration-300",
                isDone
                  ? "bg-[#01bfff]"
                  : isCurrent
                    ? "bg-[#01bfff]/40"
                    : "bg-muted/60",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
