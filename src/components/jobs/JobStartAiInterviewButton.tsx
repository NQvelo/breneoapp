import React from "react";
import { Crown } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useTranslation } from "@/contexts/LanguageContext";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { cn } from "@/lib/utils";

interface JobStartAiInterviewButtonProps {
  jobTitle: string;
  jobId: string | number;
  size?: ButtonProps["size"];
  className?: string;
}

export function JobStartAiInterviewButton({
  jobTitle,
  jobId,
  size = "sm",
  className,
}: JobStartAiInterviewButtonProps) {
  const t = useTranslation();
  const navigate = useLocalizedNavigate();

  const handleStart = () => {
    const params = new URLSearchParams({
      job_id: String(jobId),
      position: jobTitle,
      return: window.location.pathname + window.location.search,
    });
    navigate(`/interviews?${params.toString()}`);
  };

  return (
    <Button
      variant="secondary"
      size={size}
      onClick={handleStart}
      className={cn(
        "whitespace-nowrap dark:bg-[#181818] dark:hover:bg-[#252525]",
        className,
      )}
    >
      <Crown className="h-4 w-4 text-amber-500" />
      {t.mockInterview.headerButton}
    </Button>
  );
}
