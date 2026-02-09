import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, X } from "lucide-react";
import type { UserSkill, SkillSuggestion } from "@/api/profile/types";
import { profileApi } from "@/api/profile/profileApi";

export interface EditSkillsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skills: UserSkill[];
  onAddSkill: (name: string) => Promise<void>;
  onRemoveSkill: (skillId: number) => Promise<void>;
  onRefresh: () => void;
}

const MIN_CHARS_FOR_SUGGESTIONS = 3;
const SUGGESTIONS_DEBOUNCE_MS = 250;

export function EditSkillsModal({
  open,
  onOpenChange,
  skills,
  onAddSkill,
  onRemoveSkill,
  onRefresh,
}: EditSkillsModalProps) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SkillSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userSkillNames = new Set(skills.map((s) => s.skill_name.toLowerCase()));

  const handleAdd = useCallback(
    async (name?: string) => {
      const toAdd = (name ?? search.trim()).trim();
      if (!toAdd) return;
      setError(null);
      setAdding(true);
      setSuggestions([]);
      try {
        await onAddSkill(toAdd);
        setSearch("");
        onRefresh();
      } catch {
        setError("Could not add skill");
      } finally {
        setAdding(false);
      }
    },
    [search, onAddSkill, onRefresh],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleSuggestionClick = useCallback(
    async (suggestion: SkillSuggestion) => {
      await handleAdd(suggestion.name);
    },
    [handleAdd],
  );

  const handleRemove = useCallback(
    async (skillId: number) => {
      setError(null);
      setRemovingId(skillId);
      try {
        await onRemoveSkill(skillId);
        onRefresh();
      } catch {
        setError("Could not remove skill");
      } finally {
        setRemovingId(null);
      }
    },
    [onRemoveSkill, onRefresh],
  );

  // Fetch suggestions when user types at least 3 characters
  useEffect(() => {
    const query = search.trim();
    if (query.length < MIN_CHARS_FOR_SUGGESTIONS) {
      setSuggestions([]);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      debounceRef.current = null;
      setLoadingSuggestions(true);
      try {
        const list = await profileApi.searchSkills(query);
        setSuggestions(list);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, SUGGESTIONS_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const filteredSuggestions = suggestions.filter(
    (s) => !userSkillNames.has(s.name.toLowerCase()),
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="rightProfile"
        overlayClassName="backdrop-blur-sm bg-black/20 dark:bg-black/40"
        className="flex flex-col h-full overflow-hidden px-4 py-6 md:p-8 bg-white dark:bg-[#181818]"
      >
        <SheetHeader className="bg-white dark:bg-[#181818] pb-3 border-b border-gray-200 dark:border-gray-700">
          <SheetTitle className="flex-1 min-w-0">Edit skills</SheetTitle>
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <Button
              type="button"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-10 w-10 p-0 shrink-0"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}
            <div className="space-y-1">
              <Input
                placeholder="Search or type a skill (e.g. React, Figma)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={adding}
              />
              <p className="text-xs text-muted-foreground">
                Press Enter to add a skill.
              </p>
              {search.trim().length >= MIN_CHARS_FOR_SUGGESTIONS && (
                <div className="relative">
                  {loadingSuggestions ? (
                    <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading suggestions…
                    </div>
                  ) : filteredSuggestions.length > 0 ? (
                    <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1">
                      {filteredSuggestions.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-gray-100 dark:focus:bg-gray-800 outline-none"
                            onClick={() => handleSuggestionClick(s)}
                          >
                            {s.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 min-h-[2rem]">
              {skills.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No skills yet. Type above and press Enter to add one.
                </p>
              ) : (
                skills.map((s) => (
                  <Badge
                    key={s.id}
                    variant="outline"
                    className="inline-flex items-center gap-1 capitalize px-3 py-1.5 text-xs rounded-[10px] bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                  >
                    {s.skill_name}
                    <button
                      type="button"
                      className="ml-1 rounded-full p-0.5 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                      onClick={() => handleRemove(s.skill_id)}
                      disabled={removingId === s.skill_id}
                      aria-label={`Remove ${s.skill_name}`}
                    >
                      {removingId === s.skill_id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
