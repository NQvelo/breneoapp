import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Link2,
  Briefcase,
  PencilLine,
  PiggyBank,
  Clock,
  Building2,
  Globe,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ICountry, ICity } from "country-state-city";
import {
  validateHttpUrl,
  type AggregatorWorkMode,
} from "@/api/employer/publishJob";

export type PreviewEditKey =
  | "title"
  | "description"
  | "location"
  | "workMode"
  | "employmentType"
  | "applyUrl"
  | "salary"
  | "responsibilities"
  | "qualifications";

const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Temporary",
] as const;

type WorkOpt = { value: AggregatorWorkMode; label: string };

export interface EmployerJobFormPreviewProps {
  companyName: string;
  companyLogo?: string | null;
  companyWebsite?: string | null;
  workModeOptions: WorkOpt[];

  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  responsibilitiesText: string;
  setResponsibilitiesText: (v: string) => void;
  qualificationsText: string;
  setQualificationsText: (v: string) => void;
  workMode: AggregatorWorkMode;
  setWorkMode: (v: AggregatorWorkMode) => void;
  employmentType: string;
  setEmploymentType: (v: string) => void;
  applyUrl: string;
  setApplyUrl: (v: string) => void;
  salary: string;
  setSalary: (v: string) => void;

  previewLocationLine: string;
  workModeLabel: string;
  previewSalaryLine: string;

  previewEditKey: PreviewEditKey | null;
  setPreviewEditKey: (k: PreviewEditKey | null) => void;
  draftTitle: string;
  setDraftTitle: (v: string) => void;
  draftDescription: string;
  setDraftDescription: (v: string) => void;
  draftSalary: string;
  setDraftSalary: (v: string) => void;
  draftApplyUrl: string;
  setDraftApplyUrl: (v: string) => void;
  draftWorkMode: AggregatorWorkMode;
  setDraftWorkMode: (v: AggregatorWorkMode) => void;
  draftEmploymentType: string;
  setDraftEmploymentType: (v: string) => void;
  draftResponsibilities: string;
  setDraftResponsibilities: (v: string) => void;
  draftQualifications: string;
  setDraftQualifications: (v: string) => void;

  isEdit: boolean;
  responsibilitiesLabel: string;
  qualificationsLabel: string;

  fieldErrors: Record<string, string[]>;

  /** Location block (country + city) — same controls as the add-job form */
  countryQuery: string;
  setCountryQuery: (v: string) => void;
  setLocationCountry: (v: string) => void;
  countryOpen: boolean;
  setCountryOpen: (v: boolean) => void;
  cityQuery: string;
  setCityQuery: (v: string) => void;
  setLocation: (v: string) => void;
  cityOpen: boolean;
  setCityOpen: (v: boolean) => void;
  selectedCountryIsoCode: string;
  setSelectedCountryIsoCode: (v: string) => void;
  filteredCountries: ICountry[];
  filteredCities: ICity[];
  worldCountries: ICountry[];
  selectCountry: (name: string, isoCode: string) => void;
  selectCity: (name: string) => void;
  tryResolveCountryFromQuery: (raw: string) => boolean;
  tryResolveCityFromQuery: (raw: string) => boolean;
  dashedShell: string;

  onPublish: () => void;
  publishing: boolean;
  publishLabel: string;

  onLocationEditOpen: () => void;
  onLocationEditCancel: () => void;
}

const editIconButtonClass =
  "h-8 w-8 shrink-0 rounded-md bg-gray-100 text-foreground hover:bg-gray-200 dark:bg-[#2d2d2d] dark:text-gray-200 dark:hover:bg-[#3a3a3a] md:h-7 md:w-7";

