import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import {
  filterGeorgianCities,
  georgianCityLabel,
  georgianCityLabelById,
} from "@/data/georgian-cities";
import {
  ChevronRight,
  ChevronLeft,
  Search as SearchIcon,
  ChevronDown,
  Trash2,
} from "@/components/icons";
import { SalaryRangeFilter } from "@/components/jobs/SalaryRangeFilter";
import {
  JOB_ROLE_CATEGORIES,
  JOB_SENIORITY_LEVELS,
} from "@/components/jobs/JobSearchPreferenceChips";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const jobTypes = ["FULLTIME", "PARTTIME", "CONTRACTOR", "INTERN"];

interface JobFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    country: string;
    countries: string[];
    jobTypes: string[];
    isRemote: boolean;
    datePosted?: string;
    skills: string[];
    salaryMin?: number;
    salaryMax?: number;
    salaryByAgreement?: boolean;
    roleCategory?: string[];
    seniority?: string[];
  };
  onFiltersChange: (newFilters: {
    country: string;
    countries: string[];
    jobTypes: string[];
    isRemote: boolean;
    datePosted?: string;
    skills: string[];
    salaryMin?: number;
    salaryMax?: number;
    salaryByAgreement?: boolean;
    roleCategory?: string[];
    seniority?: string[];
  }) => void;
  onApply: () => void;
  onClear?: () => void;
  showSaveFilter?: boolean;
  userTopSkills?: string[]; // User's top skills from test results
}

// Legacy constants (kept for backward compatibility, but should use translations)
const CHOOSE_LABEL_KA = "აირჩიე";
const SEARCH_TITLE_KA = "მოძებნე";

const workTypeLabels: Record<string, string> = {
  FULLTIME: "Full Time",
  PARTTIME: "Part Time",
  CONTRACTOR: "Contractor",
  INTERN: "Intern",
};

interface FilterFormProps {
  filters: JobFilterModalProps["filters"];
  onFiltersChange: JobFilterModalProps["onFiltersChange"];
  isMobile?: boolean;
  userTopSkills?: string[];
  mobileView?: "main" | "workType" | "country" | "category" | "level";
  onMobileViewChange?: (
    view: "main" | "workType" | "country" | "category" | "level",
  ) => void;
  countrySearchQuery?: string;
  onCountrySearchChange?: (query: string) => void;
}

