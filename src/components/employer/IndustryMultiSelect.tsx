import React, { useMemo, useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AggregatorIndustry } from "@/api/employer/aggregatorBffApi";

type IndustryMultiSelectProps = {
  industries: AggregatorIndustry[];
  value: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  searchPlaceholder?: string;
  emptyHint?: string;
  className?: string;
};

function normalizeSearch(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Searchable multi-select: chosen industries as chips; search adds more from the list.
 */
export function IndustryMultiSelect({
  industries,
  value,
  onChange,
  disabled,
  searchPlaceholder = "Search industries…",
  emptyHint = "Type to search and pick industries.",
  className,
}: IndustryMultiSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const selectedItems = useMemo(
    () =>
      value
        .map((id) => industries.find((i) => i.id === id))
        .filter((x): x is AggregatorIndustry => !!x),
    [industries, value],
  );

  const suggestions = useMemo(() => {
    const q = normalizeSearch(query);
    const pool = industries.filter((i) => !selectedSet.has(i.id));
    if (!q) return pool.slice(0, 40);
    return pool
      .filter((i) => i.name.toLowerCase().includes(q))
      .slice(0, 40);
  }, [industries, selectedSet, query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const add = (id: number) => {
    if (selectedSet.has(id)) return;
    onChange([...value, id]);
    setQuery("");
    setOpen(false);
  };

  const remove = (id: number) => {
    onChange(value.filter((x) => x !== id));
  };

  return (
    <div ref={rootRef} className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2 min-h-[2.5rem] items-start">
        {selectedItems.map((ind) => (
          <span
            key={ind.id}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-sm"
          >
            <span className="max-w-[200px] truncate">{ind.name}</span>
            <button
              type="button"
              disabled={disabled}
              className="rounded-full p-0.5 hover:bg-background/80 disabled:opacity-50"
              onClick={() => remove(ind.id)}
              aria-label={`Remove ${ind.name}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>

      <div className="relative">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={searchPlaceholder}
          disabled={disabled}
          className="h-10"
          autoComplete="off"
        />
        {open && !disabled && (
          <div
            className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md max-h-48 overflow-auto"
            role="listbox"
          >
            {suggestions.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">{emptyHint}</p>
            ) : (
              suggestions.map((ind) => (
                <button
                  key={ind.id}
                  type="button"
                  role="option"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(ind.id)}
                >
                  {ind.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {selectedItems.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Add another industry using the search field above.
        </p>
      ) : null}
    </div>
  );
}
