/**
 * Industry Experience Match label for job cards and detail.
 * Shows percent (or "—"), optional mini bar or radial circle, and matched/missing hint.
 */

import { cn } from "@/lib/utils";
import {
  parseJobIndustryTags,
  computeIndustryMatchPercent,
} from "@/utils/industryMatch";
import { RadialProgress } from "@/components/ui/radial-progress";

export interface IndustryMatchLabelProps {
  /** Comma-separated string from job.industry_tags */
  industryTags: string | null | undefined;
  /** User industry years from backend (industry -> years) */
  userIndustryYears: Record<string, number>;
  /** Compact for cards; full for detail page; circle = radial like other match metrics */
  variant?: "compact" | "full" | "circle";
  className?: string;
  /** When true, show "Loading…" under Industry years json instead of list/— */
  industryProfileLoading?: boolean;
  /** When set, show this error under Industry years json (e.g. API failed) */
  industryProfileError?: string | null;
}

function capitalize(tag: string): string {
  if (!tag) return tag;
  return tag.charAt(0).toUpperCase() + tag.slice(1);
}

function userIndustryDisplayText(
  userIndustryEntries: string[],
  loading?: boolean,
  error?: string | null,
): string {
  if (loading) return "Loading…";
  if (error) return error;
  return userIndustryEntries.length > 0 ? userIndustryEntries.join(", ") : "—";
}

export function IndustryMatchLabel({
  industryTags,
  userIndustryYears,
  variant = "compact",
  className,
  industryProfileLoading,
  industryProfileError,
}: IndustryMatchLabelProps) {
  const tags = parseJobIndustryTags(industryTags);
  const { percent, matchedExact } = computeIndustryMatchPercent(
    tags,
    userIndustryYears,
  );

  const showBar =
    variant === "full" || (variant === "compact" && percent != null);
  const value = percent ?? 0;

  const userIndustryEntries = Object.entries(userIndustryYears)
    .filter(([, years]) => years > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([tag, years]) => `${capitalize(tag)} (${years.toFixed(1)} yrs)`);
  const jobIndustryLabels = tags.map(capitalize);

  if (variant === "circle") {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        <div className="flex flex-col items-center gap-1">
          <RadialProgress
            value={value}
            size={52}
            strokeWidth={4}
            showLabel={false}
            percentageTextSize="sm"
            centerLabel={percent == null ? "N/A" : undefined}
            className="flex-shrink-0"
          />
          <span className="text-[10px] font-bold text-black dark:text-white uppercase tracking-widest">
            Industry match
          </span>
          {percent != null && (
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              {matchedExact.length > 0 ? (
                <span>
                  Matched:{" "}
                  {matchedExact
                    .slice(0, 2)
                    .map(
                      (m) => `${capitalize(m.tag)} (${m.years.toFixed(1)} yrs)`,
                    )
                    .join(", ")}
                </span>
              ) : tags.length > 0 ? (
                <span>No industry overlap</span>
              ) : null}
            </div>
          )}
        </div>
        <div className="text-left space-y-2 min-w-[180px]">
          <div>
            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-0.5">
              Job industries
            </span>
            <p className="text-xs text-gray-700 dark:text-gray-300">
              {jobIndustryLabels.length > 0
                ? jobIndustryLabels.join(", ")
                : "—"}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-0.5">
              Industry years json
            </span>
            <p
              className={cn(
                "text-xs",
                industryProfileError
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-gray-700 dark:text-gray-300",
              )}
            >
              {userIndustryDisplayText(
                userIndustryEntries,
                industryProfileLoading,
                industryProfileError,
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Industry match
        </span>
        <span
          className={cn(
            "text-sm font-semibold",
            percent == null
              ? "text-gray-400 dark:text-gray-500"
              : "text-gray-900 dark:text-gray-100",
          )}
        >
          {percent == null ? "—" : `${percent}%`}
        </span>
      </div>
      {showBar && percent != null && (
        <div className="h-1.5 w-full max-w-[80px] rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-breneo-accent transition-all"
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        </div>
      )}
      {variant === "full" && (
        <>
          <div className="mt-3 space-y-2">
            <div>
              <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-0.5">
                Job industries
              </span>
              <p className="text-xs text-gray-700 dark:text-gray-300">
                {jobIndustryLabels.length > 0
                  ? jobIndustryLabels.join(", ")
                  : "—"}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-0.5">
                Industry years json
              </span>
              <p
                className={cn(
                  "text-xs",
                  industryProfileError
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-gray-700 dark:text-gray-300",
                )}
              >
                {userIndustryDisplayText(
                  userIndustryEntries,
                  industryProfileLoading,
                  industryProfileError,
                )}
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {matchedExact.length > 0 ? (
              <span>
                Matched:{" "}
                {matchedExact
                  .slice(0, 2)
                  .map(
                    (m) => `${capitalize(m.tag)} (${m.years.toFixed(1)} yrs)`,
                  )
                  .join(", ")}
              </span>
            ) : percent === 0 && tags.length > 0 ? (
              <span>No industry overlap</span>
            ) : null}
          </div>
        </>
      )}
      {variant === "compact" && matchedExact.length > 0 && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
          Matched:{" "}
          {matchedExact
            .slice(0, 2)
            .map((m) => capitalize(m.tag))
            .join(", ")}
        </p>
      )}
      {variant === "compact" &&
        percent === 0 &&
        tags.length > 0 &&
        matchedExact.length === 0 && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            No industry overlap
          </p>
        )}
    </div>
  );
}
