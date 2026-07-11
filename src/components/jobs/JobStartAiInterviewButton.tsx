import React from "react";
import { Crown } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useTranslation } from "@/contexts/LanguageContext";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { cn } from "@/lib/utils";
import { buildAiInterviewStartPath } from "@/components/jobs/JobAiInterviewHeaderBox";

interface JobStartAiInterviewButtonProps {
  jobTitle: string;
  jobId: string | number;
  size?: ButtonProps["size"];
  className?: string;
  label?: string;
  showIcon?: boolean;
}

export function JobStartAiInterviewButton({
  jobTitle,
  jobId,
  size = "sm",
  className,
  label,
  showIcon = true,
}: JobStartAiInterviewButtonProps) {
  const t = useTranslation();
  const navigate = useLocalizedNavigate();

  const handleStart = () => {
    navigate(buildAiInterviewStartPath(jobTitle, jobId));
  };

  return (
    <Button
      variant="secondary"
      size={size}
      onClick={handleStart}
      className={cn(
        "whitespace-nowrap bg-[#E6E7EB] text-black hover:bg-[#E6E7EB]/90 dark:bg-[#4A4A4A] dark:text-white dark:hover:bg-[#4A4A4A]/90",
        className,
      )}
    >
      {showIcon ? <Crown className="h-4 w-4 text-amber-500" /> : null}
      {label ?? t.mockInterview.headerButton}
    </Button>
  );
}
