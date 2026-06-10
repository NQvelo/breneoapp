import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea, type TextareaProps } from "@/components/ui/textarea";
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
  Pencil,
  Check,
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
  getEmployerJobStoredSkills,
  type EmployerJobSource,
} from "@/api/employer/jobsApi";
import { resolveEmployerJobRequiredSkills } from "@/utils/employerJobToJobDetail";
import { scheduleSkillsCatalogSync } from "@/api/profile/skillsCatalogApi";
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
import type { ICity, ICountry } from "country-state-city";
import {
  applyResolvedCountryToForm,
  JOB_LOCATION_MIN_SEARCH_CHARS,
  resolveCommittedJobLocation,
  resolveCountryFromStoredValue,
} from "@/utils/jobLocationFields";
import { EmployerJobFormPreview } from "@/components/employer/EmployerJobFormPreview";
import { EmployerJobSkillsPicker } from "@/components/employer/EmployerJobSkillsPicker";
import { EmployerLocationSelectDropdown } from "@/components/employer/EmployerLocationSelectDropdown";
import {
  previewParseEmployerJob,
  type EmployerJobPreviewParseResult,
} from "@/api/employer/previewParseJob";
import {
  hasDistinctStructuredSections,
  resolveJobSectionsAfterAi,
} from "@/utils/jobSectionsDedup";
import { JobSectionBulletList } from "@/components/jobs/JobSectionContent";

const jobFormReadOnlyTextClass =
  "text-gray-600 dark:text-gray-300 leading-relaxed text-base whitespace-pre-wrap break-words";

function JobFormReadOnlyText({
  value,
  emptyLabel,
}: {
  value: string;
  emptyLabel: string;
}) {
  if (!value.trim()) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return <div className={jobFormReadOnlyTextClass}>{value}</div>;
}

function JobFormReadOnlyBulletList({
  text,
  emptyLabel,
}: {
  text: string;
  emptyLabel: string;
}) {
  const items = linesToDisplayList(text);
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return <JobSectionBulletList items={items} />;
}

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

/** All non-empty lines for read-only bullet display (no API cap). */
function linesToDisplayList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function normalizeSkillsKey(skills: string[]): string {
  return skills
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join("\n");
}

function normalizeSelectedJobSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const skill of skills) {
    const trimmed = skill.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(trimmed);
  }
  return next;
}

function AutoSizeTextarea({
  minHeightPx = 80,
  className,
  onChange,
  value,
  ...props
}: TextareaProps & { minHeightPx?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const syncHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.overflow = "hidden";
    el.style.height = `${Math.max(minHeightPx, el.scrollHeight)}px`;
  }, [minHeightPx]);

  useEffect(() => {
    syncHeight();
  }, [value, syncHeight]);

  return (
    <Textarea
      {...props}
      ref={ref}
      value={value}
      rows={1}
      onChange={(e) => {
        onChange?.(e);
        requestAnimationFrame(syncHeight);
      }}
      className={cn("resize-none overflow-hidden", className)}
    />
  );
}

function SectionEditToggle({
  isEditing,
  onEdit,
  onDone,
  editLabel,
  doneLabel,
}: {
  isEditing: boolean;
  onEdit: () => void;
  onDone: () => void;
  editLabel: string;
  doneLabel: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "h-9 w-9 shrink-0 rounded-full",
        "bg-muted/80 text-muted-foreground",
        "hover:bg-muted hover:text-foreground",
        "dark:bg-white/10 dark:hover:bg-white/15",
      )}
      onClick={isEditing ? onDone : onEdit}
      aria-label={isEditing ? doneLabel : editLabel}
    >
      {isEditing ? (
        <Check className="h-5 w-5" />
      ) : (
        <Pencil className="h-5 w-5" />
      )}
    </Button>
  );
}

