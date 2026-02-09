import React, { useState, useEffect } from "react";
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
import { Loader2, Plus, Trash2, X } from "lucide-react";
import type {
  WorkExperienceEntry,
  WorkExperiencePayload,
} from "@/api/profile/types";

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

function toFormEntry(e: WorkExperienceEntry): FormEntry {
  return {
    id: e.id,
    job_title: e.job_title ?? "",
    company: e.company ?? "",
    job_type: e.job_type ?? "",
    location: e.location ?? "",
    start_date: e.start_date ?? "",
    end_date: e.is_current ? "" : (e.end_date ?? ""),
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
          job_type: r.job_type.trim() || undefined,
          location: r.location.trim() || undefined,
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
                      <Label>Job type (optional)</Label>
                      <Input
                        value={row.job_type}
                        onChange={(e) =>
                          updateRow(index, "job_type", e.target.value)
                        }
                        placeholder="e.g. Full-time"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location (optional)</Label>
                      <Input
                        value={row.location}
                        onChange={(e) =>
                          updateRow(index, "location", e.target.value)
                        }
                      />
                    </div>
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
