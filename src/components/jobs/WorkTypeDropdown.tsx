import React, { useState, useRef, useEffect } from "react";
import { Users, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface WorkType {
  id: string;
  label: string;
}

const workTypes: WorkType[] = [
  { id: "FULLTIME", label: "Full Time" },
  { id: "PARTTIME", label: "Part Time" },
  { id: "CONTRACTOR", label: "Contractor" },
  { id: "INTERN", label: "Intern" },
];

interface WorkTypeDropdownProps {
  selectedWorkTypes: string[];
  onWorkTypesChange: (workTypes: string[]) => void;
  placeholder?: string;
  isRemote?: boolean;
  onRemoteChange?: (isRemote: boolean) => void;
}

export const WorkTypeDropdown: React.FC<WorkTypeDropdownProps> = ({
  selectedWorkTypes,
  onWorkTypesChange,
  placeholder = "Work types",
  isRemote = false,
  onRemoteChange,
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

  const handleToggleWorkType = (workTypeId: string) => {
    if (selectedWorkTypes.includes(workTypeId)) {
      onWorkTypesChange(selectedWorkTypes.filter((id) => id !== workTypeId));
    } else {
      onWorkTypesChange([...selectedWorkTypes, workTypeId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedWorkTypes.length === workTypes.length) {
      onWorkTypesChange([]);
    } else {
      onWorkTypesChange(workTypes.map((type) => type.id));
    }
  };

  const isAllSelected = selectedWorkTypes.length === workTypes.length;
  const displayText = selectedWorkTypes.length === 0 
    ? placeholder 
    : selectedWorkTypes.length === 1
    ? workTypes.find((t) => t.id === selectedWorkTypes[0])?.label || placeholder
    : `${selectedWorkTypes.length} selected`;

  const isPlaceholder = selectedWorkTypes.length === 0;

  const handleRemoveWorkType = (e: React.MouseEvent, workTypeId: string) => {
    e.stopPropagation();
    const newWorkTypes = selectedWorkTypes.filter((id) => id !== workTypeId);
    onWorkTypesChange(newWorkTypes);
  };

  const handleRemoveAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onWorkTypesChange([]);
  };

  return (
    <div className="relative flex-1 min-w-0" ref={dropdownRef}>
      {/* Work Type Input Field */}
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
          <Users className="h-4 w-4 md:h-5 md:w-5 text-breneo-accent flex-shrink-0 mr-2" />
          {selectedWorkTypes.length === 0 ? (
            <span className="flex-1 min-w-0 truncate text-sm">{placeholder}</span>
          ) : selectedWorkTypes.length === 1 ? (
            <span className="flex items-center gap-2 flex-1 min-w-0">
              <span className="truncate text-sm">
                {workTypes.find((t) => t.id === selectedWorkTypes[0])?.label || placeholder}
          </span>
                  <button
                    type="button"
                onClick={(e) => handleRemoveWorkType(e, selectedWorkTypes[0])}
                className="flex-shrink-0 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                aria-label="Remove work type"
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
                aria-label="Remove all work types"
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
          "absolute top-full left-0 mt-2 w-[calc(100vw-2rem)] md:w-[320px] rounded-lg shadow-lg border z-[9999] max-h-[400px] flex flex-col",
          "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
          "min-w-[280px]"
        )}>
            {/* Header with Title and Close Button */}
            <div className={cn(
              "flex items-center justify-between px-4 py-3 border-b",
              "border-gray-200 dark:border-gray-700"
            )}>
              <h3 className={cn(
                "font-bold text-base",
                "text-gray-900 dark:text-gray-100"
              )}>Work Types</h3>
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
                      onWorkTypesChange(workTypes.map((type) => type.id));
                    } else {
                      onWorkTypesChange([]);
                    }
                  }}
                  className="mr-3"
                />
                <span className={cn(
                  "text-sm",
                  "text-gray-900 dark:text-gray-100"
                )}>Select All</span>
              </div>

              {/* Work Type List */}
              {workTypes.map((workType) => {
                const isChecked = selectedWorkTypes.includes(workType.id);
                return (
                  <div
                    key={workType.id}
                    className={cn(
                      "flex items-center px-4 py-3 cursor-pointer transition-colors",
                      "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleWorkType(workType.id);
                    }}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          onWorkTypesChange([...selectedWorkTypes, workType.id]);
                        } else {
                          onWorkTypesChange(selectedWorkTypes.filter((id) => id !== workType.id));
                        }
                      }}
                      className="mr-3"
                    />
                    <span className={cn(
                      "text-sm",
                      "text-gray-900 dark:text-gray-100"
                    )}>{workType.label}</span>
                  </div>
                );
              })}

              {/* Remote Jobs Only - Separated with border */}
              {onRemoteChange && (
                <>
                  <div className={cn(
                    "border-t",
                    "border-gray-100 dark:border-gray-700"
                  )} />
                  <div
                    className={cn(
                      "flex items-center px-4 py-3 cursor-pointer transition-colors",
                      "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoteChange(!isRemote);
                    }}
                  >
                    <Checkbox
                      checked={isRemote}
                      onCheckedChange={(checked) => {
                        onRemoteChange(!!checked);
                      }}
                      className="mr-3"
                    />
                    <span className={cn(
                      "text-sm",
                      "text-gray-900 dark:text-gray-100"
                    )}>Remote Jobs Only</span>
                  </div>
                </>
              )}
            </div>
          </div>
      )}
    </div>
  );
};

