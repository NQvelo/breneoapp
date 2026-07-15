import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { BreneoLogo } from "@/components/common/BreneoLogo";
import { isPwaInstalled, subscribePwaInstall } from "@/lib/pwaInstall";
import { cn } from "@/lib/utils";

const PULL_THRESHOLD_PX = 72;
const MAX_PULL_PX = 120;
const REFRESH_INDICATOR_HEIGHT_PX = 88;

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

function getPrimaryScrollContainer(): HTMLElement | null {
  const mainEl = document.querySelector("main");
  if (!(mainEl instanceof HTMLElement)) return null;

  const style = window.getComputedStyle(mainEl);
  const isScrollable =
    mainEl.scrollHeight > mainEl.clientHeight &&
    (style.overflowY === "auto" || style.overflowY === "scroll");

  return isScrollable ? mainEl : null;
}

function getPrimaryScrollTop(): number {
  const mainEl = getPrimaryScrollContainer();
  if (mainEl) return mainEl.scrollTop;

  return (
    window.scrollY ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  );
}

function isPageAtTop(): boolean {
  return getPrimaryScrollTop() <= 2;
}

function findScrollableAncestor(element: Element | null): HTMLElement | null {
  let current = element;

  while (current && current !== document.body) {
    if (!(current instanceof HTMLElement)) break;

    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const isScrollable =
      (overflowY === "auto" || overflowY === "scroll") &&
      current.scrollHeight > current.clientHeight;

    if (isScrollable) return current;
    current = current.parentElement;
  }

  return null;
}

function isTouchScrollAtTop(target: EventTarget | null): boolean {
  if (!isPageAtTop()) return false;

  if (!(target instanceof Element)) return true;

  const scrollable = findScrollableAncestor(target);
  if (!scrollable) return true;

  return scrollable.scrollTop <= 2;
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
  const touchTargetRef = useRef<EventTarget | null>(null);

  const enabled = isPwa && !isInterviewRoute(pathname);

  useEffect(() => {
    if (!enabled) {
      pullingRef.current = false;
      pullDistanceRef.current = 0;
      touchTargetRef.current = null;
      setPullDistance(0);
      return;
    }

    const resetPull = () => {
      pullingRef.current = false;
      touchTargetRef.current = null;
      pullDistanceRef.current = 0;
      setPullDistance(0);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (refreshing || !isTouchScrollAtTop(event.target)) return;
      if (event.touches.length !== 1) return;

      startYRef.current = event.touches[0].clientY;
      touchTargetRef.current = event.target;
      pullingRef.current = true;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!pullingRef.current || refreshing) return;

      if (!isTouchScrollAtTop(touchTargetRef.current)) {
        resetPull();
        return;
      }

      const deltaY = event.touches[0].clientY - startYRef.current;
      if (deltaY <= 0) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }

      event.preventDefault();
      const next = Math.min(deltaY * 0.5, MAX_PULL_PX);
      pullDistanceRef.current = next;
      setPullDistance(next);
    };

    const finishPull = () => {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      touchTargetRef.current = null;

      if (pullDistanceRef.current >= PULL_THRESHOLD_PX) {
        setRefreshing(true);
        pullDistanceRef.current = REFRESH_INDICATOR_HEIGHT_PX;
        setPullDistance(REFRESH_INDICATOR_HEIGHT_PX);
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
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [enabled, refreshing]);

  if (!enabled) return null;

  const progress = Math.min(pullDistance / PULL_THRESHOLD_PX, 1);
  const visible = refreshing || pullDistance > 4;
  const indicatorHeight = refreshing
    ? REFRESH_INDICATOR_HEIGHT_PX
    : pullDistance;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[300] overflow-hidden transition-[height] duration-200 ease-out",
        visible ? "opacity-100" : "opacity-0",
      )}
      style={{
        height: indicatorHeight,
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div className="flex h-full items-end justify-center pb-3">
        {refreshing ? (
          <div className="flex flex-col items-center gap-2">
            <BreneoLogo className="h-7 w-auto animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground">
              Loading
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-background/95 shadow-md ring-1 ring-border/60 backdrop-blur-sm"
              style={{
                transform: `scale(${0.75 + progress * 0.25})`,
              }}
            >
              <ChevronDown
                className="h-5 w-5 text-breneo-blue transition-transform duration-150"
                style={{
                  transform: `rotate(${progress * 180}deg)`,
                  opacity: 0.45 + progress * 0.55,
                }}
              />
            </div>
            <span
              className={cn(
                "text-[11px] font-medium text-muted-foreground transition-opacity duration-150",
                progress >= 1 ? "opacity-100" : "opacity-0",
              )}
            >
              Release to refresh
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
