import React from "react";
import { useLocation, type LinkProps } from "react-router-dom";
import {
  Book1,
  Briefcase,
  Home2,
  People,
  ProfileCircle,
  Teacher,
} from "iconsax-react";
import { LocalizedLink } from "@/components/routing/LocalizedLink";
import { useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { isNavHrefActive } from "./navActive";

const TabBarLink = ({ href, ...props }: Omit<LinkProps, "to"> & { href: string }) => (
  <LocalizedLink to={href} {...props} />
);

interface MobileTabBarProps {
  role: "user" | "academy" | "employer";
  profilePath: string;
  navLocked?: boolean;
  hasAttachedDock?: boolean;
}

/**
 * Memoized so it only re-renders on route or language changes,
 * not on every sidebar update (auth, notifications, employer profile loading).
 */
export const MobileTabBar = React.memo(function MobileTabBar({
  role,
  profilePath,
  navLocked = false,
  hasAttachedDock = false,
}: MobileTabBarProps) {
  const { pathname } = useLocation();
  const t = useTranslation();

  const navItems = React.useMemo(
    () =>
      role === "academy"
        ? [
            { icon: Home2, label: t.nav.home, href: "/academy/home" },
            { icon: Book1, label: t.nav.courses, href: "/academy/courses" },
            { icon: ProfileCircle, label: t.nav.profile, href: profilePath },
          ]
        : role === "employer"
          ? [
              { icon: Briefcase, label: t.nav.yourJobs, href: "/employer/jobs" },
              { icon: People, label: t.nav.members, href: "/employer/members" },
              { icon: ProfileCircle, label: t.nav.profile, href: profilePath },
            ]
          : [
              { icon: Home2, label: t.nav.home, href: "/home" },
              { icon: Briefcase, label: t.nav.jobs, href: "/jobs" },
              { icon: Teacher, label: t.nav.growthShort, href: "/courses" },
              { icon: ProfileCircle, label: t.nav.profile, href: profilePath },
            ],
    [role, t, profilePath],
  );

  const activeHref =
    navItems.find((item) => isNavHrefActive(item.href, pathname))?.href ??
    null;
  const activeIndex = navItems.findIndex((item) => item.href === activeHref);

  const items = React.useMemo(
    () =>
      navItems.map((item) => ({
        href: item.href,
        label: item.label,
        icon: <item.icon variant={item.href === activeHref ? "Bold" : "Linear"} />,
      })),
    [navItems, activeHref],
  );

  return (
    <div
      className={cn(
        "breneo-tab-bar-dock md:hidden fixed bottom-0 left-0 right-0 z-50",
        hasAttachedDock && "has-attached-dock",
        navLocked && "pointer-events-none opacity-40",
      )}
      aria-disabled={navLocked || undefined}
    >
      <div className="relative flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-2">
        <nav aria-label="Main navigation" className="breneo-mobile-nav">
          <div
            className="breneo-mobile-nav-items"
            style={{
              "--active-offset": `${Math.max(activeIndex, 0) * 62}px`,
            } as React.CSSProperties}
          >
            <span
              aria-hidden="true"
              className={cn(
                "breneo-mobile-nav-indicator",
                activeIndex < 0 && "is-hidden",
              )}
            />
            {items.map((item) => {
              const active = item.href === activeHref;
              return (
              <TabBarLink
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn("breneo-mobile-nav-item", active && "is-active")}
              >
                {item.icon}
              </TabBarLink>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
});
