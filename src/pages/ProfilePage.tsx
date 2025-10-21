import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, Settings } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";

const ProfilePage = () => {
  const { signOut } = useAuth();
  const isMobile = useMobile();
  const navigate = useNavigate(); // For redirect
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Retrieve user data from localStorage after login
    const storedUserData = localStorage.getItem("userData");
    if (storedUserData) {
      setUserData(JSON.parse(storedUserData));
    }
  }, []);

  if (!userData) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <p>Loading profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  const handleLogout = () => {
    // 1️⃣ Clear localStorage
    localStorage.removeItem("userData");

    // 2️⃣ Call your auth context logout (if it handles token removal, etc.)
    signOut();

    // 3️⃣ Redirect to login page
    navigate("/login");
  };

  const {
    first_name,
    last_name,
    email,
    phone_number,
    profile_image,
    user_type,
  } = userData;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 px-2 sm:px-6 lg:px-8">
        <Card className="mb-6">
          <CardContent className="pt-6 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16 md:h-24 md:w-24">
                <AvatarImage src={profile_image} />
                <AvatarFallback>
                  {first_name ? first_name.charAt(0).toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">
                  {first_name} {last_name}
                </h1>
                <p className="text-sm md:text-base text-gray-500">{email}</p>
                <p className="text-sm md:text-base text-gray-500">
                  {phone_number}
                </p>
                <p className="text-sm text-gray-400 mt-1">Role: {user_type}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size={isMobile ? "sm" : "default"}
                className="flex items-center gap-2"
              >
                <Settings size={16} />
                Settings
              </Button>
              <Button
                variant="destructive"
                size={isMobile ? "sm" : "default"}
                onClick={handleLogout} // ✅ Updated
                className="flex items-center gap-2"
              >
                <LogOut size={16} />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Account Details</h2>
            <div className="space-y-2 text-gray-700">
              <p>
                <strong>First Name:</strong> {first_name}
              </p>
              <p>
                <strong>Last Name:</strong> {last_name}
              </p>
              <p>
                <strong>Email:</strong> {email}
              </p>
              <p>
                <strong>Phone:</strong> {phone_number}
              </p>
              <p>
                <strong>User Type:</strong> {user_type}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
