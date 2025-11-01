/**
 * User Layout Component
 * 
 * Main layout wrapper for regular user pages
 * Includes navigation, sidebar, and common user interface elements
 */

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ReactNode } from 'react';

interface UserLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
  showHeader?: boolean;
}

/**
 * UserLayout - Layout wrapper for user pages
 * @param children - Page content to render
 * @param showSidebar - Whether to show sidebar (default: true)
 * @param showHeader - Whether to show header (default: true)
 */
export const UserLayout = ({
  children,
  showSidebar = true,
  showHeader = true,
}: UserLayoutProps) => {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
};

