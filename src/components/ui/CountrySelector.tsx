import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";
import { CountrySelectorModal } from "./CountrySelectorModal";
import { Country, countries } from "@/data/countries";

interface CountrySelectorProps {
  value?: Country;
  onChange: (country: Country) => void;
  placeholder?: string;
  className?: string;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({
  value,
  onChange,
  placeholder = "Select country",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Default to Georgia if no value is provided
  const defaultCountry = countries.find((country) => country.code === "GE");
  const selectedCountry = value || defaultCountry;

  return (
    <>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={isOpen}
        className={`justify-between shrink-0 ${className}`}
        onClick={() => setIsOpen(true)}
      >
        {selectedCountry ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-lg shrink-0">{selectedCountry.flag}</span>
            <span className="text-muted-foreground whitespace-nowrap">{selectedCountry.dial_code}</span>
          </div>
        ) : (
          placeholder
        )}
        <ChevronsUpDown className="ml-1.5 h-4 w-4 shrink-0 opacity-50 text-muted-foreground" />
      </Button>

      <CountrySelectorModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelect={onChange}
        selectedCountry={selectedCountry}
      />
    </>
  );
};
