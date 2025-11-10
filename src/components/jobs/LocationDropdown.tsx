import React, { useState, useRef, useEffect } from "react";
import { MapPin, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { georgianCities, GEORGIA_NAME_KA, LOCATION_LABEL_KA, SELECT_ALL_KA } from "@/data/georgian-cities";
import { cn } from "@/lib/utils";

interface LocationDropdownProps {
  selectedLocations: string[];
  onLocationsChange: (locations: string[]) => void;
  placeholder?: string;
}

export const LocationDropdown: React.FC<LocationDropdownProps> = ({
  selectedLocations,
  onLocationsChange,
  placeholder = LOCATION_LABEL_KA,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleToggleCity = (cityId: string) => {
    if (selectedLocations.includes(cityId)) {
      onLocationsChange(selectedLocations.filter((id) => id !== cityId));
    } else {
      onLocationsChange([...selectedLocations, cityId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedLocations.length === georgianCities.length) {
      onLocationsChange([]);
    } else {
      onLocationsChange(georgianCities.map((city) => city.id));
    }
  };

  const isAllSelected = selectedLocations.length === georgianCities.length;
  const displayText = selectedLocations.length === 0 
    ? placeholder 
    : selectedLocations.length === 1
    ? georgianCities.find((c) => c.id === selectedLocations[0])?.nameKa || placeholder
    : `${selectedLocations.length} არჩეული`;

  const isPlaceholder = selectedLocations.length === 0;

  return (
    <div className="relative flex-1 min-w-0" ref={dropdownRef}>
      {/* Location Input Field */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center w-full h-auto py-0 px-0 text-sm text-left bg-transparent border-0 focus:outline-none focus:ring-0",
          "transition-colors cursor-pointer hover:opacity-80",
          isPlaceholder 
            ? "text-gray-400" 
            : "text-gray-900"
        )}
      >
        <MapPin className="h-4 w-4 md:h-5 md:w-5 text-breneo-accent flex-shrink-0 mr-2" />
        <span className="flex-1 min-w-0 truncate text-sm">{displayText}</span>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className={cn(
          "absolute top-full mt-2 w-[calc(100vw-2rem)] md:w-[320px] rounded-lg shadow-lg border z-[9999] max-h-[400px] flex flex-col",
          "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
          "min-w-[280px]",
          "left-0 md:right-0 md:left-auto"
        )}>
            {/* Header with Country Name and Close Button */}
            <div className={cn(
              "flex items-center justify-between px-4 py-3 border-b",
              "border-gray-200 dark:border-gray-700"
            )}>
              <h3 className={cn(
                "font-bold text-base",
                "text-gray-900 dark:text-gray-100"
              )}>{GEORGIA_NAME_KA}</h3>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className={cn(
                  "p-1 rounded transition-colors",
                  "hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
                aria-label="Close"
              >
                <X className={cn(
                  "h-5 w-5",
                  "text-gray-900 dark:text-gray-100"
                )} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[320px]">
              {/* Select All Option */}
              <div
                className={cn(
                  "flex items-center px-4 py-3 cursor-pointer transition-colors border-b",
                  "hover:bg-gray-50 dark:hover:bg-gray-700/50",
                  "border-gray-100 dark:border-gray-700"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectAll();
                }}
              >
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onLocationsChange(georgianCities.map((city) => city.id));
                    } else {
                      onLocationsChange([]);
                    }
                  }}
                  className="mr-3"
                />
                <span className={cn(
                  "text-sm",
                  "text-gray-900 dark:text-gray-100"
                )}>{SELECT_ALL_KA}</span>
              </div>

              {/* City List */}
              {georgianCities.map((city) => {
                const isChecked = selectedLocations.includes(city.id);
                return (
                  <div
                    key={city.id}
                    className={cn(
                      "flex items-center px-4 py-3 cursor-pointer transition-colors",
                      "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleCity(city.id);
                    }}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          onLocationsChange([...selectedLocations, city.id]);
                        } else {
                          onLocationsChange(selectedLocations.filter((id) => id !== city.id));
                        }
                      }}
                      className="mr-3"
                    />
                    <span className={cn(
                      "text-sm",
                      "text-gray-900 dark:text-gray-100"
                    )}>{city.nameKa}</span>
                  </div>
                );
              })}
            </div>
          </div>
      )}
    </div>
  );
};

