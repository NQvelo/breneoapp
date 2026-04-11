import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IndustryMultiSelect } from "@/components/employer/IndustryMultiSelect";
import {
  type AggregatorApiError,
  aggregatorCompanyLogoUrl,
  type AggregatorCompany,
  type AggregatorIndustry,
  fetchAggregatorCompanyDetail,
  parseAggregatorCompanyPk,
  patchEmployerAggregatorCompany,
  type PatchAggregatorCompanyBody,
} from "@/api/employer/aggregatorBffApi";
import { uploadEmployerCompanyLogoToAggregator } from "@/api/employer/employerProfileApi";
import { Loader2, PencilLine, UploadCloud, X } from "lucide-react";

const EMPLOYEE_BANDS = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
] as const;

function normalizeEmployeeBand(raw: string): string {
  const s = raw.trim();
  return (EMPLOYEE_BANDS as readonly string[]).includes(s) ? s : "";
}

function readStr(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function industryIdsFromCompany(c: AggregatorCompany): number[] {
  const raw = c.industry_ids;
  if (Array.isArray(raw)) {
    return raw
      .map((x) => (typeof x === "number" ? x : Number(x)))
      .filter((x) => Number.isFinite(x)) as number[];
  }
  const ind = c.industries;
  if (!Array.isArray(ind)) return [];
  const out: number[] = [];
  for (const item of ind) {
    if (item && typeof item === "object") {
      const id = (item as { id?: unknown }).id;
      if (typeof id === "number" && Number.isFinite(id)) out.push(id);
    }
  }
  return out;
}

function foundedDateForInput(v: unknown): string {
  const s = readStr(v);
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function linkedinFromSocial(v: unknown): string {
  if (!v || typeof v !== "object" || Array.isArray(v)) return "";
  const o = v as Record<string, unknown>;
  return readStr(o.linkedin);
}

function additionalDetailsToText(v: unknown): string {
  if (v == null || v === "") return "";
  if (typeof v === "object") {
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return "";
    }
  }
  return readStr(v);
}

type FormSnapshot = {
  name: string;
  domain: string;
  logo: string;
  platform: string;
  description: string;
  website: string;
  founded_date: string;
  employees_count: string;
  company_email: string;
  linkedin: string;
  raw_social_links: Record<string, unknown>;
  additional_details_text: string;
  industry_ids: number[];
};

function stableIndustryIds(ids: number[]): number[] {
  return [...ids].sort((a, b) => a - b);
}

function idsEqual(a: number[], b: number[]): boolean {
  const sa = stableIndustryIds(a);
  const sb = stableIndustryIds(b);
  return sa.length === sb.length && sa.every((x, i) => x === sb[i]);
}

function normalizeAdditionalJson(text: string): unknown {
  const t = text.trim();
  if (!t) return {};
  return JSON.parse(t) as unknown;
}

function buildPatch(
  initial: FormSnapshot,
  current: Omit<FormSnapshot, "raw_social_links">,
  catalog: AggregatorIndustry[],
): PatchAggregatorCompanyBody {
  const patch: PatchAggregatorCompanyBody = {};
  if (current.name !== initial.name) patch.name = current.name.trim();
  if (current.domain !== initial.domain) {
    patch.domain = current.domain.trim() || "";
  }
  if (current.platform !== initial.platform) {
    patch.platform = current.platform.trim() || null;
  }
  if (current.description !== initial.description) {
    patch.description = current.description.trim() || "";
  }
  if (current.website !== initial.website) {
    patch.website = current.website.trim() || "";
  }
  if (current.founded_date !== initial.founded_date) {
    patch.founded_date = current.founded_date.trim() || null;
  }
  if (current.employees_count !== initial.employees_count) {
    patch.employees_count = current.employees_count.trim() || "";
  }
  if (current.company_email !== initial.company_email) {
    patch.company_email = current.company_email.trim() || "";
  }
  if (current.linkedin !== initial.linkedin) {
    const merged: Record<string, unknown> = {
      ...initial.raw_social_links,
    };
    if (current.linkedin.trim()) {
      merged.linkedin = current.linkedin.trim();
    } else {
      delete merged.linkedin;
    }
    patch.social_links = merged;
  }
  if (
    current.additional_details_text.trim() !==
    initial.additional_details_text.trim()
  ) {
    try {
      patch.additional_details = normalizeAdditionalJson(
        current.additional_details_text,
      ) as Record<string, unknown>;
    } catch {
      throw new Error("Additional details must be valid JSON (or empty).");
    }
  }
  if (!idsEqual(current.industry_ids, initial.industry_ids)) {
    patch.industry_ids = [...current.industry_ids];
    patch.industry_names = current.industry_ids.map((id) => {
      const row = catalog.find((i) => i.id === id);
      return row?.name?.trim() || `Industry ${id}`;
    });
  }
  return patch;
}

export type EmployerDirectoryCompanyEditSectionProps = {
  companies: AggregatorCompany[];
  companiesLoading: boolean;
  industryCatalog: AggregatorIndustry[];
  breneoUserId: string;
  onDirectoryUpdated: () => void | Promise<void>;
};

/**
 * Job-aggregator company profile editor (BFF PATCH). Embed on employer profile only.
 */
export function EmployerDirectoryCompanyEditSection({
  companies,
  companiesLoading,
  industryCatalog,
  breneoUserId,
  onDirectoryUpdated,
}: EmployerDirectoryCompanyEditSectionProps) {
  const editButtonClass =
    "h-8 rounded-[14px] bg-gray-100 px-2.5 text-xs font-medium text-foreground hover:bg-gray-200 dark:bg-[#2d2d2d] dark:text-gray-200 dark:hover:bg-[#3a3a3a] md:h-10 md:px-4 md:text-sm";
  type EditableBlockKey =
    | "logo"
    | "domain"
    | "websiteEmail"
    | "linkedin"
    | "description"
    | "foundedEmployees"
    | "industries";
  /** Aggregator primary key for `/api/employer/companies/{id}` — not public name-based routes. */
  const [currentCompanyId, setCurrentCompanyId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [logo, setLogo] = useState("");
  const [platform, setPlatform] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [foundedDate, setFoundedDate] = useState("");
  const [employeesCount, setEmployeesCount] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [additionalDetailsText, setAdditionalDetailsText] = useState("");
  const [industryIds, setIndustryIds] = useState<number[]>([]);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const logoUploadGenRef = useRef(0);

  const initialRef = useRef<FormSnapshot | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editingBlock, setEditingBlock] = useState<EditableBlockKey | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (logoPreviewUrl?.startsWith("blob:"))
        URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  useEffect(() => {
    if (companiesLoading || companies.length === 0) return;
    const ids = companies
      .map((c) => parseAggregatorCompanyPk(c.id))
      .filter((n): n is number => n != null);
    setCurrentCompanyId((prev) => {
      if (prev != null && ids.includes(prev)) return prev;
      return ids[0] ?? null;
    });
  }, [companiesLoading, companies]);

  const applyCompanyDetail = useCallback(
    (c: AggregatorCompany) => {
      const nm = readStr(c.name);
      const pk = parseAggregatorCompanyPk(c.id);
      if (pk != null) setCurrentCompanyId(pk);

      setName(nm);
      setDomain(readStr(c.domain));
      setLogo(aggregatorCompanyLogoUrl(c));
      setPlatform(readStr(c.platform));
      setDescription(readStr(c.description));
      setWebsite(readStr(c.website));
      setFoundedDate(foundedDateForInput(c.founded_date));
      setEmployeesCount(normalizeEmployeeBand(readStr(c.employees_count)));
      setCompanyEmail(readStr(c.company_email));
      setLinkedin(linkedinFromSocial(c.social_links));
      setAdditionalDetailsText(additionalDetailsToText(c.additional_details));
      const iids = industryIdsFromCompany(c);
      setIndustryIds(iids);
      if (logoPreviewUrl?.startsWith("blob:"))
        URL.revokeObjectURL(logoPreviewUrl);
      setLogoPreviewUrl(null);

      const rawSl =
        c.social_links != null &&
        typeof c.social_links === "object" &&
        !Array.isArray(c.social_links)
          ? { ...(c.social_links as Record<string, unknown>) }
          : {};

      initialRef.current = {
        name: nm,
        domain: readStr(c.domain),
        logo: aggregatorCompanyLogoUrl(c),
        platform: readStr(c.platform),
        description: readStr(c.description),
        website: readStr(c.website),
        founded_date: foundedDateForInput(c.founded_date),
        employees_count: normalizeEmployeeBand(readStr(c.employees_count)),
        company_email: readStr(c.company_email),
        linkedin: linkedinFromSocial(c.social_links),
        raw_social_links: rawSl,
        additional_details_text: additionalDetailsToText(c.additional_details),
        industry_ids: [...iids],
      };
    },
    [logoPreviewUrl],
  );

  const loadDetail = useCallback(
    async (companyPk: number) => {
      if (!Number.isFinite(companyPk) || companyPk <= 0) return;
      setDetailLoading(true);
      setFieldErrors({});
      try {
        const detail = await fetchAggregatorCompanyDetail(
          companyPk,
          breneoUserId.trim() || undefined,
        );
        applyCompanyDetail(detail);
      } catch (e: unknown) {
        const err = e as { message?: string; status?: number };
        if (err.status === 403) {
          toast.error(
            "You are not allowed to view this company on the directory.",
          );
        } else if (err.status === 404) {
          toast.error("Company not found or not available for this account.");
        } else {
          toast.error(err.message || "Could not load company profile.");
        }
      } finally {
        setDetailLoading(false);
      }
    },
    [breneoUserId, applyCompanyDetail],
  );

  useEffect(() => {
    if (companiesLoading || currentCompanyId == null) return;
    loadDetail(currentCompanyId);
  }, [currentCompanyId, companiesLoading, loadDetail]);

  const snapshot = useMemo(
    (): Omit<FormSnapshot, "raw_social_links"> => ({
      name,
      domain,
      logo,
      platform,
      description,
      website,
      founded_date: foundedDate,
      employees_count: employeesCount,
      company_email: companyEmail,
      linkedin,
      additional_details_text: additionalDetailsText,
      industry_ids: [...industryIds],
    }),
    [
      name,
      domain,
      logo,
      platform,
      description,
      website,
      foundedDate,
      employeesCount,
      companyEmail,
      linkedin,
      additionalDetailsText,
      industryIds,
    ],
  );

  const onSelectCompany = (value: string) => {
    setFieldErrors({});
    const n = Number(value);
    if (Number.isInteger(n) && n > 0) setCurrentCompanyId(n);
  };

  const fieldMessage = (key: string) => fieldErrors[key];

  const clearSelectedLogo = useCallback(() => {
    if (logoPreviewUrl?.startsWith("blob:"))
      URL.revokeObjectURL(logoPreviewUrl);
    setLogoPreviewUrl(null);
    if (logoFileInputRef.current) logoFileInputRef.current.value = "";
  }, [logoPreviewUrl]);

  const resetBlock = useCallback(
    (block: EditableBlockKey) => {
      const initial = initialRef.current;
      if (!initial) return;
      switch (block) {
        case "logo":
          setLogo(initial.logo);
          clearSelectedLogo();
          break;
        case "domain":
          setDomain(initial.domain);
          break;
        case "websiteEmail":
          setWebsite(initial.website);
          setCompanyEmail(initial.company_email);
          break;
        case "linkedin":
          setLinkedin(initial.linkedin);
          break;
        case "description":
          setDescription(initial.description);
          break;
        case "foundedEmployees":
          setFoundedDate(initial.founded_date);
          setEmployeesCount(initial.employees_count);
          break;
        case "industries":
          setIndustryIds([...initial.industry_ids]);
          break;
      }
      setFieldErrors({});
      setEditingBlock(null);
    },
    [clearSelectedLogo],
  );

  const applyAggregatorSaveError = useCallback((err: AggregatorApiError) => {
    const fe = err.fieldErrors;
    if (fe && Object.keys(fe).length > 0) {
      const flat: Record<string, string> = {};
      for (const [k, arr] of Object.entries(fe)) {
        flat[k] = arr.join(" ");
      }
      setFieldErrors(flat);
    }
    if (err.status === 403) {
      toast.error("You are not allowed to update this company.");
    } else if (err.status === 404) {
      toast.error(
        "Company not found. If you renamed it elsewhere, refresh the list.",
      );
    } else if (err.status === 400 || err.status === 422) {
      toast.error(err.message || "Validation failed. Check the fields below.");
    } else {
      toast.error(err.message || "Could not save.");
    }
  }, []);

  const uploadLogoWithPendingPatch = useCallback(
    async (file: File) => {
      const initial = initialRef.current;
      if (!initial) {
        toast.error("Nothing loaded yet.");
        clearSelectedLogo();
        return;
      }
      if (currentCompanyId == null) {
        toast.error("Company id is missing.");
        clearSelectedLogo();
        return;
      }
      const ext = breneoUserId.trim();
      if (!ext) {
        toast.error("User id is missing. Refresh and try again.");
        clearSelectedLogo();
        return;
      }

      const gen = ++logoUploadGenRef.current;
      setFieldErrors({});
      setSaving(true);
      try {
        let patch: PatchAggregatorCompanyBody;
        try {
          patch = buildPatch(initial, snapshot, industryCatalog);
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : "Invalid form data.");
          return;
        }

        if (Object.keys(patch).length > 0) {
          await patchEmployerAggregatorCompany(currentCompanyId, patch);
        }
        const data = await uploadEmployerCompanyLogoToAggregator({
          companyId: currentCompanyId,
          externalUserId: ext,
          file,
        });
        if (gen !== logoUploadGenRef.current) return;

        applyCompanyDetail(data as AggregatorCompany);
        clearSelectedLogo();
        await onDirectoryUpdated();
        toast.success("Company logo uploaded.");
      } catch (e: unknown) {
        if (gen !== logoUploadGenRef.current) return;
        applyAggregatorSaveError(e as AggregatorApiError);
      } finally {
        if (gen === logoUploadGenRef.current) {
          setSaving(false);
        }
      }
    },
    [
      applyAggregatorSaveError,
      applyCompanyDetail,
      breneoUserId,
      clearSelectedLogo,
      currentCompanyId,
      industryCatalog,
      onDirectoryUpdated,
      snapshot,
    ],
  );

  const handleSave = async (): Promise<boolean> => {
    const initial = initialRef.current;
    if (!initial) {
      toast.error("Nothing loaded yet.");
      return false;
    }
    if (currentCompanyId == null) {
      toast.error("Company id is missing.");
      return false;
    }
    setFieldErrors({});
    setSaving(true);
    try {
      let patch: PatchAggregatorCompanyBody;
      try {
        patch = buildPatch(initial, snapshot, industryCatalog);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Invalid form data.");
        return false;
      }

      if (Object.keys(patch).length === 0) {
        toast.message("No changes to save.");
        return true;
      }

      const updated = await patchEmployerAggregatorCompany(
        currentCompanyId,
        patch,
      );

      if (updated) {
        applyCompanyDetail(updated);
      }
      await onDirectoryUpdated();
      toast.success("Job directory company updated.");
      return true;
    } catch (e: unknown) {
      applyAggregatorSaveError(e as AggregatorApiError);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveBlock = async () => {
    const ok = await handleSave();
    if (ok) setEditingBlock(null);
  };

  if (companiesLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading directory company…
      </p>
    );
  }

  if (companies.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {companies.length > 1 ? (
        <div className="space-y-2">
          <Label>Directory company</Label>
          <Select
            value={currentCompanyId != null ? String(currentCompanyId) : ""}
            onValueChange={onSelectCompany}
            disabled={detailLoading || saving}
          >
            <SelectTrigger className="h-[3.2rem]">
              <SelectValue placeholder="Select company" />
            </SelectTrigger>
            <SelectContent>
              {companies
                .filter((c) => parseAggregatorCompanyPk(c.id) != null)
                .map((c) => {
                  const pk = parseAggregatorCompanyPk(c.id)!;
                  const label = readStr(c.name) || `Company ${pk}`;
                  return (
                    <SelectItem key={pk} value={String(pk)}>
                      {label}
                    </SelectItem>
                  );
                })}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {detailLoading ? (
        <p className="text-sm text-muted-foreground">Loading company…</p>
      ) : (
        <div className="space-y-4">
          <input
            ref={logoFileInputRef}
            id="agg-logo-upload"
            type="file"
            accept="image/*"
            tabIndex={-1}
            className="sr-only"
            disabled={saving}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (!file.type.startsWith("image/")) {
                toast.error("Please choose an image file.");
                if (logoFileInputRef.current)
                  logoFileInputRef.current.value = "";
                return;
              }
              if (file.size > 10 * 1024 * 1024) {
                toast.error("Image size must be less than 10MB.");
                if (logoFileInputRef.current)
                  logoFileInputRef.current.value = "";
                return;
              }
              const objUrl = URL.createObjectURL(file);
              if (logoPreviewUrl?.startsWith("blob:"))
                URL.revokeObjectURL(logoPreviewUrl);
              setLogoPreviewUrl(objUrl);
              void uploadLogoWithPendingPatch(file);
            }}
          />

          <div className="rounded-3xl bg-white">
            <div className="px-7 pt-7">
              <h3 className="text-base font-semibold">Company Overview</h3>
            </div>
            <div className="px-4 py-2 divide-y divide-border/60">
              <div className="py-4 flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Profile picture
                  </span>
                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={saving || detailLoading}
                      aria-label="Change company logo"
                      className={
                        "group relative flex h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border/70 bg-muted p-0 " +
                        (saving || detailLoading
                          ? "pointer-events-none opacity-70"
                          : "")
                      }
                      onClick={() => logoFileInputRef.current?.click()}
                    >
                      {logo ? (
                        <img
                          src={logo}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                          aria-hidden
                        />
                      ) : !logoPreviewUrl ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted">
                          <UploadCloud className="h-5 w-5 text-muted-foreground" />
                        </div>
                      ) : null}
                      {logoPreviewUrl ? (
                        <>
                          <img
                            src={logoPreviewUrl}
                            alt=""
                            className="absolute inset-0 z-10 h-full w-full object-cover ring-2 ring-primary/70 ring-inset"
                            aria-hidden
                          />
                          {saving ? (
                            <div
                              className="absolute inset-0 z-20 flex items-center justify-center bg-background/55"
                              aria-hidden
                            >
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                          ) : null}
                        </>
                      ) : null}
                      <div
                        className={
                          "pointer-events-none absolute inset-0 z-[21] flex items-center justify-center bg-foreground/60 transition-opacity duration-200 " +
                          (saving || logoPreviewUrl
                            ? "opacity-0"
                            : "opacity-0 group-hover:opacity-100")
                        }
                        aria-hidden
                      >
                        <span className="text-[11px] font-medium text-background">
                          Change
                        </span>
                      </div>
                    </button>
                    {logoPreviewUrl && !saving ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => resetBlock("logo")}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Discard
                      </Button>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {saving && logoPreviewUrl
                        ? "Uploading new logo…"
                        : "Choose an image — it uploads automatically."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">
                    Company name
                  </p>
                  <p className="text-sm font-medium mt-1 break-words">
                    {name || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Company name is read-only.
                  </p>
                </div>
              </div>

              <div className="py-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    Domain
                  </p>
                  <div className="flex shrink-0 items-start gap-1.5">
                    {editingBlock === "domain" ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 px-2.5 text-xs md:h-10 md:px-3 md:text-sm"
                          onClick={saveBlock}
                          disabled={saving}
                        >
                          {saving ? "Saving…" : "Save"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs md:h-10 md:px-3 md:text-sm"
                          onClick={() => resetBlock("domain")}
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={editButtonClass}
                        onClick={() => setEditingBlock("domain")}
                      >
                        <PencilLine className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4" />
                        შეცვლა
                      </Button>
                    )}
                  </div>
                </div>
                {editingBlock === "domain" ? (
                  <div className="w-full space-y-2 md:max-w-md">
                    <Input
                      id="agg-domain"
                      className="h-9 w-full md:h-10"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      disabled={saving}
                      aria-invalid={Boolean(fieldMessage("domain"))}
                    />
                    {fieldMessage("domain") ? (
                      <p className="text-xs text-destructive">
                        {fieldMessage("domain")}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm break-words">{domain || "—"}</p>
                )}
              </div>

              <div className="py-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    LinkedIn
                  </p>
                  <div className="flex shrink-0 items-start gap-1.5">
                    {editingBlock === "linkedin" ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 px-2.5 text-xs md:h-10 md:px-3 md:text-sm"
                          onClick={saveBlock}
                          disabled={saving}
                        >
                          {saving ? "Saving…" : "Save"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs md:h-10 md:px-3 md:text-sm"
                          onClick={() => resetBlock("linkedin")}
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={editButtonClass}
                        onClick={() => setEditingBlock("linkedin")}
                      >
                        <PencilLine className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4" />
                        შეცვლა
                      </Button>
                    )}
                  </div>
                </div>
                {editingBlock === "linkedin" ? (
                  <div className="w-full space-y-2 md:max-w-xl">
                    <Input
                      id="agg-li"
                      type="url"
                      className="h-9 w-full md:h-10"
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      disabled={saving}
                      placeholder="https://linkedin.com/company/…"
                      aria-invalid={Boolean(
                        fieldMessage("social_links") ||
                        fieldMessage("linkedin"),
                      )}
                    />
                    {fieldMessage("social_links") ||
                    fieldMessage("linkedin") ? (
                      <p className="text-xs text-destructive">
                        {fieldMessage("social_links") ||
                          fieldMessage("linkedin")}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm break-words">{linkedin || "—"}</p>
                )}
              </div>

              <div className="py-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Website and company email
                  </p>
                  {editingBlock === "websiteEmail" ? (
                    <div className="flex shrink-0 items-start gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 px-2.5 text-xs md:h-10 md:px-3 md:text-sm"
                        onClick={saveBlock}
                        disabled={saving}
                      >
                        {saving ? "Saving…" : "Save"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs md:h-10 md:px-3 md:text-sm"
                        onClick={() => resetBlock("websiteEmail")}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={editButtonClass}
                      onClick={() => setEditingBlock("websiteEmail")}
                    >
                      <PencilLine className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4" />
                      შეცვლა
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Website</p>
                    {editingBlock === "websiteEmail" ? (
                      <>
                        <Input
                          id="agg-website"
                          className="h-9 w-full md:h-10"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          disabled={saving}
                          placeholder="https://…"
                          aria-invalid={Boolean(fieldMessage("website"))}
                        />
                        {fieldMessage("website") ? (
                          <p className="text-xs text-destructive">
                            {fieldMessage("website")}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-sm break-words">{website || "—"}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Company email
                    </p>
                    {editingBlock === "websiteEmail" ? (
                      <>
                        <Input
                          id="agg-email"
                          type="email"
                          className="h-9 w-full md:h-10"
                          value={companyEmail}
                          onChange={(e) => setCompanyEmail(e.target.value)}
                          disabled={saving}
                          aria-invalid={Boolean(fieldMessage("company_email"))}
                        />
                        {fieldMessage("company_email") ? (
                          <p className="text-xs text-destructive">
                            {fieldMessage("company_email")}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-sm break-words">
                        {companyEmail || "—"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white">
            <div className="px-7 pt-7">
              <h3 className="text-base font-semibold">Company Details</h3>
            </div>
            <div className="px-4 py-2 divide-y divide-border/60">
              <div className="py-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Description
                  </p>
                  {editingBlock === "description" ? (
                    <div className="flex shrink-0 items-start gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 px-2.5 text-xs md:h-10 md:px-3 md:text-sm"
                        onClick={saveBlock}
                        disabled={saving}
                      >
                        {saving ? "Saving…" : "Save"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs md:h-10 md:px-3 md:text-sm"
                        onClick={() => resetBlock("description")}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={editButtonClass}
                      onClick={() => setEditingBlock("description")}
                    >
                      <PencilLine className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4" />
                      შეცვლა
                    </Button>
                  )}
                </div>
                {editingBlock === "description" ? (
                  <div className="max-w-3xl space-y-2">
                    <Textarea
                      id="agg-desc"
                      className="min-h-[120px] text-sm"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={saving}
                      rows={5}
                      aria-invalid={Boolean(fieldMessage("description"))}
                    />
                    {fieldMessage("description") ? (
                      <p className="text-xs text-destructive">
                        {fieldMessage("description")}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {description || "—"}
                  </p>
                )}
              </div>

              <div className="py-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Founded date and employees
                  </p>
                  {editingBlock === "foundedEmployees" ? (
                    <div className="flex shrink-0 items-start gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 px-2.5 text-xs md:h-10 md:px-3 md:text-sm"
                        onClick={saveBlock}
                        disabled={saving}
                      >
                        {saving ? "Saving…" : "Save"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs md:h-10 md:px-3 md:text-sm"
                        onClick={() => resetBlock("foundedEmployees")}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={editButtonClass}
                      onClick={() => setEditingBlock("foundedEmployees")}
                    >
                      <PencilLine className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4" />
                      შეცვლა
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Founded date
                    </p>
                    {editingBlock === "foundedEmployees" ? (
                      <>
                        <Input
                          id="agg-founded"
                          type="date"
                          className="h-9 w-full md:h-10"
                          value={foundedDate}
                          onChange={(e) => setFoundedDate(e.target.value)}
                          disabled={saving}
                          aria-invalid={Boolean(fieldMessage("founded_date"))}
                        />
                        {fieldMessage("founded_date") ? (
                          <p className="text-xs text-destructive">
                            {fieldMessage("founded_date")}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-sm">{foundedDate || "—"}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Employees (range)
                    </p>
                    {editingBlock === "foundedEmployees" ? (
                      <>
                        <Select
                          value={
                            normalizeEmployeeBand(employeesCount) || undefined
                          }
                          onValueChange={setEmployeesCount}
                          disabled={saving}
                        >
                          <SelectTrigger
                            id="agg-employees"
                            className="h-9 w-full md:h-10"
                            aria-invalid={Boolean(
                              fieldMessage("employees_count"),
                            )}
                          >
                            <SelectValue placeholder="Select range" />
                          </SelectTrigger>
                          <SelectContent>
                            {EMPLOYEE_BANDS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {fieldMessage("employees_count") ? (
                          <p className="text-xs text-destructive">
                            {fieldMessage("employees_count")}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-sm">{employeesCount || "—"}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="py-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Industries
                  </p>
                  {editingBlock === "industries" ? (
                    <div className="flex shrink-0 items-start gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 px-2.5 text-xs md:h-10 md:px-3 md:text-sm"
                        onClick={saveBlock}
                        disabled={saving}
                      >
                        {saving ? "Saving…" : "Save"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs md:h-10 md:px-3 md:text-sm"
                        onClick={() => resetBlock("industries")}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={editButtonClass}
                      onClick={() => setEditingBlock("industries")}
                    >
                      <PencilLine className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4" />
                      შეცვლა
                    </Button>
                  )}
                </div>
                {editingBlock === "industries" ? (
                  <>
                    {industryCatalog.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Industry list unavailable. Try again later.
                      </p>
                    ) : (
                      <IndustryMultiSelect
                        industries={industryCatalog}
                        value={industryIds}
                        onChange={setIndustryIds}
                        disabled={saving}
                        searchInputClassName="md:max-w-[260px]"
                        chipClassName="min-h-10 px-3 text-sm"
                      />
                    )}
                    {fieldMessage("industry_ids") ||
                    fieldMessage("industry_names") ? (
                      <p className="text-xs text-destructive">
                        {fieldMessage("industry_ids") ||
                          fieldMessage("industry_names")}
                      </p>
                    ) : null}
                  </>
                ) : industryIds.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {industryIds.map((id) => {
                      const label =
                        industryCatalog
                          .find((i) => i.id === id)
                          ?.name?.trim() || `Industry ${id}`;
                      return (
                        <span
                          key={id}
                          className="inline-flex min-h-10 items-center rounded-md bg-gray-100 px-3 py-2 text-sm text-foreground dark:bg-[#2d2d2d]"
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm">—</p>
                )}
              </div>
            </div>
          </div>

          {fieldMessage("non_field_errors") ? (
            <p className="text-sm text-destructive">
              {fieldMessage("non_field_errors")}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
