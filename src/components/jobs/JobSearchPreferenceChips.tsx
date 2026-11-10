import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Search } from "@/components/icons";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SalaryRangeFilter } from "@/components/jobs/SalaryRangeFilter";
import { useLanguage } from "@/contexts/LanguageContext";
import type { OnboardingRoleCategoryId } from "@/onboarding/onboardingAnswers";
import {
  filterGeorgianCities,
  georgianCityLabel,
  georgianCityLabelById,
} from "@/data/georgian-cities";
import { cn } from "@/lib/utils";
import { formatSalaryFilterLabel } from "@/utils/jobSalaryFormat";

/** Values sent as `role_category`. Labels come from onboarding translations. */
export const JOB_ROLE_CATEGORIES: {
  value: string;
  labelId: OnboardingRoleCategoryId;
}[] = [
  { value: "Software engineering", labelId: "software" },
  { value: "DevOps & cloud", labelId: "devops" },
  { value: "Data & AI", labelId: "data" },
  { value: "Design", labelId: "design" },
  { value: "Product & business analysis", labelId: "product" },
  { value: "Project & program management", labelId: "project" },
  { value: "Marketing", labelId: "marketing" },
  { value: "Sales & success", labelId: "sales" },
  { value: "Finance & accounting", labelId: "finance" },
  { value: "HR & recruiting", labelId: "hr" },
  { value: "Customer support", labelId: "support" },
  { value: "Operations & admin", labelId: "operations" },
  { value: "Healthcare", labelId: "healthcare" },
  { value: "Education", labelId: "education" },
  { value: "Engineering & trades", labelId: "trades" },
  { value: "Writing & media", labelId: "writing" },
  { value: "Legal & compliance", labelId: "legal" },
  { value: "Consulting & strategy", labelId: "consulting" },
];

export const JOB_SENIORITY_LEVELS = [
  "intern",
  "junior",
  "mid",
  "senior",
  "lead",
] as const;

const WORK_TYPES = ["FULLTIME", "PARTTIME", "CONTRACTOR", "INTERN"] as const;

const WORK_TYPE_LABEL_KEYS = {
  FULLTIME: "fullTime",
  PARTTIME: "partTime",
  CONTRACTOR: "contract",
} as const;

const SALARY_MIN = 0;
const SALARY_MAX = 20000;

const dropdownItemClass =
  "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-gray-900 hover:bg-[#e4e4e4] dark:text-gray-100 dark:hover:bg-[#3a3a3a]";

const dropdownCheckboxClass =
  "pointer-events-none h-5 w-5 shrink-0 rounded-[4px] border-[#e4e4e4] bg-white dark:border-[#3a3a3a] dark:bg-[#2c2c2c] data-[state=checked]:border-breneo-blue data-[state=checked]:bg-breneo-blue";

type OpenChip = "workType" | "city" | "category" | "level" | "salary" | null;

type JobSearchPreferenceChipsProps = {
  jobTypes: string[];
  isRemote: boolean;
  countries: string[];
  roleCategory: string[];
  seniority: string[];
  salaryMin?: number;
  salaryMax?: number;
  salaryByAgreement?: boolean;
  onJobTypesChange: (next: string[]) => void;
  onRemoteChange: (next: boolean) => void;
  onCountriesChange: (next: string[]) => void;
  onRoleCategoryChange: (next: string[]) => void;
  onSeniorityChange: (next: string[]) => void;
  onSalaryChange: (
    min: number | undefined,
    max: number | undefined,
    byAgreement: boolean,
  ) => void;
};

