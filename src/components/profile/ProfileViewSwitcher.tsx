import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MobileBottomDockExtension } from "@/components/layout/mobileBottomDock";

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

export type ProfileToolbarView = "profile" | "jobs" | "courses";

interface ProfileViewSwitcherProps {
  activeView: ProfileToolbarView;
  onProfile: () => void;
  onJobs: () => void;
  onCourses: () => void;
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
          ? "text-gray-900 md:dark:text-gray-100 font-bold"
          : "text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-200",
      )}
    >
      {active ? (
        <motion.div
          layoutId="profile-toolbar-pill"
          className="absolute inset-0 rounded-3xl bg-white shadow-sm md:bg-sky-100 dark:md:bg-gray-700"
          transition={pillSpring}
        />
      ) : null}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

export function ProfileViewSwitcher({
  activeView,
  onProfile,
  onJobs,
  onCourses,
}: ProfileViewSwitcherProps) {
  const isProfile = activeView === "profile";
  const segmentKey = isProfile ? "profile-secondary" : "management-secondary";

  return (
    <MobileBottomDockExtension>
    <div className="mobile-attached-switcher profile-mobile-switcher fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 py-2 md:static md:translate-x-0 md:left-auto md:flex md:justify-center md:mb-2 md:w-auto">
      <motion.div
        layout
        transition={pillSpring}
        className="mobile-attached-switcher-control inline-flex items-center gap-0 bg-gray-100 dark:bg-[#242424]/80 md:bg-white dark:md:bg-[#242424]/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-3xl p-1 shadow-sm"
      >
        <ToolbarButton active={isProfile} onClick={onProfile}>
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
              {isProfile ? (
                <ToolbarButton active={false} onClick={onJobs}>
                  Management
                </ToolbarButton>
              ) : (
                <>
                  <ToolbarButton active={activeView === "jobs"} onClick={onJobs}>
                    Jobs
                  </ToolbarButton>
                  <ToolbarButton
                    active={activeView === "courses"}
                    onClick={onCourses}
                  >
                    Courses
                  </ToolbarButton>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
    </MobileBottomDockExtension>
  );
}
