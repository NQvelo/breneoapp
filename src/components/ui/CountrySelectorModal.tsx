import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMobile } from "@/hooks/use-mobile";
import { Search, X } from "lucide-react";
import { countries, Country } from "@/data/countries";

interface CountrySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (country: Country) => void;
  selectedCountry?: Country;
}

const CountryList: React.FC<{
  countries: Country[];
  onSelect: (country: Country) => void;
  selectedCountry?: Country;
}> = ({ countries, onSelect, selectedCountry }) => {
  return (
    <div className="space-y-1">
      {countries.map((country) => (
        <button
          key={country.code}
          onClick={() => onSelect(country)}
          className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-3 ${
            selectedCountry?.code === country.code
              ? "bg-primary/10 text-primary"
              : ""
          }`}
        >
          <span className="text-lg">{country.flag}</span>
          <div className="flex-1">
            <div className="font-medium">{country.name}</div>
            <div className="text-sm text-muted-foreground">
              {country.dial_code}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export const CountrySelectorModal: React.FC<CountrySelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedCountry,
}) => {
  const isMobile = useMobile();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCountries = useMemo(() => {
    if (!searchTerm) return countries;
    return countries.filter((country) =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const handleSelect = (country: Country) => {
    onSelect(country);
    onClose();
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="h-[85vh]">
          <DrawerHeader className="pb-4">
            <DrawerTitle>Select Country</DrawerTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search countries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSearch}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full px-4">
              <CountryList
                countries={filteredCountries}
                onSelect={handleSelect}
                selectedCountry={selectedCountry}
              />
            </ScrollArea>
          </div>
          <div className="p-4 border-t">
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                Cancel
              </Button>
            </DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Country</DialogTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search countries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className="overflow-hidden">
          <ScrollArea className="h-[400px]">
            <CountryList
              countries={filteredCountries}
              onSelect={handleSelect}
              selectedCountry={selectedCountry}
            />
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
