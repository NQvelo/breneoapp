import React from "react";
import { cn } from "@/lib/utils";

export interface EmployerLocationSelectItem {
  key: string;
  label: string;
}

export interface EmployerLocationSelectDropdownProps {
  minSearchChars: number;
  queryLength: number;
  items: EmployerLocationSelectItem[];
  onSelect: (label: string) => void;
  minCharsMessage?: string;
  emptyMessage?: string;
  className?: string;
}

/** Shared listbox shell + item styles (country, city, skills pickers). */
export const employerSelectDropdownShellClass =
  "absolute z-40 mt-2 w-full max-h-52 overflow-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-md dark:border-[#3a3a3c] dark:bg-[#1c1c1e] dark:shadow-lg dark:shadow-black/20";

export const employerSelectDropdownHintClass =
  "px-2.5 py-2.5 text-sm text-muted-foreground dark:text-gray-400";

export const employerSelectDropdownItemClass =
  "w-full rounded-[10px] px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-[#f0f0f2] focus-visible:outline-none focus-visible:bg-[#f0f0f2] dark:text-gray-100 dark:hover:bg-[#2c2c2e] dark:focus-visible:bg-[#2c2c2e]";

export function EmployerLocationSelectDropdown({
  minSearchChars,
  queryLength,
  items,
  onSelect,
  minCharsMessage,
  emptyMessage = "No matches found",
  className,
}: EmployerLocationSelectDropdownProps) {
  const needsMoreChars = queryLength < minSearchChars;

  return (
    <div className={cn(employerSelectDropdownShellClass, className)}>
      {needsMoreChars ? (
        <p className={employerSelectDropdownHintClass}>
          {minCharsMessage ??
            `Type at least ${minSearchChars} characters`}
        </p>
      ) : items.length === 0 ? (
        <p className={employerSelectDropdownHintClass}>{emptyMessage}</p>
      ) : (
        <ul className="flex flex-col gap-1" role="listbox">
          {items.map((item) => (
            <li key={item.key} role="none">
              <button
                type="button"
                role="option"
                className={employerSelectDropdownItemClass}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelect(item.label)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
