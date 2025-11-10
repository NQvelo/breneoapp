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
import { ScrollArea } from "@/components/ui/scroll-area";
import { countries } from "@/data/countries";
import { georgianCities, GEORGIA_NAME_KA } from "@/data/georgian-cities";
import { ChevronLeft, ChevronRight } from "lucide-react";

const jobTypes = ["FULLTIME", "PARTTIME", "CONTRACTOR", "INTERN"];

interface JobFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    country: string;
    cities: string[];
    jobTypes: string[];
    isRemote: boolean;
    datePosted?: string;
    skills: string[];
  };
  onFiltersChange: (newFilters: {
    country: string;
    cities: string[];
    jobTypes: string[];
    isRemote: boolean;
    datePosted?: string;
    skills: string[];
  }) => void;
  onApply: () => void;
  userTopSkills?: string[]; // User's top skills from test results
}

// Georgian translations
const WORK_TYPE_LABEL_KA = "მუშაობის ტიპი";
const COUNTRY_LABEL_KA = "ქვეყანა";
const CHOOSE_LABEL_KA = "აირჩიე";
const SEARCH_TITLE_KA = "მოძებნე";
const SAVE_BUTTON_KA = "შენახვა";
const SKILLS_LABEL_KA = "ინტერესები";
const INTERESTS_LABEL = "Interests / Skills";

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
  onWorkTypeClick?: () => void;
  onLocationClick?: () => void;
  userTopSkills?: string[];
}

