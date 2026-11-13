import { createContext } from "react";

export interface DashboardLayoutOptions {
  showSidebar: boolean;
  showHeader: boolean;
  showMobileNav: boolean;
  background: "default" | "white";
  containMainScroll: boolean;
}

export const DEFAULT_DASHBOARD_LAYOUT_OPTIONS: DashboardLayoutOptions = {
  showSidebar: true,
  showHeader: true,
  showMobileNav: true,
  background: "default",
  containMainScroll: true,
};

/**
 * Set inside a persistent dashboard shell route. Pages' `DashboardLayout` then only
 * passes its options up, so the sidebar, header and mobile tab bar stay mounted
 * across navigation instead of remounting with every page.
 */
export const DashboardShellContext = createContext<
  ((options: DashboardLayoutOptions) => void) | null
>(null);