const FilterForm: React.FC<FilterFormProps> = ({
  filters,
  onFiltersChange,
  isMobile = false,
  userTopSkills = [],
  mobileView = "main",
  onMobileViewChange,
  countrySearchQuery = "",
  onCountrySearchChange,
}) => {
  const { t, language } = useLanguage();
  const [isWorkTypeOpen, setIsWorkTypeOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isLevelOpen, setIsLevelOpen] = useState(false);
  const [internalCountrySearchQuery, setInternalCountrySearchQuery] =
    useState("");

  // Use external search query if provided, otherwise use internal state
  const searchQuery =
    onCountrySearchChange && countrySearchQuery !== undefined
      ? countrySearchQuery
      : internalCountrySearchQuery;

  const handleSearchChange = (value: string) => {
    if (onCountrySearchChange) {
      onCountrySearchChange(value);
    } else {
      setInternalCountrySearchQuery(value);
    }
  };

  const filteredCities = React.useMemo(
    () => filterGeorgianCities(searchQuery, language),
    [searchQuery, language],
  );

  // Reset search query when leaving country view
  useEffect(() => {
    if (isMobile && mobileView !== "country") {
      if (onCountrySearchChange) {
        onCountrySearchChange("");
      } else {
        setInternalCountrySearchQuery("");
      }
    }
    if (!isMobile && !isLocationOpen) {
      if (onCountrySearchChange) {
        onCountrySearchChange("");
      } else {
        setInternalCountrySearchQuery("");
      }
    }
  }, [mobileView, isLocationOpen, isMobile, onCountrySearchChange]);

  const handleJobTypeChange = (type: string) => {
    const newJobTypes = filters.jobTypes.includes(type)
      ? filters.jobTypes.filter((t) => t !== type)
      : [...filters.jobTypes, type];
    onFiltersChange({
      ...filters,
      jobTypes: newJobTypes,
      countries: filters.countries || [],
      datePosted: filters.datePosted,
      skills: filters.skills || [],
    });
  };

  const handleCityToggle = (cityId: string) => {
    const newCountries = filters.countries.includes(cityId)
      ? filters.countries.filter((id) => id !== cityId)
      : [...filters.countries, cityId];
    onFiltersChange({
      ...filters,
      countries: newCountries,
      datePosted: filters.datePosted,
      skills: filters.skills || [],
      salaryMin: filters.salaryMin,
      salaryMax: filters.salaryMax,
      salaryByAgreement: filters.salaryByAgreement,
    });
  };

  const handleRemoteChange = (isRemote: boolean) => {
    onFiltersChange({
      ...filters,
      isRemote: isRemote,
      countries: filters.countries || [],
      datePosted: filters.datePosted,
      skills: filters.skills || [],
      salaryMin: filters.salaryMin,
      salaryMax: filters.salaryMax,
      salaryByAgreement: filters.salaryByAgreement,
    });
  };

  const getWorkTypeDisplayText = () => {
    if (filters.jobTypes.length === 0) return CHOOSE_LABEL_KA;
    if (filters.jobTypes.length === 1) {
      return workTypeLabels[filters.jobTypes[0]] || filters.jobTypes[0];
    }
    return filters.jobTypes
      .map((type) => workTypeLabels[type] || type)
      .join(", ");
  };

  const getLocationDisplayText = () => {
    if (filters.countries.length === 0) return t.jobs.choose;
    if (filters.countries.length === 1) {
      return georgianCityLabelById(filters.countries[0], language);
    }
    if (filters.countries.length > 3) {
      return `${filters.countries.length} ${t.jobs.citiesSelected}`;
    }
    return filters.countries
      .slice(0, 3)
      .map((id) => georgianCityLabelById(id, language))
      .join(", ");
  };

  const getSkillsDisplayText = () => {
    if (filters.skills.length === 0) return CHOOSE_LABEL_KA;
    if (filters.skills.length === 1) {
      return filters.skills[0];
    }
    return filters.skills.join(", ");
  };

  const handleSkillToggle = (skill: string) => {
    const newSkills = filters.skills.includes(skill)
      ? filters.skills.filter((s) => s !== skill)
      : [...filters.skills, skill];
    onFiltersChange({
      ...filters,
      skills: newSkills,
      countries: filters.countries || [],
      datePosted: filters.datePosted,
      salaryMin: filters.salaryMin,
      salaryMax: filters.salaryMax,
      salaryByAgreement: filters.salaryByAgreement,
    });
  };

  const handleSelectAllSkills = () => {
    if (userTopSkills.length === 0) return;
    const allSelected = userTopSkills.every((skill) =>
      filters.skills.includes(skill),
    );
    if (allSelected) {
      // Remove all
      onFiltersChange({
        ...filters,
        skills: [],
        countries: filters.countries || [],
        datePosted: filters.datePosted,
        salaryMin: filters.salaryMin,
        salaryMax: filters.salaryMax,
        salaryByAgreement: filters.salaryByAgreement,
      });
    } else {
      // Select all
      onFiltersChange({
        ...filters,
        skills: userTopSkills,
        countries: filters.countries || [],
        datePosted: filters.datePosted,
        salaryMin: filters.salaryMin,
        salaryMax: filters.salaryMax,
        salaryByAgreement: filters.salaryByAgreement,
      });
    }
  };

  const isAllSkillsSelected =
    userTopSkills.length > 0 &&
    userTopSkills.every((skill) => filters.skills.includes(skill));

  const toggleStringList = (
    key: "roleCategory" | "seniority",
    id: string,
  ) => {
    const current = filters[key] ?? [];
    onFiltersChange({
      ...filters,
      [key]: current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    });
  };

  const handleSalaryChange = (
    min: number | undefined,
    max: number | undefined,
    byAgreement: boolean,
  ) => {
    onFiltersChange({
      ...filters,
      salaryMin: min,
      salaryMax: max,
      salaryByAgreement: byAgreement,
    });
  };

  if (isMobile) {
    // Work Type Picker View
    if (mobileView === "workType") {
      return (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="space-y-3">
              {jobTypes.map((type) => {
                const isChecked = filters.jobTypes.includes(type);
                return (
                  <label
                    key={type}
                    className="flex items-center cursor-pointer hover:bg-[#e4e4e4] dark:hover:bg-[#3a3a3a] rounded px-2 py-2 gap-3"
                  >
                    <span className="text-sm text-gray-900 dark:text-gray-100 flex-1 min-w-0">
                      {workTypeLabels[type] || type}
                    </span>
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => handleJobTypeChange(type)}
                      className="h-6 w-6 shrink-0 rounded-[8px] border-[#e4e4e4] bg-white dark:border-[#3a3a3a] dark:bg-[#2c2c2c] data-[state=checked]:bg-breneo-blue data-[state=checked]:border-breneo-blue"
                    />
                  </label>
                );
              })}
              <div className="border-t border-[#e4e4e4] dark:border-[#3a3a3a] my-2" />
              <label className="flex items-center cursor-pointer hover:bg-[#e4e4e4] dark:hover:bg-[#3a3a3a] rounded px-2 py-2 gap-3">
                <span className="text-sm text-gray-900 dark:text-gray-100 flex-1 min-w-0">
                  Remote Jobs Only
                </span>
                <Checkbox
                  checked={filters.isRemote || false}
                  onCheckedChange={(checked) => handleRemoteChange(!!checked)}
                  className="h-6 w-6 shrink-0 rounded-[8px] border-[#e4e4e4] bg-white dark:border-[#3a3a3a] dark:bg-[#2c2c2c] data-[state=checked]:bg-breneo-blue data-[state=checked]:border-breneo-blue"
                />
              </label>
            </div>
          </div>
        </div>
      );
    }

    // City picker (mobile)
    if (mobileView === "country") {
      return (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto overflow-x-hidden -mx-6 px-6">
            <div className="space-y-2">
              {filteredCities.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  {t.jobs.noCitiesFound}
                </div>
              ) : (
                filteredCities.map((city) => {
                  const isChecked = filters.countries.includes(city.id);
                  return (
                    <label
                      key={city.id}
                      className="flex items-center cursor-pointer hover:bg-[#e4e4e4] dark:hover:bg-[#3a3a3a] rounded px-2 py-2 gap-2"
                    >
                      <span className="text-sm text-gray-900 dark:text-gray-100 flex-1 min-w-0 truncate">
                        {georgianCityLabel(city, language)}
                      </span>
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleCityToggle(city.id)}
                        className="h-6 w-6 shrink-0 rounded-[8px] border-[#e4e4e4] bg-white dark:border-[#3a3a3a] dark:bg-[#2c2c2c] data-[state=checked]:bg-breneo-blue data-[state=checked]:border-breneo-blue"
                      />
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>
      );
    }

    if (mobileView === "category") {
      return (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="space-y-3">
              {JOB_ROLE_CATEGORIES.map((category) => {
                const isChecked = (filters.roleCategory ?? []).includes(
                  category.value,
                );
                return (
                  <label
                    key={category.value}
                    className="flex items-center cursor-pointer hover:bg-[#e4e4e4] dark:hover:bg-[#3a3a3a] rounded px-2 py-2 gap-3"
                  >
                    <span className="text-sm text-gray-900 dark:text-gray-100 flex-1 min-w-0">
                      {t.onboarding.roleCategories[category.labelId]}
                    </span>
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() =>
                        toggleStringList("roleCategory", category.value)
                      }
                      className="h-6 w-6 shrink-0 rounded-[8px] border-[#e4e4e4] bg-white dark:border-[#3a3a3a] dark:bg-[#2c2c2c] data-[state=checked]:bg-breneo-blue data-[state=checked]:border-breneo-blue"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (mobileView === "level") {
      return (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="space-y-3">
              {JOB_SENIORITY_LEVELS.map((level) => {
                const isChecked = (filters.seniority ?? []).includes(level);
                return (
                  <label
                    key={level}
                    className="flex items-center cursor-pointer hover:bg-[#e4e4e4] dark:hover:bg-[#3a3a3a] rounded px-2 py-2 gap-3"
                  >
                    <span className="text-sm text-gray-900 dark:text-gray-100 flex-1 min-w-0">
                      {t.jobs.levels[level]}
                    </span>
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() =>
                        toggleStringList("seniority", level)
                      }
                      className="h-6 w-6 shrink-0 rounded-[8px] border-[#e4e4e4] bg-white dark:border-[#3a3a3a] dark:bg-[#2c2c2c] data-[state=checked]:bg-breneo-blue data-[state=checked]:border-breneo-blue"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // Main Filter View
    return (
      <div className="space-y-4">
        {/* Salary Range Filter - Mobile Style */}
        <div className="space-y-3">
          <SalaryRangeFilter
            minSalary={0}
            maxSalary={20000}
            salaryMin={filters.salaryMin}
            salaryMax={filters.salaryMax}
            salaryByAgreement={filters.salaryByAgreement}
            onSalaryChange={handleSalaryChange}
          />
        </div>

        {/* Work Type Filter - Mobile Style */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onMobileViewChange?.("workType")}
            className="flex items-center justify-between w-full rounded-[14px] bg-white p-4 text-gray-700 transition-colors hover:bg-gray-50 dark:bg-[#3A3A3A] dark:text-gray-200 dark:hover:bg-[#444]"
          >
            <span className="text-sm font-medium">
              {t.jobs.workType}
            </span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Location Filter - Mobile Style */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onMobileViewChange?.("country")}
            className="flex items-center justify-between w-full rounded-[14px] bg-white p-4 text-gray-700 transition-colors hover:bg-gray-50 dark:bg-[#3A3A3A] dark:text-gray-200 dark:hover:bg-[#444]"
          >
            <span className="text-sm font-medium">
              {t.jobs.city}
            </span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onMobileViewChange?.("category")}
            className="flex items-center justify-between w-full rounded-[14px] bg-white p-4 text-gray-700 transition-colors hover:bg-gray-50 dark:bg-[#3A3A3A] dark:text-gray-200 dark:hover:bg-[#444]"
          >
            <span className="text-sm font-medium">
              {t.jobs.category}
            </span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onMobileViewChange?.("level")}
            className="flex items-center justify-between w-full rounded-[14px] bg-white p-4 text-gray-700 transition-colors hover:bg-gray-50 dark:bg-[#3A3A3A] dark:text-gray-200 dark:hover:bg-[#444]"
          >
            <span className="text-sm font-medium">
              {t.jobs.level}
            </span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Skills/Interests Filter - Mobile Style */}
        {userTopSkills.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t.jobs.interests}
              </Label>
              <button
                type="button"
                onClick={handleSelectAllSkills}
                className="text-xs font-medium text-breneo-blue hover:text-breneo-blue/80 dark:text-breneo-blue dark:hover:text-breneo-blue/80 transition-colors"
              >
                {isAllSkillsSelected ? "Remove All" : "Select All"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {userTopSkills.map((skill) => {
                const isSelected = filters.skills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => handleSkillToggle(skill)}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium transition-colors border
                      ${
                        isSelected
                          ? "bg-breneo-blue text-white border-breneo-blue hover:bg-breneo-blue/90 dark:bg-breneo-blue dark:text-white dark:border-breneo-blue dark:hover:bg-breneo-blue/90"
                          : "bg-white text-gray-700 border-[#e4e4e4] hover:bg-[#e4e4e4] dark:bg-[#3A3A3A] dark:text-gray-200 dark:border-[#3a3a3a] dark:hover:bg-[#444]"
                      }
                    `}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Salary Range Filter - Desktop */}
      <div className="bg-white dark:bg-[#3A3A3A] rounded-lg p-4">
        <SalaryRangeFilter
          minSalary={0}
          maxSalary={20000}
          salaryMin={filters.salaryMin}
          salaryMax={filters.salaryMax}
          salaryByAgreement={filters.salaryByAgreement}
          onSalaryChange={handleSalaryChange}
        />
      </div>

      {/* Skills/Interests Filter - Desktop */}
      {userTopSkills.length > 0 && (
        <div className="bg-white dark:bg-[#3A3A3A] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium dark:text-gray-100">
              {t.jobs.interests}
            </Label>
            <button
              type="button"
              onClick={handleSelectAllSkills}
              className="text-xs font-medium text-breneo-blue hover:text-breneo-blue/80 dark:text-breneo-blue dark:hover:text-breneo-blue/80 transition-colors"
            >
              {isAllSkillsSelected ? "Remove All" : "Select All"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {userTopSkills.map((skill) => {
              const isSelected = filters.skills.includes(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => handleSkillToggle(skill)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-colors border
                    ${
                      isSelected
                        ? "bg-breneo-blue text-white border-breneo-blue hover:bg-breneo-blue/90 dark:bg-breneo-blue dark:text-white dark:border-breneo-blue dark:hover:bg-breneo-blue/90"
                        : "bg-white text-gray-700 border-[#e4e4e4] hover:bg-[#e4e4e4] dark:bg-[#3A3A3A] dark:text-gray-200 dark:border-[#3a3a3a] dark:hover:bg-[#444]"
                    }
                  `}
                >
                  {skill}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Work Type Filter - Desktop */}
      <div className="space-y-3">
        <Collapsible open={isWorkTypeOpen} onOpenChange={setIsWorkTypeOpen}>
          <CollapsibleTrigger
            className={`flex items-center justify-between w-full bg-white dark:bg-[#3A3A3A] px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#444] transition-colors ${
              isWorkTypeOpen ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <Label className="text-base font-medium dark:text-gray-100 cursor-pointer">
              {t.jobs.workType}
            </Label>
            <ChevronDown
              className={`h-4 w-4 text-gray-600 dark:text-gray-400 transition-transform duration-200 ${
                isWorkTypeOpen ? "transform rotate-180" : ""
              }`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-0">
            <div className="bg-white dark:bg-[#3A3A3A] rounded-b-lg overflow-hidden flex flex-col">
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  {jobTypes.map((type) => {
                    const isChecked = filters.jobTypes.includes(type);
                    return (
                      <label
                        key={type}
                        className="flex items-center space-x-3 cursor-pointer hover:bg-[#e4e4e4] dark:hover:bg-[#3a3a3a] rounded-[0.7rem] px-2 py-2"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleJobTypeChange(type)}
                          className="h-6 w-6 rounded-[4px] border-[#e4e4e4] bg-white dark:border-[#3a3a3a] dark:bg-[#2c2c2c] data-[state=checked]:bg-breneo-blue data-[state=checked]:border-breneo-blue"
                        />
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {workTypeLabels[type] || type}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className="border-t border-[#e4e4e4] dark:border-[#3a3a3a] my-2" />
                <label className="flex items-center space-x-3 cursor-pointer hover:bg-[#e4e4e4] dark:hover:bg-[#3a3a3a] rounded-[0.7rem] px-2 py-2">
                  <Checkbox
                    checked={filters.isRemote || false}
                    onCheckedChange={(checked) => handleRemoteChange(!!checked)}
                    className="h-6 w-6 rounded-[4px] border-[#e4e4e4] bg-white dark:border-[#3a3a3a] dark:bg-[#2c2c2c] data-[state=checked]:bg-breneo-blue data-[state=checked]:border-breneo-blue"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    Remote Jobs Only
                  </span>
                </label>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Location Filter - Desktop */}
      <div className="space-y-3">
        <Collapsible
          open={isLocationOpen}
          onOpenChange={(open) => {
            setIsLocationOpen(open);
            if (!open) {
              handleSearchChange("");
            }
          }}
        >
          <CollapsibleTrigger
            className={`flex items-center justify-between w-full bg-white dark:bg-[#3A3A3A] px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#444] transition-colors ${
              isLocationOpen ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <Label className="text-base font-medium dark:text-gray-100 cursor-pointer">
              {t.jobs.city}
            </Label>
            <ChevronDown
              className={`h-4 w-4 text-gray-600 dark:text-gray-400 transition-transform duration-200 ${
                isLocationOpen ? "transform rotate-180" : ""
              }`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-0">
            <div className="bg-white dark:bg-[#3A3A3A] rounded-b-lg overflow-hidden flex flex-col">
              {/* Search Bar - Sticky at top */}
              <div className="sticky top-0 z-10 bg-white dark:bg-[#3A3A3A] p-3 border-b border-[#e4e4e4] dark:border-[#3a3a3a]">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder={t.jobs.searchCities}
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9 pr-3 h-9 text-sm bg-white dark:bg-[#2c2c2c] dark:border-[#3a3a3a]"
                  />
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-2">
                  {filteredCities.length === 0 ? (
                    <div className="col-span-2 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      {t.jobs.noCitiesFound}
                    </div>
                  ) : (
                    filteredCities.map((city) => {
                      const isChecked = filters.countries.includes(city.id);
                      return (
                        <label
                          key={city.id}
                          className="flex items-center space-x-3 cursor-pointer hover:bg-[#e4e4e4] dark:hover:bg-[#3a3a3a] rounded-[0.7rem] px-2 py-2"
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleCityToggle(city.id)}
                            className="h-6 w-6 rounded-[4px] border-[#e4e4e4] bg-white dark:border-[#3a3a3a] dark:bg-[#2c2c2c] data-[state=checked]:bg-breneo-blue data-[state=checked]:border-breneo-blue"
                          />
                          <span className="text-sm text-gray-900 dark:text-gray-100">
                            {georgianCityLabel(city, language)}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="space-y-3">
        <Collapsible open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
          <CollapsibleTrigger
            className={`flex items-center justify-between w-full bg-white dark:bg-[#3A3A3A] px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#444] transition-colors ${
              isCategoryOpen ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <Label className="text-base font-medium dark:text-gray-100 cursor-pointer">
              {t.jobs.category}
            </Label>
            <ChevronDown
              className={`h-4 w-4 text-gray-600 dark:text-gray-400 transition-transform duration-200 ${
                isCategoryOpen ? "transform rotate-180" : ""
              }`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-0">
            <div className="bg-white dark:bg-[#3A3A3A] rounded-b-lg p-4">
              <div className="grid grid-cols-2 gap-3">
                {JOB_ROLE_CATEGORIES.map((category) => {
                  const isChecked = (filters.roleCategory ?? []).includes(
                    category.value,
                  );
                  return (
                    <label
                      key={category.value}
                      className="flex items-center space-x-3 cursor-pointer hover:bg-[#e4e4e4] dark:hover:bg-[#3a3a3a] rounded-[0.7rem] px-2 py-2"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() =>
                          toggleStringList("roleCategory", category.value)
                        }
                        className="h-6 w-6 rounded-[4px] border-[#e4e4e4] bg-white dark:border-[#3a3a3a] dark:bg-[#2c2c2c] data-[state=checked]:bg-breneo-blue data-[state=checked]:border-breneo-blue"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {t.onboarding.roleCategories[category.labelId]}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="space-y-3">
        <Collapsible open={isLevelOpen} onOpenChange={setIsLevelOpen}>
          <CollapsibleTrigger
            className={`flex items-center justify-between w-full bg-white dark:bg-[#3A3A3A] px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#444] transition-colors ${
              isLevelOpen ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <Label className="text-base font-medium dark:text-gray-100 cursor-pointer">
              {t.jobs.level}
            </Label>
            <ChevronDown
              className={`h-4 w-4 text-gray-600 dark:text-gray-400 transition-transform duration-200 ${
                isLevelOpen ? "transform rotate-180" : ""
              }`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-0">
            <div className="bg-white dark:bg-[#3A3A3A] rounded-b-lg p-4">
              <div className="grid grid-cols-2 gap-3">
                {JOB_SENIORITY_LEVELS.map((level) => {
                  const isChecked = (filters.seniority ?? []).includes(level);
                  return (
                    <label
                      key={level}
                      className="flex items-center space-x-3 cursor-pointer hover:bg-[#e4e4e4] dark:hover:bg-[#3a3a3a] rounded-[0.7rem] px-2 py-2"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() =>
                          toggleStringList("seniority", level)
                        }
                        className="h-6 w-6 rounded-[4px] border-[#e4e4e4] bg-white dark:border-[#3a3a3a] dark:bg-[#2c2c2c] data-[state=checked]:bg-breneo-blue data-[state=checked]:border-breneo-blue"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {t.jobs.levels[level]}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};

export const JobFilterModal: React.FC<JobFilterModalProps> = ({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onApply,
  onClear,
  showSaveFilter = false,
  userTopSkills = [],
}) => {
  const { t } = useLanguage();
  const isMobile = useMobile();
  const [mobileView, setMobileView] = useState<
    "main" | "workType" | "country" | "category" | "level"
  >("main");
  const [showWorkTypePicker, setShowWorkTypePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [countrySearchQuery, setCountrySearchQuery] = useState("");

  const handleWorkTypeChange = (workTypes: string[]) => {
    onFiltersChange({
      ...filters,
      jobTypes: workTypes,
      countries: filters.countries || [],
      datePosted: filters.datePosted,
      skills: filters.skills || [],
      salaryMin: filters.salaryMin,
      salaryMax: filters.salaryMax,
      salaryByAgreement: filters.salaryByAgreement,
    });
  };

  const handleLocationChange = (countryCodes: string[]) => {
    onFiltersChange({
      ...filters,
      countries: countryCodes,
      datePosted: filters.datePosted,
      skills: filters.skills || [],
      salaryMin: filters.salaryMin,
      salaryMax: filters.salaryMax,
      salaryByAgreement: filters.salaryByAgreement,
    });
  };

  const handleRemoteChange = (isRemote: boolean) => {
    onFiltersChange({
      ...filters,
      isRemote: isRemote,
      countries: filters.countries || [],
      datePosted: filters.datePosted,
      skills: filters.skills || [],
      salaryMin: filters.salaryMin,
      salaryMax: filters.salaryMax,
      salaryByAgreement: filters.salaryByAgreement,
    });
  };

  const handleSkillsChange = (skills: string[]) => {
    onFiltersChange({
      ...filters,
      skills: skills,
      countries: filters.countries || [],
      datePosted: filters.datePosted,
      salaryMin: filters.salaryMin,
      salaryMax: filters.salaryMax,
      salaryByAgreement: filters.salaryByAgreement,
    });
  };

  const handleSalaryChange = (
    min: number | undefined,
    max: number | undefined,
    byAgreement: boolean,
  ) => {
    onFiltersChange({
      ...filters,
      salaryMin: min,
      salaryMax: max,
      salaryByAgreement: byAgreement,
    });
  };

  // Reset picker states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowWorkTypePicker(false);
      setShowLocationPicker(false);
      setMobileView("main");
      setCountrySearchQuery("");
    }
  }, [isOpen]);

  if (isMobile) {
    // Main Filter View
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[90vh] flex flex-col bg-background backdrop-blur-none">
          <DrawerHeader className={`flex-shrink-0 border-b border-[#e4e4e4] dark:border-[#3a3a3a]`}>
            <div className="flex items-center gap-2">
              {mobileView !== "main" && (
                <button
                  type="button"
                  onClick={() => {
                    setCountrySearchQuery("");
                    setMobileView("main");
                  }}
                  aria-label={t.common.back}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-300 p-0 text-gray-600 transition-colors hover:bg-gray-400 hover:text-gray-800 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-gray-100"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              )}
              <DrawerTitle className="text-xl font-bold">
                {mobileView === "workType"
                  ? t.jobs.workType
                  : mobileView === "country"
                    ? t.jobs.city
                    : mobileView === "category"
                      ? t.jobs.category
                      : mobileView === "level"
                        ? t.jobs.level
                        : SEARCH_TITLE_KA}
              </DrawerTitle>
            </div>
          </DrawerHeader>
          {mobileView === "country" && (
            <div className="flex-shrink-0 px-6 py-3 border-b border-[#e4e4e4] dark:border-[#3a3a3a]">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder={t.jobs.searchCities}
                  value={countrySearchQuery}
                  onChange={(e) => setCountrySearchQuery(e.target.value)}
                  className="pl-9 pr-3 h-9 text-sm"
                />
              </div>
            </div>
          )}
          <div className="px-6 py-6 flex-1 overflow-y-auto min-h-0">
            <FilterForm
              filters={filters}
              onFiltersChange={onFiltersChange}
              isMobile={true}
              userTopSkills={userTopSkills}
              mobileView={mobileView}
              onMobileViewChange={setMobileView}
              countrySearchQuery={countrySearchQuery}
              onCountrySearchChange={setCountrySearchQuery}
            />
          </div>
          {mobileView === "main" && (
            <DrawerFooter className="border-t border-[#e4e4e4] dark:border-[#3a3a3a]">
              <div
                className={`flex gap-3 w-full ${
                  onClear ? "justify-between" : "justify-end"
                }`}
              >
                {onClear && (
                  <Button
                    onClick={() => {
                      onClear();
                      setMobileView("main");
                    }}
                    variant="ghost"
                    size="icon"
                    aria-label={t.common.clear}
                    className="h-12 w-12 shrink-0 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-600 dark:bg-red-950/30 dark:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-600 border-0 rounded-[18px]"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                )}
                <div className="flex gap-2">
                  {showSaveFilter && (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled
                      className="h-12 px-4 rounded-[18px] text-base font-medium bg-white text-gray-700 hover:bg-gray-50 dark:bg-[#3A3A3A] dark:text-gray-200 dark:hover:bg-[#444] border-0"
                    >
                      {t.common.save}
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      onApply();
                      setMobileView("main");
                    }}
                    className="h-12 px-8 bg-breneo-blue text-white hover:bg-breneo-blue/90 rounded-[18px] text-base font-medium font-semibold"
                  >
                    {t.common.apply}
                  </Button>
                </div>
              </div>
            </DrawerFooter>
          )}
          {(mobileView === "workType" ||
            mobileView === "country" ||
            mobileView === "category" ||
            mobileView === "level") && (
            <DrawerFooter className="border-t border-[#e4e4e4] dark:border-[#3a3a3a]">
              <Button
                onClick={() => {
                  setCountrySearchQuery("");
                  setMobileView("main");
                }}
                className="w-full h-12 bg-breneo-blue text-white hover:bg-breneo-blue/90 rounded-[18px] text-base font-medium font-semibold"
              >
                Done
              </Button>
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col bg-background backdrop-blur-none">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Filter Jobs</DialogTitle>
        </DialogHeader>
        <div className="py-4 overflow-y-auto flex-1 min-h-0">
          <FilterForm
            filters={filters}
            onFiltersChange={onFiltersChange}
            isMobile={false}
            userTopSkills={userTopSkills}
          />
        </div>
        <DialogFooter className="flex-shrink-0">
          <div
            className={`flex gap-3 w-full ${
              onClear ? "justify-between" : "justify-end"
            }`}
          >
            {onClear && (
              <Button
                onClick={() => {
                  onClear();
                }}
                variant="ghost"
                size="icon"
                aria-label={t.common.clear}
                className="h-12 w-12 shrink-0 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-600 dark:bg-red-950/30 dark:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-600 border-0"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              {showSaveFilter && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled
                  className="h-12 px-4 text-base font-medium bg-white text-gray-700 hover:bg-gray-50 dark:bg-[#3A3A3A] dark:text-gray-200 dark:hover:bg-[#444] border-0"
                >
                  {t.common.save}
                </Button>
              )}
              <Button
                onClick={onApply}
                className="w-auto h-12 px-8 bg-breneo-blue text-white hover:bg-breneo-blue/90"
              >
                {t.common.apply}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
