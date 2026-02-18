import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonthYearPicker } from "@/components/profile/MonthYearPicker";
import type {
  WorkExperienceEntry,
  WorkExperiencePayload,
} from "@/api/profile/types";

const JOB_TYPE_OPTIONS = [
  { value: "Full time", label: "Full time" },
  { value: "Part time", label: "Part time" },
  { value: "Contract", label: "Contract" },
  { value: "Internship", label: "Internship" },
] as const;

function JobTypeDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const label = JOB_TYPE_OPTIONS.find((o) => o.value === value)?.label;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-[3.2rem] w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm",
          "focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
          open && "bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-600",
          !label && "text-muted-foreground",
        )}
      >
        <span className="truncate">{label || "Select job type"}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>
      {open && (
        <ul
          className="absolute z-50 mt-1 w-full space-y-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg max-h-48 overflow-y-auto dark:border-gray-700 dark:bg-[#242424]"
          role="listbox"
        >
          {JOB_TYPE_OPTIONS.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={value === opt.value}
              className={cn(
                "cursor-pointer select-none rounded-md px-3 py-2.5 text-base md:text-sm",
                "hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100",
                value === opt.value &&
                  "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100",
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const LOCATION_DEBOUNCE_MS = 400;
const MIN_CHARS_FOR_SUGGESTIONS = 3;

function formatLocationSuggestion(place: {
  address?: { city?: string; town?: string; village?: string; state?: string; country?: string };
  display_name?: string;
}): string {
  const addr = place.address;
  if (!addr) return place.display_name || "";
  const city = addr.city || addr.town || addr.village || addr.state || "";
  const country = addr.country || "";
  if (city && country) return `${city}, ${country}`;
  if (country) return country;
  return place.display_name || "";
}

function LocationInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < MIN_CHARS_FOR_SUGGESTIONS) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        format: "json",
        addressdetails: "1",
        limit: "8",
      });
      const res = await fetch(`${NOMINATIM_URL}?${params}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "BreneoApp/1.0 (Work Experience Location)",
        },
      });
      const data = await res.json();
      const formatted = (data as unknown[]).map((p: unknown) =>
        formatLocationSuggestion(p as Parameters<typeof formatLocationSuggestion>[0])
      );
      setSuggestions(formatted);
      setOpen(true);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < MIN_CHARS_FOR_SUGGESTIONS) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(q), LOCATION_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex h-[3.2rem] w-full items-center rounded-md border border-input bg-background px-3 py-2",
          "focus-within:outline-none focus-within:ring-0",
          open && "bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-600",
        )}
      >
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() =>
            value.trim().length >= MIN_CHARS_FOR_SUGGESTIONS && setOpen(true)
          }
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
        />
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50 text-muted-foreground" />
      </div>
      {open && (suggestions.length > 0 || loading) && (
        <ul
          className="absolute z-50 mt-1 w-full space-y-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg max-h-48 overflow-auto dark:border-gray-700 dark:bg-[#242424]"
          role="listbox"
        >
          {loading && (
            <li className="flex items-center gap-2 rounded-md px-3 py-2.5 text-base md:text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </li>
          )}
          {!loading && suggestions.map((s, i) => (
            <li
              key={`${s}-${i}`}
              role="option"
              className="cursor-pointer select-none rounded-md px-3 py-2.5 text-base md:text-sm hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(s);
                setOpen(false);
              }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface EditWorkExperienceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: WorkExperienceEntry[];
  onSave: (
    created: WorkExperiencePayload[],
    updated: { id: number; payload: Partial<WorkExperiencePayload> }[],
    deletedIds: number[],
  ) => Promise<void>;
}

type FormEntry = {
  id: number | null;
  job_title: string;
  company: string;
  job_type: string;
  location: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
};

function toMonthValue(dateValue?: string | null): string {
  if (!dateValue) return "";
  return dateValue.slice(0, 7);
}

function monthToStartDate(monthValue: string): string {
  return monthValue ? `${monthValue}-01` : "";
}

function monthToEndDate(monthValue: string): string {
  if (!monthValue) return "";
  const [yearRaw, monthRaw] = monthValue.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return "";
  }
  const lastDay = new Date(year, month, 0).getDate();
  return `${monthValue}-${String(lastDay).padStart(2, "0")}`;
}

function toFormEntry(e: WorkExperienceEntry): FormEntry {
  return {
    id: e.id,
    job_title: e.job_title ?? "",
    company: e.company ?? "",
    job_type: e.job_type ?? "",
    location: e.location ?? "",
    start_date: toMonthValue(e.start_date),
    end_date: e.is_current ? "" : toMonthValue(e.end_date),
    is_current: e.is_current ?? false,
  };
}

export function EditWorkExperienceModal({
  open,
  onOpenChange,
  entries,
  onSave,
}: EditWorkExperienceModalProps) {
  const [rows, setRows] = useState<FormEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRows(entries.length ? entries.map(toFormEntry) : []);
      setError(null);
    }
  }, [open, entries]);

  const addRow = () => {
    if (rows.length >= 10) return;
    setRows((prev) => [
      ...prev,
      {
        id: null,
        job_title: "",
        company: "",
        job_type: "",
        location: "",
        start_date: "",
        end_date: "",
        is_current: false,
      },
    ]);
  };

  const updateRow = (
    index: number,
    field: keyof FormEntry,
    value: string | boolean,
  ) => {
    setRows((prev) => {
      const next = [...prev];
      (next[index] as Record<string, unknown>)[field] = value;
      if (field === "is_current" && value === true) next[index].end_date = "";
      return next;
    });
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): string | null => {
    for (const r of rows) {
      if (!r.job_title.trim()) return "Job title is required for all entries.";
      if (!r.company.trim()) return "Company is required for all entries.";
      if (!r.job_type.trim()) return "Job type is required for all entries.";
      if (!r.location.trim()) return "Location is required for all entries.";
      if (!r.start_date.trim())
        return "Start date is required for all entries.";
      if (!r.is_current && r.end_date && r.start_date > r.end_date) {
        return "Start date must be before or equal to end date.";
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const created: WorkExperiencePayload[] = [];
      const updated: {
        id: number;
        payload: Partial<WorkExperiencePayload>;
      }[] = [];
      const deletedIds: number[] = [];

      for (const r of rows) {
        const payload: WorkExperiencePayload = {
          job_title: r.job_title.trim(),
          company: r.company.trim(),
          job_type: r.job_type.trim() || null,
          location: r.location.trim() || null,
          start_date: monthToStartDate(r.start_date.trim()),
          end_date: r.is_current
            ? undefined
            : monthToEndDate(r.end_date.trim()) || undefined,
          is_current: r.is_current,
        };
        if (r.id == null) {
          created.push(payload);
        } else {
          updated.push({ id: r.id, payload });
        }
      }
      for (const e of entries) {
        if (!rows.some((r) => r.id === e.id)) deletedIds.push(e.id);
      }
      await onSave(created, updated, deletedIds);
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Could not save";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="rightProfile"
        overlayClassName="backdrop-blur-sm bg-black/20 dark:bg-black/40"
        className="flex flex-col h-full overflow-hidden px-4 py-6 md:p-8 bg-white dark:bg-[#181818]"
      >
        <SheetHeader className="bg-white dark:bg-[#181818] pb-3">
          <SheetTitle className="flex-1 min-w-0">
            Edit work experience
          </SheetTitle>
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <Button
              type="submit"
              form="edit-work-experience-form"
              size="sm"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-10 w-10 p-0 shrink-0"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>
        <form
          id="edit-work-experience-form"
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}
            <div className="space-y-4">
              {rows.map((row, index) => (
                <div
                  key={row.id ?? `new-${index}`}
                  className="p-4 rounded-lg space-y-3 bg-gray-100 dark:bg-[#242424]"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Work experience {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeRow(index)}
                      aria-label={`Remove work experience ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Job title</Label>
                    <Input
                      value={row.job_title}
                      onChange={(e) =>
                        updateRow(index, "job_title", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input
                      value={row.company}
                      onChange={(e) =>
                        updateRow(index, "company", e.target.value)
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>Job type</Label>
                      <JobTypeDropdown
                        value={row.job_type}
                        onChange={(v) => updateRow(index, "job_type", v)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <LocationInput
                        value={row.location}
                        onChange={(value) =>
                          updateRow(index, "location", value)
                        }
                        placeholder="e.g. Tbilisi, Georgia"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>Start date</Label>
                      <MonthYearPicker
                        value={row.start_date}
                        onChange={(nextValue) => updateRow(index, "start_date", nextValue)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End date</Label>
                      <MonthYearPicker
                        value={row.end_date}
                        onChange={(nextValue) => updateRow(index, "end_date", nextValue)}
                        disabled={row.is_current}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`current-we-${index}`}
                      checked={row.is_current}
                      onCheckedChange={(checked) =>
                        updateRow(index, "is_current", checked === true)
                      }
                    />
                    <Label
                      htmlFor={`current-we-${index}`}
                      className="cursor-pointer"
                    >
                      I currently work here
                    </Label>
                  </div>
                </div>
              ))}
            </div>
            {rows.length < 10 && (
              <Button
                type="button"
                variant="outline"
                onClick={addRow}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add work experience
              </Button>
            )}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
