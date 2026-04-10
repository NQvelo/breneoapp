import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import OptimizedAvatar from "@/components/ui/OptimizedAvatar";
import {
  Loader2,
  MapPin,
  Link2,
  Banknote,
  Briefcase,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  extractBreneoUserIdFromEmployerProfileRaw,
  normalizeEmployerProfile,
  type NormalizedEmployerProfile,
} from "@/api/employer/profile";
import {
  fetchEmployerJobForEdit,
  type EmployerJobSource,
} from "@/api/employer/jobsApi";
import {
  deletePublishedEmployerJob,
  type EmployerJobsApiError,
  publishEmployerJob,
  updatePublishedEmployerJob,
  validateHttpUrl,
  type AggregatorWorkMode,
} from "@/api/employer/publishJob";
import { getLocalizedPath } from "@/utils/localeUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  aggregatorCompanyLogoUrl,
  fetchEmployerAggregatorCompanies,
  resolveEmployerJobsCompanyFilter,
} from "@/api/employer/aggregatorBffApi";
import { City, Country } from "country-state-city";

const dashedShell =
  "rounded-lg border border-dashed border-gray-300 bg-transparent transition hover:border-breneo-blue focus-within:border-breneo-blue dark:border-[#444444]";

/** Shown in description as "Employment: …" on the aggregator */
const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Temporary",
] as const;

const WORK_MODE_OPTIONS: { value: AggregatorWorkMode; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "on-site", label: "On-site" },
  { value: "onsite", label: "Onsite" },
  { value: "unknown", label: "Not specified" },
];

const WORLD_COUNTRIES = Country.getAllCountries();

function normalizeBulletLinesKey(text: string): string {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

function linesToBulletArray(text: string, max = 6): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, max);
}

