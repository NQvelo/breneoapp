import React from "react";
import { useLocation, type LinkProps } from "react-router-dom";
import { useTheme } from "next-themes";
import { TabBar } from "glisse";
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
import { isNavHrefActive } from "./navActive";

const TabBarLink = ({
  href,
  ...props
}: Omit<LinkProps, "to"> & { href: string }) => (
  <LocalizedLink to={href} {...props} />
);

const TAB_BAR_STYLE = { "--lg-tab-selected": "#19B5FE" } as React.CSSProperties;

interface MobileTabBarProps {
  role: "user" | "academy" | "employer";
  profilePath: string;
  avatarUrl?: string;
}

/**
 * Memoized so it only re-renders on route, language, theme or avatar changes,
 * not on every sidebar update (auth, notifications, employer profile loading).
 */
export const MobileTabBar = React.memo(function MobileTabBar({
  role,
  profilePath,
  avatarUrl,
}: MobileTabBarProps) {
  const { pathname } = useLocation();
  const { resolvedTheme } = useTheme();
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

  const items = React.useMemo(
    () =>
      navItems.map((item) => ({
        value: item.href,
        href: item.href,
        label: item.label,
        icon:
          item.href === profilePath && avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              decoding="async"
              className="breneo-tab-avatar"
              data-square={role === "user" ? undefined : ""}
              data-active={item.href === activeHref ? "" : undefined}
            />
          ) : (
            <item.icon variant={item.href === activeHref ? "Bold" : "Linear"} />
          ),
      })),
    [navItems, profilePath, avatarUrl, role, activeHref],
  );

  return (
    <div className="breneo-tab-bar-dock md:hidden fixed bottom-0 left-0 right-0 z-50">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[calc(6.5rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-background via-background/50 to-transparent"
        aria-hidden
      />

      <div className="relative flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-2">
        <TabBar
          aria-label="Main navigation"
          className="breneo-tab-bar"
          data-theme={resolvedTheme === "dark" ? "dark" : "light"}
          link={TabBarLink}
          value={activeHref}
          items={items}
          style={TAB_BAR_STYLE}
        />
      </div>
    </div>
  );
});
