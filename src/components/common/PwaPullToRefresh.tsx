import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { isPwaInstalled, subscribePwaInstall } from "@/lib/pwaInstall";
import { cn } from "@/lib/utils";

const PULL_THRESHOLD_PX = 72;
const MAX_PULL_PX = 112;

function useIsPwaStandalone(): boolean {
  const [isPwa, setIsPwa] = useState(isPwaInstalled);

  useEffect(() => {
    const sync = () => setIsPwa(isPwaInstalled());
    sync();

    const media = window.matchMedia("(display-mode: standalone)");
    media.addEventListener("change", sync);
    const unsubscribe = subscribePwaInstall(sync);

    return () => {
      media.removeEventListener("change", sync);
      unsubscribe();
    };
  }, []);

  return isPwa;
}

const AT_TOP_THRESHOLD_PX = 2;

function isElementAtTop(element: Element): boolean {
  return (element as HTMLElement).scrollTop <= AT_TOP_THRESHOLD_PX;
}

function isWindowAtTop(): boolean {
  return (
    (window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0) <= AT_TOP_THRESHOLD_PX
  );
}

function isScrollableElement(element: Element): boolean {
  const { overflowY } = window.getComputedStyle(element);
  if (overflowY !== "auto" && overflowY !== "scroll" && overflowY !== "overlay") {
    return false;
  }

  const el = element as HTMLElement;
  return el.scrollHeight > el.clientHeight + 1;
}

function getDashboardMain(): HTMLElement | null {
  return (
    document.querySelector("[data-dashboard-main]") ??
    document.querySelector("main.overflow-y-auto, main[class*='overflow-y-auto']")
  );
}

function isPageAtTop(touchTarget?: EventTarget | null): boolean {
  if (!isWindowAtTop()) return false;

  const dashboardMain = getDashboardMain();
  if (dashboardMain && !isElementAtTop(dashboardMain)) return false;

  if (!(touchTarget instanceof Element)) return true;

  let element: Element | null = touchTarget;
  while (
    element &&
    element !== document.body &&
    element !== document.documentElement
  ) {
    if (isScrollableElement(element) && !isElementAtTop(element)) {
      return false;
    }
    element = element.parentElement;
  }

  return true;
}

function isInterviewRoute(pathname: string): boolean {
  return /\/interviews(\/?|$)/.test(pathname);
}

export function PwaPullToRefresh() {
  const { pathname } = useLocation();
  const isPwa = useIsPwaStandalone();
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const pullDistanceRef = useRef(0);

  const enabled = isPwa && !isInterviewRoute(pathname);

  useEffect(() => {
    if (!enabled) {
      pullingRef.current = false;
      pullDistanceRef.current = 0;
      setPullDistance(0);
      return;
    }

    const previousOverscrollBehavior = document.documentElement.style.overscrollBehaviorY;
    document.documentElement.style.overscrollBehaviorY = "none";

    const onTouchStart = (event: TouchEvent) => {
      if (refreshing || !isPageAtTop(event.target)) return;
      if (event.touches.length !== 1) return;

      startYRef.current = event.touches[0].clientY;
      pullingRef.current = true;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!pullingRef.current || refreshing) return;
      if (!isPageAtTop(event.target)) {
        pullingRef.current = false;
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }

      const deltaY = event.touches[0].clientY - startYRef.current;
      if (deltaY <= 0) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }

      event.preventDefault();
      const next = Math.min(deltaY * 0.45, MAX_PULL_PX);
      pullDistanceRef.current = next;
      setPullDistance(next);
    };

    const finishPull = () => {
      if (!pullingRef.current) return;
      pullingRef.current = false;

      if (pullDistanceRef.current >= PULL_THRESHOLD_PX) {
        setRefreshing(true);
        pullDistanceRef.current = PULL_THRESHOLD_PX;
        setPullDistance(PULL_THRESHOLD_PX);
        window.location.reload();
        return;
      }

      pullDistanceRef.current = 0;
      setPullDistance(0);
    };

    const onTouchEnd = () => finishPull();
    const onTouchCancel = () => finishPull();

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchCancel);

    return () => {
      document.documentElement.style.overscrollBehaviorY = previousOverscrollBehavior;
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [enabled, refreshing]);

  if (!enabled) return null;

  const progress = Math.min(pullDistance / PULL_THRESHOLD_PX, 1);
  const visible = refreshing || pullDistance > 4;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[300] flex justify-center transition-opacity duration-150",
        visible ? "opacity-100" : "opacity-0",
      )}
      style={{
        paddingTop: "max(0.5rem, env(safe-area-inset-top, 0px))",
        transform: `translateY(${refreshing ? PULL_THRESHOLD_PX * 0.35 : pullDistance * 0.35}px)`,
      }}
    >
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full bg-background/95 shadow-md ring-1 ring-border/60 backdrop-blur-sm",
          refreshing && "scale-100",
        )}
        style={{
          transform: refreshing ? undefined : `scale(${0.7 + progress * 0.3})`,
        }}
      >
        <Loader2
          className={cn(
            "h-5 w-5 text-breneo-blue",
            refreshing ? "animate-spin" : "transition-transform duration-150",
          )}
          style={
            refreshing
              ? undefined
              : { transform: `rotate(${progress * 180}deg)` }
          }
        />
      </div>
    </div>
  );
}
