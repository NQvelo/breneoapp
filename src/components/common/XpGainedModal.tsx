import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import {
  useUserXp,
  XP_PER_COURSE_ENROLLMENT,
  XP_PER_JOB_APPLICATION,
} from "@/hooks/useUserXp";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";
import { Briefcase, GraduationCap } from "@/components/icons";

const STORAGE_KEY_PREFIX = "xp_last_seen_counts";

const SPARKLES = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2;
  const distance = i % 2 === 0 ? 62 : 48;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    size: i % 2 === 0 ? 8 : 5,
    color: i % 3 === 0 ? "#19B5FE" : i % 3 === 1 ? "#FFC107" : "#F97316",
  };
});

function XpBurstIllustration() {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <img
        src="/lovable-uploads/3dicons-flash-dynamic-color.png"
        alt=""
        className="h-28 w-28 object-contain"
      />
    );
  }

  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      {[0, 0.6].map((delay) => (
        <motion.span
          key={delay}
          className="absolute h-24 w-24 rounded-full bg-orange-400/25"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 1.5], opacity: [0.5, 0] }}
          transition={{
            duration: 1.8,
            delay: 0.3 + delay,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}

      {SPARKLES.map((s, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{ width: s.size, height: s.size, backgroundColor: s.color }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
          animate={{
            x: s.x,
            y: s.y,
            scale: [0, 1.2, 0],
            opacity: [0, 1, 0],
          }}
          transition={{ duration: 0.9, delay: 0.25, ease: "easeOut" }}
        />
      ))}

      <motion.img
        src="/lovable-uploads/3dicons-flash-dynamic-color.png"
        alt=""
        className="relative h-28 w-28 object-contain drop-shadow-[0_8px_16px_rgba(249,115,22,0.35)]"
        initial={{ scale: 0, rotate: -30, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 14 }}
      />
    </div>
  );
}

function AnimatedXpValue({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();
  const count = useMotionValue(reduceMotion ? value : 0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    if (reduceMotion) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, {
      duration: 0.9,
      delay: 0.3,
      ease: "easeOut",
    });
    return () => controls.stop();
  }, [count, value, reduceMotion]);

  return <motion.span>{rounded}</motion.span>;
}

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
  const isMobile = useMobile();
  const [gained, setGained] = useState<XpCounts | null>(null);
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);

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

    const stillOpen = openRef.current;
    setGained((prev) => {
      const base = stillOpen ? prev : null;
      return {
        jobApplicationsCount: (base?.jobApplicationsCount ?? 0) + newJobs,
        courseEnrollmentsCount:
          (base?.courseEnrollmentsCount ?? 0) + newCourses,
      };
    });
    openRef.current = true;
    setOpen(true);
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

  const title = t.xpGained.title.replace("{xp}", String(gainedXp));
  const [totalBefore, totalAfter = ""] = t.xpGained.total.split("{xp}");

  const close = () => {
    openRef.current = false;
    setOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) close();
  };

  const rewards = (
    <div className="mt-3 space-y-2">
      {rows.map((row, i) => (
        <motion.div
          key={row.key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 + i * 0.1 }}
          className="flex items-center justify-between rounded-2xl bg-black/[0.04] px-4 py-3 dark:bg-white/[0.05]"
        >
          <span className="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-200">
            <row.icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            {row.label}
          </span>
          <span className="text-sm font-semibold text-breneo-blue">
            +<AnimatedXpValue value={row.xp} /> XP
          </span>
        </motion.div>
      ))}
      <p className="pt-1 text-sm text-gray-500 dark:text-gray-400">
        {totalBefore}
        <AnimatedXpValue value={xp} />
        {totalAfter}
      </p>
    </div>
  );

  const gotItButton = (
    <Button
      type="button"
      className={isMobile ? "w-full" : "flex-1"}
      onClick={close}
    >
      {t.xpGained.gotIt}
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="border-none bg-white dark:bg-background">
          <DrawerHeader className="items-start pb-0 text-left">
            {/* pl-11 offsets the header's close button (h-7 + gap-4) so the image is centered in the drawer */}
            <div className="mb-3 flex justify-center pl-11">
              <XpBurstIllustration />
            </div>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription className="mt-1">
              {t.xpGained.subtitle}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-6 pt-2">{rewards}</div>
          <DrawerFooter className="flex-col gap-2 pt-10">
            {gotItButton}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm gap-0">
        <div className="mb-3 flex justify-center">
          <XpBurstIllustration />
        </div>
        <DialogHeader className="space-y-1 text-left sm:text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t.xpGained.subtitle}</DialogDescription>
        </DialogHeader>
        {rewards}
        <DialogFooter className="flex flex-row gap-2 pt-10 sm:space-x-0">
          {gotItButton}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
