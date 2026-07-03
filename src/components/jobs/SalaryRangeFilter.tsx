import React, { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface SalaryRangeFilterProps {
  minSalary: number;
  maxSalary: number;
  salaryMin?: number;
  salaryMax?: number;
  salaryByAgreement?: boolean;
  onSalaryChange: (
    min: number | undefined,
    max: number | undefined,
    byAgreement: boolean,
  ) => void;
}

const pillInputClassName =
  "w-full min-w-0 bg-transparent text-center text-sm font-medium text-gray-900 dark:text-gray-100 tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function parseSalaryInput(raw: string): number | null {
  const cleaned = raw.replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const parsed = parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMaxDisplay(value: number, ceiling: number): string {
  return value >= ceiling ? `${value}+` : String(value);
}

export const SalaryRangeFilter: React.FC<SalaryRangeFilterProps> = ({
  minSalary,
  maxSalary,
  salaryMin = minSalary,
  salaryMax = maxSalary,
  salaryByAgreement = false,
  onSalaryChange,
}) => {
  const { t } = useLanguage();
  const [localMin, setLocalMin] = useState<number>(salaryMin ?? minSalary);
  const [localMax, setLocalMax] = useState<number>(salaryMax ?? maxSalary);
  const [localByAgreement, setLocalByAgreement] =
    useState<boolean>(salaryByAgreement);
  const [minDraft, setMinDraft] = useState<string | null>(null);
  const [maxDraft, setMaxDraft] = useState<string | null>(null);

  useEffect(() => {
    setLocalMin(salaryMin ?? minSalary);
    setLocalMax(salaryMax ?? maxSalary);
    setLocalByAgreement(salaryByAgreement ?? false);
    setMinDraft(null);
    setMaxDraft(null);
  }, [salaryMin, salaryMax, salaryByAgreement, minSalary, maxSalary]);

  const commitRange = (
    min: number,
    max: number,
    byAgreement = localByAgreement,
  ) => {
    const nextMin = Math.max(minSalary, Math.min(min, max));
    const nextMax = Math.min(maxSalary, Math.max(max, nextMin));
    setLocalMin(nextMin);
    setLocalMax(nextMax);
    setMinDraft(null);
    setMaxDraft(null);
    onSalaryChange(
      nextMin === minSalary ? undefined : nextMin,
      nextMax === maxSalary ? undefined : nextMax,
      byAgreement,
    );
  };

  const handleSliderChange = (values: number[]) => {
    const [min, max] = values;
    commitRange(min, max);
  };

  const handleMinBlur = () => {
    const parsed = parseSalaryInput(minDraft ?? String(localMin));
    const nextMin = parsed ?? minSalary;
    commitRange(nextMin, localMax);
  };

  const handleMaxBlur = () => {
    const parsed = parseSalaryInput(maxDraft ?? String(localMax));
    const nextMax = parsed ?? maxSalary;
    commitRange(localMin, nextMax);
  };

  const handleMinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const handleMaxKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const handleByAgreementChange = (checked: boolean) => {
    setLocalByAgreement(checked);
    onSalaryChange(
      localMin === minSalary ? undefined : localMin,
      localMax === maxSalary ? undefined : localMax,
      checked,
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-medium text-left text-gray-900 dark:text-gray-100">
        {t.jobs.salaryRange}
      </h3>

      <Slider
        variant="salary"
        value={[localMin, localMax]}
        onValueChange={handleSliderChange}
        min={minSalary}
        max={maxSalary}
        step={100}
        className="w-full"
      />

      <div className="flex items-start justify-between">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t.jobs.minimum}
          </span>
          <div className="flex w-[90px] items-center justify-center rounded-full border border-gray-200 bg-white px-2 py-2.5 dark:border-gray-700 dark:bg-transparent">
            <input
              type="text"
              inputMode="numeric"
              aria-label={t.jobs.minimum}
              value={minDraft ?? String(localMin)}
              onChange={(e) => setMinDraft(e.target.value)}
              onFocus={() => setMinDraft(String(localMin))}
              onBlur={handleMinBlur}
              onKeyDown={handleMinKeyDown}
              className={cn(pillInputClassName, "pr-1")}
            />
            <span className="shrink-0 text-sm font-medium text-gray-900 dark:text-gray-100">
              ₾
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t.jobs.maximum}
          </span>
          <div className="flex w-[90px] items-center justify-center rounded-full border border-gray-200 bg-white px-2 py-2.5 dark:border-gray-700 dark:bg-transparent">
            <input
              type="text"
              inputMode="numeric"
              aria-label={t.jobs.maximum}
              value={maxDraft ?? formatMaxDisplay(localMax, maxSalary)}
              onChange={(e) => setMaxDraft(e.target.value.replace(/\+$/, ""))}
              onFocus={() => setMaxDraft(String(localMax))}
              onBlur={handleMaxBlur}
              onKeyDown={handleMaxKeyDown}
              className={cn(pillInputClassName, "pr-1")}
            />
            <span className="shrink-0 text-sm font-medium text-gray-900 dark:text-gray-100">
              ₾
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="salary-by-agreement"
          checked={localByAgreement}
          onCheckedChange={handleByAgreementChange}
        />
        <Label
          htmlFor="salary-by-agreement"
          className="text-sm font-normal cursor-pointer text-gray-900 dark:text-gray-100"
        >
          {t.jobs.byAgreement}
        </Label>
      </div>
    </div>
  );
};
