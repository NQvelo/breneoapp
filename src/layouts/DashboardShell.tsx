/**
 * Persistent job seeker / academy dashboard shell — keeps sidebar, header and the
 * mobile tab bar mounted across navigation. Pages still render `DashboardLayout`,
 * which inside this shell only passes its layout options up.
 */
import { Suspense, useCallback, useState } from "react";
import { Outlet } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardChrome } from "@/components/layout/DashboardLayout";
import {
  DashboardShellContext,
  DEFAULT_DASHBOARD_LAYOUT_OPTIONS,
  type DashboardLayoutOptions,
} from "@/components/layout/dashboardShellContext";

const PageLoadingFallback = () => (
  <div className="flex h-full min-h-[50vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
  </div>
);

export function DashboardShell() {
  const [options, setOptions] = useState<DashboardLayoutOptions>(
    DEFAULT_DASHBOARD_LAYOUT_OPTIONS,
  );

  const setShellOptions = useCallback((next: DashboardLayoutOptions) => {
    setOptions((prev) =>
      prev.showSidebar === next.showSidebar &&
      prev.showHeader === next.showHeader &&
      prev.showMobileNav === next.showMobileNav &&
      prev.background === next.background &&
      prev.containMainScroll === next.containMainScroll
        ? prev
        : next,
    );
  }, []);

  return (
    <ProtectedRoute>
      <DashboardShellContext.Provider value={setShellOptions}>
        <DashboardChrome {...options}>
          <Suspense fallback={<PageLoadingFallback />}>
            <Outlet />
          </Suspense>
        </DashboardChrome>
      </DashboardShellContext.Provider>
    </ProtectedRoute>
  );
}
