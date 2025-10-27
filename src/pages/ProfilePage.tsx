import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import OptimizedAvatar from "@/components/ui/OptimizedAvatar";
import { Button } from "@/components/ui/button";
import { LogOut, Edit, Phone, Mail, Plus, Settings } from "lucide-react";
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Left Column - Profile Summary */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Header Card */}
          <Card>
            <CardContent className="flex flex-col items-center pb-6 pt-6">
              <OptimizedAvatar
                src={profile_image}
                alt="Profile photo"
                fallback={first_name ? first_name.charAt(0).toUpperCase() : "U"}
                size="xl"
                loading="lazy"
                className="h-32 w-32"
              />
              <h1 className="text-2xl font-bold mt-4 text-center">
                {first_name} {last_name}
              </h1>
              <div className="mt-4 flex items-center gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-[4] flex items-center justify-center gap-2"
                >
                  <Settings size={16} />
                  Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="flex-[1] flex items-center justify-center border-breneo-danger text-breneo-danger hover:bg-breneo-danger/10"
                >
                  <LogOut size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information Card */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-bold">Contact Information</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-breneo-blue/10 rounded-full p-2">
                  <Phone size={18} className="text-breneo-blue" />
                </div>
                <span className="text-sm">
                  {phone_number || "Not provided"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-breneo-blue/10 rounded-full p-2">
                  <Mail size={18} className="text-breneo-blue" />
                </div>
                <span className="text-sm">{email}</span>
              </div>
            </CardContent>
          </Card>

          {/* Social Networks Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-bold">Social Networks</h3>
              <Button variant="link" className="text-breneo-blue p-0 h-auto">
                Add
              </Button>
            </CardHeader>
          </Card>
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* About Me Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-bold">About Me</h3>
              <Button variant="link" className="text-breneo-blue p-0 h-auto">
                Edit
              </Button>
            </CardHeader>
          </Card>

          {/* Work Experience Card */}
          {/* <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-bold">Work Experience</h3>
              <Button
                variant="link"
                className="text-breneo-blue p-0 h-auto flex items-center gap-1"
              >
                <Plus size={16} />
                Add
              </Button>
            </CardHeader>
          </Card> */}

          {/* Education Card */}
          {/* <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-bold">Education</h3>
              <Button
                variant="link"
                className="text-breneo-blue p-0 h-auto flex items-center gap-1"
              >
                <Plus size={16} />
                Add
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-base">Management and IT</p>
                <p className="text-sm text-gray-600">Master</p>
                <p className="text-sm text-gray-500">University</p>
              </div>
            </CardContent>
          </Card> */}

          {/* Professional Skills Card */}
          {/* <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-bold">Professional Skills</h3>
              <Button
                variant="link"
                className="text-breneo-blue p-0 h-auto flex items-center gap-1"
              >
                <Plus size={16} />
                Add
              </Button>
            </CardHeader>
          </Card> */}

          {/* Personal Skills Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-bold">Personal Skills</h3>
              <Button
                variant="link"
                className="text-breneo-blue p-0 h-auto flex items-center gap-1"
              >
                <Plus size={16} />
                Add
              </Button>
            </CardHeader>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