export function JobSearchPreferenceChips({
  jobTypes,
  isRemote,
  countries,
  roleCategory,
  seniority,
  salaryMin,
  salaryMax,
  salaryByAgreement = false,
  onJobTypesChange,
  onRemoteChange,
  onCountriesChange,
  onRoleCategoryChange,
  onSeniorityChange,
  onSalaryChange,
}: JobSearchPreferenceChipsProps) {
  const { t, language } = useLanguage();
  const [openChip, setOpenChip] = useState<OpenChip>(null);
  const [cityQuery, setCityQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openChip) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenChip(null);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenChip(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openChip]);

  const workTypeLabel = (id: string) => {
    if (id === "INTERN") return t.jobs.levels.intern;
    const key = WORK_TYPE_LABEL_KEYS[id as keyof typeof WORK_TYPE_LABEL_KEYS];
    return key ? t.jobs[key] : id;
  };

  const categoryLabel = (value: string) => {
    const match = JOB_ROLE_CATEGORIES.find((item) => item.value === value);
    return match ? t.onboarding.roleCategories[match.labelId] : value;
  };

  const levelLabel = (id: string) =>
    t.jobs.levels[id as keyof typeof t.jobs.levels] ?? id;

  const workTypeNames = jobTypes.map(workTypeLabel);
  if (isRemote) workTypeNames.push(t.jobs.remote);

  const filteredCities = useMemo(
    () => filterGeorgianCities(cityQuery, language),
    [cityQuery, language],
  );

  const toggle = (
    current: string[],
    id: string,
    onChange: (next: string[]) => void,
  ) => {
    onChange(
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  };

  const summary = (
    fallback: string,
    selected: string[],
    labelFor: (id: string) => string,
  ) => {
    if (selected.length === 0) return fallback;
    if (selected.length === 1) return labelFor(selected[0]);
    return `${fallback} (${selected.length})`;
  };

  const salaryActive =
    salaryMin !== undefined || salaryMax !== undefined || salaryByAgreement;

  return (
    <div ref={rootRef} className="mt-3 hidden flex-wrap gap-2 md:flex">
      <ChipMenu
        label={
          workTypeNames.length === 0
            ? t.jobs.workType
            : workTypeNames.length === 1
              ? workTypeNames[0]
              : `${t.jobs.workType} (${workTypeNames.length})`
        }
        active={workTypeNames.length > 0}
        open={openChip === "workType"}
        onClick={() =>
          setOpenChip((current) => (current === "workType" ? null : "workType"))
        }
      >
        <OptionList
          options={WORK_TYPES.map((id) => ({
            id,
            label: workTypeLabel(id),
          }))}
          selected={jobTypes}
          onToggle={(id) => toggle(jobTypes, id, onJobTypesChange)}
        />
        <div
          role="button"
          tabIndex={0}
          onClick={() => onRemoteChange(!isRemote)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onRemoteChange(!isRemote);
            }
          }}
          className={dropdownItemClass}
        >
          <Checkbox checked={isRemote} className={dropdownCheckboxClass} />
          <span>{t.jobs.remote}</span>
        </div>
      </ChipMenu>

      <ChipMenu
        label={summary(t.jobs.city, countries, (id) =>
          georgianCityLabelById(id, language),
        )}
        active={countries.length > 0}
        open={openChip === "city"}
        onClick={() =>
          setOpenChip((current) => (current === "city" ? null : "city"))
        }
        panelClassName="w-[min(320px,calc(100vw-2rem))]"
      >
        <div className="px-1 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={cityQuery}
              onChange={(event) => setCityQuery(event.target.value)}
              placeholder={t.jobs.searchCities}
              className="h-9 rounded-xl pl-9 text-sm"
            />
          </div>
        </div>
        <div className="max-h-72 space-y-0.5 overflow-y-auto">
          {filteredCities.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">
              {t.jobs.noCitiesFound}
            </p>
          ) : (
            filteredCities.map((city) => (
              <div
                key={city.id}
                role="button"
                tabIndex={0}
                onClick={() => toggle(countries, city.id, onCountriesChange)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggle(countries, city.id, onCountriesChange);
                  }
                }}
                className={dropdownItemClass}
              >
                <Checkbox
                  checked={countries.includes(city.id)}
                  className={dropdownCheckboxClass}
                />
                <span className="truncate">
                  {georgianCityLabel(city, language)}
                </span>
              </div>
            ))
          )}
        </div>
      </ChipMenu>

      <ChipMenu
        label={summary(t.jobs.category, roleCategory, categoryLabel)}
        active={roleCategory.length > 0}
        open={openChip === "category"}
        onClick={() =>
          setOpenChip((current) => (current === "category" ? null : "category"))
        }
      >
        <OptionList
          options={JOB_ROLE_CATEGORIES.map((item) => ({
            id: item.value,
            label: t.onboarding.roleCategories[item.labelId],
          }))}
          selected={roleCategory}
          onToggle={(id) => toggle(roleCategory, id, onRoleCategoryChange)}
        />
      </ChipMenu>

      <ChipMenu
        label={summary(t.jobs.level, seniority, levelLabel)}
        active={seniority.length > 0}
        open={openChip === "level"}
        onClick={() =>
          setOpenChip((current) => (current === "level" ? null : "level"))
        }
      >
        <OptionList
          options={JOB_SENIORITY_LEVELS.map((id) => ({
            id,
            label: levelLabel(id),
          }))}
          selected={seniority}
          onToggle={(id) => toggle(seniority, id, onSeniorityChange)}
        />
      </ChipMenu>

      <ChipMenu
        label={
          salaryByAgreement
            ? t.jobs.byAgreement
            : salaryMin !== undefined || salaryMax !== undefined
              ? formatSalaryFilterLabel(salaryMin, salaryMax)
              : t.jobs.salary
        }
        active={salaryActive}
        open={openChip === "salary"}
        onClick={() =>
          setOpenChip((current) => (current === "salary" ? null : "salary"))
        }
        panelClassName="right-0 left-auto w-[min(320px,calc(100vw-2rem))]"
      >
        <div className="p-4">
          <SalaryRangeFilter
            minSalary={SALARY_MIN}
            maxSalary={SALARY_MAX}
            salaryMin={salaryMin}
            salaryMax={salaryMax}
            salaryByAgreement={salaryByAgreement}
            onSalaryChange={onSalaryChange}
          />
        </div>
      </ChipMenu>
    </div>
  );
}

function ChipMenu({
  label,
  active,
  open,
  onClick,
  panelClassName,
  children,
}: {
  label: string;
  active: boolean;
  open: boolean;
  onClick: () => void;
  panelClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={onClick}
        className={cn(
          "inline-flex max-w-[240px] items-center gap-1.5 rounded-[14px] px-4 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-breneo-blue/10 text-breneo-blue"
            : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-[#3A3A3A] dark:text-gray-200 dark:hover:bg-[#444]",
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div
          className={cn(
            "absolute left-0 top-full z-50 mt-2 w-[min(280px,calc(100vw-2rem))] rounded-[24px] border border-[#e4e4e4] bg-white p-2 shadow-xl dark:border-[#3a3a3a] dark:bg-[#242424]",
            panelClassName,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function OptionList({
  options,
  selected,
  onToggle,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="max-h-72 space-y-0.5 overflow-y-auto">
      {options.map((option) => (
        <div
          key={option.id}
          role="button"
          tabIndex={0}
          onClick={() => onToggle(option.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onToggle(option.id);
            }
          }}
          className={dropdownItemClass}
        >
          <Checkbox
            checked={selected.includes(option.id)}
            className={dropdownCheckboxClass}
          />
          <span className="min-w-0 truncate">{option.label}</span>
        </div>
      ))}
    </div>
  );
}
