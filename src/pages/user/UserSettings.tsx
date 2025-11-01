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
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import axios from "axios";

export default function SettingsPage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Profile form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");

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

  // Clear phone error when editing is disabled
  useEffect(() => {
    if (!isEditing) {
      setPhoneError("");
    }
  }, [isEditing]);

  // Phone number validation
  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) return true; // Empty is allowed (optional field)

    // International phone number regex:
    // - Optional + at the start
    // - Only digits (0-9) and spaces, dashes, parentheses, and dots allowed
    // - Minimum 7 digits (shortest valid international number like Tuvalu: +688)
    // - Maximum 15 digits (ITU-T E.164 standard limit)
    const phoneRegex = /^\+?[\d\s\-().]{7,15}$/;

    // Remove all non-digit characters for length check
    const digitsOnly = phone.replace(/\D/g, "");

    // Check format and length
    if (!phoneRegex.test(phone)) {
      setPhoneError(
        "Phone number can only contain digits, spaces, hyphens, parentheses, and dots, optionally starting with +"
      );
      return false;
    }

    if (digitsOnly.length < 7) {
      setPhoneError("Phone number must contain at least 7 digits");
      return false;
    }

    if (digitsOnly.length > 15) {
      setPhoneError("Phone number must not exceed 15 digits");
      return false;
    }

    setPhoneError("");
    return true;
  };

  const handleProfileClick = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    // Check if there are any changes
    const hasChanges =
      firstName !== (user?.first_name || "") ||
      lastName !== (user?.last_name || "") ||
      phoneNumber !== (user?.phone_number || "");

    if (!hasChanges) {
      // No changes made, just revert to disabled state
      setIsEditing(false);
      return;
    }

    // Validate phone number before submitting
    if (!validatePhoneNumber(phoneNumber)) {
      return;
    }

    setProfileLoading(true);

    if (!user || !user.id) {
      toast.error("User ID not found. Please log in again.");
      setProfileLoading(false);
      return;
    }

    try {
      await apiClient.patch(API_ENDPOINTS.AUTH.PROFILE, {
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
      });

      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (err: unknown) {
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
      const res = await apiClient.post(API_ENDPOINTS.AUTH.PASSWORD_RESET, {
        email: user.email,
      });
      toast.success(res.data.message || "Code sent to your email!");
      setPasswordStep(2);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error || "Error sending code");
      } else {
        toast.error("Error sending code");
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    try {
      const res = await apiClient.post(
        API_ENDPOINTS.AUTH.PASSWORD_RESET_VERIFY,
        {
          email: user?.email,
          code: code,
        }
      );
      toast.success(res.data.message || "Code verified!");
      setPasswordStep(3);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error || "Invalid code");
      } else {
        toast.error("Invalid code");
      }
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
      const res = await apiClient.post(
        API_ENDPOINTS.AUTH.PASSWORD_RESET_CONFIRM,
        {
          email: user?.email,
          code: code,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }
      );
      toast.success(res.data.message || "Password updated successfully!");
      // Reset everything
      setPasswordStep(1);
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error || "Error setting new password");
      } else {
        toast.error("Error setting new password");
      }
    } finally {
      setPasswordLoading(false);
    }
  };
  // --- END: New Password Reset Functions ---

  return (
    <DashboardLayout>
      <div className="max-w-none mx-auto py-6 px-4 sm:px-8 lg:px-12 xl:px-16 space-y-6">
        <div className="space-y-6">
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
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        if (isEditing) {
                          validatePhoneNumber(e.target.value);
                        }
                      }}
                      disabled={!isEditing}
                      placeholder="+1 234 567 8900"
                      className={phoneError ? "border-red-500" : ""}
                    />
                    {phoneError && (
                      <p className="text-sm text-red-500">{phoneError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      International format: minimum 7 digits, maximum 15 digits.
                      (e.g., +1 234 567 8900)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      disabled
                      className="bg-muted/50 text-muted-foreground"
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
                        className="bg-muted/50 text-muted-foreground"
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
                  <span className="text-sm text-muted-foreground">
                    {user?.email}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">User Type:</span>
                  <span className="text-sm text-muted-foreground">
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
