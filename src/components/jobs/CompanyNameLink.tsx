import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { companyPagePath } from "@/utils/companyPagePath";

type CompanyNameLinkProps = {
  name: string;
  className?: string;
  /** Single-line ellipsis. Turn off for the full company title. */
  truncate?: boolean;
};

/** Company name that opens that company's page. Stops the parent job card click. */
export function CompanyNameLink({
  name,
  className,
  truncate = true,
}: CompanyNameLinkProps) {
  const navigate = useNavigate();
  const label = name.trim();
  if (!label) return null;

  return (
    <button
      type="button"
      className={cn(
        "inline-block max-w-full border-0 bg-transparent p-0 text-left font-[inherit] text-inherit cursor-pointer hover:underline underline-offset-2",
        truncate ? "truncate" : "whitespace-normal break-words",
        className,
      )}
      aria-label={`View ${label}`}
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        navigate(companyPagePath(label));
      }}
    >
      {label}
    </button>
  );
}
