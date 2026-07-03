import React, { useState, useRef, useEffect, useMemo } from "react";
import { MapPin, X, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  filterGeorgianCities,
  georgianCityLabel,
  georgianCityLabelById,
} from "@/data/georgian-cities";
import { useLanguage, useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface LocationDropdownProps {
  /** Georgian city ids (stored in filters.countries for API compat). */
  selectedLocations: string[];
  onLocationsChange: (locations: string[]) => void;
  placeholder?: string;
}

export const LocationDropdown: React.FC<LocationDropdownProps> = ({
  selectedLocations,
  onLocationsChange,
  placeholder,
}) => {
  const { language } = useLanguage();
  const t = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tempSelectedLocations, setTempSelectedLocations] =
    useState<string[]>(selectedLocations);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const placeholderText = placeholder ?? t.jobs.location;

  useEffect(() => {
    if (isOpen) {
      setTempSelectedLocations(selectedLocations);
    }
  }, [isOpen, selectedLocations]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setTempSelectedLocations(selectedLocations);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setTempSelectedLocations(selectedLocations);
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
  }, [isOpen, selectedLocations]);

  const filteredCities = useMemo(
    () => filterGeorgianCities(searchQuery, language),
    [searchQuery, language],
  );

  const handleToggleCity = (cityId: string) => {
    if (tempSelectedLocations.includes(cityId)) {
      setTempSelectedLocations(
        tempSelectedLocations.filter((id) => id !== cityId),
      );
    } else {
      setTempSelectedLocations([...tempSelectedLocations, cityId]);
    }
  };

  const handleSelectAll = () => {
    if (tempSelectedLocations.length === filteredCities.length) {
      setTempSelectedLocations([]);
    } else {
      setTempSelectedLocations(filteredCities.map((city) => city.id));
    }
  };

  const handleSave = () => {
    onLocationsChange(tempSelectedLocations);
    setIsOpen(false);
  };

  const isAllSelected =
    filteredCities.length > 0 &&
    filteredCities.every((city) => tempSelectedLocations.includes(city.id));

  const displayText = useMemo(() => {
    if (selectedLocations.length === 0) {
      return placeholderText;
    }

    if (selectedLocations.length === 1) {
      return georgianCityLabelById(selectedLocations[0], language);
    }

    if (selectedLocations.length > 3) {
      return `${selectedLocations.length} ${t.jobs.citiesSelected}`;
    }

    return selectedLocations
      .slice(0, 3)
      .map((id) => georgianCityLabelById(id, language))
      .join(", ");
  }, [selectedLocations, placeholderText, language, t.jobs.citiesSelected]);

  const isPlaceholder = selectedLocations.length === 0;

  const handleRemoveCity = (e: React.MouseEvent, cityId: string) => {
    e.stopPropagation();
    onLocationsChange(selectedLocations.filter((id) => id !== cityId));
  };

  const handleRemoveAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLocationsChange([]);
  };

  return (
    <div className="relative w-full max-w-full" ref={dropdownRef}>
      <div className="flex items-center gap-2 w-full min-w-0">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center flex-1 min-w-0 h-auto py-0 px-0 text-sm text-left bg-transparent border-0 focus:outline-none focus:ring-0",
            "transition-colors cursor-pointer hover:opacity-80 overflow-hidden",
            isPlaceholder
              ? "text-gray-400 dark:text-gray-500"
              : "text-gray-900 dark:text-gray-100",
          )}
        >
          <MapPin className="h-4 w-4 md:h-5 md:w-5 text-breneo-accent dark:text-breneo-blue flex-shrink-0 mr-2" />
          <span className="flex-1 min-w-0 truncate text-sm overflow-hidden text-ellipsis whitespace-nowrap">
            {displayText}
          </span>
        </button>
        {selectedLocations.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (selectedLocations.length === 1) {
                handleRemoveCity(e, selectedLocations[0]);
              } else {
                handleRemoveAll(e);
              }
            }}
            className="flex-shrink-0 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded ml-1 transition-all duration-200 animate-in fade-in-0 zoom-in-95"
            aria-label={
              selectedLocations.length === 1
                ? "Remove location"
                : "Remove all locations"
            }
          >
            <X className="h-4 w-4 text-gray-600 dark:text-gray-400 transition-transform duration-200 hover:scale-110" />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          className={cn(
            "absolute top-full mt-2 w-[calc(100vw-2rem)] md:w-[400px] rounded-lg shadow-lg border z-[9999] max-h-[500px] flex flex-col overflow-hidden",
            "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
            "min-w-[320px]",
            "left-0 md:right-0 md:left-auto",
          )}
        >
          <div
            className={cn(
              "flex items-center justify-between px-4 py-3 border-b",
              "border-gray-200 dark:border-gray-700",
            )}
          >
            <h3
              className={cn(
                "font-bold text-base",
                "text-gray-900 dark:text-gray-100",
              )}
            >
              {t.jobs.city}
            </h3>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                setSearchQuery("");
              }}
              className={cn(
                "p-1 rounded transition-colors",
                "hover:bg-gray-100 dark:hover:bg-gray-700",
              )}
              aria-label="Close"
            >
              <X
                className={cn("h-5 w-5", "text-gray-900 dark:text-gray-100")}
              />
            </button>
          </div>

          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder={t.jobs.searchCities}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "pl-9 pr-3 h-9 text-sm",
                  "bg-white dark:bg-gray-800",
                  "border-gray-200 dark:border-gray-700",
                  "focus-visible:outline-none focus-visible:ring-0",
                )}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {filteredCities.length > 0 && (
              <div
                className={cn(
                  "flex items-center px-4 py-3 cursor-pointer transition-colors border-b",
                  "hover:bg-gray-50 dark:hover:bg-gray-700/50",
                  "border-gray-100 dark:border-gray-700",
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
                      setTempSelectedLocations(
                        filteredCities.map((city) => city.id),
                      );
                    } else {
                      const filteredIds = filteredCities.map((c) => c.id);
                      setTempSelectedLocations(
                        tempSelectedLocations.filter(
                          (id) => !filteredIds.includes(id),
                        ),
                      );
                    }
                  }}
                  className="mr-3"
                />
                <span
                  className={cn("text-sm", "text-gray-900 dark:text-gray-100")}
                >
                  {t.jobs.selectAllCities}
                </span>
              </div>
            )}

            {filteredCities.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {t.jobs.noCitiesFound}
              </div>
            ) : (
              filteredCities.map((city) => {
                const isChecked = tempSelectedLocations.includes(city.id);
                return (
                  <div
                    key={city.id}
                    className={cn(
                      "flex items-center px-4 py-2.5 cursor-pointer transition-colors",
                      "hover:bg-gray-50 dark:hover:bg-gray-700/50",
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
                          setTempSelectedLocations([
                            ...tempSelectedLocations,
                            city.id,
                          ]);
                        } else {
                          setTempSelectedLocations(
                            tempSelectedLocations.filter((id) => id !== city.id),
                          );
                        }
                      }}
                      className="mr-3"
                    />
                    <span
                      className={cn(
                        "text-sm flex-1",
                        "text-gray-900 dark:text-gray-100",
                      )}
                    >
                      {georgianCityLabel(city, language)}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800 sticky bottom-0 z-10">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
              className="w-full"
            >
              {t.common.save}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
