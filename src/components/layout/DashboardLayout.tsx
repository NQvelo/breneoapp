
import React, { useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { DashboardHeader } from './DashboardHeader';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  return (
    <div className="h-screen bg-breneo-lightgray overflow-hidden">
      <AppSidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
      <DashboardHeader sidebarCollapsed={sidebarCollapsed} />
      
      <main className={cn(
        "h-full transition-all duration-300 overflow-y-auto",
        // Desktop margins
        "md:ml-64",
        sidebarCollapsed ? "md:ml-20" : "md:ml-64",
        // Mobile padding for header and bottom nav, desktop padding for fixed header
        "pt-16 pb-20 md:pt-16 md:pb-0",
        // Mobile padding - 12px from screen edges
        "px-3 md:px-6"
      )}>
        <div className="h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
