import React from "react";
import { RadialProgress } from "@/components/ui/radial-progress";
import { getMatchQualityLabel } from "@/utils/jobMatchUtils";
import { cn } from "@/lib/utils";

interface JobMatchIndicatorProps {
  matchPercentage?: number | null;
  size?: number;
  showLabel?: boolean;
  /** Label beside the circle (list rows) or stacked under it (profile card). */
  labelPosition?: "beside" | "below";
  className?: string;
}

/** Radial match % + quality label (same pattern as job list cards). */
export function JobMatchIndicator({
  matchPercentage,
  size = 44,
  showLabel = true,
  labelPosition = "beside",
  className,
}: JobMatchIndicatorProps) {
  if (matchPercentage == null || matchPercentage < 0) {
    return null;
  }

  const labelBelow = labelPosition === "below";

  return (
    <div
      className={cn(
        "flex shrink-0",
        labelBelow ? "flex-col items-center gap-1.5" : "items-center gap-2",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <RadialProgress
        value={matchPercentage}
        size={size}
        strokeWidth={5}
        showLabel={false}
        percentageTextSize="sm"
        className="text-breneo-blue"
      />
      {showLabel ? (
        <span
          className={cn(
            "text-xs font-semibold text-gray-700 dark:text-gray-100",
            labelBelow ? "text-center" : "whitespace-nowrap",
          )}
        >
          {getMatchQualityLabel(matchPercentage)}
        </span>
      ) : null}
    </div>
  );
}
