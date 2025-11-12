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
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useMobile } from "@/hooks/use-mobile";
import { countries } from "@/data/countries";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, Search as SearchIcon } from "lucide-react";

interface CourseFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    country: string;
    countries: string[];
    skills: string[];
  };
  onFiltersChange: (newFilters: {
    country: string;
    countries: string[];
    skills: string[];
  }) => void;
  onApply: () => void;
  onClear?: () => void;
  userTopSkills?: string[];
}

// Georgian translations
const COUNTRY_LABEL_KA = "ქვეყანა";
const CHOOSE_LABEL_KA = "აირჩიე";
const SEARCH_TITLE_KA = "მოძებნე";
const SAVE_BUTTON_KA = "არჩევა";
const CLEAR_BUTTON_KA = "გასუფთავება";
const SKILLS_LABEL_KA = "ინტერესები";
const INTERESTS_LABEL = "Interests / Skills";

interface FilterFormProps {
  filters: CourseFilterModalProps["filters"];
  onFiltersChange: CourseFilterModalProps["onFiltersChange"];
  isMobile?: boolean;
  onLocationClick?: () => void;
  userTopSkills?: string[];
}

const FilterForm: React.FC<FilterFormProps> = ({
  filters,
  onFiltersChange,
  isMobile = false,
  onLocationClick,
  userTopSkills = [],
}) => {
  const handleCountryToggle = (countryCode: string) => {
    const newCountries = filters.countries.includes(countryCode)
      ? filters.countries.filter((code) => code !== countryCode)
      : [...filters.countries, countryCode];
    onFiltersChange({
      ...filters,
      countries: newCountries,
      skills: filters.skills || [],
    });
  };

  const getLocationDisplayText = () => {
    if (filters.countries.length === 0) return "Choose";
    if (filters.countries.length === 1) {
      const country = countries.find((c) => c.code === filters.countries[0]);
      return country?.name || "Choose";
    }
    return `${filters.countries.length} selected`;
  };

  const getSkillsDisplayText = () => {
    if (filters.skills.length === 0) return CHOOSE_LABEL_KA;
    if (filters.skills.length === 1) {
      return filters.skills[0];
    }
    return `${filters.skills.length} selected`;
  };

  const handleSkillToggle = (skill: string) => {
    const newSkills = filters.skills.includes(skill)
      ? filters.skills.filter((s) => s !== skill)
      : [...filters.skills, skill];
    onFiltersChange({
      ...filters,
      skills: newSkills,
      countries: filters.countries || [],
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
      });
    } else {
      // Select all
      onFiltersChange({
        ...filters,
        skills: userTopSkills,
        countries: filters.countries || [],
      });
    }
  };

  const isAllSkillsSelected =
    userTopSkills.length > 0 &&
    userTopSkills.every((skill) => filters.skills.includes(skill));

  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Location Filter - Mobile Style */}
        <div
          className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer"
          onClick={onLocationClick}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">
              {COUNTRY_LABEL_KA}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {getLocationDisplayText()}
              </span>
              <ChevronLeft className="h-4 w-4 text-gray-400 rotate-180" />
            </div>
          </div>
        </div>

        {/* Skills/Interests Filter - Mobile Style */}
        {userTopSkills.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {SKILLS_LABEL_KA}
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
      {/* Skills/Interests Filter - Desktop */}
      {userTopSkills.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium dark:text-gray-100">
              {INTERESTS_LABEL}
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
};

export const CourseFilterModal: React.FC<CourseFilterModalProps> = ({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onApply,
  onClear,
  userTopSkills = [],
}) => {
  const isMobile = useMobile();
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState("");

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

  const handleLocationChange = (countryCodes: string[]) => {
    onFiltersChange({
      ...filters,
      countries: countryCodes,
      skills: filters.skills || [],
    });
  };

  const handleSkillsChange = (skills: string[]) => {
    onFiltersChange({
      ...filters,
      skills: skills,
      countries: filters.countries || [],
    });
  };

  // Reset picker states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowLocationPicker(false);
    }
  }, [isOpen]);

  if (isMobile) {
    // Location Picker View
    if (showLocationPicker) {
      return (
        <Drawer
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) {
              setShowLocationPicker(false);
              onClose();
            }
          }}
        >
          <DrawerContent className="max-h-[90vh] flex flex-col">
            <DrawerHeader className="border-b flex-shrink-0">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full -ml-2"
                  onClick={() => {
                    setShowLocationPicker(false);
                    setLocationSearchQuery("");
                  }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <DrawerTitle>Countries</DrawerTitle>
              </div>
            </DrawerHeader>
            {/* Search Input */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search countries..."
                  value={locationSearchQuery}
                  onChange={(e) => setLocationSearchQuery(e.target.value)}
                  className="pl-9 pr-3 h-9 text-sm"
                />
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto -mx-4 px-4">
              <div className="py-4 space-y-2">
                {filteredCountriesMobile.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    No countries found
                  </div>
                ) : (
                  filteredCountriesMobile.map((country) => {
                    const isChecked = filters.countries.includes(country.code);
                    return (
                      <Label
                        key={country.code}
                        htmlFor={country.code}
                        className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer min-h-[48px] active:bg-gray-50 dark:active:bg-gray-700 transition-colors select-none"
                      >
                        <span className="flex-1 text-sm font-medium">
                          {country.name}
                        </span>
                        <Checkbox
                          id={country.code}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const newCountries = checked
                              ? [...filters.countries, country.code]
                              : filters.countries.filter(
                                  (code) => code !== country.code
                                );
                            handleLocationChange(newCountries);
                          }}
                        />
                      </Label>
                    );
                  })
                )}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      );
    }

    // Main Filter View
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="border-b pb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full -ml-2"
                onClick={onClose}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <DrawerTitle className="text-xl font-bold">
                {SEARCH_TITLE_KA}
              </DrawerTitle>
            </div>
          </DrawerHeader>
          <div className="px-4 py-6 flex-1 overflow-y-auto">
            <FilterForm
              filters={filters}
              onFiltersChange={onFiltersChange}
              isMobile={true}
              onLocationClick={() => setShowLocationPicker(true)}
              userTopSkills={userTopSkills}
            />
          </div>
          <DrawerFooter className="border-t pt-4 px-4 pb-6">
            <div className="flex gap-3 w-full">
              {onClear && (
                <Button
                  onClick={() => {
                    onClear();
                    setShowLocationPicker(false);
                  }}
                  variant="ghost"
                  className="flex-1 h-12 text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-0"
                >
                  {CLEAR_BUTTON_KA}
                </Button>
              )}
              <Button
                onClick={() => {
                  onApply();
                  setShowLocationPicker(false);
                }}
                className="flex-1 bg-breneo-blue text-white hover:bg-breneo-blue/90 rounded-lg h-12 text-base font-medium"
              >
                {SAVE_BUTTON_KA}
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Filter Courses</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <FilterForm
            filters={filters}
            onFiltersChange={onFiltersChange}
            isMobile={false}
            userTopSkills={userTopSkills}
          />
        </div>
        <DialogFooter>
          <div className="flex gap-3 w-full">
            {onClear && (
              <Button
                onClick={() => {
                  onClear();
                }}
                variant="ghost"
                className="flex-1 h-10 text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-0"
              >
                {CLEAR_BUTTON_KA}
              </Button>
            )}
            <Button onClick={onApply} className="flex-1 bg-breneo-blue text-white hover:bg-breneo-blue/90">
              Apply Filters
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