function EditOrSaveRow(props: {
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  editAriaLabel?: string;
}) {
  const { editing, onEdit, onSave, onCancel, editAriaLabel } = props;
  if (editing) {
    return (
      <div className="flex shrink-0 items-start gap-1.5">
        <Button
          type="button"
          size="sm"
          className="h-8 px-2.5 text-xs md:h-10 md:px-3 md:text-sm"
          onClick={onSave}
        >
          Save
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-xs md:h-10 md:px-3 md:text-sm"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    );
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={editIconButtonClass}
      onClick={onEdit}
      aria-label={editAriaLabel ?? "Edit"}
    >
      <PencilLine className="h-3.5 w-3.5 md:h-3 md:w-3" />
    </Button>
  );
}

export function EmployerJobFormPreview(p: EmployerJobFormPreviewProps) {
  const applyValid = validateHttpUrl(p.applyUrl);
  const canOpenApply =
    applyValid.ok === true && Boolean(applyValid.url?.trim());

  return (
    <div
      id="preview"
      className="max-w-5xl mx-auto pt-0 sm:pt-4 pb-40 sm:pb-32 md:pb-24 sm:px-4 md:px-6 space-y-4 scroll-mt-4"
    >
      <Card className="bg-transparent border-0 shadow-none h-full">
        <CardContent className="p-1 sm:p-6 space-y-2">
          {/* Job header — mirrors JobDetailPage */}
          <div>
            <div className="flex flex-col md:flex-row md:items-start gap-6 bg-white dark:bg-card rounded-3xl p-6 shadow-none border-0">
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-center gap-4 mb-1">
                  {p.companyLogo ? (
                    <img
                      src={p.companyLogo}
                      alt={p.companyName || "Company logo"}
                      className="h-12 w-12 rounded-md object-cover flex-shrink-0"
                    />
                  ) : null}
                  <div className="flex flex-col min-w-0 flex-1 gap-2">
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 truncate">
                      {p.companyName}
                    </p>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {p.previewEditKey === "title" ? (
                          <Input
                            value={p.draftTitle}
                            onChange={(e) => p.setDraftTitle(e.target.value)}
                            className="text-lg md:text-2xl font-semibold h-auto py-2"
                            placeholder="Job title"
                          />
                        ) : (
                          <h1 className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white">
                            {p.title.trim() || "Untitled position"}
                          </h1>
                        )}
                      </div>
                      <EditOrSaveRow
                        editing={p.previewEditKey === "title"}
                        editAriaLabel="Edit job title"
                        onEdit={() => {
                          p.setDraftTitle(p.title);
                          p.setPreviewEditKey("title");
                        }}
                        onSave={() => {
                          p.setTitle(p.draftTitle);
                          p.setPreviewEditKey(null);
                        }}
                        onCancel={() => p.setPreviewEditKey(null)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 min-w-0">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="break-words">{p.previewLocationLine}</span>
                  </div>
                  <EditOrSaveRow
                    editing={p.previewEditKey === "location"}
                    editAriaLabel="Edit location"
                    onEdit={() => {
                      p.onLocationEditOpen();
                      p.setPreviewEditKey("location");
                    }}
                    onSave={() => p.setPreviewEditKey(null)}
                    onCancel={() => p.onLocationEditCancel()}
                  />
                </div>
                {p.previewEditKey === "location" ? (
                  <div
                    className={cn(
                      "rounded-xl border border-gray-100 bg-gray-50/90 dark:bg-white/5 p-4 space-y-2",
                    )}
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label
                          htmlFor="preview-job-location-country"
                          className="text-xs text-muted-foreground"
                        >
                          Country
                        </Label>
                        <div className="relative">
                          <Input
                            id="preview-job-location-country"
                            value={p.countryQuery}
                            onChange={(e) => {
                              const next = e.target.value;
                              p.setCountryQuery(next);
                              p.setLocationCountry(next);
                              p.setCountryOpen(true);
                              const exact = p.worldCountries.find(
                                (c) =>
                                  c.name.toLowerCase() === next.trim().toLowerCase(),
                              );
                              if (exact) {
                                if (p.selectedCountryIsoCode !== exact.isoCode) {
                                  p.setSelectedCountryIsoCode(exact.isoCode);
                                  p.setLocation("");
                                  p.setCityQuery("");
                                }
                              } else {
                                p.setSelectedCountryIsoCode("");
                                p.setLocation("");
                                p.setCityQuery("");
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (
                                  !p.tryResolveCountryFromQuery(p.countryQuery)
                                ) {
                                  const first = p.filteredCountries[0];
                                  if (first)
                                    p.selectCountry(first.name, first.isoCode);
                                }
                                p.setCountryOpen(false);
                              }
                            }}
                            onFocus={() => p.setCountryOpen(true)}
                            onBlur={() => {
                              p.tryResolveCountryFromQuery(p.countryQuery);
                              setTimeout(() => p.setCountryOpen(false), 120);
                            }}
                            placeholder="Select country"
                            className="bg-white dark:bg-background"
                            autoComplete="off"
                          />
                          {p.countryOpen ? (
                            <div className="absolute z-40 mt-1 max-h-52 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                              {p.countryQuery.trim().length < 2 ? (
                                <p className="px-3 py-2 text-sm text-muted-foreground">
                                  Type at least 2 characters
                                </p>
                              ) : p.filteredCountries.length === 0 ? (
                                <p className="px-3 py-2 text-sm text-muted-foreground">
                                  No matches found
                                </p>
                              ) : (
                                p.filteredCountries.map((country) => (
                                  <button
                                    key={country.isoCode}
                                    type="button"
                                    className="block w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() =>
                                      p.selectCountry(country.name, country.isoCode)
                                    }
                                  >
                                    {country.name}
                                  </button>
                                ))
                              )}
                            </div>
                          ) : null}
                        </div>
                        {p.fieldErrors.location_country?.[0] ? (
                          <p className="text-sm text-destructive">
                            {p.fieldErrors.location_country[0]}
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor="preview-job-location-city"
                          className="text-xs text-muted-foreground"
                        >
                          City
                        </Label>
                        <div className="relative">
                          <Input
                            id="preview-job-location-city"
                            value={p.cityQuery}
                            onChange={(e) => {
                              const next = e.target.value;
                              p.setCityQuery(next);
                              p.setLocation(next);
                              p.setCityOpen(true);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (!p.tryResolveCityFromQuery(p.cityQuery)) {
                                  const first = p.filteredCities[0];
                                  if (first) p.selectCity(first.name);
                                }
                                p.setCityOpen(false);
                              }
                            }}
                            onFocus={() =>
                              p.selectedCountryIsoCode && p.setCityOpen(true)
                            }
                            onBlur={() => {
                              p.tryResolveCityFromQuery(p.cityQuery);
                              setTimeout(() => p.setCityOpen(false), 120);
                            }}
                            placeholder="Select city"
                            className="bg-white dark:bg-background"
                            autoComplete="off"
                            disabled={!p.selectedCountryIsoCode}
                          />
                          {p.cityOpen && p.selectedCountryIsoCode ? (
                            <div className="absolute z-40 mt-1 max-h-52 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                              {p.cityQuery.trim().length < 2 ? (
                                <p className="px-3 py-2 text-sm text-muted-foreground">
                                  Type at least 2 characters
                                </p>
                              ) : p.filteredCities.length === 0 ? (
                                <p className="px-3 py-2 text-sm text-muted-foreground">
                                  No matches found
                                </p>
                              ) : (
                                p.filteredCities.map((city) => (
                                  <button
                                    key={`${city.countryCode}-${city.name}-${city.latitude}-${city.longitude}`}
                                    type="button"
                                    className="block w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => p.selectCity(city.name)}
                                  >
                                    {city.name}
                                  </button>
                                ))
                              )}
                            </div>
                          ) : null}
                        </div>
                        {!p.selectedCountryIsoCode ? (
                          <p className="text-xs text-muted-foreground">
                            Select a country first
                          </p>
                        ) : null}
                        {p.fieldErrors.location?.[0] ? (
                          <p className="text-sm text-destructive">
                            {p.fieldErrors.location[0]}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-col gap-2 md:gap-3 mb-2 text-sm md:text-base font-medium text-gray-700 dark:text-gray-200">
                  <div className="flex w-full min-w-0 items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
                      <PiggyBank className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                      {p.previewEditKey === "salary" ? (
                        <Input
                          value={p.draftSalary}
                          onChange={(e) => p.setDraftSalary(e.target.value)}
                          className="h-9 max-w-[min(100%,220px)]"
                          placeholder="Salary"
                        />
                      ) : (
                        <span className="break-words">{p.previewSalaryLine}</span>
                      )}
                    </div>
                    <EditOrSaveRow
                      editing={p.previewEditKey === "salary"}
                      editAriaLabel="Edit salary"
                      onEdit={() => {
                        p.setDraftSalary(p.salary);
                        p.setPreviewEditKey("salary");
                      }}
                      onSave={() => {
                        p.setSalary(p.draftSalary);
                        p.setPreviewEditKey(null);
                      }}
                      onCancel={() => p.setPreviewEditKey(null)}
                    />
                  </div>
                  <div className="flex w-full min-w-0 items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
                      <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                      {p.previewEditKey === "employmentType" ? (
                        <Select
                          value={p.draftEmploymentType}
                          onValueChange={p.setDraftEmploymentType}
                        >
                          <SelectTrigger className="h-9 w-[min(100%,180px)] bg-white dark:bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EMPLOYMENT_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="break-words">{p.employmentType}</span>
                      )}
                    </div>
                    <EditOrSaveRow
                      editing={p.previewEditKey === "employmentType"}
                      editAriaLabel="Edit employment type"
                      onEdit={() => {
                        p.setDraftEmploymentType(p.employmentType);
                        p.setPreviewEditKey("employmentType");
                      }}
                      onSave={() => {
                        p.setEmploymentType(p.draftEmploymentType);
                        p.setPreviewEditKey(null);
                      }}
                      onCancel={() => p.setPreviewEditKey(null)}
                    />
                  </div>
                  <div className="flex w-full min-w-0 items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
                      <Briefcase className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                      {p.previewEditKey === "workMode" ? (
                        <Select
                          value={p.draftWorkMode}
                          onValueChange={(v) =>
                            p.setDraftWorkMode(v as AggregatorWorkMode)
                          }
                        >
                          <SelectTrigger className="h-9 w-[min(100%,180px)] bg-white dark:bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {p.workModeOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="break-words">{p.workModeLabel}</span>
                      )}
                    </div>
                    <EditOrSaveRow
                      editing={p.previewEditKey === "workMode"}
                      editAriaLabel="Edit work mode"
                      onEdit={() => {
                        p.setDraftWorkMode(p.workMode);
                        p.setPreviewEditKey("workMode");
                      }}
                      onSave={() => {
                        p.setWorkMode(p.draftWorkMode);
                        p.setPreviewEditKey(null);
                      }}
                      onCancel={() => p.setPreviewEditKey(null)}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                    <Link2 className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium">Application URL</span>
                  </div>
                  <EditOrSaveRow
                    editing={p.previewEditKey === "applyUrl"}
                    editAriaLabel="Edit application URL"
                    onEdit={() => {
                      p.setDraftApplyUrl(p.applyUrl);
                      p.setPreviewEditKey("applyUrl");
                    }}
                    onSave={() => {
                      p.setApplyUrl(p.draftApplyUrl);
                      p.setPreviewEditKey(null);
                    }}
                    onCancel={() => p.setPreviewEditKey(null)}
                  />
                </div>
                {p.previewEditKey === "applyUrl" ? (
                  <div className="space-y-1">
                    <Input
                      value={p.draftApplyUrl}
                      onChange={(e) => p.setDraftApplyUrl(e.target.value)}
                      placeholder="https://…"
                      className="bg-white dark:bg-background"
                    />
                    {p.fieldErrors.apply_url?.[0] ? (
                      <p className="text-sm text-destructive">
                        {p.fieldErrors.apply_url[0]}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm break-all text-gray-700 dark:text-gray-300">
                    {p.applyUrl.trim() || "—"}
                  </p>
                )}
              </div>

              {canOpenApply && applyValid.ok ? (
                <div className="flex flex-row items-start gap-2 md:pt-0">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => window.open(applyValid.url, "_blank")}
                  >
                    Apply Now
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white dark:bg-card rounded-3xl p-6 shadow-none border-0 mt-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold">Description</h2>
              <EditOrSaveRow
                editing={p.previewEditKey === "description"}
                editAriaLabel="Edit description"
                onEdit={() => {
                  p.setDraftDescription(p.description);
                  p.setPreviewEditKey("description");
                }}
                onSave={() => {
                  p.setDescription(p.draftDescription);
                  p.setPreviewEditKey(null);
                }}
                onCancel={() => p.setPreviewEditKey(null)}
              />
            </div>
            {p.previewEditKey === "description" ? (
              <Textarea
                value={p.draftDescription}
                onChange={(e) => p.setDraftDescription(e.target.value)}
                className={cn(p.dashedShell, "min-h-[200px]")}
                placeholder="Describe the role…"
              />
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-line">
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-[0.9rem] md:text-md">
                  {p.description.trim() || "No description yet."}
                </p>
              </div>
            )}
            {p.fieldErrors.full_description?.[0] ? (
              <p className="text-sm text-destructive mt-2">
                {p.fieldErrors.full_description[0]}
              </p>
            ) : null}
          </div>

          {/* Responsibilities / qualifications */}
          <div className="bg-white dark:bg-card rounded-3xl p-6 shadow-none border-0 mt-6 space-y-[4.5rem]">
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h2 className="text-lg font-semibold">
                    {p.responsibilitiesLabel}
                  </h2>
                  <EditOrSaveRow
                    editing={p.previewEditKey === "responsibilities"}
                    editAriaLabel="Edit responsibilities"
                    onEdit={() => {
                      p.setDraftResponsibilities(p.responsibilitiesText);
                      p.setPreviewEditKey("responsibilities");
                    }}
                    onSave={() => {
                      p.setResponsibilitiesText(p.draftResponsibilities);
                      p.setPreviewEditKey(null);
                    }}
                    onCancel={() => p.setPreviewEditKey(null)}
                  />
                </div>
                {p.previewEditKey === "responsibilities" ? (
                  <Textarea
                    value={p.draftResponsibilities}
                    onChange={(e) =>
                      p.setDraftResponsibilities(e.target.value)
                    }
                    className={cn(p.dashedShell, "min-h-[140px]")}
                    placeholder="One bullet per line"
                  />
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-line">
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-[0.9rem] md:text-md">
                      {p.responsibilitiesText.trim() || "—"}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h2 className="text-lg font-semibold">
                    {p.qualificationsLabel}
                  </h2>
                  <EditOrSaveRow
                    editing={p.previewEditKey === "qualifications"}
                    editAriaLabel="Edit qualifications"
                    onEdit={() => {
                      p.setDraftQualifications(p.qualificationsText);
                      p.setPreviewEditKey("qualifications");
                    }}
                    onSave={() => {
                      p.setQualificationsText(p.draftQualifications);
                      p.setPreviewEditKey(null);
                    }}
                    onCancel={() => p.setPreviewEditKey(null)}
                  />
                </div>
                {p.previewEditKey === "qualifications" ? (
                  <Textarea
                    value={p.draftQualifications}
                    onChange={(e) => p.setDraftQualifications(e.target.value)}
                    className={cn(p.dashedShell, "min-h-[140px]")}
                    placeholder="One bullet per line"
                  />
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-line">
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-[0.9rem] md:text-md">
                      {p.qualificationsText.trim() || "—"}
                    </p>
                  </div>
                )}
              </div>
            </div>

          {/* Company strip — simplified JobDetail company block */}
          <div className="bg-white dark:bg-card rounded-3xl p-6 shadow-none border-0 mt-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5" />
              Company details
            </h2>
            <div className="flex items-center gap-4">
              {p.companyLogo ? (
                <img
                  src={p.companyLogo}
                  alt=""
                  className="h-14 w-14 rounded-2xl object-cover bg-white shadow-sm"
                />
              ) : null}
              <h3 className="text-xl font-bold text-gray-900 dark:text-white break-words">
                {p.companyName}
              </h3>
            </div>
            {p.companyWebsite ? (
              <div className="mt-4">
                <a
                  href={
                    p.companyWebsite.startsWith("http")
                      ? p.companyWebsite
                      : `https://${p.companyWebsite}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 h-10 rounded-full bg-primary text-white dark:text-black hover:opacity-80 transition-opacity font-medium text-sm"
                >
                  <Globe className="h-4 w-4" />
                  Visit Website
                </a>
              </div>
            ) : null}
          </div>

          {/* Publish */}
          <Card className="rounded-3xl border border-border/80 mt-8 bg-muted/30">
            <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">
                  {p.isEdit ? "Save changes" : "Ready to publish?"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {p.isEdit
                    ? "Updates apply when you save."
                    : "Candidates will see this listing after you publish."}
                </p>
              </div>
              <Button
                type="button"
                size="lg"
                className="sm:min-w-[200px]"
                disabled={p.publishing}
                onClick={p.onPublish}
              >
                {p.publishing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {p.publishLabel}
                  </>
                ) : p.isEdit ? (
                  "Save changes"
                ) : (
                  "Publish job"
                )}
              </Button>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
