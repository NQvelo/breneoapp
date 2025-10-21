import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";
import { CountrySelectorModal } from "./CountrySelectorModal";
import { Country } from "@/data/countries";

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

  return (
    <>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={isOpen}
        className={`justify-between ${className}`}
        onClick={() => setIsOpen(true)}
      >
        {value ? (
          <div className="flex items-center gap-2">
            <span className="text-lg">{value.flag}</span>
            <span>{value.dial_code}</span>
          </div>
        ) : (
          placeholder
        )}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      <CountrySelectorModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelect={onChange}
        selectedCountry={value}
      />
    </>
  );
};