export default function EmployerAddJobPage() {
  const { jobId } = useParams<{ jobId?: string }>();
  const locationState = useLocation();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const isEdit = Boolean(jobId);
  const editSource = (new URLSearchParams(locationState.search).get("source") ||
    "breneo") as EmployerJobSource;

  const [profile, setProfile] = useState<NormalizedEmployerProfile | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [headerCompanyName, setHeaderCompanyName] = useState("");
  const [headerCompanyLogo, setHeaderCompanyLogo] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [responsibilitiesText, setResponsibilitiesText] = useState("");
  const [qualificationsText, setQualificationsText] = useState("");
  const [locationCountry, setLocationCountry] = useState("");
  const [location, setLocation] = useState("");
  const [countryQuery, setCountryQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [selectedCountryIsoCode, setSelectedCountryIsoCode] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [employmentType, setEmploymentType] = useState<string>(
    EMPLOYMENT_TYPES[0],
  );
  const [applyUrl, setApplyUrl] = useState("");
  const [salary, setSalary] = useState("");
  const [workMode, setWorkMode] = useState<AggregatorWorkMode>("on-site");
  const [isActive, setIsActive] = useState(true);
  const [initialSnapshot, setInitialSnapshot] = useState<{
    title: string;
    full_description: string;
    responsibilities_key: string;
    qualifications_key: string;
    work_mode: AggregatorWorkMode;
    location_country: string;
    location: string;
    salary: string;
    apply_url: string;
    is_active: boolean;
  } | null>(null);

  const initPage = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await apiClient.get(API_ENDPOINTS.EMPLOYER.PROFILE);
      const n = normalizeEmployerProfile(res.data, user.email);
      setProfile(n);
      const profileObj =
        res.data && typeof res.data === "object"
          ? (res.data as Record<string, unknown>)
          : null;
      const companyId =
        profileObj?.company_id != null
          ? String(profileObj.company_id)
          : profileObj?.company &&
              typeof profileObj.company === "object" &&
              (profileObj.company as Record<string, unknown>).id != null
            ? String((profileObj.company as Record<string, unknown>).id)
            : "";
      const companyName = n?.company_name || "";
      const {
        companyId: resolvedCompanyId,
        companyName: resolvedCompanyName,
        linkedDirectoryCompanyName,
      } =
        await resolveEmployerJobsCompanyFilter({
          breneoUserId: user?.id,
          employerProfileRaw: res.data,
          profileCompanyId: companyId,
          profileCompanyName: companyName,
        });
      setHeaderCompanyName(
        linkedDirectoryCompanyName?.trim() ||
          resolvedCompanyName?.trim() ||
          companyName.trim(),
      );
      const staffUserId =
        extractBreneoUserIdFromEmployerProfileRaw(res.data) ||
        String(user?.id ?? "").trim();
      if (staffUserId) {
        try {
          const companies = await fetchEmployerAggregatorCompanies(staffUserId);
          const matched =
            companies.find(
              (c) =>
                c?.id != null &&
                String(c.id).trim() === String(resolvedCompanyId).trim(),
            ) || companies[0];
          const logo = aggregatorCompanyLogoUrl(matched);
          setHeaderCompanyLogo(logo || null);
          if (!linkedDirectoryCompanyName?.trim()) {
            const name =
              matched?.name != null ? String(matched.name).trim() : "";
            if (name) setHeaderCompanyName(name);
          }
        } catch {
          setHeaderCompanyLogo(null);
        }
      }
      if (isEdit && jobId) {
        let job;
        try {
          job = await fetchEmployerJobForEdit(jobId, editSource, {
            companyId: resolvedCompanyId,
            companyName: resolvedCompanyName,
          });
        } catch (e: unknown) {
          const err = e as Error & { status?: number };
          if (err.status === 403) {
            toast.error("You are not authorized to view this job.");
          } else {
            toast.error(err.message || "Could not load job.");
          }
          navigate(getLocalizedPath("/employer/jobs", language));
          return;
        }
        if (!job) {
          toast.error("Job not found.");
          navigate(getLocalizedPath("/employer/jobs", language));
          return;
        }
        setTitle(job.title);
        setDescription(job.description);
        setResponsibilitiesText((job.responsibilities ?? []).join("\n"));
        setQualificationsText((job.qualifications ?? []).join("\n"));
        const jobCountry = String(job.location_country ?? job.country ?? "").trim();
        setLocationCountry(jobCountry);
        setCountryQuery(jobCountry);
        const matchedCountry = WORLD_COUNTRIES.find(
          (c) => c.name.toLowerCase() === jobCountry.toLowerCase(),
        );
        setSelectedCountryIsoCode(matchedCountry?.isoCode ?? "");
        const jobCity = String(job.location ?? job.city ?? "").trim();
        setLocation(jobCity);
        setCityQuery(jobCity);
        setEmploymentType(
          EMPLOYMENT_TYPES.includes(
            job.employment_type as (typeof EMPLOYMENT_TYPES)[number],
          )
            ? job.employment_type
            : EMPLOYMENT_TYPES[0],
        );
        setApplyUrl(job.apply_url);
        setSalary(job.salary);
        let resolvedWorkMode: AggregatorWorkMode = "unknown";
        if (
          job.work_mode &&
          ["remote", "hybrid", "onsite", "on-site", "unknown"].includes(
            job.work_mode.toLowerCase(),
          )
        ) {
          resolvedWorkMode = job.work_mode.toLowerCase() as AggregatorWorkMode;
          setWorkMode(resolvedWorkMode);
        } else if (
          job.employment_type &&
          ["remote", "hybrid", "onsite", "on-site", "unknown"].includes(
            job.employment_type.toLowerCase(),
          )
        ) {
          resolvedWorkMode = job.employment_type.toLowerCase() as AggregatorWorkMode;
          setWorkMode(resolvedWorkMode);
        } else if (job.remote) {
          resolvedWorkMode = "remote";
          setWorkMode("remote");
        } else {
          setWorkMode("unknown");
        }
        setIsActive(job.is_active !== false);
        const respJoined = (job.responsibilities ?? []).join("\n");
        const qualJoined = (job.qualifications ?? []).join("\n");
        setInitialSnapshot({
          title: String(job.title ?? "").trim(),
          full_description: String(job.description ?? "").trim(),
          responsibilities_key: normalizeBulletLinesKey(respJoined),
          qualifications_key: normalizeBulletLinesKey(qualJoined),
          work_mode: resolvedWorkMode,
          location_country: jobCountry,
          location: jobCity,
          salary: String(job.salary ?? "").trim(),
          apply_url: String(job.apply_url ?? "").trim(),
          is_active: job.is_active !== false,
        });
      }
    } catch {
      toast.error("Could not load company profile.");
    } finally {
      setLoading(false);
    }
  }, [user, isEdit, jobId, navigate, language, editSource]);

  useEffect(() => {
    initPage();
  }, [initPage]);

  /** Gemini runs on the server only when publishing a new job (not on edit — structured fields are manual). */
  const willExtractDescriptionOnSave = useMemo(() => !isEdit, [isEdit]);

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return WORLD_COUNTRIES.filter((c) => c.name.toLowerCase().includes(q)).slice(
      0,
      20,
    );
  }, [countryQuery]);

  const cityOptions = useMemo(() => {
    if (!selectedCountryIsoCode) return [];
    return City.getCitiesOfCountry(selectedCountryIsoCode);
  }, [selectedCountryIsoCode]);

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (!selectedCountryIsoCode || q.length < 2) return [];
    return cityOptions
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 30);
  }, [cityQuery, selectedCountryIsoCode, cityOptions]);

  const selectCountry = (name: string, isoCode: string) => {
    setLocationCountry(name);
    setCountryQuery(name);
    setSelectedCountryIsoCode(isoCode);
    setCountryOpen(false);
    setLocation("");
    setCityQuery("");
    setCityOpen(false);
  };

  const selectCity = (name: string) => {
    setLocation(name);
    setCityQuery(name);
    setCityOpen(false);
  };

  const tryResolveCountryFromQuery = (rawQuery: string): boolean => {
    const q = rawQuery.trim().toLowerCase();
    if (!q) return false;
    const exact = WORLD_COUNTRIES.find((c) => c.name.toLowerCase() === q);
    if (!exact) return false;
    setLocationCountry(exact.name);
    setCountryQuery(exact.name);
    if (selectedCountryIsoCode !== exact.isoCode) {
      setSelectedCountryIsoCode(exact.isoCode);
      setLocation("");
      setCityQuery("");
    }
    return true;
  };

  const tryResolveCityFromQuery = (rawQuery: string): boolean => {
    const q = rawQuery.trim().toLowerCase();
    if (!q || !selectedCountryIsoCode) return false;
    const exact = cityOptions.find((c) => c.name.toLowerCase() === q);
    if (!exact) return false;
    setLocation(exact.name);
    setCityQuery(exact.name);
    return true;
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setFieldErrors({ title: ["Job title is required."] });
      toast.error("Job title is required.");
      return;
    }
    if (!description.trim()) {
      setFieldErrors({ full_description: ["Description is required."] });
      toast.error("Description is required.");
      return;
    }

    const applyCheck = validateHttpUrl(applyUrl);
    if (applyCheck.ok === false) {
      setFieldErrors({ apply_url: [applyCheck.error] });
      toast.error(applyCheck.error);
      return;
    }

    const normalizedCountry = locationCountry.trim();
    const normalizedCity = location.trim();
    if (normalizedCity && !normalizedCountry) {
      setFieldErrors({ location_country: ["Location country is required."] });
      toast.error("Select a location country first.");
      return;
    }
    if (normalizedCountry && !normalizedCity) {
      setFieldErrors({ location: ["Location city is required."] });
      toast.error("Select a location city.");
      return;
    }
    if (normalizedCountry) {
      const countryObj = WORLD_COUNTRIES.find(
        (c) => c.name.toLowerCase() === normalizedCountry.toLowerCase(),
      );
      if (!countryObj) {
        setFieldErrors({ location_country: ["Select a valid country."] });
        toast.error("Select a valid country from the list.");
        return;
      }
      const validCity = City.getCitiesOfCountry(countryObj.isoCode).some(
        (c) => c.name.toLowerCase() === normalizedCity.toLowerCase(),
      );
      if (!validCity) {
        setFieldErrors({
          location: ["Select a city that belongs to the selected country."],
        });
        toast.error("Selected city does not belong to the selected country.");
        return;
      }
    }

    setFieldErrors({});
    setSaving(true);
    try {
      if (isEdit && jobId) {
        const nextState = {
          title: title.trim(),
          full_description: description.trim(),
          work_mode: workMode,
          country: normalizedCountry,
          city: normalizedCity,
          location_country: normalizedCountry,
          location: normalizedCity,
          salary: salary.trim(),
          apply_url: applyCheck.url || "",
          is_active: isActive,
        };
        const patch: Partial<{
          title: string;
          full_description: string;
          work_mode: AggregatorWorkMode;
          country: string;
          city: string;
          location_country: string;
          location: string;
          salary: string;
          apply_url: string | null;
          is_active: boolean;
          employment_type_note: string;
          responsibilities: string[];
          qualifications: string[];
        }> = {};

        const snap = initialSnapshot;
        if (!snap || nextState.title !== snap.title)
          patch.title = nextState.title;
        if (!snap || nextState.full_description !== snap.full_description) {
          patch.full_description = nextState.full_description;
        }
        if (!snap || nextState.work_mode !== snap.work_mode) {
          patch.work_mode = nextState.work_mode;
        }
        if (!snap || nextState.country !== snap.location_country) {
          patch.country = nextState.country;
        }
        if (!snap || nextState.city !== snap.location) {
          patch.city = nextState.city;
        }
        if (!snap || nextState.location_country !== snap.location_country) {
          patch.location_country = nextState.location_country;
        }
        if (!snap || nextState.location !== snap.location) {
          patch.location = nextState.location;
        }
        if (!snap || nextState.salary !== snap.salary) {
          patch.salary = nextState.salary;
        }
        if (!snap || nextState.apply_url !== snap.apply_url) {
          patch.apply_url = nextState.apply_url || null;
        }
        if (!snap || nextState.is_active !== snap.is_active) {
          patch.is_active = nextState.is_active;
        }
        if (patch.full_description != null) {
          patch.employment_type_note = employmentType;
          patch.responsibilities = linesToBulletArray(responsibilitiesText);
          patch.qualifications = linesToBulletArray(qualificationsText);
        } else {
          const nextRespKey = normalizeBulletLinesKey(responsibilitiesText);
          const nextQualKey = normalizeBulletLinesKey(qualificationsText);
          if (!snap || nextRespKey !== snap.responsibilities_key) {
            patch.responsibilities = linesToBulletArray(responsibilitiesText);
          }
          if (!snap || nextQualKey !== snap.qualifications_key) {
            patch.qualifications = linesToBulletArray(qualificationsText);
          }
        }
        if (Object.keys(patch).length === 0) {
          toast.info("No changes to save.");
          return;
        }

        await updatePublishedEmployerJob(jobId, patch);
        toast.success("Job updated.");
      } else {
        const data = await publishEmployerJob({
          title: title.trim(),
          full_description: description.trim(),
          work_mode: workMode,
          country: normalizedCountry || undefined,
          city: normalizedCity || undefined,
          location_country: normalizedCountry || undefined,
          location: normalizedCity || undefined,
          salary: salary.trim() || undefined,
          apply_url: applyCheck.url || null,
          is_active: isActive,
          employment_type_note: employmentType,
        });
        const id = data.id ?? data.pk ?? data.job_id;
        toast.success(
          id != null
            ? `Job posted successfully (id: ${String(id)})`
            : "Job posted successfully",
        );
        console.log("[job aggregator] response", data);
      }
      navigate(getLocalizedPath("/employer/jobs", language));
    } catch (e: unknown) {
      const err = e as EmployerJobsApiError;
      if (err.status === 401 || err.status === 403) {
        toast.error("You are not authorized to manage employer jobs.");
      } else if (err.status === 404) {
        toast.error("Job not found (possibly already deleted).");
      } else if (err.status === 400 && err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
        toast.error("Please fix the highlighted fields.");
      } else {
        toast.error(err.message || "Could not save job.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit || !jobId) return;
    const ok = window.confirm("Delete this job? This action cannot be undone.");
    if (!ok) return;

    setDeleting(true);
    try {
      await deletePublishedEmployerJob(jobId);
      toast.success("Job deleted.");
      navigate(getLocalizedPath("/employer/jobs", language));
    } catch (e: unknown) {
      const err = e as EmployerJobsApiError;
      if (err.status === 401 || err.status === 403) {
        toast.error("You are not authorized to manage employer jobs.");
      } else if (err.status === 404) {
        toast.error("Job not found (possibly already deleted).");
      } else {
        toast.error(err.message || "Could not delete job.");
      }
    } finally {
      setDeleting(false);
    }
  };

  const companyName =
    headerCompanyName.trim() ||
    profile?.company_name?.trim() ||
    user?.email ||
    "Company";

  if (loading) {
    return (
      <DashboardLayout containMainScroll={false}>
        <div className="flex justify-center py-24 text-muted-foreground">
          Loading…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout containMainScroll={false}>
      <div className="max-w-4xl mx-auto pb-24 space-y-6">
        <Card className="relative rounded-3xl border-0 shadow-none bg-white dark:bg-card overflow-hidden">
          {saving && willExtractDescriptionOnSave ? (
            <div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-3xl bg-background/85 px-6 text-center backdrop-blur-sm dark:bg-background/90"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-10 w-10 animate-spin text-breneo-blue" />
              <p className="text-base font-semibold text-foreground">
                {t.employerJobForm.extractingDescriptionTitle}
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {t.employerJobForm.extractingDescriptionHint}
              </p>
            </div>
          ) : null}
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-border/60">
              <OptimizedAvatar
                src={headerCompanyLogo || profile?.logo_url || undefined}
                alt={companyName}
                fallback={companyName.charAt(0).toUpperCase()}
                size="sm"
                className="flex-shrink-0 !h-10 !w-10 !rounded-sm"
              />
              <span className="text-muted-foreground text-base font-medium">
                {companyName}
              </span>
            </div>

            <div className={cn(dashedShell)}>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-auto min-h-[4rem] w-full rounded-lg border-0 bg-transparent px-3 py-3 text-2xl md:text-2xl font-bold leading-tight shadow-none outline-none focus-visible:ring-0 placeholder:text-xl md:placeholder:text-3xl dark:text-white"
                placeholder="Job title"
              />
            </div>
            {fieldErrors.title?.[0] ? (
              <p className="text-sm text-destructive">{fieldErrors.title[0]}</p>
            ) : null}

            <div className="space-y-2">
              {isEdit ? (
                <Label
                  htmlFor="employer-job-full-description"
                  className="text-sm font-medium text-foreground"
                >
                  {t.employerJobForm.fullDescriptionLabel}
                </Label>
              ) : null}
              <div className={cn(dashedShell)}>
                <Textarea
                  id="employer-job-full-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[200px] w-full rounded-lg border-0 bg-transparent px-3 py-3 text-base shadow-none resize-y focus-visible:ring-0 dark:text-white"
                  placeholder="Describe the role, requirements, and benefits…"
                />
              </div>
              {fieldErrors.full_description?.[0] ? (
                <p className="text-sm text-destructive">
                  {fieldErrors.full_description[0]}
                </p>
              ) : null}
            </div>

            {isEdit ? (
              <div className="space-y-6 pt-2 border-t border-border/50">
                <div className="space-y-2">
                  <Label
                    htmlFor="employer-job-responsibilities"
                    className="text-sm font-medium text-foreground"
                  >
                    {t.employerJobForm.responsibilitiesLabel}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t.employerJobForm.responsibilitiesHint}
                  </p>
                  <div className={cn(dashedShell)}>
                    <Textarea
                      id="employer-job-responsibilities"
                      value={responsibilitiesText}
                      onChange={(e) =>
                        setResponsibilitiesText(e.target.value)
                      }
                      className="min-h-[140px] w-full rounded-lg border-0 bg-transparent px-3 py-3 text-base shadow-none resize-y focus-visible:ring-0 dark:text-white"
                      placeholder="One bullet per line"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="employer-job-qualifications"
                    className="text-sm font-medium text-foreground"
                  >
                    {t.employerJobForm.qualificationsLabel}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t.employerJobForm.qualificationsHint}
                  </p>
                  <div className={cn(dashedShell)}>
                    <Textarea
                      id="employer-job-qualifications"
                      value={qualificationsText}
                      onChange={(e) =>
                        setQualificationsText(e.target.value)
                      }
                      className="min-h-[140px] w-full rounded-lg border-0 bg-transparent px-3 py-3 text-base shadow-none resize-y focus-visible:ring-0 dark:text-white"
                      placeholder="One bullet per line"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50/90 dark:bg-white/5 p-4 space-y-2 sm:col-span-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-breneo-blue" />
                  Location
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label
                      htmlFor="job-location-country"
                      className="text-xs text-muted-foreground"
                    >
                      Country
                    </Label>
                    <div className="relative">
                      <Input
                        id="job-location-country"
                        value={countryQuery}
                        onChange={(e) => {
                          const next = e.target.value;
                          setCountryQuery(next);
                          setLocationCountry(next);
                          setCountryOpen(true);
                          const exact = WORLD_COUNTRIES.find(
                            (c) => c.name.toLowerCase() === next.trim().toLowerCase(),
                          );
                          if (exact) {
                            if (selectedCountryIsoCode !== exact.isoCode) {
                              setSelectedCountryIsoCode(exact.isoCode);
                              setLocation("");
                              setCityQuery("");
                            }
                          } else {
                            setSelectedCountryIsoCode("");
                            setLocation("");
                            setCityQuery("");
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (!tryResolveCountryFromQuery(countryQuery)) {
                              const first = filteredCountries[0];
                              if (first) selectCountry(first.name, first.isoCode);
                            }
                            setCountryOpen(false);
                          }
                        }}
                        onFocus={() => setCountryOpen(true)}
                        onBlur={() => {
                          tryResolveCountryFromQuery(countryQuery);
                          setTimeout(() => setCountryOpen(false), 120);
                        }}
                        placeholder="Select country"
                        className="bg-white dark:bg-background"
                        autoComplete="off"
                      />
                      {countryOpen ? (
                        <div className="absolute z-40 mt-1 max-h-52 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                          {countryQuery.trim().length < 2 ? (
                            <p className="px-3 py-2 text-sm text-muted-foreground">
                              Type at least 2 characters
                            </p>
                          ) : filteredCountries.length === 0 ? (
                            <p className="px-3 py-2 text-sm text-muted-foreground">
                              No matches found
                            </p>
                          ) : (
                            filteredCountries.map((country) => (
                              <button
                                key={country.isoCode}
                                type="button"
                                className="block w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() =>
                                  selectCountry(country.name, country.isoCode)
                                }
                              >
                                {country.name}
                              </button>
                            ))
                          )}
                        </div>
                      ) : null}
                    </div>
                    {fieldErrors.location_country?.[0] ? (
                      <p className="text-sm text-destructive">
                        {fieldErrors.location_country[0]}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor="job-location-city"
                      className="text-xs text-muted-foreground"
                    >
                      City
                    </Label>
                    <div className="relative">
                      <Input
                        id="job-location-city"
                        value={cityQuery}
                        onChange={(e) => {
                          const next = e.target.value;
                          setCityQuery(next);
                          setLocation(next);
                          setCityOpen(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (!tryResolveCityFromQuery(cityQuery)) {
                              const first = filteredCities[0];
                              if (first) selectCity(first.name);
                            }
                            setCityOpen(false);
                          }
                        }}
                        onFocus={() => selectedCountryIsoCode && setCityOpen(true)}
                        onBlur={() => {
                          tryResolveCityFromQuery(cityQuery);
                          setTimeout(() => setCityOpen(false), 120);
                        }}
                        placeholder="Select city"
                        className="bg-white dark:bg-background"
                        autoComplete="off"
                        disabled={!selectedCountryIsoCode}
                      />
                      {cityOpen && selectedCountryIsoCode ? (
                        <div className="absolute z-40 mt-1 max-h-52 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                          {cityQuery.trim().length < 2 ? (
                            <p className="px-3 py-2 text-sm text-muted-foreground">
                              Type at least 2 characters
                            </p>
                          ) : filteredCities.length === 0 ? (
                            <p className="px-3 py-2 text-sm text-muted-foreground">
                              No matches found
                            </p>
                          ) : (
                            filteredCities.map((city) => (
                              <button
                                key={`${city.countryCode}-${city.name}-${city.latitude}-${city.longitude}`}
                                type="button"
                                className="block w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => selectCity(city.name)}
                              >
                                {city.name}
                              </button>
                            ))
                          )}
                        </div>
                      ) : null}
                    </div>
                    {!selectedCountryIsoCode ? (
                      <p className="text-xs text-muted-foreground">
                        Select a country first
                      </p>
                    ) : null}
                    {fieldErrors.location?.[0] ? (
                      <p className="text-sm text-destructive">
                        {fieldErrors.location[0]}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/90 dark:bg-white/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="h-4 w-4 text-breneo-blue" />
                  Work mode
                </div>
                <Select
                  value={workMode}
                  onValueChange={(v) => setWorkMode(v as AggregatorWorkMode)}
                >
                  <SelectTrigger className="bg-white dark:bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_MODE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/90 dark:bg-white/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="h-4 w-4 text-breneo-blue" />
                  Employment type
                </div>
                <Select
                  value={employmentType}
                  onValueChange={setEmploymentType}
                >
                  <SelectTrigger className="bg-white dark:bg-background">
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
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/90 dark:bg-white/5 p-4 space-y-2 sm:col-span-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Link2 className="h-4 w-4 text-breneo-blue" />
                  Application URL
                </div>
                <Input
                  value={applyUrl}
                  onChange={(e) => setApplyUrl(e.target.value)}
                  placeholder="https://…"
                  className="bg-white dark:bg-background"
                />
                {fieldErrors.apply_url?.[0] ? (
                  <p className="text-sm text-destructive">
                    {fieldErrors.apply_url[0]}
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/90 dark:bg-white/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Banknote className="h-4 w-4 text-breneo-blue" />
                  Salary (optional)
                </div>
                <Input
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="e.g. 3000–5000 GEL"
                  className="bg-white dark:bg-background"
                />
              </div>
            </div>

            {isEdit ? (
              <div className="flex items-center space-x-3 pt-2">
                <Checkbox
                  id="active"
                  checked={isActive}
                  onCheckedChange={(c) => setIsActive(c === true)}
                />
                <Label htmlFor="active" className="cursor-pointer">
                  Listing is active (visible to candidates)
                </Label>
              </div>
            ) : null}

            <div className="pt-4 flex items-center justify-between gap-3">
              <div>
                {isEdit ? (
                  <Button
                    variant="outline"
                    onClick={handleDelete}
                    disabled={saving || deleting}
                    className="h-10 w-10 p-0 border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-500/70 dark:text-red-400 dark:hover:bg-red-950/20"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete job</span>
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate(getLocalizedPath("/employer/jobs", language))
                  }
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={saving || deleting}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {willExtractDescriptionOnSave
                        ? t.employerJobForm.buttonExtractingSaving
                        : t.employerJobForm.buttonSaving}
                    </>
                  ) : isEdit ? (
                    "Save changes"
                  ) : (
                    "Publish job"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
