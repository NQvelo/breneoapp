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
import { countries, Country } from "@/data/countries";
import { Input } from "@/components/ui/input";
import { ChevronRight, Search as SearchIcon, ChevronDown } from "lucide-react";
import { SalaryRangeFilter } from "@/components/jobs/SalaryRangeFilter";
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
  }) => void;
  onApply: () => void;
  onClear?: () => void;
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
  mobileView?: "main" | "workType" | "country";
  onMobileViewChange?: (view: "main" | "workType" | "country") => void;
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
  const { t } = useLanguage();
  const [isWorkTypeOpen, setIsWorkTypeOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
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

  // Filter countries based on search query
  const filteredCountries = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return countries;
    }
    const query = searchQuery.toLowerCase();
    return countries.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

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

  const handleCountryToggle = (countryCode: string) => {
    const newCountries = filters.countries.includes(countryCode)
      ? filters.countries.filter((code) => code !== countryCode)
      : [...filters.countries, countryCode];
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
    if (filters.countries.length === 0) return "Choose";
    if (filters.countries.length === 1) {
      const country = countries.find((c) => c.code === filters.countries[0]);
      return country?.name || "Choose";
    }
    // If more than 3 countries selected, show count instead of all names
    if (filters.countries.length > 3) {
      return `${filters.countries.length} countries selected`;
    }
    // Show up to 3 country names
    return filters.countries
      .slice(0, 3)
      .map((code) => {
        const country = countries.find((c) => c.code === code);
        return country?.name || code;
      })
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
      filters.skills.includes(skill)
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

  const handleSalaryChange = (
    min: number | undefined,
    max: number | undefined,
    byAgreement: boolean
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
                    className="flex items-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 rounded px-2 py-2 gap-3"
                  >
                    <span className="text-sm text-gray-900 dark:text-gray-100 flex-1 min-w-0">
                      {workTypeLabels[type] || type}
                    </span>
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => handleJobTypeChange(type)}
                      className="h-6 w-6 shrink-0 rounded-[6px] border-[#8C8C8C] data-[state=checked]:bg-breneo-blue data-[state=checked]:border-breneo-blue"
                    />
                  </label>
                );
              })}
              <div className="border-t border-gray-300 dark:border-gray-600 my-2" />
              <label className="flex items-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 rounded px-2 py-2 gap-3">
                <span className="text-sm text-gray-900 dark:text-gray-100 flex-1 min-w-0">
                  Remote Jobs Only
                </span>
                <Checkbox
                  checked={filters.isRemote || false}
                  onCheckedChange={(checked) => handleRemoteChange(!!checked)}
                  className="h-6 w-6 shrink-0 rounded-[6px] border-[#8C8C8C] data-[state=checked]:bg-breneo-blue data-[state=checked]:border-breneo-blue"
                />
              </label>
            </div>
          </div>
        </div>
      );
    }

    // Country Picker View
    if (mobileView === "country") {
      return (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto overflow-x-hidden -mx-6 px-6">
            <div className="space-y-2">
              {filteredCountries.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  No countries found
                </div>
              ) : (
                filteredCountries.map((country) => {
                  const isChecked = filters.countries.includes(country.code);
                  return (
                    <label
                      key={country.code}
                      className="flex items-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 rounded px-2 py-2 gap-2"
                    >
                      <span className="text-sm text-gray-900 dark:text-gray-100 flex-1 min-w-0 truncate">
                        {country.name}
                      </span>
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() =>
                          handleCountryToggle(country.code)
                        }
                        className="h-6 w-6 shrink-0 rounded-[6px] border-[#8C8C8C] data-[state=checked]:bg-breneo-blue data-[state=checked]:border-breneo-blue"
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
            className="flex items-center justify-between w-full bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900">
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
            className="flex items-center justify-between w-full bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900">
              {t.jobs.country}
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
                          : "bg-transparent text-gray-900 border-gray-300 hover:border-gray-400 dark:text-gray-100 dark:border-gray-600 dark:hover:border-gray-500"
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

      {/* Skills/Interests Filter - Desktop */}
      {userTopSkills.length > 0 && (
        <div className="space-y-3">
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
                        : "bg-transparent text-gray-900 border-gray-300 hover:border-gray-400 dark:text-gray-100 dark:border-gray-600 dark:hover:border-gray-500"
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
            className={`flex items-center justify-between w-full bg-gray-100 dark:bg-[rgb(55,57,60)] px-4 py-3 hover:bg-gray-200 dark:hover:bg-[rgb(55,57,60)] transition-colors ${
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
            <div className="bg-gray-100 dark:bg-[rgb(55,57,60)] rounded-b-lg overflow-hidden flex flex-col">
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  {jobTypes.map((type) => {
                    const isChecked = filters.jobTypes.includes(type);
                    return (
                      <label
                        key={type}
                        className="flex items-center space-x-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 rounded-[0.7rem] px-2 py-2"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleJobTypeChange(type)}
                          className="h-6 w-6 rounded-[6px] border-[#8C8C8C] data-[state=checked]:bg-breneo-blue data-[state=checked]:border-breneo-blue"
                        />
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {workTypeLabels[type] || type}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className="border-t border-gray-300 dark:border-gray-600 my-2" />
                <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 rounded-[0.7rem] px-2 py-2">
                  <Checkbox
                    checked={filters.isRemote || false}
                    onCheckedChange={(checked) => handleRemoteChange(!!checked)}
                    className="h-6 w-6 rounded-[6px] border-[#8C8C8C] data-[state=checked]:bg-breneo-blue data-[state=checked]:border-breneo-blue"
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
            className={`flex items-center justify-between w-full bg-gray-100 dark:bg-[rgb(55,57,60)] px-4 py-3 hover:bg-gray-200 dark:hover:bg-[rgb(55,57,60)] transition-colors ${
              isLocationOpen ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <Label className="text-base font-medium dark:text-gray-100 cursor-pointer">
              {t.jobs.country}
            </Label>
            <ChevronDown
              className={`h-4 w-4 text-gray-600 dark:text-gray-400 transition-transform duration-200 ${
                isLocationOpen ? "transform rotate-180" : ""
              }`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-0">
            <div className="bg-gray-100 dark:bg-[rgb(55,57,60)] rounded-b-lg overflow-hidden flex flex-col">
              {/* Search Bar - Sticky at top */}
              <div className="sticky top-0 z-10 bg-gray-100 dark:bg-[rgb(55,57,60)] p-3 border-b border-gray-300 dark:border-gray-600">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search countries..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9 pr-3 h-9 text-sm bg-white dark:bg-gray-700"
                  />
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-2">
                  {filteredCountries.length === 0 ? (
                    <div className="col-span-2 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No countries found
                    </div>
                  ) : (
                    filteredCountries.map((country) => {
                      const isChecked = filters.countries.includes(
                        country.code
                      );
                      return (
                        <label
                          key={country.code}
                          className="flex items-center space-x-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 rounded-[0.7rem] px-2 py-2"
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() =>
                              handleCountryToggle(country.code)
                            }
                            className="h-6 w-6 rounded-[6px] border-[#8C8C8C] data-[state=checked]:bg-breneo-blue data-[state=checked]:border-breneo-blue"
                          />
                          <span className="text-sm text-gray-900 dark:text-gray-100">
                            {country.name}
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
  userTopSkills = [],
}) => {
  const { t } = useLanguage();
  const isMobile = useMobile();
  const [mobileView, setMobileView] = useState<"main" | "workType" | "country">(
    "main"
  );
  const [showWorkTypePicker, setShowWorkTypePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [countrySearchQuery, setCountrySearchQuery] = useState("");

  // Filter countries for mobile location picker
  const filteredCountriesMobile = React.useMemo(() => {
    if (!locationSearchQuery.trim()) {
      return countries;
    }
    const query = locationSearchQuery.toLowerCase();
    return countries.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query)
    );
  }, [locationSearchQuery]);

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
    byAgreement: boolean
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
        <DrawerContent className="max-h-[90vh] flex flex-col bg-white backdrop-blur-none">
          <DrawerHeader className={`flex-shrink-0 border-b border-gray-200`}>
            <DrawerTitle className="text-xl font-bold">
              {mobileView === "workType"
                ? t.jobs.workType
                : mobileView === "country"
                ? t.jobs.country
                : SEARCH_TITLE_KA}
            </DrawerTitle>
          </DrawerHeader>
          {mobileView === "country" && (
            <div className="flex-shrink-0 px-6 py-3 border-b border-gray-200">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search countries..."
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
            <DrawerFooter className="border-t border-gray-200">
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
                    className="h-12 px-6 text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-0 rounded-[18px]"
                  >
                    {t.common.clear}
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
            </DrawerFooter>
          )}
          {(mobileView === "workType" || mobileView === "country") && (
            <DrawerFooter className="border-t border-gray-200">
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
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col bg-white backdrop-blur-none">
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
                className="w-auto h-10 px-4 text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-0"
              >
                {t.common.clear}
              </Button>
            )}
            <Button
              onClick={onApply}
              className="w-auto h-12 px-8 bg-breneo-blue text-white hover:bg-breneo-blue/90"
            >
              {t.common.apply}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
