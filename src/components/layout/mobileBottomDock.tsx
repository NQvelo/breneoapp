import React from "react";
import { createPortal } from "react-dom";
import { useMobile } from "@/hooks/use-mobile";

type MobileBottomDockContextValue = {
  target: HTMLDivElement | null;
  setHasExtension: (hasExtension: boolean) => void;
};

export const MobileBottomDockContext =
  React.createContext<MobileBottomDockContextValue | null>(null);

/**
 * Places page-specific mobile controls inside the shared bottom navigation dock.
 * On desktop the controls stay in their original document position.
 */
export function MobileBottomDockExtension({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = React.useContext(MobileBottomDockContext);
  const isMobile = useMobile();

  React.useLayoutEffect(() => {
    if (!isMobile) return;
    context?.setHasExtension(true);
    return () => context?.setHasExtension(false);
  }, [context, isMobile]);

  return context?.target && isMobile
    ? createPortal(children, context.target)
    : <>{children}</>;
}
