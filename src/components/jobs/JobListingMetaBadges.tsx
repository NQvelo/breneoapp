import { cn } from "@/lib/utils";

const chipClassName =
  "inline-flex items-center rounded-[10px] px-3 py-1 text-[13px] font-medium bg-breneo-blue/10 text-gray-800 dark:bg-breneo-blue/15 dark:text-gray-100";

function isDisplayableSalary(salary?: string): boolean {
  const trimmed = (salary ?? "").trim();
  return !!trimmed && trimmed !== "—";
}

type JobListingMetaBadgesProps = {
  employmentType?: string;
  workArrangement?: string;
  salary?: string;
  className?: string;
};

export function JobListingMetaBadges({
  employmentType,
  workArrangement,
  salary,
  className,
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
