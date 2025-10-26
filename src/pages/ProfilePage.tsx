import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import OptimizedAvatar from "@/components/ui/OptimizedAvatar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";

const ProfilePage = () => {
  // ✅ Get user, loading state, and logout function from AuthContext
  const { user, loading, logout } = useAuth();
  const isMobile = useMobile();
  const navigate = useNavigate();

  // ✅ Show loading text based on the context's loading state
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <p>Loading profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  // ✅ Show error or prompt to login if user isn't loaded
  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <p>Could not load user data. Please try logging in again.</p>
        </div>
      </DashboardLayout>
    );
  }

  const handleLogout = () => {
    // ✅ Call the logout function directly from the context
    logout();
  };

  // ✅ Use the 'user' object from the context directly
  const { first_name, last_name, email, phone_number, profile_image } = user;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 px-2 sm:px-6 lg:px-8">
        <Card className="mb-6">
          <CardContent className="pt-6">
            {/* Mobile Layout - Stacked */}
            <div className="flex flex-col md:hidden space-y-4">
              {/* Avatar and Info */}
              <div className="flex items-center space-x-4">
                <OptimizedAvatar
                  src={profile_image}
                  alt="Profile photo"
                  fallback={
                    first_name ? first_name.charAt(0).toUpperCase() : "U"
                  }
                  size="lg"
                  loading="lazy"
                  className="h-16 w-16 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-bold truncate">
                    {first_name} {last_name}
                  </h1>
                  <p className="text-sm text-gray-500 truncate">{email}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {phone_number}
                  </p>
                </div>
              </div>

              {/* Buttons - Inline, Max 20% Width on Mobile */}
              <div className="flex items-center gap-2 self-end">
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  size="sm"
                  className="flex items-center justify-center gap-1.5 text-xs px-3 h-8"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </Button>
              </div>
            </div>

            {/* Desktop Layout - Horizontal */}
            <div className="hidden md:flex justify-between items-center gap-6">
              <div className="flex items-center space-x-4 min-w-0 flex-1">
                <OptimizedAvatar
                  src={profile_image}
                  alt="Profile photo"
                  fallback={
                    first_name ? first_name.charAt(0).toUpperCase() : "U"
                  }
                  size="xl"
                  loading="lazy"
                  className="h-20 w-20 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-bold truncate">
                    {first_name} {last_name}
                  </h1>
                  <p className="text-base text-gray-500 truncate">{email}</p>
                  <p className="text-base text-gray-500 truncate">
                    {phone_number}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 text-sm px-4 h-10"
                >
                  <LogOut size={16} />
                  Logout
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-4">Account Details</h2>
            <div className="space-y-3 sm:space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 py-2 border-b border-gray-100 last:border-0">
                <strong className="text-sm text-gray-600 sm:w-24 sm:flex-shrink-0">
                  First Name:
                </strong>
                <span className="text-sm sm:text-base text-gray-900 break-words">
                  {first_name}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 py-2 border-b border-gray-100 last:border-0">
                <strong className="text-sm text-gray-600 sm:w-24 sm:flex-shrink-0">
                  Last Name:
                </strong>
                <span className="text-sm sm:text-base text-gray-900 break-words">
                  {last_name}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 py-2 border-b border-gray-100 last:border-0">
                <strong className="text-sm text-gray-600 sm:w-24 sm:flex-shrink-0">
                  Email:
                </strong>
                <span className="text-sm sm:text-base text-gray-900 break-all">
                  {email}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 py-2 border-b border-gray-100 last:border-0">
                <strong className="text-sm text-gray-600 sm:w-24 sm:flex-shrink-0">
                  Phone:
                </strong>
                <span className="text-sm sm:text-base text-gray-900 break-words">
                  {phone_number}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
