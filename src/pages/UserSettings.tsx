import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import axios from "axios";
import { Camera } from "lucide-react";

// Base API URL
const API_BASE = "https://breneo.onrender.com";

export default function SettingsPage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Profile form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // --- Password Reset State ---
  const [passwordStep, setPasswordStep] = useState(1);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  // ---

  // Populate form with user data from AuthContext
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setEmail(user.email || "");
      setPhoneNumber(user.phone_number || "");
    }
  }, [user]);

  // Get initials for avatar
  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || "U";
  };

  const handlePhotoUploadClick = () => {
    toast.info("Profile photo upload is coming soon!");
  };

  const handleProfileClick = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    setProfileLoading(true);
    // Get the simple 'token'
    const token = localStorage.getItem("authToken");

    if (!token) {
      toast.error("Authentication session expired. Please log in again.");
      setProfileLoading(false);
      return;
    }
    if (!user || !user.id) {
      toast.error("User ID not found. Please log in again.");
      setProfileLoading(false);
      return;
    }

    try {
      const updateUrl = `${API_BASE}/api/profile/${user.id}/`;
      await axios.patch(
        // Use PATCH
        updateUrl,
        {
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
        },
        {
          headers: {
            // Use 'Bearer' auth
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (err: any) {
      let errorMessage = "Failed to update profile.";
      if (axios.isAxiosError(err) && err.response) {
        errorMessage =
          err.response.data.detail ||
          err.response.data.message ||
          "An error occurred.";
      }
      toast.error(errorMessage);
    } finally {
      setProfileLoading(false);
    }
  };

  // --- START: Password Reset Functions ---
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    if (!user?.email) {
      toast.error("Email not found. Please log in again.");
      setPasswordLoading(false);
      return;
    }
    try {
      const res = await axios.post(`${API_BASE}/password-reset/request/`, {
        email: user.email,
      });
      toast.success(res.data.message || "Code sent to your email!");
      setPasswordStep(2);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Error sending code");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/password-reset/verify/`, {
        email: user?.email,
        code: code,
      });
      toast.success(res.data.message || "Code verified!");
      setPasswordStep(3);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Invalid code");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/password-reset/set-new/`, {
        email: user?.email,
        code: code,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      toast.success(res.data.message || "Password updated successfully!");
      // Reset everything
      setPasswordStep(1);
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Error setting new password");
    } finally {
      setPasswordLoading(false);
    }
  };
  // --- END: New Password Reset Functions ---

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 px-2 sm:px-6 lg:px-8 space-y-6">
        <div className="space-y-6">
          {/* Profile Photo and Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="h-32 w-32">
                    <AvatarImage
                      src={user?.profile_image}
                      alt="Profile photo"
                    />
                    <AvatarFallback className="bg-breneo-blue/10 text-breneo-blue text-2xl">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={handlePhotoUploadClick}
                    className="absolute bottom-1 right-1 bg-breneo-blue hover:bg-breneo-blue/90 text-white rounded-full p-2 shadow-lg transition-colors disabled:opacity-50"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileClick} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={!isEditing}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={!isEditing}
                      placeholder="Enter your last name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Mobile Number</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={!isEditing}
                      placeholder="Enter your mobile number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      disabled
                      className="bg-gray-50"
                      placeholder="Email address"
                    />
                    {/* ✅ START: FIX */}
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed from this page.
                    </p>
                    {/* ✅ END: FIX */}
                  </div>
                  <Button
                    type="submit"
                    disabled={profileLoading}
                    className="w-full"
                  >
                    {isEditing
                      ? profileLoading
                        ? "Updating..."
                        : "Update Info"
                      : "Edit Your Info"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Password Change */}
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Step 1: Send Code */}
                {passwordStep === 1 && (
                  <form onSubmit={handleSendCode} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email_pass_reset">Email</Label>
                      <Input
                        id="email_pass_reset"
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-muted-foreground">
                        A verification code will be sent to this email.
                      </p>
                    </div>
                    <Button
                      type="submit"
                      disabled={passwordLoading}
                      className="w-full"
                    >
                      {passwordLoading ? "Sending..." : "Send Code"}
                    </Button>
                  </form>
                )}

                {/* Step 2: Verify Code */}
                {passwordStep === 2 && (
                  <form onSubmit={handleVerifyCode} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">Verification Code</Label>
                      <Input
                        id="code"
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Enter 6-digit code"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={passwordLoading}
                      className="w-full"
                    >
                      {passwordLoading ? "Verifying..." : "Verify Code"}
                    </Button>
                    <Button
                      variant="link"
                      type="button"
                      onClick={() => setPasswordStep(1)}
                      className="p-0 h-auto"
                    >
                      Back
                    </Button>
                  </form>
                )}

                {/* Step 3: Set New Password */}
                {passwordStep === 3 && (
                  <form onSubmit={handleSetNewPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">
                        Confirm New Password
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={passwordLoading}
                      className="w-full"
                    >
                      {passwordLoading ? "Updating..." : "Set New Password"}
                    </Button>
                    <Button
                      variant="link"
                      type="button"
                      onClick={() => setPasswordStep(2)}
                      className="p-0 h-auto"
                    >
                      Back
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                View your account details and status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Email:</span>
                  <span className="text-sm text-gray-600">{user?.email}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">User Type:</span>
                  <span className="text-sm text-gray-600">
                    {user?.user_type
                      ? user.user_type.charAt(0).toUpperCase() +
                        user.user_type.slice(1)
                      : "N/A"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
