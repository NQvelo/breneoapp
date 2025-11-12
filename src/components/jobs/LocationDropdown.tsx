import React, { useState, useRef, useEffect, useMemo } from "react";
import { MapPin, X, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { countries, Country } from "@/data/countries";
import { cn } from "@/lib/utils";

interface LocationDropdownProps {
  selectedLocations: string[]; // Array of country codes
  onLocationsChange: (locations: string[]) => void;
  placeholder?: string;
}

export const LocationDropdown: React.FC<LocationDropdownProps> = ({
  selectedLocations,
  onLocationsChange,
  placeholder = "Location",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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

  // Filter countries based on search query
  const filteredCountries = useMemo(() => {
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

  const handleToggleCountry = (countryCode: string) => {
    if (selectedLocations.includes(countryCode)) {
      onLocationsChange(selectedLocations.filter((code) => code !== countryCode));
    } else {
      onLocationsChange([...selectedLocations, countryCode]);
    }
  };

  const handleSelectAll = () => {
    if (selectedLocations.length === filteredCountries.length) {
      onLocationsChange([]);
    } else {
      onLocationsChange(filteredCountries.map((country) => country.code));
    }
  };

  const isAllSelected = filteredCountries.length > 0 && 
    filteredCountries.every((country) => selectedLocations.includes(country.code));
  
  const displayText = selectedLocations.length === 0 
    ? placeholder 
    : selectedLocations.length === 1
    ? countries.find((c) => c.code === selectedLocations[0])?.name || placeholder
    : `${selectedLocations.length} selected`;

  const isPlaceholder = selectedLocations.length === 0;

  const handleRemoveCountry = (e: React.MouseEvent, countryCode: string) => {
    e.stopPropagation();
    onLocationsChange(selectedLocations.filter((code) => code !== countryCode));
  };

  const handleRemoveAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLocationsChange([]);
  };

  return (
    <div className="relative flex-1 min-w-0" ref={dropdownRef}>
      {/* Location Input Field */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
            "flex items-center flex-1 min-w-0 h-auto py-0 px-0 text-sm text-left bg-transparent border-0 focus:outline-none focus:ring-0",
          "transition-colors cursor-pointer hover:opacity-80",
          isPlaceholder 
            ? "text-gray-400 dark:text-gray-500" 
            : "text-gray-900 dark:text-gray-100"
        )}
      >
        <MapPin className="h-4 w-4 md:h-5 md:w-5 text-breneo-accent dark:text-breneo-blue flex-shrink-0 mr-2" />
          {selectedLocations.length === 0 ? (
            <span className="flex-1 min-w-0 truncate text-sm">{placeholder}</span>
          ) : selectedLocations.length === 1 ? (
            <span className="flex items-center gap-2 flex-1 min-w-0">
              <span className="truncate text-sm">
                {countries.find((c) => c.code === selectedLocations[0])?.name || placeholder}
              </span>
              <button
                type="button"
                onClick={(e) => handleRemoveCountry(e, selectedLocations[0])}
                className="flex-shrink-0 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                aria-label="Remove location"
              >
                <X className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
              </button>
            </span>
          ) : (
            <span className="flex items-center gap-2 flex-1 min-w-0">
              <span className="truncate text-sm">{displayText}</span>
              <button
                type="button"
                onClick={(e) => handleRemoveAll(e)}
                className="flex-shrink-0 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                aria-label="Remove all locations"
              >
                <X className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
              </button>
            </span>
          )}
      </button>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className={cn(
          "absolute top-full mt-2 w-[calc(100vw-2rem)] md:w-[400px] rounded-lg shadow-lg border z-[9999] max-h-[500px] flex flex-col",
          "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
          "min-w-[320px]",
          "left-0 md:right-0 md:left-auto"
        )}>
            {/* Header with Title and Close Button */}
            <div className={cn(
              "flex items-center justify-between px-4 py-3 border-b",
              "border-gray-200 dark:border-gray-700"
            )}>
              <h3 className={cn(
                "font-bold text-base",
                "text-gray-900 dark:text-gray-100"
              )}>Countries</h3>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  setSearchQuery("");
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

            {/* Search Input */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search countries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "pl-9 pr-3 h-9 text-sm",
                    "bg-white dark:bg-gray-800",
                    "border-gray-200 dark:border-gray-700",
                    "focus-visible:ring-1 focus-visible:ring-breneo-accent"
                  )}
                />
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[350px]">
              {/* Select All Option - Only show if there are filtered results */}
              {filteredCountries.length > 0 && (
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
                        onLocationsChange(filteredCountries.map((country) => country.code));
                      } else {
                        // Remove all filtered countries from selection
                        const filteredCodes = filteredCountries.map((c) => c.code);
                        onLocationsChange(selectedLocations.filter((code) => !filteredCodes.includes(code)));
                      }
                    }}
                    className="mr-3"
                  />
                  <span className={cn(
                    "text-sm",
                    "text-gray-900 dark:text-gray-100"
                  )}>Select All</span>
                </div>
              )}

              {/* Country List */}
              {filteredCountries.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No countries found
                </div>
              ) : (
                filteredCountries.map((country) => {
                  const isChecked = selectedLocations.includes(country.code);
                  return (
                    <div
                      key={country.code}
                      className={cn(
                        "flex items-center px-4 py-2.5 cursor-pointer transition-colors",
                        "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCountry(country.code);
                      }}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            onLocationsChange([...selectedLocations, country.code]);
                          } else {
                            onLocationsChange(selectedLocations.filter((code) => code !== country.code));
                          }
                        }}
                        className="mr-3"
                      />
                      <span className={cn(
                        "text-sm flex-1",
                        "text-gray-900 dark:text-gray-100"
                      )}>{country.name}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
      )}
    </div>
  );
};

