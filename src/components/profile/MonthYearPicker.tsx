import React, { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

const MONTHS = [
  { label: "Jan", value: "01" },
  { label: "Feb", value: "02" },
  { label: "Mar", value: "03" },
  { label: "Apr", value: "04" },
  { label: "May", value: "05" },
  { label: "Jun", value: "06" },
  { label: "Jul", value: "07" },
  { label: "Aug", value: "08" },
  { label: "Sep", value: "09" },
  { label: "Oct", value: "10" },
  { label: "Nov", value: "11" },
  { label: "Dec", value: "12" },
] as const;

const MIN_YEAR = 1950;

function parseMonthValue(value: string): { year: number; month: string } | null {
  const [yearRaw, monthRaw] = value.split("-");
  const year = Number(yearRaw);
  if (!Number.isFinite(year) || !monthRaw || monthRaw.length !== 2) return null;
  return { year, month: monthRaw };
}

function formatMonthLabel(value: string): string {
  const parsed = parseMonthValue(value);
  if (!parsed) return value;
  const month = MONTHS.find((m) => m.value === parsed.month);
  return month ? `${month.label} ${parsed.year}` : value;
}

type MonthYearPickerProps = {
  value: string;
  onChange: (nextValue: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function MonthYearPicker({
  value,
  onChange,
  disabled = false,
  placeholder = "Select month and year",
}: MonthYearPickerProps) {
  const currentYear = new Date().getFullYear();
  const parsed = parseMonthValue(value);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState<number>(parsed?.year ?? currentYear);
  const [view, setView] = useState<"month" | "year">("month");

  const yearOptions = useMemo(() => {
    const maxYear = currentYear + 10;
    const years: number[] = [];
    for (let y = maxYear; y >= MIN_YEAR; y -= 1) years.push(y);
    return years;
  }, [currentYear]);

  const displayValue = value ? formatMonthLabel(value) : placeholder;

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (disabled) return;
        if (nextOpen) {
          if (parsed?.year) setYear(parsed.year);
          setView("month");
        }
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-[3.2rem] w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-base md:text-sm",
            "focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-muted-foreground",
          )}
        >
          <span className="truncate">{displayValue}</span>
          <CalendarDays className="h-4 w-4 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-[120] w-[18rem] space-y-3 p-3 pointer-events-auto">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant={view === "month" ? "default" : "outline"}
            size="sm"
            className="h-9 flex-1"
            onClick={() => setView("month")}
          >
            Month
          </Button>
          <Button
            type="button"
            variant={view === "year" ? "default" : "outline"}
            size="sm"
            className="h-9 flex-1"
            onClick={() => setView("year")}
          >
            {year}
          </Button>
        </div>

        {view === "month" ? (
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((month) => {
              const nextValue = `${year}-${month.value}`;
              const isSelected = value === nextValue;
              return (
                <Button
                  key={month.value}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className="h-9 cursor-pointer px-0 text-xs"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange(nextValue);
                    setOpen(false);
                  }}
                >
                  {month.label}
                </Button>
              );
            })}
          </div>
        ) : (
          <ScrollArea
            className="h-56 w-full rounded-md"
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-3 gap-2 pr-3 touch-pan-y">
              {yearOptions.map((optionYear) => (
                <Button
                  key={optionYear}
                  type="button"
                  variant={optionYear === year ? "default" : "outline"}
                  size="sm"
                  className="h-9 cursor-pointer px-0 text-xs"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setYear(optionYear);
                    setView("month");
                  }}
                >
                  {optionYear}
                </Button>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
