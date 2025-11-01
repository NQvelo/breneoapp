/**
 * Academy Layout Component
 * 
 * Main layout wrapper for academy pages
 * Includes academy-specific navigation and interface elements
 */

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ReactNode } from 'react';

interface AcademyLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
  showHeader?: boolean;
}

/**
 * AcademyLayout - Layout wrapper for academy pages
 * @param children - Page content to render
 * @param showSidebar - Whether to show sidebar (default: true)
 * @param showHeader - Whether to show header (default: true)
 */
export const AcademyLayout = ({
  children,
  showSidebar = true,
  showHeader = true,
}: AcademyLayoutProps) => {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
};

