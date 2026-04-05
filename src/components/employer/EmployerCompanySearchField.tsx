import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  searchAggregatorCompanies,
  type AggregatorCompany,
} from "@/api/employer/aggregatorBffApi";

const MIN_SEARCH_CHARS = 3;
const DEBOUNCE_MS = 280;

type Props = {
  disabled?: boolean;
  selected: AggregatorCompany | null;
  onSelectExisting: (company: AggregatorCompany | null) => void;
  /** Single field: search query and, for new companies, the name to save */
  companyName: string;
  onCompanyNameChange: (value: string) => void;
  /**
   * When true, the list is only API search results — no “type a new name” row unless
   * `onQuickCreateCompany` is set (then “Create new” POSTs when search returns nothing).
   */
  existingCompaniesOnly?: boolean;
  /**
   * When search returns no rows (≥3 chars), show “Create new company”. On tap, POST via BFF
   * and resolve with the created `AggregatorCompany` (caller should toast errors).
   */
  onQuickCreateCompany?: (name: string) => Promise<AggregatorCompany>;
};

/**
 * One input: search `GET …/companies?search=` (debounced), pick a row, or create new (optional API).
 */
export function EmployerCompanySearchField({
  disabled,
  selected,
  onSelectExisting,
  companyName,
  onCompanyNameChange,
  existingCompaniesOnly = false,
  onQuickCreateCompany,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quickCreateLoading, setQuickCreateLoading] = useState(false);
  const [results, setResults] = useState<AggregatorCompany[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selected) {
      setResults([]);
      setSearchError(null);
      return;
    }
    const t = companyName.trim();
    if (t.length < MIN_SEARCH_CHARS) {
      setResults([]);
      setSearchError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const id = window.setTimeout(async () => {
      setLoading(true);
      setSearchError(null);
      try {
        const list = await searchAggregatorCompanies(t);
        if (!cancelled) {
          setResults(list.slice(0, 50));
          setSearchError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setResults([]);
          setSearchError(
            e instanceof Error ? e.message : "Could not search companies.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [companyName, selected]);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  if (selected) {
    return (
      <div className="space-y-2">
        <Label>Company</Label>
        <div className="flex items-center gap-2 flex-wrap rounded-xl border border-border/60 px-3 py-2 bg-muted/20">
          <span className="font-medium">{selected.name ?? "Company"}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onSelectExisting(null);
              onCompanyNameChange("");
              setOpen(false);
            }}
            disabled={disabled}
          >
            Change
          </Button>
        </div>
      </div>
    );
  }

  const trimmed = companyName.trim();
  const lower = trimmed.toLowerCase();
  const hasExactListMatch = results.some(
    (r) => String(r.name ?? "").trim().toLowerCase() === lower,
  );

  const showQuickCreateRow =
    typeof onQuickCreateCompany === "function" &&
    trimmed.length >= MIN_SEARCH_CHARS &&
    !loading &&
    !quickCreateLoading &&
    results.length === 0 &&
    !searchError;

  /** No API: choose “create” when typing a new name (any length ≥1) and not an exact list hit. */
  const showSoftCreateRow =
    !existingCompaniesOnly &&
    onQuickCreateCompany == null &&
    trimmed.length >= 1 &&
    !hasExactListMatch;

  const showSoftCreateRowWithQuick =
    !existingCompaniesOnly &&
    typeof onQuickCreateCompany === "function" &&
    trimmed.length >= 1 &&
    !hasExactListMatch &&
    results.length > 0;

  const showEmptyApiMessage =
    existingCompaniesOnly &&
    onQuickCreateCompany == null &&
    trimmed.length >= MIN_SEARCH_CHARS &&
    !loading &&
    results.length === 0 &&
    !searchError;

  const showPanel =
    open &&
    (loading ||
      quickCreateLoading ||
      results.length > 0 ||
      showSoftCreateRow ||
      showSoftCreateRowWithQuick ||
      showQuickCreateRow ||
      showEmptyApiMessage);

  const helpText =
    existingCompaniesOnly && typeof onQuickCreateCompany === "function"
      ? `Type at least ${MIN_SEARCH_CHARS} characters to search. If there is no match, use Create new company to add it to the directory.`
      : typeof onQuickCreateCompany === "function"
        ? `Type at least ${MIN_SEARCH_CHARS} characters to search. If nothing matches, you can create the company on the directory with one tap; otherwise pick a row or use Create new company to continue registration with your own name.`
        : existingCompaniesOnly
          ? `Type at least ${MIN_SEARCH_CHARS} characters to search the directory; pick a company from the list.`
          : `Type at least ${MIN_SEARCH_CHARS} characters to search existing companies, or choose "Create new company" and edit the name in this field.`;

  return (
    <div ref={containerRef} className="relative space-y-2">
      <Label htmlFor="co-combobox">Company name</Label>
      <p className="text-xs text-muted-foreground">{helpText}</p>
      <Input
        ref={inputRef}
        id="co-combobox"
        value={companyName}
        onChange={(e) => {
          onCompanyNameChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        disabled={disabled}
        placeholder={
          existingCompaniesOnly && !onQuickCreateCompany
            ? "Search companies…"
            : "Search companies or type a new name…"
        }
        className="h-[3rem]"
        autoComplete="off"
        role="combobox"
        aria-expanded={showPanel}
        aria-autocomplete="list"
      />
      {searchError ? (
        <p className="text-xs text-destructive" role="alert">
          {searchError}
        </p>
      ) : null}
      {showPanel ? (
        <ul
          className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-md"
          role="listbox"
        >
          {loading ? (
            <li className="px-3 py-2.5 text-xs text-muted-foreground">
              Searching…
            </li>
          ) : null}
          {quickCreateLoading ? (
            <li className="px-3 py-2.5 text-xs text-muted-foreground">
              Creating company…
            </li>
          ) : null}
          {showEmptyApiMessage ? (
            <li className="px-3 py-2.5 text-xs text-muted-foreground">
              No companies match &quot;{trimmed}&quot;.
            </li>
          ) : null}
          {showQuickCreateRow ? (
            <li role="option" className="border-t border-border/60">
              <button
                type="button"
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted/80 transition-colors"
                disabled={disabled}
                onClick={async () => {
                  if (!onQuickCreateCompany) return;
                  setQuickCreateLoading(true);
                  try {
                    const created = await onQuickCreateCompany(trimmed);
                    const label =
                      created?.name != null && String(created.name).trim()
                        ? String(created.name).trim()
                        : trimmed;
                    onCompanyNameChange(label);
                    onSelectExisting(created);
                    setOpen(false);
                  } catch {
                    /* caller toasts */
                  } finally {
                    setQuickCreateLoading(false);
                  }
                }}
              >
                <span className="font-medium text-primary">
                  Create new company
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Add &quot;{trimmed}&quot; to the job directory
                </span>
              </button>
            </li>
          ) : null}
          {!loading &&
            !quickCreateLoading &&
            results.map((row) => (
              <li
                key={String(row.id ?? `${row.name}-${row.domain}`)}
                role="option"
              >
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted/80 transition-colors"
                  onClick={() => {
                    onSelectExisting(row);
                    setOpen(false);
                  }}
                  disabled={disabled}
                >
                  <span className="font-medium">{row.name}</span>
                  {row.domain ? (
                    <span className="text-muted-foreground ml-2 text-xs">
                      {String(row.domain)}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          {showSoftCreateRow || showSoftCreateRowWithQuick ? (
            <li role="option" className="border-t border-border/60">
              <button
                type="button"
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted/80 transition-colors"
                onClick={() => {
                  setOpen(false);
                  inputRef.current?.focus();
                }}
                disabled={disabled}
              >
                <span className="font-medium text-primary">
                  Create new company
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Use name &quot;{trimmed}&quot; — fill details below and continue
                </span>
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
