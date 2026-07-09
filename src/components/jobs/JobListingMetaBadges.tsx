import { cn } from "@/lib/utils";

import { PLATFORM_CHIP_BADGE_CLASS } from "@/lib/chipStyles";

const defaultChipClassName = PLATFORM_CHIP_BADGE_CLASS;

function isDisplayableSalary(salary?: string): boolean {
  const trimmed = (salary ?? "").trim();
  return !!trimmed && trimmed !== "—";
}

type JobListingMetaBadgesProps = {
  employmentType?: string;
  workArrangement?: string;
  salary?: string;
  className?: string;
  chipClassName?: string;
};

export function JobListingMetaBadges({
  employmentType,
  workArrangement,
  salary,
  className,
  chipClassName = defaultChipClassName,
}: JobListingMetaBadgesProps) {
  const showSalary = isDisplayableSalary(salary);

  if (!employmentType && !workArrangement && !showSalary) {
    return null;
  }

  return (
    <div className={cn("mt-1 flex flex-wrap gap-2", className)}>
      {employmentType ? (
        <span className={chipClassName}>{employmentType}</span>
      ) : null}
      {workArrangement ? (
        <span className={chipClassName}>{workArrangement}</span>
      ) : null}
      {showSalary ? <span className={chipClassName}>{salary}</span> : null}
    </div>
  );
}
