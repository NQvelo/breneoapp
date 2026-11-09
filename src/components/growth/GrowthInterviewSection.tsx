import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/api/profile";
import { JobAiInterviewIllustration } from "@/components/jobs/JobAiInterviewHeaderBox";
import { JobStartAiInterviewButton } from "@/components/jobs/JobStartAiInterviewButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/contexts/LanguageContext";
import { useMobile } from "@/hooks/use-mobile";
import {
  matchInterviewRoles,
  type CvInterviewSignals,
} from "@/utils/interviewRoleMatch";

async function fetchCvInterviewSignals(): Promise<CvInterviewSignals> {
  const [skills, experiences] = await Promise.all([
    profileApi.getMySkills().catch(() => []),
    profileApi.getWorkExperiences().catch(() => []),
  ]);

  return {
    skills: skills.map((skill) => skill.skill_name).filter(Boolean),
    jobTitles: experiences
      .map((experience) => experience.job_title)
      .filter(Boolean),
  };
}

function HowItWorksSteps() {
  const t = useTranslation();
  const steps = [
    t.courses.howItWorksStep1,
    t.courses.howItWorksStep2,
    t.courses.howItWorksStep3,
  ];

  return (
    <ol className="space-y-5">
      {steps.map((step, index) => (
        <li key={step} className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-breneo-blue/10 text-sm font-bold text-breneo-blue">
            {index + 1}
          </span>
          <p className="pt-1 text-[15px] leading-relaxed text-foreground">
            {step}
          </p>
        </li>
      ))}
    </ol>
  );
}

function HowItWorksModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslation();
  const isMobile = useMobile();
  const closeButtonClass =
    "h-12 w-full rounded-full bg-breneo-blue text-base font-semibold text-white hover:bg-breneo-blue/90";

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="border-none bg-white dark:bg-[#242424]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-center text-xl font-bold text-foreground">
              {t.courses.howItWorks}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-6 pb-2 pt-2">
            <HowItWorksSteps />
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button className={closeButtonClass}>{t.courses.howItWorksGotIt}</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-none bg-white p-6 dark:bg-[#242424] sm:rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-foreground">
            {t.courses.howItWorks}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <HowItWorksSteps />
        </div>
        <Button
          type="button"
          onClick={() => onOpenChange(false)}
          className={closeButtonClass}
        >
          {t.courses.howItWorksGotIt}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function GrowthInterviewSection() {
  const t = useTranslation();
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const { data: cvSignals, isLoading } = useQuery({
    queryKey: ["growthInterviewCv"],
    queryFn: fetchCvInterviewSignals,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const interviews = cvSignals ? matchInterviewRoles(cvSignals) : [];

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-bold">{t.courses.interviews}</h2>
        {!isLoading ? (
          <span className="text-sm text-gray-600">{interviews.length}</span>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="self-start overflow-hidden rounded-3xl bg-white divide-y divide-gray-200 dark:bg-[#242424] dark:divide-gray-700">
          {isLoading ? (
            [...Array(4)].map((_, index) => (
              <div key={index} className="px-4 py-3 md:px-5">
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))
          ) : interviews.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              {t.courses.noMatchingInterviews}
            </p>
          ) : (
            interviews.map((roleId) => {
              const title = t.courses.interviewRoles[roleId];
              return (
                <div
                  key={roleId}
                  className="flex items-center gap-3 px-4 py-3 md:px-5"
                >
                  <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {title}
                  </h3>
                  <JobStartAiInterviewButton
                    jobTitle={title}
                    label={t.courses.startInterview}
                    showIcon={false}
                    className="shrink-0"
                  />
                </div>
              );
            })
          )}
        </div>
        <div className="flex h-full min-h-[220px] flex-col rounded-3xl bg-gradient-to-br from-white via-white to-breneo-blue/15 p-5 dark:from-[#242424] dark:via-[#242424] dark:to-breneo-blue/20 md:p-6">
          <div className="mx-auto w-4/5 max-w-xs overflow-hidden rounded-2xl">
            <JobAiInterviewIllustration />
          </div>
          <p className="mt-5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            {t.courses.interviewDescription}
          </p>
          <div className="mt-auto pt-6">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setHowItWorksOpen(true)}
              className="bg-[#E6E7EB] text-black hover:bg-[#E6E7EB]/90 dark:bg-[#4A4A4A] dark:text-white dark:hover:bg-[#4A4A4A]/90"
            >
              {t.courses.howItWorks}
            </Button>
          </div>
        </div>
      </div>
      <HowItWorksModal
        open={howItWorksOpen}
        onOpenChange={setHowItWorksOpen}
      />
    </section>
  );
}
