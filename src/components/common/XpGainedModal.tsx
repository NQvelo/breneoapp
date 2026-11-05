import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import {
  useUserXp,
  XP_PER_COURSE_ENROLLMENT,
  XP_PER_JOB_APPLICATION,
} from "@/hooks/useUserXp";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Briefcase, GraduationCap, Zap } from "@/components/icons";

const STORAGE_KEY_PREFIX = "xp_last_seen_counts";

interface XpCounts {
  jobApplicationsCount: number;
  courseEnrollmentsCount: number;
}

const readCounts = (key: string): XpCounts | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<XpCounts>;
    if (
      typeof parsed.jobApplicationsCount !== "number" ||
      typeof parsed.courseEnrollmentsCount !== "number"
    ) {
      return null;
    }
    return parsed as XpCounts;
  } catch {
    return null;
  }
};

const writeCounts = (key: string, counts: XpCounts) => {
  try {
    localStorage.setItem(key, JSON.stringify(counts));
  } catch {
    /* ignore */
  }
};

/**
 * Tells job seekers when they earn XP. The last counts the user has been told about
 * are kept per user in localStorage, so a gain is shown once, including gains made
 * on another device. The first load only records a baseline, so existing XP is not announced.
 */
export function XpGainedModal() {
  const { user } = useAuth();
  const t = useTranslation();
  const [gained, setGained] = useState<XpCounts | null>(null);

  const isEmployer =
    user?.user_type === "employer" ||
    (typeof window !== "undefined" &&
      localStorage.getItem("userRole") === "employer");
  const isAcademy =
    user?.user_type === "academy" ||
    (typeof window !== "undefined" &&
      localStorage.getItem("userRole") === "academy");
  const enabled = !!user && !isEmployer && !isAcademy;

  const { xp, jobApplicationsCount, courseEnrollmentsCount, isReady } =
    useUserXp(enabled, user?.id);

  const storageKey =
    user?.id != null ? `${STORAGE_KEY_PREFIX}_${user.id}` : null;

  useEffect(() => {
    if (!enabled || !isReady || !storageKey) return;

    const current = { jobApplicationsCount, courseEnrollmentsCount };
    const seen = readCounts(storageKey);
    writeCounts(storageKey, current);
    if (!seen) return;

    const newJobs = Math.max(
      0,
      current.jobApplicationsCount - seen.jobApplicationsCount,
    );
    const newCourses = Math.max(
      0,
      current.courseEnrollmentsCount - seen.courseEnrollmentsCount,
    );
    if (newJobs === 0 && newCourses === 0) return;

    setGained((prev) => ({
      jobApplicationsCount: (prev?.jobApplicationsCount ?? 0) + newJobs,
      courseEnrollmentsCount: (prev?.courseEnrollmentsCount ?? 0) + newCourses,
    }));
  }, [
    enabled,
    isReady,
    storageKey,
    jobApplicationsCount,
    courseEnrollmentsCount,
  ]);

  if (!enabled) return null;

  const jobsXp = (gained?.jobApplicationsCount ?? 0) * XP_PER_JOB_APPLICATION;
  const coursesXp =
    (gained?.courseEnrollmentsCount ?? 0) * XP_PER_COURSE_ENROLLMENT;
  const gainedXp = jobsXp + coursesXp;

  const rows = [
    gained && gained.jobApplicationsCount > 0
      ? {
          key: "jobs",
          icon: Briefcase,
          label:
            gained.jobApplicationsCount === 1
              ? t.xpGained.jobApplication
              : t.xpGained.jobApplications.replace(
                  "{count}",
                  String(gained.jobApplicationsCount),
                ),
          xp: jobsXp,
        }
      : null,
    gained && gained.courseEnrollmentsCount > 0
      ? {
          key: "courses",
          icon: GraduationCap,
          label:
            gained.courseEnrollmentsCount === 1
              ? t.xpGained.courseEnrollment
              : t.xpGained.courseEnrollments.replace(
                  "{count}",
                  String(gained.courseEnrollmentsCount),
                ),
          xp: coursesXp,
        }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row !== null);

  return (
    <Dialog
      open={gained !== null}
      onOpenChange={(open) => {
        if (!open) setGained(null);
      }}
    >
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="sr-only">
            {t.xpGained.title.replace("{xp}", String(gainedXp))}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center px-2 py-4 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-breneo-blue/10">
            <Zap variant="Bold" className="h-9 w-9 text-breneo-blue" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t.xpGained.title.replace("{xp}", String(gainedXp))}
          </h2>
          <p className="mb-5 text-gray-600 dark:text-gray-400">
            {t.xpGained.subtitle}
          </p>

          <div className="mb-4 w-full space-y-2">
            {rows.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between rounded-2xl bg-black/[0.04] px-4 py-3 dark:bg-white/[0.05]"
              >
                <span className="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-200">
                  <row.icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  {row.label}
                </span>
                <span className="text-sm font-semibold text-breneo-blue">
                  +{row.xp} XP
                </span>
              </div>
            ))}
          </div>

          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            {t.xpGained.total.replace("{xp}", String(xp))}
          </p>

          <Button
            onClick={() => setGained(null)}
            className="min-w-[140px]"
          >
            {t.xpGained.gotIt}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
