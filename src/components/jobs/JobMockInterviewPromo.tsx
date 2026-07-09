import React from "react";
import { Sparkles, UserRound, Video } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { JobStartAiInterviewButton } from "@/components/jobs/JobStartAiInterviewButton";

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
        "overflow-hidden rounded-3xl bg-white p-6 dark:bg-card",
        "shadow-[0_0_0_1px_rgba(99,102,241,0.14),0_4px_16px_-2px_rgba(56,189,248,0.18),0_12px_32px_-4px_rgba(99,102,241,0.14),0_20px_48px_-8px_rgba(168,85,247,0.12)]",
        "dark:shadow-[0_0_0_1px_rgba(129,140,248,0.2),0_4px_16px_-2px_rgba(56,189,248,0.12),0_12px_32px_-4px_rgba(99,102,241,0.18),0_20px_48px_-8px_rgba(168,85,247,0.15)]",
        className,
      )}
    >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative mx-auto flex h-36 w-full max-w-[220px] shrink-0 items-center justify-center sm:mx-0 sm:h-40 sm:w-44">
            <div className="absolute inset-0 rounded-2xl bg-[#202124]/95 shadow-lg ring-1 ring-white/10" />
            <div className="relative z-10 grid h-full w-full grid-cols-2 gap-1.5 p-2.5">
              <div className="relative flex flex-col items-center justify-end rounded-lg bg-[#3c4043] pb-1.5 pt-3">
                <UserRound className="h-7 w-7 text-white/80" />
                <span className="mt-1 rounded bg-black/50 px-1 text-[8px] text-white/80">
                  HR
                </span>
              </div>
              <div className="relative flex flex-col items-center justify-end rounded-lg bg-[#3c4043] pb-1.5 pt-3 ring-1 ring-sky-400/40">
                <Video className="h-6 w-6 text-sky-300" />
                <span className="mt-1 rounded bg-black/50 px-1 text-[8px] text-white/80">
                  You
                </span>
              </div>
            </div>
            <div className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#1a1a1a] px-2 py-1 shadow-md ring-1 ring-white/10">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-[9px] font-medium text-white/80">
                AI Mock
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">
              <Sparkles className="h-3 w-3" />
              {t.mockInterview.badge}
            </div>
            <h3 className="text-base font-semibold text-foreground sm:text-lg">
              {t.mockInterview.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t.mockInterview.description}
            </p>
            <p className="mt-1 text-xs text-muted-foreground/90">
              {t.mockInterview.roleHint.replace("{role}", jobTitle)}
            </p>
            <JobStartAiInterviewButton
              jobTitle={jobTitle}
              jobId={jobId}
              className="mt-4"
            />
          </div>
        </div>
    </div>
  );
}