const FilterForm: React.FC<FilterFormProps> = ({ 
  filters, 
  onFiltersChange, 
  isMobile = false,
  onWorkTypeClick,
  onLocationClick,
  userTopSkills = [],
}) => {
  const handleJobTypeChange = (type: string) => {
    const newJobTypes = filters.jobTypes.includes(type)
      ? filters.jobTypes.filter((t) => t !== type)
      : [...filters.jobTypes, type];
    onFiltersChange({ 
      ...filters, 
      jobTypes: newJobTypes,
      cities: filters.cities || [],
      datePosted: filters.datePosted || "all",
      skills: filters.skills || [],
    });
  };

  const handleCityToggle = (cityId: string) => {
    const newCities = filters.cities.includes(cityId)
      ? filters.cities.filter((id) => id !== cityId)
      : [...filters.cities, cityId];
    onFiltersChange({ 
      ...filters, 
      cities: newCities,
      datePosted: filters.datePosted || "all",
      skills: filters.skills || [],
    });
  };

  const getWorkTypeDisplayText = () => {
    if (filters.jobTypes.length === 0) return CHOOSE_LABEL_KA;
    if (filters.jobTypes.length === 1) {
      return workTypeLabels[filters.jobTypes[0]] || filters.jobTypes[0];
    }
    return `${filters.jobTypes.length} selected`;
  };

  const getLocationDisplayText = () => {
    if (filters.cities.length === 0) return CHOOSE_LABEL_KA;
    if (filters.cities.length === 1) {
      const city = georgianCities.find(c => c.id === filters.cities[0]);
      return city?.nameKa || CHOOSE_LABEL_KA;
    }
    return `${filters.cities.length} არჩეული`;
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
      cities: filters.cities || [],
      datePosted: filters.datePosted || "all",
    });
  };

  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Work Type Filter - Mobile Style */}
        <div 
          className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer"
          onClick={onWorkTypeClick}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">{WORK_TYPE_LABEL_KA}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{getWorkTypeDisplayText()}</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Location Filter - Mobile Style */}
        <div 
          className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer"
          onClick={onLocationClick}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">{COUNTRY_LABEL_KA}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{getLocationDisplayText()}</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Skills/Interests Filter - Mobile Style */}
        {userTopSkills.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">{SKILLS_LABEL_KA}</Label>
            <div className="flex flex-wrap gap-2">
              {userTopSkills.map((skill) => {
                const isSelected = filters.skills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => handleSkillToggle(skill)}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium transition-colors
                      ${
                        isSelected
                          ? "bg-gray-100 text-black hover:bg-gray-200 dark:bg-gray-100 dark:text-black dark:hover:bg-gray-200"
                          : "bg-white text-gray-900 border border-gray-300 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:hover:border-gray-500"
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
      {/* Location Filter - Desktop */}
      {filters.country === "Georgia" && (
        <div className="space-y-2">
          <Label>Locations (Cities)</Label>
          <ScrollArea className="h-[200px] border rounded-md p-4">
            <div className="space-y-2">
              {georgianCities.map((city) => (
                <div key={city.id} className="flex items-center gap-2">
                  <Checkbox
                    id={city.id}
                    checked={filters.cities.includes(city.id)}
                    onCheckedChange={() => handleCityToggle(city.id)}
                  />
                  <Label htmlFor={city.id}>{city.nameKa}</Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Skills/Interests Filter - Desktop */}
      {userTopSkills.length > 0 && (
        <div className="space-y-3">
          <Label className="text-base font-medium dark:text-gray-100">{INTERESTS_LABEL}</Label>
          <div className="flex flex-wrap gap-2">
            {userTopSkills.map((skill) => {
              const isSelected = filters.skills.includes(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => handleSkillToggle(skill)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-colors
                    ${
                      isSelected
                        ? "bg-gray-100 text-black hover:bg-gray-200 dark:bg-gray-100 dark:text-black dark:hover:bg-gray-200"
                        : "bg-white text-gray-900 border border-gray-300 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:hover:border-gray-500"
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

      {/* Remote Filter */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="remote"
          checked={filters.isRemote}
          onCheckedChange={(checked) =>
            onFiltersChange({ 
              ...filters, 
              isRemote: !!checked,
              cities: filters.cities || [],
              datePosted: filters.datePosted || "all",
              skills: filters.skills || [],
            })
          }
        />
        <Label htmlFor="remote">Remote Jobs Only</Label>
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
  userTopSkills = [],
}) => {
  const isMobile = useMobile();
  const [showWorkTypePicker, setShowWorkTypePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const handleWorkTypeChange = (workTypes: string[]) => {
    onFiltersChange({
      ...filters,
      jobTypes: workTypes.length === 0 ? ["FULLTIME"] : workTypes,
      cities: filters.cities || [],
      datePosted: filters.datePosted || "all",
      skills: filters.skills || [],
    });
  };

  const handleLocationChange = (cities: string[]) => {
    onFiltersChange({
      ...filters,
      cities: cities,
      datePosted: filters.datePosted || "all",
      skills: filters.skills || [],
    });
  };

  const handleSkillsChange = (skills: string[]) => {
    onFiltersChange({
      ...filters,
      skills: skills,
      cities: filters.cities || [],
      datePosted: filters.datePosted || "all",
    });
  };

  // Reset picker states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowWorkTypePicker(false);
      setShowLocationPicker(false);
    }
  }, [isOpen]);

  if (isMobile) {
    // Work Type Picker View
    if (showWorkTypePicker) {
      return (
        <Drawer open={isOpen} onOpenChange={(open) => {
          if (!open) {
            setShowWorkTypePicker(false);
            onClose();
          }
        }}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="border-b">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full -ml-2"
                  onClick={() => setShowWorkTypePicker(false)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <DrawerTitle>{WORK_TYPE_LABEL_KA}</DrawerTitle>
              </div>
            </DrawerHeader>
            <ScrollArea className="flex-1 px-4">
              <div className="py-4 space-y-3">
                {jobTypes.map((type) => {
                  const isChecked = filters.jobTypes.includes(type);
                  return (
                    <div
                      key={type}
                      className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 cursor-pointer"
                      onClick={() => {
                        const newTypes = isChecked
                          ? filters.jobTypes.filter((t) => t !== type)
                          : [...filters.jobTypes, type];
                        handleWorkTypeChange(newTypes);
                      }}
                    >
                      <Label htmlFor={type} className="cursor-pointer flex-1">
                        {workTypeLabels[type] || type}
                      </Label>
                      <Checkbox
                        id={type}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          const newTypes = checked
                            ? [...filters.jobTypes, type]
                            : filters.jobTypes.filter((t) => t !== type);
                          handleWorkTypeChange(newTypes);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </DrawerContent>
        </Drawer>
      );
    }

    // Location Picker View
    if (showLocationPicker) {
      return (
        <Drawer open={isOpen} onOpenChange={(open) => {
          if (!open) {
            setShowLocationPicker(false);
            onClose();
          }
        }}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="border-b">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full -ml-2"
                  onClick={() => setShowLocationPicker(false)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <DrawerTitle>{COUNTRY_LABEL_KA}</DrawerTitle>
              </div>
            </DrawerHeader>
            <ScrollArea className="flex-1 px-4">
              <div className="py-4 space-y-3">
                {georgianCities.map((city) => {
                  const isChecked = filters.cities.includes(city.id);
                  return (
                    <div
                      key={city.id}
                      className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 cursor-pointer"
                      onClick={() => {
                        const newCities = isChecked
                          ? filters.cities.filter((id) => id !== city.id)
                          : [...filters.cities, city.id];
                        handleLocationChange(newCities);
                      }}
                    >
                      <Label htmlFor={city.id} className="cursor-pointer flex-1">
                        {city.nameKa}
                      </Label>
                      <Checkbox
                        id={city.id}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          const newCities = checked
                            ? [...filters.cities, city.id]
                            : filters.cities.filter((id) => id !== city.id);
                          handleLocationChange(newCities);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
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
              <DrawerTitle className="text-xl font-bold">{SEARCH_TITLE_KA}</DrawerTitle>
            </div>
          </DrawerHeader>
          <div className="px-4 py-6 flex-1 overflow-y-auto">
            <FilterForm 
              filters={filters} 
              onFiltersChange={onFiltersChange}
              isMobile={true}
              onWorkTypeClick={() => setShowWorkTypePicker(true)}
              onLocationClick={() => setShowLocationPicker(true)}
              userTopSkills={userTopSkills}
            />
          </div>
          <DrawerFooter className="border-t pt-4 px-4 pb-6">
            <Button 
              onClick={() => {
                onApply();
                setShowWorkTypePicker(false);
                setShowLocationPicker(false);
              }}
              className="w-full bg-breneo-blue text-white hover:bg-breneo-blue/90 rounded-lg h-12 text-base font-medium"
            >
              {SAVE_BUTTON_KA}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Filter Jobs</DialogTitle>
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
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onApply}>Apply Filters</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
