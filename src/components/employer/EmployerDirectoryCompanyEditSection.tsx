import React, {
  useCallback,
  useEffect,
  useId,
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
  type AggregatorCompany,
  type AggregatorIndustry,
  fetchAggregatorCompanyDetail,
  parseAggregatorCompanyPk,
  patchEmployerAggregatorCompany,
  uploadEmployerAggregatorCompanyLogo,
  type PatchAggregatorCompanyBody,
} from "@/api/employer/aggregatorBffApi";
import { UploadCloud, X } from "lucide-react";

const EMPLOYEE_BANDS = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
] as const;

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
  if (current.logo !== initial.logo) {
    patch.logo = current.logo.trim() || "";
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
  const bandsListId = useId();
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
  const [logoFileName, setLogoFileName] = useState("");
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const initialRef = useRef<FormSnapshot | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  const applyCompanyDetail = useCallback((c: AggregatorCompany) => {
    const nm = readStr(c.name);
    const pk = parseAggregatorCompanyPk(c.id);
    if (pk != null) setCurrentCompanyId(pk);

    setName(nm);
    setDomain(readStr(c.domain));
    setLogo(readStr(c.logo));
    setPlatform(readStr(c.platform));
    setDescription(readStr(c.description));
    setWebsite(readStr(c.website));
    setFoundedDate(foundedDateForInput(c.founded_date));
    setEmployeesCount(readStr(c.employees_count));
    setCompanyEmail(readStr(c.company_email));
    setLinkedin(linkedinFromSocial(c.social_links));
    setAdditionalDetailsText(additionalDetailsToText(c.additional_details));
    const iids = industryIdsFromCompany(c);
    setIndustryIds(iids);
    setLogoFileName("");
    setLogoFile(null);
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
      logo: readStr(c.logo),
      platform: readStr(c.platform),
      description: readStr(c.description),
      website: readStr(c.website),
      founded_date: foundedDateForInput(c.founded_date),
      employees_count: readStr(c.employees_count),
      company_email: readStr(c.company_email),
      linkedin: linkedinFromSocial(c.social_links),
      raw_social_links: rawSl,
      additional_details_text: additionalDetailsToText(c.additional_details),
      industry_ids: [...iids],
    };
  }, []);

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
    setLogoFile(null);
    setLogoFileName("");
    if (logoPreviewUrl?.startsWith("blob:"))
      URL.revokeObjectURL(logoPreviewUrl);
    setLogoPreviewUrl(null);
    if (logoFileInputRef.current) logoFileInputRef.current.value = "";
  }, [logoPreviewUrl]);

  const handleSave = async () => {
    const initial = initialRef.current;
    if (!initial) {
      toast.error("Nothing loaded yet.");
      return;
    }
    setFieldErrors({});
    let patch: PatchAggregatorCompanyBody;
    try {
      patch = buildPatch(initial, snapshot, industryCatalog);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Invalid form data.");
      return;
    }
    if (Object.keys(patch).length === 0 && !logoFile) {
      toast.message("No changes to save.");
      return;
    }
    if (currentCompanyId == null) {
      toast.error("Company id is missing.");
      return;
    }
    setSaving(true);
    try {
      let updated: AggregatorCompany | null = null;
      if (Object.keys(patch).length > 0) {
        updated = await patchEmployerAggregatorCompany(currentCompanyId, patch);
      }
      if (logoFile) {
        updated = await uploadEmployerAggregatorCompanyLogo(
          currentCompanyId,
          logoFile,
          breneoUserId || undefined,
        );
      }
      if (updated) {
        applyCompanyDetail(updated);
      }
      clearSelectedLogo();
      await onDirectoryUpdated();
      toast.success("Job directory company updated.");
    } catch (e: unknown) {
      const err = e as AggregatorApiError;
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
      } else if (err.status === 400) {
        toast.error(
          err.message || "Validation failed. Check the fields below.",
        );
      } else {
        toast.error(err.message || "Could not save.");
      }
    } finally {
      setSaving(false);
    }
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
    <div className="rounded-2xl border border-border/60 p-4 bg-muted/20 space-y-4">
      {companies.length > 1 ? (
        <div className="space-y-2">
          <Label>Directory company</Label>
          <Select
            value={currentCompanyId != null ? String(currentCompanyId) : ""}
            onValueChange={onSelectCompany}
            disabled={detailLoading || saving}
          >
            <SelectTrigger className="h-[3rem]">
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
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="agg-name">Company name</Label>
              <Input
                id="agg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Company name is read-only here. API routes use the numeric
                company id above.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="agg-logo-upload">Profile picture</Label>
              <input
                ref={logoFileInputRef}
                id="agg-logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                disabled={saving}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
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
                  setLogoFile(file);
                  setLogoFileName(file.name);
                }}
              />
              {logoPreviewUrl || logo ? (
                <div className="space-y-2">
                  <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-muted">
                    <img
                      src={logoPreviewUrl || logo}
                      alt="Company logo preview"
                      className="h-full w-full object-cover"
                    />
                    {logoPreviewUrl ? (
                      <button
                        type="button"
                        onClick={clearSelectedLogo}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                        aria-label="Remove selected logo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => logoFileInputRef.current?.click()}
                    disabled={saving}
                  >
                    {logoPreviewUrl ? "Change photo" : "Upload photo"}
                  </Button>
                  {logoFileName ? (
                    <p className="text-xs text-muted-foreground">
                      Selected file: {logoFileName}. It will be uploaded and
                      saved with the other changes.
                    </p>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  disabled={saving}
                  className="flex h-32 w-32 shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-transparent px-2 text-gray-500 transition hover:border-breneo-blue disabled:opacity-60 disabled:cursor-not-allowed dark:border-[#444444]"
                >
                  <UploadCloud className="h-8 w-8 text-gray-400" />
                  <span className="text-sm font-medium text-breneo-blue">
                    Upload photo
                  </span>
                  <span className="text-xs text-gray-500">
                    PNG, JPG up to 10MB
                  </span>
                </button>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="agg-domain">Domain</Label>
              <Input
                id="agg-domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={saving}
                aria-invalid={Boolean(fieldMessage.domain)}
              />
              {fieldMessage.domain ? (
                <p className="text-xs text-destructive">
                  {fieldMessage.domain}
                </p>
              ) : null}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="agg-desc">Description</Label>
              <Textarea
                id="agg-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving}
                rows={5}
                aria-invalid={Boolean(fieldMessage.description)}
              />
              {fieldMessage.description ? (
                <p className="text-xs text-destructive">
                  {fieldMessage.description}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="agg-website">Website</Label>
              <Input
                id="agg-website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={saving}
                placeholder="https://…"
                aria-invalid={Boolean(fieldMessage.website)}
              />
              {fieldMessage.website ? (
                <p className="text-xs text-destructive">
                  {fieldMessage.website}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="agg-email">Company email</Label>
              <Input
                id="agg-email"
                type="email"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                disabled={saving}
                aria-invalid={Boolean(fieldMessage.company_email)}
              />
              {fieldMessage.company_email ? (
                <p className="text-xs text-destructive">
                  {fieldMessage.company_email}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="agg-founded">Founded date</Label>
              <Input
                id="agg-founded"
                type="date"
                value={foundedDate}
                onChange={(e) => setFoundedDate(e.target.value)}
                disabled={saving}
                aria-invalid={Boolean(fieldMessage.founded_date)}
              />
              {fieldMessage.founded_date ? (
                <p className="text-xs text-destructive">
                  {fieldMessage.founded_date}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="agg-employees">Employees (range)</Label>
              <Input
                id="agg-employees"
                value={employeesCount}
                onChange={(e) => setEmployeesCount(e.target.value)}
                disabled={saving}
                placeholder="e.g. 51-200"
                list={bandsListId}
                aria-invalid={Boolean(fieldMessage.employees_count)}
              />
              <datalist id={bandsListId}>
                {EMPLOYEE_BANDS.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
              {fieldMessage.employees_count ? (
                <p className="text-xs text-destructive">
                  {fieldMessage.employees_count}
                </p>
              ) : null}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="agg-li">LinkedIn (social link)</Label>
              <Input
                id="agg-li"
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                disabled={saving}
                placeholder="https://linkedin.com/company/…"
                aria-invalid={Boolean(
                  fieldMessage.social_links || fieldMessage.linkedin,
                )}
              />
              {fieldMessage.social_links || fieldMessage.linkedin ? (
                <p className="text-xs text-destructive">
                  {fieldMessage.social_links || fieldMessage.linkedin}
                </p>
              ) : null}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Industries</Label>
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
              {fieldMessage.industry_ids || fieldMessage.industry_names ? (
                <p className="text-xs text-destructive">
                  {fieldMessage.industry_ids || fieldMessage.industry_names}
                </p>
              ) : null}
            </div>
          </div>

          {fieldMessage.non_field_errors ? (
            <p className="text-sm text-destructive">
              {fieldMessage.non_field_errors}
            </p>
          ) : null}

          <Button onClick={handleSave} disabled={saving || detailLoading}>
            {saving ? "Saving…" : "Save directory company"}
          </Button>
        </>
      )}
    </div>
  );
}