export default function EmployerAddJobPage() {
  const { jobId } = useParams<{ jobId?: string }>();
  const locationState = useLocation();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
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
  const [headerCompanyLogo, setHeaderCompanyLogo] = useState<string | null>(
    null,
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [responsibilitiesText, setResponsibilitiesText] = useState("");
  const [qualificationsText, setQualificationsText] = useState("");
  const [jobDescriptionSummary, setJobDescriptionSummary] = useState("");
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
    skills_key: string;
    work_mode: AggregatorWorkMode;
    location_country: string;
    location: string;
    salary: string;
    apply_url: string;
    is_active: boolean;
  } | null>(null);

  const [showJobPreview, setShowJobPreview] = useState(false);
  const [previewExtracting, setPreviewExtracting] = useState(false);
  const [previewExtraction, setPreviewExtraction] =
    useState<EmployerJobPreviewParseResult | null>(null);
  const [extractionSourceDescription, setExtractionSourceDescription] =
    useState("");
  const [selectedJobSkills, setSelectedJobSkills] = useState<string[]>([]);
  const [skillsRequireManual, setSkillsRequireManual] = useState(false);
  const [editingJobDescription, setEditingJobDescription] = useState(false);
  const [editingResponsibilities, setEditingResponsibilities] = useState(false);
  const [editingQualifications, setEditingQualifications] = useState(false);
  const [worldCountries, setWorldCountries] = useState<ICountry[]>([]);
  const resolveCitiesRef = useRef<(countryIsoCode: string) => ICity[]>(
    () => [],
  );
  /** Edit load: resolve stored country name once after country-state-city data loads. */
  const pendingCountrySyncRef = useRef<string | null>(null);

  const initPage = useCallback(async () => {
    if (authLoading || !user) return;
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
      } = await resolveEmployerJobsCompanyFilter({
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
        setJobDescriptionSummary(job.job_description_summary ?? "");
        setResponsibilitiesText((job.responsibilities ?? []).join("\n"));
        setQualificationsText((job.qualifications ?? []).join("\n"));
        const storedSkills = getEmployerJobStoredSkills(job);
        const pickerSkills =
          storedSkills.length > 0
            ? storedSkills
            : resolveEmployerJobRequiredSkills(job);
        setSelectedJobSkills(pickerSkills);
        setSkillsRequireManual(pickerSkills.length === 0);
        const loadedSections = resolveJobSectionsAfterAi({
          description: job.job_description_summary ?? "",
          responsibilities: job.responsibilities ?? [],
          qualifications: job.qualifications ?? [],
        });
        setPreviewExtraction({
          ...loadedSections,
          skills: pickerSkills,
          aiAvailable: true,
        });
        setExtractionSourceDescription(String(job.description ?? "").trim());
        const jobCountry = String(
          job.location_country ?? job.country ?? "",
        ).trim();
        const jobCity = String(job.location ?? job.city ?? "").trim();
        const resolvedCountry = resolveCountryFromStoredValue(
          worldCountries,
          jobCountry,
        );
        if (resolvedCountry) {
          applyResolvedCountryToForm(resolvedCountry, {
            setLocationCountry,
            setCountryQuery,
            setSelectedCountryIsoCode,
          });
        } else {
          setLocationCountry(jobCountry);
          setCountryQuery(jobCountry);
          setSelectedCountryIsoCode("");
          if (jobCountry) pendingCountrySyncRef.current = jobCountry;
        }
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
          resolvedWorkMode =
            job.employment_type.toLowerCase() as AggregatorWorkMode;
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
          skills_key: normalizeSkillsKey(pickerSkills),
          work_mode: resolvedWorkMode,
          location_country: resolvedCountry?.name ?? jobCountry,
          location: jobCity,
          salary: String(job.salary ?? "").trim(),
          apply_url: String(job.apply_url ?? "").trim(),
          is_active: job.is_active !== false,
        });
        setEditingJobDescription(false);
        setEditingResponsibilities(false);
        setEditingQualifications(false);
      }
    } catch {
      toast.error("Could not load company profile.");
    } finally {
      setLoading(false);
    }
  }, [authLoading, user, isEdit, jobId, navigate, language, editSource]);

  useEffect(() => {
    if (authLoading || !user) return;
    initPage();
  }, [initPage, authLoading, user]);

  useEffect(() => {
    let isMounted = true;
    const loadCountryCityData = async () => {
      try {
        const module = await import("country-state-city");
        if (!isMounted) return;
        setWorldCountries(module.Country.getAllCountries());
        resolveCitiesRef.current = (countryIsoCode: string) =>
          module.City.getCitiesOfCountry(countryIsoCode);
      } catch {
        setWorldCountries([]);
        resolveCitiesRef.current = () => [];
      }
    };
    void loadCountryCityData();
    return () => {
      isMounted = false;
    };
  }, []);

  /** One-time sync after edit load when country dataset arrives (never while user types). */
  useEffect(() => {
    if (worldCountries.length === 0) return;
    const pending = pendingCountrySyncRef.current?.trim();
    if (!pending) return;
    pendingCountrySyncRef.current = null;
    const resolved = resolveCountryFromStoredValue(worldCountries, pending);
    if (!resolved) return;
    applyResolvedCountryToForm(resolved, {
      setLocationCountry,
      setCountryQuery,
      setSelectedCountryIsoCode,
    });
    setInitialSnapshot((snap) => {
      if (!snap) return snap;
      const snapResolved = resolveCountryFromStoredValue(
        worldCountries,
        snap.location_country,
      );
      if (snapResolved?.isoCode !== resolved.isoCode) return snap;
      if (snap.location_country === resolved.name) return snap;
      return { ...snap, location_country: resolved.name };
    });
  }, [worldCountries]);

  /** Server re-runs Gemini only when publish happens without a prior preview extraction. */
  const willExtractDescriptionOnSave = useMemo(
    () => !isEdit && !previewExtraction,
    [isEdit, previewExtraction],
  );

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (q.length < JOB_LOCATION_MIN_SEARCH_CHARS) return [];
    return worldCountries
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 20);
  }, [countryQuery, worldCountries]);

  const cityOptions = useMemo(() => {
    if (!selectedCountryIsoCode) return [];
    return resolveCitiesRef.current(selectedCountryIsoCode);
  }, [selectedCountryIsoCode]);

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (!selectedCountryIsoCode || q.length < JOB_LOCATION_MIN_SEARCH_CHARS) {
      return [];
    }
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
    const resolved = resolveCountryFromStoredValue(worldCountries, rawQuery);
    if (!resolved) return false;
    applyResolvedCountryToForm(resolved, {
      setLocationCountry,
      setCountryQuery,
      setSelectedCountryIsoCode,
    });
    if (selectedCountryIsoCode !== resolved.isoCode) {
      setLocation("");
      setCityQuery("");
    }
    return true;
  };

  const applyCommittedLocationToForm = useCallback(
    (committed: ReturnType<typeof resolveCommittedJobLocation>) => {
      if (committed.resolvedCountry) {
        applyResolvedCountryToForm(committed.resolvedCountry, {
          setLocationCountry,
          setCountryQuery,
          setSelectedCountryIsoCode,
        });
      } else if (committed.normalizedCountry) {
        setLocationCountry(committed.normalizedCountry);
        setCountryQuery(committed.normalizedCountry);
      }
      if (committed.normalizedCity) {
        setLocation(committed.normalizedCity);
        setCityQuery(committed.normalizedCity);
      }
    },
    [],
  );

  const tryResolveCityFromQuery = (rawQuery: string): boolean => {
    const q = rawQuery.trim().toLowerCase();
    if (
      !q ||
      !selectedCountryIsoCode ||
      q.length < JOB_LOCATION_MIN_SEARCH_CHARS
    ) {
      return false;
    }
    const exact = cityOptions.find((c) => c.name.toLowerCase() === q);
    if (!exact) return false;
    selectCity(exact.name);
    return true;
  };

  const validateFormForSave = useCallback(():
    | {
        ok: true;
        normalizedCountry: string;
        normalizedCity: string;
        applyUrl: string;
      }
    | {
        ok: false;
        fieldErrors: Record<string, string[]>;
        message: string;
      } => {
    if (!title.trim()) {
      return {
        ok: false,
        fieldErrors: { title: ["Job title is required."] },
        message: "Job title is required.",
      };
    }
    if (!description.trim()) {
      return {
        ok: false,
        fieldErrors: { full_description: ["Description is required."] },
        message: "Description is required.",
      };
    }

    const applyCheck = validateHttpUrl(applyUrl);
    if (applyCheck.ok === false) {
      return {
        ok: false,
        fieldErrors: { apply_url: [applyCheck.error] },
        message: applyCheck.error,
      };
    }

    const committed = resolveCommittedJobLocation({
      countries: worldCountries,
      locationCountry,
      countryQuery,
      selectedCountryIsoCode,
      location,
      cityQuery,
    });
    const { normalizedCountry, normalizedCity } = committed;
    if (normalizedCity && !normalizedCountry) {
      return {
        ok: false,
        fieldErrors: {
          location_country: ["Location country is required."],
        },
        message: "Select a location country first.",
      };
    }
    if (normalizedCountry && !normalizedCity) {
      return {
        ok: false,
        fieldErrors: { location: ["Location city is required."] },
        message: "Select a location city.",
      };
    }
    if (normalizedCountry) {
      const countryObj = worldCountries.find(
        (c) => c.name.toLowerCase() === normalizedCountry.toLowerCase(),
      );
      if (!countryObj) {
        return {
          ok: false,
          fieldErrors: { location_country: ["Select a valid country."] },
          message: "Select a valid country from the list.",
        };
      }
      const cityOptionsForCountry = resolveCitiesRef.current(
        countryObj.isoCode,
      );
      if (cityOptionsForCountry.length > 0) {
        const validCity = cityOptionsForCountry.some(
          (c) => c.name.toLowerCase() === normalizedCity.toLowerCase(),
        );
        if (!validCity) {
          return {
            ok: false,
            fieldErrors: {
              location: ["Select a city that belongs to the selected country."],
            },
            message: "Selected city does not belong to the selected country.",
          };
        }
      }
    }

    return {
      ok: true,
      normalizedCountry,
      normalizedCity,
      applyUrl: applyCheck.url || "",
    };
  }, [
    title,
    description,
    applyUrl,
    locationCountry,
    countryQuery,
    selectedCountryIsoCode,
    location,
    cityQuery,
    worldCountries,
  ]);

  const applyPreviewExtraction = useCallback(
    (result: EmployerJobPreviewParseResult, sourceDesc: string) => {
      setPreviewExtraction(result);
      setExtractionSourceDescription(sourceDesc);
      if (hasDistinctStructuredSections(result)) {
        setResponsibilitiesText(result.responsibilities.join("\n"));
        setQualificationsText(result.qualifications.join("\n"));
        setJobDescriptionSummary(result.description);
      } else {
        setResponsibilitiesText("");
        setQualificationsText("");
        setJobDescriptionSummary("");
      }
      setSelectedJobSkills((prev) => {
        const merged =
          result.skills.length > 0
            ? (() => {
                const next = [...prev];
                for (const skill of result.skills) {
                  const trimmed = skill.trim();
                  if (!trimmed) continue;
                  if (
                    !next.some(
                      (existing) =>
                        existing.toLowerCase() === trimmed.toLowerCase(),
                    )
                  ) {
                    next.push(trimmed);
                  }
                }
                return next.length > 0 ? next : result.skills;
              })()
            : prev;
        setSkillsRequireManual(
          merged.length === 0 &&
            result.aiAvailable === true &&
            result.skills.length === 0,
        );
        return merged;
      });
      scheduleSkillsCatalogSync(
        [...result.skills, ...(result.skills_preferred ?? [])],
        "employer-preview-extraction",
      );
    },
    [],
  );

  const buildPublishParsedSections = useCallback(() => {
    const extraction =
      previewExtraction ??
      resolveJobSectionsAfterAi({
        description: jobDescriptionSummary,
        responsibilities: responsibilitiesText,
        qualifications: qualificationsText,
      });
    const structured = hasDistinctStructuredSections(extraction);
    return {
      client_parsed_sections: true as const,
      description: structured ? extraction.description : undefined,
      responsibilities: structured ? extraction.responsibilities : [],
      qualifications: structured ? extraction.qualifications : [],
      required_skills: selectedJobSkills,
      skills_preferred: previewExtraction?.skills_preferred ?? [],
    };
  }, [
    previewExtraction,
    jobDescriptionSummary,
    responsibilitiesText,
    qualificationsText,
    selectedJobSkills,
  ]);

  const handleSubmit = async () => {
    const validated = validateFormForSave();
    if ("fieldErrors" in validated) {
      setFieldErrors(validated.fieldErrors);
      toast.error(validated.message);
      return;
    }

    if (skillsRequireManual && selectedJobSkills.length === 0) {
      toast.error("Select at least one skill for this job.");
      return;
    }

    const trimmedDescription = description.trim();
    if (
      previewExtraction &&
      extractionSourceDescription !== trimmedDescription
    ) {
      toast.error("Job description changed. Open preview again to refresh.");
      return;
    }

    const {
      normalizedCountry,
      normalizedCity,
      applyUrl: applyUrlNorm,
    } = validated;
    const applyCheck = { ok: true as const, url: applyUrlNorm };

    setFieldErrors({});
    setSaving(true);
    try {
      /** Publish from preview always activates the listing; form save uses the checkbox. */
      const listingShouldBeActive = showJobPreview ? true : isActive;

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
          is_active: listingShouldBeActive,
        };
        const patch: Partial<{
          title: string;
          full_description: string;
          description?: string;
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
          required_skills: string[];
          client_parsed_sections: boolean;
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
        const normalizedSelectedSkills = normalizeSelectedJobSkills(
          selectedJobSkills,
        );
        const skillsChanged =
          !snap ||
          normalizeSkillsKey(normalizedSelectedSkills) !== snap.skills_key;
        if (!snap || nextState.is_active !== snap.is_active) {
          patch.is_active = nextState.is_active;
        }
        if (patch.full_description != null) {
          patch.employment_type_note = employmentType;
          const parsed = buildPublishParsedSections();
          patch.description = parsed.description;
          patch.responsibilities = parsed.responsibilities;
          patch.qualifications = parsed.qualifications;
          patch.client_parsed_sections = true;
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
        // Always include current skill chips so PATCH reliably persists them.
        patch.required_skills = normalizedSelectedSkills;
        if (showJobPreview) {
          patch.is_active = true;
        }
        const hasLocationPatch =
          patch.country != null ||
          patch.location_country != null ||
          patch.city != null ||
          patch.location != null;
        if (hasLocationPatch) {
          patch.country = normalizedCountry;
          patch.location_country = normalizedCountry;
          patch.city = normalizedCity;
          patch.location = normalizedCity;
        }
        const hasNonSkillPatch = Object.keys(patch).some(
          (key) => key !== "required_skills",
        );
        if (!skillsChanged && !hasNonSkillPatch) {
          toast.info("No changes to save.");
          return;
        }

        await updatePublishedEmployerJob(jobId, patch);
        setInitialSnapshot((prev) =>
          prev
            ? {
                ...prev,
                skills_key: normalizeSkillsKey(normalizedSelectedSkills),
              }
            : prev,
        );
        toast.success(showJobPreview ? "Job published." : "Job updated.");
      } else {
        const parsed = buildPublishParsedSections();
        applyCommittedLocationToForm(
          resolveCommittedJobLocation({
            countries: worldCountries,
            locationCountry: normalizedCountry,
            countryQuery: normalizedCountry,
            selectedCountryIsoCode,
            location: normalizedCity,
            cityQuery: normalizedCity,
          }),
        );
        const data = await publishEmployerJob({
          title: title.trim(),
          full_description: description.trim(),
          work_mode: workMode,
          country: normalizedCountry,
          city: normalizedCity,
          location_country: normalizedCountry,
          location: normalizedCity,
          salary: salary.trim() || undefined,
          apply_url: applyCheck.url || null,
          is_active: listingShouldBeActive,
          employment_type_note: employmentType,
          ...parsed,
        });
        scheduleSkillsCatalogSync(
          [
            ...selectedJobSkills,
            ...(parsed.skills_preferred ?? []),
          ],
          "employer-job-publish",
        );
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

  const openJobPreview = useCallback(async () => {
    const validated = validateFormForSave();
    if ("fieldErrors" in validated) {
      setFieldErrors(validated.fieldErrors);
      toast.error(validated.message);
      return;
    }
    const { normalizedCountry, normalizedCity } = validated;
    applyCommittedLocationToForm(
      resolveCommittedJobLocation({
        countries: worldCountries,
        locationCountry: normalizedCountry,
        countryQuery: normalizedCountry,
        selectedCountryIsoCode,
        location: normalizedCity,
        cityQuery: normalizedCity,
      }),
    );

    setShowJobPreview(true);
    navigate({ hash: "preview" }, { replace: true });

    const sourceDesc = description.trim();
    const needsExtraction = extractionSourceDescription !== sourceDesc;
    if (!needsExtraction && previewExtraction) {
      return;
    }

    setPreviewExtracting(true);
    try {
      const result = await previewParseEmployerJob(sourceDesc);
      applyPreviewExtraction(result, sourceDesc);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Could not analyze job description.";
      toast.error(message);
      applyPreviewExtraction(
        {
          description: "",
          responsibilities: [],
          qualifications: [],
          skills: [],
          skills_preferred: [],
          useDescriptionOnly: true,
          aiAvailable: false,
        },
        sourceDesc,
      );
    } finally {
      setPreviewExtracting(false);
    }
  }, [
    validateFormForSave,
    applyCommittedLocationToForm,
    worldCountries,
    selectedCountryIsoCode,
    navigate,
    description,
    extractionSourceDescription,
    previewExtraction,
    applyPreviewExtraction,
  ]);

  /** When hash loses #preview (e.g. DashboardHeader Back), leave preview mode */
  const prevEmployerJobHashRef = useRef<string>("");
  useEffect(() => {
    const prev = prevEmployerJobHashRef.current;
    prevEmployerJobHashRef.current = locationState.hash;
    if (
      prev === "#preview" &&
      locationState.hash !== "#preview" &&
      showJobPreview
    ) {
      setShowJobPreview(false);
    }
  }, [locationState.hash, showJobPreview]);

  /** Open preview when URL is shared with #preview */
  useEffect(() => {
    if (loading) return;
    if (locationState.hash === "#preview" && !showJobPreview) {
      setShowJobPreview(true);
    }
  }, [loading, locationState.hash, showJobPreview]);

  /** Scroll to preview anchor after it mounts */
  useEffect(() => {
    if (!showJobPreview) return;
    const id = window.requestAnimationFrame(() => {
      document.getElementById("preview")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [showJobPreview]);

  const handleExitPreview = useCallback(() => {
    setShowJobPreview(false);
    navigate({ hash: "" }, { replace: true });
  }, [navigate]);

  const workModeLabel = useMemo(
    () =>
      WORK_MODE_OPTIONS.find((o) => o.value === workMode)?.label ?? workMode,
    [workMode],
  );

  const previewLocationLine = useMemo(() => {
    const { normalizedCountry, normalizedCity } = resolveCommittedJobLocation({
      countries: worldCountries,
      locationCountry,
      countryQuery,
      selectedCountryIsoCode,
      location,
      cityQuery,
    });
    if (normalizedCity && normalizedCountry) {
      return `${normalizedCity}, ${normalizedCountry}`;
    }
    if (normalizedCity) return normalizedCity;
    if (normalizedCountry) return normalizedCountry;
    return "Location not specified";
  }, [
    worldCountries,
    locationCountry,
    countryQuery,
    selectedCountryIsoCode,
    location,
    cityQuery,
  ]);

  const previewSalaryLine = salary.trim() ? salary.trim() : "By agreement";

  const companyName =
    headerCompanyName.trim() ||
    profile?.company_name?.trim() ||
    user?.email ||
    "Company";

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <>
      {saving ? (
        <div
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-3 bg-background/85 px-6 text-center backdrop-blur-sm dark:bg-background/90"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-10 w-10 animate-spin text-breneo-blue" />
          <p className="text-base font-semibold text-foreground">
            {willExtractDescriptionOnSave
              ? t.employerJobForm.extractingDescriptionTitle
              : t.employerJobForm.buttonSaving}
          </p>
          {willExtractDescriptionOnSave ? (
            <p className="max-w-sm text-sm text-muted-foreground">
              {t.employerJobForm.extractingDescriptionHint}
            </p>
          ) : null}
        </div>
      ) : null}

      {showJobPreview ? (
        <EmployerJobFormPreview
          companyName={companyName}
          companyLogo={headerCompanyLogo || profile?.logo_url || null}
          companyWebsite={profile?.website?.trim() || null}
          title={title}
          manualDescription={description}
          responsibilities={
            previewExtraction?.responsibilities ??
            linesToBulletArray(responsibilitiesText)
          }
          qualifications={
            previewExtraction?.qualifications ??
            linesToBulletArray(qualificationsText)
          }
          useDescriptionOnly={previewExtraction?.useDescriptionOnly ?? true}
          selectedSkills={selectedJobSkills}
          onSelectedSkillsChange={setSelectedJobSkills}
          skillsRequireManual={skillsRequireManual}
          previewExtracting={previewExtracting}
          workModeLabel={workModeLabel}
          employmentType={employmentType}
          applyUrl={applyUrl}
          previewLocationLine={previewLocationLine}
          previewSalaryLine={previewSalaryLine}
          isEdit={isEdit}
          responsibilitiesLabel={t.employerJobForm.responsibilitiesLabel}
          qualificationsLabel={t.employerJobForm.qualificationsLabel}
          skillsLabel={t.employerJobForm.skillsLabel}
          skillsHint={
            skillsRequireManual
              ? t.employerJobForm.skillsManualHint
              : t.employerJobForm.skillsEditHint
          }
          onExitPreview={handleExitPreview}
          onPublish={handleSubmit}
          publishing={saving}
          publishLabel={
            willExtractDescriptionOnSave
              ? t.employerJobForm.buttonExtractingSaving
              : t.employerJobForm.buttonSaving
          }
        />
      ) : (
        <div className="space-y-6 md:px-6 lg:px-8 pb-24">
          <Card className="relative rounded-3xl border-0 shadow-none bg-white dark:bg-card overflow-hidden">
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
                <p className="text-sm text-destructive">
                  {fieldErrors.title[0]}
                </p>
              ) : null}

              <div className="space-y-2">
                {isEdit ? (
                  <div className="flex items-center justify-between gap-2">
                    <Label
                      htmlFor="employer-job-full-description"
                      className="text-sm font-medium text-foreground"
                    >
                      {t.employerJobForm.fullDescriptionLabel}
                    </Label>
                    <SectionEditToggle
                      isEditing={editingJobDescription}
                      onEdit={() => setEditingJobDescription(true)}
                      onDone={() => setEditingJobDescription(false)}
                      editLabel="Edit description"
                      doneLabel="Done editing description"
                    />
                  </div>
                ) : null}
                {isEdit && !editingJobDescription ? (
                  <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-4">
                    <JobFormReadOnlyText
                      value={description}
                      emptyLabel="No description yet."
                    />
                  </div>
                ) : (
                  <div className={cn(dashedShell)}>
                    <AutoSizeTextarea
                      id="employer-job-full-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      minHeightPx={200}
                      className="min-h-[200px] w-full rounded-lg border-0 bg-transparent px-3 py-3 text-base shadow-none focus-visible:ring-0 dark:text-white"
                      placeholder="Describe the role, requirements, and benefits…"
                    />
                  </div>
                )}
                {fieldErrors.full_description?.[0] ? (
                  <p className="text-sm text-destructive">
                    {fieldErrors.full_description[0]}
                  </p>
                ) : null}
              </div>

              {isEdit ? (
                <div className="space-y-6 pt-2 border-t border-border/50">
                  {responsibilitiesText.trim() ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label
                          htmlFor="employer-job-responsibilities"
                          className="text-sm font-medium text-foreground"
                        >
                          {t.employerJobForm.responsibilitiesLabel}
                        </Label>
                        <SectionEditToggle
                          isEditing={editingResponsibilities}
                          onEdit={() => setEditingResponsibilities(true)}
                          onDone={() => setEditingResponsibilities(false)}
                          editLabel="Edit responsibilities"
                          doneLabel="Done editing responsibilities"
                        />
                      </div>
                      {editingResponsibilities ? (
                        <>
                          <p className="text-xs text-muted-foreground">
                            {t.employerJobForm.responsibilitiesHint}
                          </p>
                          <div className={cn(dashedShell)}>
                            <AutoSizeTextarea
                              id="employer-job-responsibilities"
                              value={responsibilitiesText}
                              onChange={(e) =>
                                setResponsibilitiesText(e.target.value)
                              }
                              minHeightPx={140}
                              className="min-h-[140px] w-full rounded-lg border-0 bg-transparent px-3 py-3 text-base shadow-none focus-visible:ring-0 dark:text-white"
                              placeholder="One bullet per line"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-4">
                          <JobFormReadOnlyBulletList
                            text={responsibilitiesText}
                            emptyLabel="No responsibilities listed."
                          />
                        </div>
                      )}
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    {qualificationsText.trim() ? (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <Label
                            htmlFor="employer-job-qualifications"
                            className="text-sm font-medium text-foreground"
                          >
                            {t.employerJobForm.qualificationsLabel}
                          </Label>
                          <SectionEditToggle
                            isEditing={editingQualifications}
                            onEdit={() => setEditingQualifications(true)}
                            onDone={() => setEditingQualifications(false)}
                            editLabel="Edit qualifications"
                            doneLabel="Done editing qualifications"
                          />
                        </div>
                        {editingQualifications ? (
                          <>
                            <p className="text-xs text-muted-foreground">
                              {t.employerJobForm.qualificationsHint}
                            </p>
                            <div className={cn(dashedShell)}>
                              <AutoSizeTextarea
                                id="employer-job-qualifications"
                                value={qualificationsText}
                                onChange={(e) =>
                                  setQualificationsText(e.target.value)
                                }
                                minHeightPx={140}
                                className="min-h-[140px] w-full rounded-lg border-0 bg-transparent px-3 py-3 text-base shadow-none focus-visible:ring-0 dark:text-white"
                                placeholder="One bullet per line"
                              />
                            </div>
                          </>
                        ) : (
                          <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-4">
                            <JobFormReadOnlyBulletList
                              text={qualificationsText}
                              emptyLabel="No qualifications listed."
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <Label className="text-sm font-medium text-foreground">
                        {t.employerJobForm.qualificationsLabel}
                      </Label>
                    )}
                    <div className={cn(dashedShell, "p-4 mt-4")}>
                      <EmployerJobSkillsPicker
                        selectedSkills={selectedJobSkills}
                        onSelectedSkillsChange={setSelectedJobSkills}
                        label={t.employerJobForm.skillsLabel}
                        hint={t.employerJobForm.skillsEditHint}
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
                          name="employer-job-country-picker"
                          value={countryQuery}
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                          data-1p-ignore
                          data-lpignore="true"
                          onChange={(e) => {
                            const next = e.target.value;
                            setCountryQuery(next);
                            setCountryOpen(true);
                            const selected = selectedCountryIsoCode
                              ? worldCountries.find(
                                  (c) => c.isoCode === selectedCountryIsoCode,
                                )
                              : null;
                            const stillMatchesSelected =
                              selected &&
                              next.trim().toLowerCase() ===
                                selected.name.toLowerCase();
                            if (stillMatchesSelected) {
                              setLocationCountry(selected.name);
                              return;
                            }
                            setLocationCountry("");
                            if (selectedCountryIsoCode) {
                              setSelectedCountryIsoCode("");
                              setLocation("");
                              setCityQuery("");
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (
                                countryQuery.trim().length <
                                JOB_LOCATION_MIN_SEARCH_CHARS
                              ) {
                                return;
                              }
                              if (!tryResolveCountryFromQuery(countryQuery)) {
                                const first = filteredCountries[0];
                                if (first)
                                  selectCountry(first.name, first.isoCode);
                              }
                              setCountryOpen(false);
                            }
                          }}
                          onFocus={() => setCountryOpen(true)}
                          onBlur={() => {
                            setTimeout(() => setCountryOpen(false), 120);
                          }}
                          placeholder="Select country"
                          className="bg-white dark:bg-background"
                        />
                        {countryOpen ? (
                          <EmployerLocationSelectDropdown
                            minSearchChars={JOB_LOCATION_MIN_SEARCH_CHARS}
                            queryLength={countryQuery.trim().length}
                            items={filteredCountries.map((country) => ({
                              key: country.isoCode,
                              label: country.name,
                            }))}
                            onSelect={(name) => {
                              const country = filteredCountries.find(
                                (c) => c.name === name,
                              );
                              if (country) {
                                selectCountry(country.name, country.isoCode);
                              }
                            }}
                            minCharsMessage={`Type at least ${JOB_LOCATION_MIN_SEARCH_CHARS} characters`}
                          />
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
                          name="employer-job-city-picker"
                          value={cityQuery}
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                          data-1p-ignore
                          data-lpignore="true"
                          onChange={(e) => {
                            const next = e.target.value;
                            setCityQuery(next);
                            setCityOpen(true);
                            const committed = location.trim();
                            if (
                              committed &&
                              next.trim().toLowerCase() ===
                                committed.toLowerCase()
                            ) {
                              return;
                            }
                            setLocation("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (
                                cityQuery.trim().length <
                                JOB_LOCATION_MIN_SEARCH_CHARS
                              ) {
                                return;
                              }
                              if (!tryResolveCityFromQuery(cityQuery)) {
                                const first = filteredCities[0];
                                if (first) selectCity(first.name);
                              }
                              setCityOpen(false);
                            }
                          }}
                          onFocus={() =>
                            selectedCountryIsoCode && setCityOpen(true)
                          }
                          onBlur={() => {
                            setTimeout(() => setCityOpen(false), 120);
                          }}
                          placeholder="Select city"
                          className="bg-white dark:bg-background"
                          disabled={!selectedCountryIsoCode}
                        />
                        {cityOpen && selectedCountryIsoCode ? (
                          <EmployerLocationSelectDropdown
                            minSearchChars={JOB_LOCATION_MIN_SEARCH_CHARS}
                            queryLength={cityQuery.trim().length}
                            items={filteredCities.map((city) => ({
                              key: `${city.countryCode}-${city.name}-${city.latitude}-${city.longitude}`,
                              label: city.name,
                            }))}
                            onSelect={selectCity}
                            minCharsMessage={`Type at least ${JOB_LOCATION_MIN_SEARCH_CHARS} characters`}
                          />
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
                  {isEdit ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={openJobPreview}
                        disabled={saving || deleting}
                      >
                        View preview
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={saving || deleting}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {willExtractDescriptionOnSave
                              ? t.employerJobForm.buttonExtractingSaving
                              : t.employerJobForm.buttonSaving}
                          </>
                        ) : (
                          "Save changes"
                        )}
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      onClick={openJobPreview}
                      disabled={saving || deleting}
                    >
                      View job preview
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
