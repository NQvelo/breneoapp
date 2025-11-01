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
import OptimizedAvatar, {
  useImagePreloader,
} from "@/components/ui/OptimizedAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import apiClient, { createFormDataRequest } from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import axios, { AxiosError } from "axios";
import { Camera } from "lucide-react";

interface AcademyProfile {
  id: string;
  academy_name: string;
  description: string;
  website_url: string;
  contact_email: string;
  logo_url: string | null;
}

export default function AcademySettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { preloadImage } = useImagePreloader();
  const [isEditing, setIsEditing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Profile form state
  const [academyName, setAcademyName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [academyProfile, setAcademyProfile] = useState<AcademyProfile | null>(
    null
  );

  // --- Password Reset State ---
  const [passwordStep, setPasswordStep] = useState(1);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  // ---

  // Fetch academy profile data
  useEffect(() => {
    const fetchAcademyData = async () => {
      // Wait for auth to complete
      if (authLoading) {
        return;
      }

      if (!user) {
        setLoadingData(false);
        return;
      }

      // ✅ Check if token exists before making API calls
      const hasToken =
        typeof window !== "undefined" && !!localStorage.getItem("authToken");
      if (!hasToken) {
        console.error("❌ No token available, cannot fetch academy profile");
        setLoadingData(false);
        toast.error(
          "Authentication Error: Please log in again to access academy settings."
        );
        return;
      }

      try {
        // Get phone number from user context
        setPhoneNumber(user.phone_number || "");

        // ✅ Fetch academy profile from API (same as AcademyProfilePage)
        try {
          const academyResponse = await apiClient.get(
            API_ENDPOINTS.ACADEMY.PROFILE
          );

          if (academyResponse.data) {
            const data = academyResponse.data;
            console.log("✅ Academy profile data:", data);
            setAcademyProfile(data);
            setAcademyName(data.academy_name || "");
            setWebsiteUrl(data.website_url || "");
            setContactEmail(data.contact_email || "");
          }
        } catch (error: unknown) {
          // Handle specific error cases without triggering logout
          const academyError = error as AxiosError;
          const status = academyError.response?.status;
          const errorData = academyError.response?.data as
            | {
                detail?: string;
                message?: string;
              }
            | undefined;

          // 404 means academy profile doesn't exist yet - this is okay
          if (status === 404) {
            console.log(
              "✅ Academy profile not found (404) - user may need to create one"
            );
            // Don't show error - user can create profile from settings
            setAcademyProfile(null);
          }
          // 401 might mean profile doesn't exist or permissions issue
          else if (status === 401) {
            const errorDetail = errorData?.detail || errorData?.message || "";
            const errorMessage = String(errorDetail).toLowerCase();
            const isProfileNotFound =
              errorMessage.includes("not found") ||
              errorMessage.includes("does not exist") ||
              errorMessage.includes("user not found");

            if (isProfileNotFound) {
              console.log(
                "✅ Profile not found based on error message - treating as 404"
              );
              setAcademyProfile(null);
            } else {
              console.warn("⚠️ Academy profile returned 401:", errorDetail);
              // Still allow user to continue - they might need to create profile
              setAcademyProfile(null);
            }
          }
          // 403 means forbidden
          else if (status === 403) {
            console.error("Access forbidden to academy profile");
            toast.error(
              "Access Denied: You don't have permission to access academy settings."
            );
          }
          // Other errors
          else {
            console.error("Error fetching academy profile:", academyError);
            toast.error(
              "Error fetching profile: Could not load academy profile data. Please try again."
            );
          }
        }
      } catch (error) {
        console.error("Unexpected error fetching academy data:", error);
        toast.error("Failed to load academy data");
      } finally {
        setLoadingData(false);
      }
    };

    fetchAcademyData();
  }, [user, authLoading]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Clear phone error when editing is disabled
  useEffect(() => {
    if (!isEditing) {
      setPhoneError("");
    }
  }, [isEditing]);

  // Get initials for avatar
  const getInitials = () => {
    if (academyName) {
      return academyName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || "A";
  };

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

  const handlePhotoUploadClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = handlePhotoUpload;
    input.click();
  };

  const handlePhotoUpload = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    if (!user || !user.id) {
      toast.error("User ID not found. Please log in again.");
      return;
    }

    try {
      setPhotoUploading(true);

      // Create FormData for file upload
      const formData = createFormDataRequest({ profile_image: file });

      // Upload the image using the correct endpoint (no ID in URL)
      const response = await apiClient.patch(
        API_ENDPOINTS.AUTH.PROFILE,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Update user data in AuthContext
      if (response.data && user) {
        const updatedUser = {
          ...user,
          profile_image: response.data.profile_image,
        };

        // Preload the new image for better performance
        if (response.data.profile_image) {
          preloadImage(response.data.profile_image).catch(console.error);
        }

        toast.success("Profile photo updated successfully!");

        // Clear preview and reload the page to refresh user data
        setImagePreview(null);
        window.location.reload();
      }
    } catch (error) {
      console.error("Photo upload failed:", error);
      if (axios.isAxiosError(error)) {
        const errorMessage =
          error.response?.data?.detail ||
          error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to upload profile photo. Please try again.";
        toast.error(errorMessage);
      } else {
        toast.error("Failed to upload profile photo. Please try again.");
      }
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    // Check if there are any changes
    const hasChanges =
      academyName !== (academyProfile?.academy_name || "") ||
      phoneNumber !== (user?.phone_number || "") ||
      websiteUrl !== (academyProfile?.website_url || "") ||
      contactEmail !== (academyProfile?.contact_email || "");

    if (!hasChanges) {
      // No changes made, just revert to disabled state
      setIsEditing(false);
      return;
    }

    // Validate required fields
    if (!academyName.trim()) {
      toast.error("Academy name is required.");
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
      // Update phone number through profile API
      if (phoneNumber !== (user?.phone_number || "")) {
        await apiClient.patch(API_ENDPOINTS.AUTH.PROFILE, {
          phone_number: phoneNumber,
        });
        console.log("Phone number updated successfully");
      }

      // ✅ Update academy profile through API (same pattern as AcademyProfilePage)
      // Use POST if profile doesn't exist, PATCH if it does
      try {
        const method = academyProfile ? "patch" : "post";
        const academyData = {
          academy_name: academyName.trim(),
          description: academyProfile?.description || "", // Preserve existing description
          website_url: websiteUrl.trim() || null,
          contact_email: contactEmail.trim() || null,
        };

        const academyResponse = await apiClient[method](
          API_ENDPOINTS.ACADEMY.PROFILE,
          academyData
        );

        if (academyResponse.data) {
          // Update academy profile state
          const updatedProfile: AcademyProfile = {
            id: academyProfile?.id || academyResponse.data.id || "",
            academy_name: academyName.trim(),
            description:
              academyResponse.data.description ||
              academyProfile?.description ||
              "",
            website_url: websiteUrl.trim() || "",
            contact_email: contactEmail.trim() || "",
            logo_url:
              academyProfile?.logo_url || academyResponse.data.logo_url || null,
          };
          setAcademyProfile(updatedProfile);
          console.log(
            "✅ Academy profile updated successfully:",
            updatedProfile
          );
        }
      } catch (academyError: unknown) {
        console.error("Error updating academy profile:", academyError);
        const axiosError = academyError as AxiosError;
        let errorMessage =
          "Failed to update academy profile. Please try again.";

        if (axiosError.response?.data) {
          const errorData = axiosError.response.data as {
            detail?: string;
            message?: string;
          };
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } else if (academyError instanceof Error) {
          errorMessage = academyError.message;
        }

        throw new Error(errorMessage);
      }

      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (err: unknown) {
      console.error("Error updating profile:", err);
      let errorMessage = "Failed to update profile.";
      if (axios.isAxiosError(err) && err.response) {
        errorMessage =
          err.response.data.detail ||
          err.response.data.message ||
          "An error occurred.";
      } else if (err instanceof Error) {
        errorMessage = err.message;
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
  // --- END: Password Reset Functions ---

  // Show loading state while fetching data
  if (loadingData || authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading academy settings...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-none mx-auto py-6 px-4 sm:px-8 lg:px-12 xl:px-16 space-y-6">
        <div className="space-y-6">
          {/* Profile Photo and Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <OptimizedAvatar
                    src={imagePreview || user?.profile_image}
                    alt="Profile photo"
                    fallback={getInitials()}
                    size="xl"
                    loading="eager"
                    className="h-32 w-32"
                  />
                  <button
                    onClick={handlePhotoUploadClick}
                    disabled={photoUploading}
                    className="absolute bottom-1 right-1 bg-breneo-blue hover:bg-breneo-blue/90 text-white rounded-full p-2 shadow-lg transition-colors disabled:opacity-50"
                  >
                    {photoUploading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Academy Information */}
            <Card>
              <CardHeader>
                <CardTitle>Academy Information</CardTitle>
                <CardDescription>
                  Update your academy's information.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSave} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="academyName">Academy Name</Label>
                    <Input
                      id="academyName"
                      type="text"
                      value={academyName}
                      onChange={(e) => setAcademyName(e.target.value)}
                      disabled={!isEditing}
                      placeholder="Enter academy name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="websiteUrl">Website URL</Label>
                    <Input
                      id="websiteUrl"
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      disabled={!isEditing}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      disabled={!isEditing}
                      placeholder="contact@example.com"
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
                      value={user?.email || ""}
                      disabled
                      className="bg-muted/50 text-muted-foreground"
                      placeholder="Email address"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed from this page.
                    </p>
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
