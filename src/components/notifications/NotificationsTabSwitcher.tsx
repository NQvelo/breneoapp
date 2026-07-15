import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type NotificationsTab = "notifications" | "cv_views";

type NotificationsTabSwitcherProps = {
  activeTab: NotificationsTab;
  notificationsCount: number;
  cvViewsCount: number;
  notificationsLabel: string;
  cvViewsLabel: string;
  onTabChange: (tab: NotificationsTab) => void;
};

const pillSpring = {
  type: "spring" as const,
  stiffness: 500,
  damping: 40,
  mass: 1,
};

export function NotificationsTabSwitcher({
  activeTab,
  notificationsCount,
  cvViewsCount,
  notificationsLabel,
  cvViewsLabel,
  onTabChange,
}: NotificationsTabSwitcherProps) {
  const tabs = [
    {
      value: "notifications" as const,
      label: `${notificationsLabel} (${notificationsCount})`,
    },
    {
      value: "cv_views" as const,
      label: `${cvViewsLabel} (${cvViewsCount})`,
    },
  ];

  return (
    <div className="fixed bottom-above-mobile-nav left-1/2 z-40 -translate-x-1/2 md:static md:translate-x-0 md:left-auto md:flex md:justify-start md:mb-4 md:w-auto">
      <motion.div
        layout
        transition={pillSpring}
        className="relative inline-flex items-center gap-0 rounded-3xl border border-gray-200 bg-white/95 p-1 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-gray-800 dark:bg-[#242424]/80 dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] md:shadow-sm"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <motion.button
              key={tab.value}
              type="button"
              layout
              onClick={() => onTabChange(tab.value)}
              className={cn(
                "relative shrink-0 whitespace-nowrap rounded-3xl px-6 py-2.5 text-sm outline-none transition-colors duration-200",
                isActive
                  ? "font-bold text-sky-950 dark:text-gray-100"
                  : "font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
              )}
            >
              {isActive ? (
                <motion.div
                  layoutId="notifications-page-tab-pill"
                  className="absolute inset-0 rounded-3xl bg-sky-100 dark:bg-gray-700"
                  transition={pillSpring}
                />
              ) : null}
              <span className="relative z-10">{tab.label}</span>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
