
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Briefcase, BookOpen, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface AppSidebarProps {
  collapsed: boolean;
  toggleSidebar: () => void;
}

export function AppSidebar({ collapsed, toggleSidebar }: AppSidebarProps) {
  const location = useLocation();
  
  const navItems = [
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      href: '/dashboard'
    },
    {
      icon: Briefcase,
      label: 'Job Offers',
      href: '/jobs'
    },
    {
      icon: BookOpen,
      label: 'Courses',
      href: '/courses'
    }
  ];

  const mobileNavItems = [
    ...navItems,
    {
      icon: User,
      label: 'Profile',
      href: '/profile'
    }
  ];

  // Force rebuild to clear Settings reference cache

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src="/lovable-uploads/a27089ec-2666-4c11-a0e0-0d8ea54e1d39.png" alt="Breneo Logo" className="h-8" />
          </Link>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
        <nav className="flex justify-around items-center py-2">
          {mobileNavItems.map((item, index) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={index}
                to={item.href}
                className={cn(
                  "flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 min-w-0 flex-1 mx-1",
                  "hover:bg-breneo-blue/10 active:bg-breneo-blue/20",
                  isActive 
                    ? "bg-breneo-blue/10 text-breneo-blue" 
                    : "text-gray-600 hover:text-breneo-blue"
                )}
              >
                <item.icon 
                  size={20} 
                  className={cn(
                    "transition-colors duration-200 mb-1",
                    isActive ? "text-breneo-blue" : "group-hover:text-breneo-blue"
                  )} 
                />
                <span className={cn(
                  "text-xs font-medium transition-colors duration-200 text-center",
                  isActive ? "text-breneo-blue" : "group-hover:text-breneo-blue"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Desktop Sidebar - Full Height */}
      <div className={cn(
        "hidden md:block h-screen fixed top-0 left-0 bottom-0 z-40 bg-white border-r border-gray-200 transition-all duration-300 flex-col shadow-sm",
        collapsed ? "w-20" : "w-64"
      )}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              {!collapsed && (
                <Link to="/" className="flex items-center space-x-2">
                  <img src="/lovable-uploads/a27089ec-2666-4c11-a0e0-0d8ea54e1d39.png" alt="Breneo Logo" className="h-10" />
                </Link>
              )}
              {collapsed && (
                <img 
                  src="/lovable-uploads/a27089ec-2666-4c11-a0e0-0d8ea54e1d39.png" 
                  alt="Breneo Logo" 
                  className="h-10 w-10" 
                  style={{
                    objectFit: 'cover',
                    objectPosition: 'left'
                  }} 
                />
              )}
            </div>
            
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto pt-8">
          <nav className="space-y-2 px-4">
            {navItems.map((item, index) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={index}
                  to={item.href}
                  className={cn(
                    "flex items-center space-x-4 px-4 py-4 rounded-xl transition-all duration-200 group",
                    isActive 
                      ? "bg-breneo-blue/10 text-breneo-blue" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-breneo-blue"
                  )}
                >
                  <item.icon 
                    size={22} 
                    className={cn(
                      "transition-colors duration-200 flex-shrink-0",
                      isActive 
                        ? "text-breneo-blue" 
                        : "text-gray-400 group-hover:text-breneo-blue"
                    )} 
                  />
                  {!collapsed && (
                    <span className={cn(
                      "font-medium text-base transition-colors duration-200",
                      isActive 
                        ? "text-breneo-blue" 
                        : "text-gray-600 group-hover:text-breneo-blue"
                    )}>
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

      </div>
    </>
  );
}
