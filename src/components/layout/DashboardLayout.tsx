import React, { useState, useRef, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const mainContentRef = useRef<HTMLElement>(null);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  useEffect(() => {
    const mainEl = mainContentRef.current;
    if (!mainEl) return;

    const handleScroll = () => {
      const scrollTop = mainEl.scrollTop;
      // Hide header if scrolled more than 50px, otherwise show it
      if (scrollTop > 50) {
        setIsHeaderVisible(false);
      } else {
        setIsHeaderVisible(true);
      }
    };

    mainEl.addEventListener("scroll", handleScroll);
    return () => {
      mainEl.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="h-screen bg-breneo-lightgray overflow-hidden">
      <AppSidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
      <DashboardHeader
        sidebarCollapsed={sidebarCollapsed}
        isVisible={isHeaderVisible}
      />

      <main
        ref={mainContentRef}
        className={cn(
          "h-full overflow-y-auto transition-all duration-300",
          sidebarCollapsed ? "md:ml-24" : "md:ml-[17rem]",
          // Adjusted top padding for the new header position
          "pt-24 pb-32 md:pt-24 md:pb-0",
          "px-3 md:px-6"
        )}
      >
        <div className="h-full">{children}</div>
      </main>
    </div>
  );
}
