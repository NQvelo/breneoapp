import * as React from "react";
import { cn } from "@/lib/utils";

interface RadialProgressProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  matchLabel?: "GOOD MATCH" | "FAIR MATCH";
  percentageTextSize?: "sm" | "md" | "lg" | "xl";
}

export const RadialProgress = React.forwardRef<
  HTMLDivElement,
  RadialProgressProps
>(
  (
    {
      value,
      size = 60,
      strokeWidth = 3,
      className,
      showLabel = true,
      matchLabel,
      percentageTextSize = "lg",
    },
    ref
  ) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const clampedValue = Math.max(0, Math.min(100, value));
    const offset = circumference - (clampedValue / 100) * circumference;

    // Determine match label if not provided
    const label = matchLabel || (value >= 70 ? "GOOD MATCH" : "FAIR MATCH");

    // Percentage text size classes
    const textSizeClasses = {
      sm: "text-xs",
      md: "text-sm",
      lg: "text-lg",
      xl: "text-xl",
    };

    return (
      <div ref={ref} className={cn("flex items-center gap-2", className)}>
        {showLabel && (
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
            {label}
          </span>
        )}
        <div className="relative" style={{ width: size, height: size }}>
          <svg
            width={size}
            height={size}
            className="transform -rotate-90"
            style={{ overflow: "visible" }}
          >
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-gray-200/40 dark:text-gray-700/40"
            />
            {/* Progress circle – starts from the top because of -rotate-90 */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
          </svg>
          {/* Percentage text in center - bigger */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={cn(
                "font-bold text-gray-700 dark:text-gray-300",
                textSizeClasses[percentageTextSize]
              )}
            >
              {Math.round(value)}%
            </span>
          </div>
        </div>
      </div>
    );
  }
);

RadialProgress.displayName = "RadialProgress";










