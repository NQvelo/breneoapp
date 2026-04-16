import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768; // Corresponds to Tailwind's `md` breakpoint

export function useMobile(): boolean {
  const getIsMobile = () =>
    typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;

  const [isMobile, setIsMobile] = useState<boolean>(getIsMobile);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    function syncIsMobile() {
      setIsMobile(mediaQuery.matches);
    }

    syncIsMobile();
    mediaQuery.addEventListener("change", syncIsMobile);
    window.addEventListener("resize", syncIsMobile);

    return () => {
      mediaQuery.removeEventListener("change", syncIsMobile);
      window.removeEventListener("resize", syncIsMobile);
    };
  }, []);

  return isMobile;
}
