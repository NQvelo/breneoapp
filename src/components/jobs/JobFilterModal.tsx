import React from "react";
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

const jobTypes = ["FULLTIME", "PARTTIME", "CONTRACTOR", "INTERN"];

interface JobFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    country: string;
    jobTypes: string[];
    isRemote: boolean;
  };
  onFiltersChange: (newFilters: {
    country: string;
    jobTypes: string[];
    isRemote: boolean;
  }) => void;
  onApply: () => void;
}

const FilterForm: React.FC<
  Omit<JobFilterModalProps, "isOpen" | "onClose" | "onApply">
> = ({ filters, onFiltersChange }) => {
  const handleJobTypeChange = (type: string) => {
    const newJobTypes = filters.jobTypes.includes(type)
      ? filters.jobTypes.filter((t) => t !== type)
      : [...filters.jobTypes, type];
    onFiltersChange({ ...filters, jobTypes: newJobTypes });
  };

  return (
    <div className="space-y-6">
      {/* Country Filter */}
      <div className="space-y-2">
        <Label>Country</Label>
        <Select
          value={filters.country}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, country: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {countries.map((country) => (
              <SelectItem key={country.code} value={country.name}>
                {country.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Job Type Filter */}
      <div className="space-y-2">
        <Label>Job Type</Label>
        <div className="grid grid-cols-2 gap-4">
          {jobTypes.map((type) => (
            <div key={type} className="flex items-center gap-2">
              <Checkbox
                id={type}
                checked={filters.jobTypes.includes(type)}
                onCheckedChange={() => handleJobTypeChange(type)}
              />
              <Label htmlFor={type} className="capitalize">
                {type.toLowerCase().replace("_", "-")}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Remote Filter */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="remote"
          checked={filters.isRemote}
          onCheckedChange={(checked) =>
            onFiltersChange({ ...filters, isRemote: !!checked })
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
}) => {
  const isMobile = useMobile();

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Filter Jobs</DrawerTitle>
          </DrawerHeader>
          <div className="px-4">
            <ScrollArea className="h-[60vh]">
              <FilterForm filters={filters} onFiltersChange={onFiltersChange} />
            </ScrollArea>
          </div>
          <DrawerFooter className="pt-4">
            <Button onClick={onApply}>Apply Filters</Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
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
          <FilterForm filters={filters} onFiltersChange={onFiltersChange} />
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
