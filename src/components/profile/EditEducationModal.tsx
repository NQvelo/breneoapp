import React, { useState, useEffect, useRef } from "react";
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
import type { EducationEntry, EducationPayload } from "@/api/profile/types";

const DEGREE_TYPE_OPTIONS = [
  { value: "High School", label: "High School" },
  { value: "Diploma / Certificate", label: "Diploma / Certificate" },
  { value: "Associate", label: "Associate" },
  { value: "Bachelor's", label: "Bachelor's" },
  { value: "Master's", label: "Master's" },
  { value: "MBA", label: "MBA" },
  { value: "Doctorate (PhD)", label: "Doctorate (PhD)" },
  { value: "Bootcamp / Short Program", label: "Bootcamp / Short Program" },
  { value: "Other", label: "Other" },
] as const;

function DegreeTypeDropdown({
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

  const label = DEGREE_TYPE_OPTIONS.find((o) => o.value === value)?.label;

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
        <span className="truncate">{label || "Select degree type"}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>
      {open && (
        <ul
          className="absolute z-50 mt-1 w-full space-y-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg max-h-48 overflow-y-auto dark:border-gray-700 dark:bg-[#242424]"
          role="listbox"
        >
          {DEGREE_TYPE_OPTIONS.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={value === opt.value}
              className={cn(
                "cursor-pointer select-none rounded-md px-3 py-2.5 text-base md:text-sm",
                "hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100",
                value === opt.value && "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100",
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

export interface EditEducationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: EducationEntry[];
  onSave: (
    created: EducationPayload[],
    updated: { id: number; payload: Partial<EducationPayload> }[],
    deletedIds: number[],
  ) => Promise<void>;
}

type FormEntry = {
  id: number | null;
  school_name: string;
  major: string;
  degree_type: string;
  gpa: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
};

function toFormEntry(e: EducationEntry): FormEntry {
  return {
    id: e.id,
    school_name: e.school_name ?? "",
    major: e.major ?? "",
    degree_type: e.degree_type ?? "",
    gpa: e.gpa ?? "",
    start_date: e.start_date ?? "",
    end_date: e.is_current ? "" : (e.end_date ?? ""),
    is_current: e.is_current ?? false,
  };
}

export function EditEducationModal({
  open,
  onOpenChange,
  entries,
  onSave,
}: EditEducationModalProps) {
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
        school_name: "",
        major: "",
        degree_type: "",
        gpa: "",
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
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.school_name.trim())
        return "School name is required for all entries.";
      if (!r.start_date.trim())
        return "Start date is required for all entries.";
      if (!r.is_current && r.end_date) {
        if (r.start_date > r.end_date) {
          return "Start date must be before or equal to end date.";
        }
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
      const created: EducationPayload[] = [];
      const updated: { id: number; payload: Partial<EducationPayload> }[] = [];
      const deletedIds: number[] = [];

      for (const r of rows) {
        const payload: EducationPayload = {
          school_name: r.school_name.trim(),
          major: r.major.trim() || undefined,
          degree_type: r.degree_type.trim() || undefined,
          gpa: r.gpa.trim() || undefined,
          start_date: r.start_date,
          end_date: r.is_current ? undefined : r.end_date.trim() || undefined,
          is_current: r.is_current,
        };
        if (r.id == null) {
          created.push(payload);
        } else {
          updated.push({ id: r.id, payload });
        }
      }
      const existingIds = new Set(entries.map((e) => e.id));
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
          <SheetTitle className="flex-1 min-w-0">Edit education</SheetTitle>
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <Button
              type="submit"
              form="edit-education-form"
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
          id="edit-education-form"
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
                      Education {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeRow(index)}
                      aria-label={`Remove education ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>School name</Label>
                    <Input
                      value={row.school_name}
                      onChange={(e) =>
                        updateRow(index, "school_name", e.target.value)
                      }
                      placeholder="University or school name"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>Major</Label>
                      <Input
                        value={row.major}
                        onChange={(e) =>
                          updateRow(index, "major", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Degree type</Label>
                      <DegreeTypeDropdown
                        value={row.degree_type}
                        onChange={(v) => updateRow(index, "degree_type", v)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>GPA (optional)</Label>
                    <Input
                      value={row.gpa}
                      onChange={(e) => updateRow(index, "gpa", e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>Start date</Label>
                      <Input
                        type="date"
                        value={row.start_date}
                        onChange={(e) =>
                          updateRow(index, "start_date", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End date</Label>
                      <Input
                        type="date"
                        value={row.end_date}
                        onChange={(e) =>
                          updateRow(index, "end_date", e.target.value)
                        }
                        disabled={row.is_current}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`current-${index}`}
                      checked={row.is_current}
                      onCheckedChange={(checked) =>
                        updateRow(index, "is_current", checked === true)
                      }
                    />
                    <Label
                      htmlFor={`current-${index}`}
                      className="cursor-pointer"
                    >
                      Currently studying here
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
                Add education
              </Button>
            )}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
