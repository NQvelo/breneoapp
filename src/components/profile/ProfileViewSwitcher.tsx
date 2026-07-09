import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const pillSpring = {
  type: "spring" as const,
  stiffness: 520,
  damping: 42,
  mass: 0.85,
};

const segmentFade = {
  duration: 0.16,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
};

export type ProfileToolbarView = "profile" | "saved" | "applied";

interface ProfileViewSwitcherProps {
  activeView: ProfileToolbarView;
  activeSavedTab: "courses" | "jobs";
  activeAppliedTab: "courses" | "jobs";
  onProfile: () => void;
  onSavedSummary: () => void;
  onAppliedSummary: () => void;
  onSavedCourses: () => void;
  onSavedJobs: () => void;
  onAppliedCourses: () => void;
  onAppliedJobs: () => void;
}

function ToolbarButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative shrink-0 px-4 py-2.5 md:px-5 text-sm whitespace-nowrap outline-none rounded-3xl",
        "transition-colors duration-200",
        active
          ? "text-sky-950 dark:text-gray-100 font-bold"
          : "text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-200",
      )}
    >
      {active ? (
        <motion.div
          layoutId="profile-toolbar-pill"
          className="absolute inset-0 rounded-3xl bg-sky-100 dark:bg-gray-700"
          transition={pillSpring}
        />
      ) : null}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

export function ProfileViewSwitcher({
  activeView,
  activeSavedTab,
  activeAppliedTab,
  onProfile,
  onSavedSummary,
  onAppliedSummary,
  onSavedCourses,
  onSavedJobs,
  onAppliedCourses,
  onAppliedJobs,
}: ProfileViewSwitcherProps) {
  const segmentKey =
    activeView === "profile"
      ? "profile-secondary"
      : activeView === "saved"
        ? "saved-secondary"
        : "applied-secondary";

  return (
    <div className="fixed bottom-above-mobile-nav left-1/2 z-40 -translate-x-1/2 md:static md:translate-x-0 md:left-auto md:flex md:justify-center md:mb-6 md:w-auto">
      <motion.div
        layout
        transition={pillSpring}
        className="inline-flex items-center gap-0 bg-white dark:bg-[#242424]/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-3xl p-1 shadow-sm"
      >
        <ToolbarButton active={activeView === "profile"} onClick={onProfile}>
          Profile
        </ToolbarButton>

        <motion.div
          layout="position"
          transition={pillSpring}
          className="relative flex items-center overflow-hidden"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={segmentKey}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={segmentFade}
              className="flex items-center"
            >
              {activeView === "profile" ? (
                <>
                  <ToolbarButton active={false} onClick={onSavedSummary}>
                    Saved
                  </ToolbarButton>
                  <ToolbarButton active={false} onClick={onAppliedSummary}>
                    Applied
                  </ToolbarButton>
                </>
              ) : activeView === "saved" ? (
                <>
                  <ToolbarButton
                    active={activeSavedTab === "courses"}
                    onClick={onSavedCourses}
                  >
                    Saved Courses
                  </ToolbarButton>
                  <ToolbarButton
                    active={activeSavedTab === "jobs"}
                    onClick={onSavedJobs}
                  >
                    Saved Jobs
                  </ToolbarButton>
                </>
              ) : (
                <>
                  <ToolbarButton
                    active={activeAppliedTab === "courses"}
                    onClick={onAppliedCourses}
                  >
                    Applied Courses
                  </ToolbarButton>
                  <ToolbarButton
                    active={activeAppliedTab === "jobs"}
                    onClick={onAppliedJobs}
                  >
                    Applied Jobs
                  </ToolbarButton>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}
