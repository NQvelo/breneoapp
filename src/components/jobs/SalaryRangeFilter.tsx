import React, { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface SalaryRangeFilterProps {
  minSalary: number;
  maxSalary: number;
  salaryMin?: number;
  salaryMax?: number;
  salaryByAgreement?: boolean;
  onSalaryChange: (min: number | undefined, max: number | undefined, byAgreement: boolean) => void;
}

// Generate histogram data (mock distribution for visualization)
const generateHistogramData = (min: number, max: number, bins: number = 20): number[] => {
  const binSize = (max - min) / bins;
  const data: number[] = [];
  
  // Create a distribution that's denser on the left (lower salaries more common)
  for (let i = 0; i < bins; i++) {
    const binStart = min + i * binSize;
    // Higher frequency for lower values (exponential decay)
    const frequency = Math.exp(-i * 0.15) * 100;
    data.push(Math.max(5, Math.min(100, frequency))); // Clamp between 5 and 100
  }
  
  return data;
};

export const SalaryRangeFilter: React.FC<SalaryRangeFilterProps> = ({
  minSalary,
  maxSalary,
  salaryMin = minSalary,
  salaryMax = maxSalary,
  salaryByAgreement = false,
  onSalaryChange,
}) => {
  const [localMin, setLocalMin] = useState<number>(salaryMin ?? minSalary);
  const [localMax, setLocalMax] = useState<number>(salaryMax ?? maxSalary);
  const [localByAgreement, setLocalByAgreement] = useState<boolean>(salaryByAgreement);
  
  const histogramData = generateHistogramData(minSalary, maxSalary, 20);
  const maxHistogramHeight = Math.max(...histogramData);

  useEffect(() => {
    setLocalMin(salaryMin ?? minSalary);
    setLocalMax(salaryMax ?? maxSalary);
    setLocalByAgreement(salaryByAgreement ?? false);
  }, [salaryMin, salaryMax, salaryByAgreement, minSalary, maxSalary]);

  const handleSliderChange = (values: number[]) => {
    const [min, max] = values;
    setLocalMin(min);
    setLocalMax(max);
    onSalaryChange(min === minSalary ? undefined : min, max === maxSalary ? undefined : max, localByAgreement);
  };

  const handleMinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || minSalary;
    const clampedValue = Math.max(minSalary, Math.min(value, localMax));
    setLocalMin(clampedValue);
    onSalaryChange(clampedValue === minSalary ? undefined : clampedValue, localMax === maxSalary ? undefined : localMax, localByAgreement);
  };

  const handleMaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || maxSalary;
    const clampedValue = Math.min(maxSalary, Math.max(value, localMin));
    setLocalMax(clampedValue);
    onSalaryChange(localMin === minSalary ? undefined : localMin, clampedValue === maxSalary ? undefined : clampedValue, localByAgreement);
  };

  const handleByAgreementChange = (checked: boolean) => {
    setLocalByAgreement(checked);
    onSalaryChange(localMin === minSalary ? undefined : localMin, localMax === maxSalary ? undefined : localMax, checked);
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <h3 className="text-base font-medium text-center text-gray-900 dark:text-gray-100">
        ხელფასის დიაპაზონი
      </h3>

      {/* Histogram */}
      <div className="relative h-16 flex items-end justify-between gap-0.5 px-1">
        {histogramData.map((height, index) => {
          const barHeight = (height / maxHistogramHeight) * 100;
          const binStart = minSalary + (index * (maxSalary - minSalary) / histogramData.length);
          const binEnd = minSalary + ((index + 1) * (maxSalary - minSalary) / histogramData.length);
          const isInRange = binStart >= localMin && binEnd <= localMax;
          
          return (
            <div
              key={index}
              className="flex-1 bg-gray-900 dark:bg-gray-200 transition-opacity"
              style={{
                height: `${barHeight}%`,
                minHeight: '4px',
                opacity: isInRange ? 1 : 0.3,
              }}
            />
          );
        })}
      </div>

      {/* Range Slider */}
      <div className="px-2">
        <Slider
          value={[localMin, localMax]}
          onValueChange={handleSliderChange}
          min={minSalary}
          max={maxSalary}
          step={100}
          className="w-full"
        />
      </div>

      {/* Input Fields */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="salary-min" className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
            მინიმუმი
          </Label>
          <Input
            id="salary-min"
            type="number"
            value={localMin}
            onChange={handleMinInputChange}
            min={minSalary}
            max={localMax}
            className="h-10"
          />
        </div>
        <div className="pb-2.5">
          <span className="text-gray-400 dark:text-gray-400">-</span>
        </div>
        <div className="flex-1">
          <Label htmlFor="salary-max" className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
            მაქსიმუმი
          </Label>
          <Input
            id="salary-max"
            type="number"
            value={localMax}
            onChange={handleMaxInputChange}
            min={localMin}
            max={maxSalary}
            className="h-10"
          />
        </div>
      </div>

      {/* By Agreement Checkbox */}
      <div className="flex items-center space-x-2 pt-2">
        <Checkbox
          id="salary-by-agreement"
          checked={localByAgreement}
          onCheckedChange={handleByAgreementChange}
        />
        <Label
          htmlFor="salary-by-agreement"
          className="text-sm font-normal cursor-pointer text-gray-900 dark:text-gray-100"
        >
          შეთანხმებით
        </Label>
      </div>
    </div>
  );
};

