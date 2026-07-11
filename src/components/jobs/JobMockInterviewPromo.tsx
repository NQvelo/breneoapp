import React from "react";
import { useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { JobStartAiInterviewButton } from "@/components/jobs/JobStartAiInterviewButton";
import { JobAiInterviewIllustration } from "@/components/jobs/JobAiInterviewHeaderBox";

interface JobMockInterviewPromoProps {
  jobTitle: string;
  jobId: string | number;
  className?: string;
}

export function JobMockInterviewPromo({
  jobTitle,
  jobId,
  className,
}: JobMockInterviewPromoProps) {
  const t = useTranslation();

  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border-0 bg-white p-6 shadow-none dark:bg-card",
        className,
      )}
    >
      <div className="pointer-events-none flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative mx-auto w-full max-w-[440px] shrink-0 overflow-hidden rounded-2xl sm:mx-0 sm:w-80 sm:max-w-none md:w-96">
          <JobAiInterviewIllustration />
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h3 className="text-sm font-semibold leading-tight text-foreground sm:text-base">
            {t.mockInterview.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground sm:text-sm">
            {t.mockInterview.description}
          </p>
          <p className="mt-2 line-clamp-1 text-[12px] leading-snug text-muted-foreground/90 sm:text-xs">
            {t.mockInterview.roleHint.replace("{role}", jobTitle)}
          </p>
          <div className="pointer-events-auto mt-4 flex justify-center sm:justify-start">
            <JobStartAiInterviewButton
              jobTitle={jobTitle}
              jobId={jobId}
              label={t.mockInterview.startButton}
              showIcon={false}
              className="w-full sm:w-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
