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
}

export function DashboardLayout({
  children,
  showSidebar = true,
  showHeader = true,
  background = "default",
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
    <div
      className={cn(
        "h-screen overflow-hidden",
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
          "h-full overflow-y-auto transition-all duration-300",
          showSidebar && (sidebarCollapsed ? "md:ml-24" : "md:ml-[17rem]"),
          // Adjusted top padding for the new header position
          showHeader && "pt-24 pb-32 md:pt-24 md:pb-0",
          (showSidebar || showHeader) && "px-2 md:px-6"
        )}
      >
        <div className="h-full">{children}</div>
      </main>
      <AcademyVerifiedCongratsModal />
      <SubscriptionModal 
        isOpen={isSubscriptionModalOpen} 
        onClose={() => setIsSubscriptionModalOpen(false)} 
      />
    </div>
  );
}
