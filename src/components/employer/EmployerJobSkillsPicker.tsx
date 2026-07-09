import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, Search, X } from "lucide-react";
import { profileApi } from "@/api/profile";
import type { SkillSuggestion } from "@/api/profile/types";
import {
  employerSelectDropdownItemClass,
  employerSelectDropdownShellClass,
} from "@/components/employer/EmployerLocationSelectDropdown";
import { cn } from "@/lib/utils";
import { PLATFORM_CHIP_SKILL_CLASS } from "@/lib/chipStyles";

const MIN_CHARS_FOR_SUGGESTIONS = 3;

export interface EmployerJobSkillsPickerProps {
  selectedSkills: string[];
  onSelectedSkillsChange: (skills: string[]) => void;
  required?: boolean;
  label?: string;
  hint?: string;
}

export function EmployerJobSkillsPicker({
  selectedSkills,
  onSelectedSkillsChange,
  required = false,
  label = "Required skills",
  hint,
}: EmployerJobSkillsPickerProps) {
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<SkillSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const filteredSuggestions = useMemo(() => {
    const selectedLower = new Set(
      selectedSkills.map((s) => s.toLowerCase().trim()),
    );
    return suggestions.filter(
      (s) => !selectedLower.has(String(s.name).toLowerCase().trim()),
    );
  }, [suggestions, selectedSkills]);

  useEffect(() => {
    const q = draft.trim();
    if (q.length < MIN_CHARS_FOR_SUGGESTIONS) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const list = await profileApi.searchSkills(q);
        if (!cancelled) setSuggestions(list);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [draft]);

  const addSkill = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const exists = selectedSkills.some(
      (s) => s.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) return;
    onSelectedSkillsChange([...selectedSkills, trimmed]);
    setDraft("");
    setSuggestions([]);
  };

  const removeSkill = (name: string) => {
    onSelectedSkillsChange(
      selectedSkills.filter(
        (s) => s.toLowerCase() !== name.toLowerCase(),
      ),
    );
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive ml-1">*</span> : null}
      </Label>
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const first = filteredSuggestions[0];
              if (first?.name) addSkill(first.name);
              else if (draft.trim()) addSkill(draft.trim());
            }
          }}
          placeholder="Search skills…"
          className="pl-9"
        />
      </div>
      {draft.trim().length >= MIN_CHARS_FOR_SUGGESTIONS ? (
        <div className="relative">
          {loadingSuggestions ? (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading suggestions…
            </div>
          ) : filteredSuggestions.length > 0 ? (
            <ul
              className={cn(
                employerSelectDropdownShellClass,
                "z-10 max-h-48 flex flex-col gap-1",
              )}
              role="listbox"
            >
              {filteredSuggestions.map((s) => (
                <li key={s.id} role="none">
                  <button
                    type="button"
                    role="option"
                    className={cn(employerSelectDropdownItemClass, "capitalize")}
                    onClick={() => addSkill(s.name)}
                  >
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2 min-h-[2rem]">
        {selectedSkills.length === 0 ? (
          <p className="text-sm text-muted-foreground py-0.5">
            {required
              ? "Add at least one skill for candidate matching."
              : "No skills selected."}
          </p>
        ) : (
          selectedSkills.map((skill) => (
            <Badge
              key={skill}
              variant="outline"
              className={cn("gap-1", PLATFORM_CHIP_SKILL_CLASS)}
            >
              {skill}
              <button
                type="button"
                className="ml-1 rounded-full p-0.5 hover:bg-sky-200/80 dark:hover:bg-sky-800/50"
                onClick={() => removeSkill(skill)}
                aria-label={`Remove ${skill}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}
