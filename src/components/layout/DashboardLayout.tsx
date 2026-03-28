import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { AcademyVerifiedCongratsModal } from "@/components/common/AcademyVerifiedCongratsModal";
import { SubscriptionModal } from "@/components/subscription/SubscriptionModal";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showHeader?: boolean;
  background?: "default" | "white";
  /**
   * When false, `<main>` does not scroll internally; content grows with the page and the window scrolls.
   * Use for long forms (e.g. add course) to avoid a nested scroll area.
   */
  containMainScroll?: boolean;
}

export function DashboardLayout({
  children,
  showSidebar = true,
  showHeader = true,
  background = "default",
  containMainScroll = true,
}: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const mainContentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (searchParams.get("upgrade") === "true") {
      setIsSubscriptionModalOpen(true);
      // Clean up the URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("upgrade");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  const openSubscriptionModal = () => {
    setIsSubscriptionModalOpen(true);
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = containMainScroll
        ? mainContentRef.current?.scrollTop ?? 0
        : window.scrollY || document.documentElement.scrollTop;
      if (scrollTop > 50) {
        setIsHeaderVisible(false);
      } else {
        setIsHeaderVisible(true);
      }
    };

    if (containMainScroll) {
      const mainEl = mainContentRef.current;
      if (!mainEl) return;
      mainEl.addEventListener("scroll", handleScroll);
      return () => mainEl.removeEventListener("scroll", handleScroll);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [containMainScroll]);

  return (
    <div
      className={cn(
        containMainScroll ? "h-screen overflow-hidden" : "min-h-screen overflow-x-hidden",
        background === "white" ? "bg-white" : "bg-breneo-lightgray"
      )}
    >
      {showSidebar && (
        <AppSidebar
          collapsed={sidebarCollapsed}
          toggleSidebar={toggleSidebar}
          onUpgradeClick={openSubscriptionModal}
        />
      )}
      {showHeader && (
        <DashboardHeader
          sidebarCollapsed={sidebarCollapsed}
          isVisible={isHeaderVisible}
        />
      )}

      <main
        ref={mainContentRef}
        className={cn(
          "transition-all duration-300",
          containMainScroll
            ? "h-full overflow-y-auto"
            : "h-auto min-h-[calc(100dvh-6rem)] overflow-visible md:min-h-[calc(100vh-6rem)]",
          showSidebar && (sidebarCollapsed ? "md:ml-24" : "md:ml-[17rem]"),
          // Adjusted top padding for the new header position
          showHeader && "pt-24 pb-32 md:pt-24 md:pb-0",
          (showSidebar || showHeader) && "px-2 md:px-6"
        )}
      >
        <div className={cn(containMainScroll && "h-full")}>{children}</div>
      </main>
      <AcademyVerifiedCongratsModal />
      <SubscriptionModal 
        isOpen={isSubscriptionModalOpen} 
        onClose={() => setIsSubscriptionModalOpen(false)} 
      />
    </div>
  );
}
