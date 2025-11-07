import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import OptimizedAvatar, {
  useImagePreloader,
} from "@/components/ui/OptimizedAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import apiClient, { createFormDataRequest } from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import axios, { AxiosError } from "axios";
import { Link, useLocation } from "react-router-dom";
import { Camera } from "lucide-react";
import { PWAInstallCard } from "@/components/common/PWAInstallCard";

interface AcademyProfile {
  id: string;
  academy_name: string;
  description: string;
  website_url: string;
  contact_email: string;
  logo_url: string | null;
}

export default function AcademySettingsPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { preloadImage } = useImagePreloader();
  const location = useLocation();
  const [mounted, setMounted] = useState(false);

  // Preferences state
  const [soundEffects, setSoundEffects] = useState(true);
  const [animations, setAnimations] = useState(true);
  const [motivationalMessages, setMotivationalMessages] = useState(true);
  const [listeningExercises, setListeningExercises] = useState(true);

  // Profile editing state
  const [isEditing, setIsEditing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [academyName, setAcademyName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [academyProfile, setAcademyProfile] = useState<AcademyProfile | null>(
    null
  );

  // Password Reset State
  const [passwordStep, setPasswordStep] = useState(1);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    setMounted(true);
    const savedSoundEffects = localStorage.getItem("pref_sound_effects");
    const savedAnimations = localStorage.getItem("pref_animations");
    const savedMotivationalMessages = localStorage.getItem(
      "pref_motivational_messages"
    );
    const savedListeningExercises = localStorage.getItem(
      "pref_listening_exercises"
    );

    if (savedSoundEffects !== null)
      setSoundEffects(savedSoundEffects === "true");
    if (savedAnimations !== null)
      setAnimations(savedAnimations === "true");
    if (savedMotivationalMessages !== null)
      setMotivationalMessages(savedMotivationalMessages === "true");
    if (savedListeningExercises !== null)
      setListeningExercises(savedListeningExercises === "true");
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("pref_sound_effects", String(soundEffects));
    }
  }, [soundEffects, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("pref_animations", String(animations));
    }
  }, [animations, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        "pref_motivational_messages",
        String(motivationalMessages)
      );
    }
  }, [motivationalMessages, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        "pref_listening_exercises",
        String(listeningExercises)
      );
    }
  }, [listeningExercises, mounted]);

  // Fetch academy profile data
  useEffect(() => {
    const fetchAcademyData = async () => {
      if (authLoading) {
        return;
      }

      if (!user) {
        setLoadingData(false);
        return;
      }

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
        setPhoneNumber(user.phone_number || "");

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
          const academyError = error as AxiosError;
          const status = academyError.response?.status;
          const errorData = academyError.response?.data as
            | {
                detail?: string;
                message?: string;
              }
            | undefined;

          if (status === 404) {
            console.log(
              "✅ Academy profile not found (404) - user may need to create one"
            );
            setAcademyProfile(null);
          } else if (status === 401) {
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
              setAcademyProfile(null);
            }
          } else if (status === 403) {
            console.error("Access forbidden to academy profile");
            toast.error(
              "Access Denied: You don't have permission to access academy settings."
            );
          } else {
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
    if (!phone) return true;
    const phoneRegex = /^\+?[\d\s\-().]{7,15}$/;
    const digitsOnly = phone.replace(/\D/g, "");

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

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    if (!user || !user.id) {
      toast.error("User ID not found. Please log in again.");
      return;
    }

    try {
      setPhotoUploading(true);
      const formData = createFormDataRequest({ profile_image: file });

      const response = await apiClient.patch(
        API_ENDPOINTS.AUTH.PROFILE,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data && user) {
        const updatedUser = {
          ...user,
          profile_image: response.data.profile_image,
        };

        if (response.data.profile_image) {
          preloadImage(response.data.profile_image).catch(console.error);
        }

        toast.success("Profile photo updated successfully!");
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

    const hasChanges =
      academyName !== (academyProfile?.academy_name || "") ||
      phoneNumber !== (user?.phone_number || "") ||
      websiteUrl !== (academyProfile?.website_url || "") ||
      contactEmail !== (academyProfile?.contact_email || "");

    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    if (!academyName.trim()) {
      toast.error("Academy name is required.");
      return;
    }

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
      if (phoneNumber !== (user?.phone_number || "")) {
        await apiClient.patch(API_ENDPOINTS.AUTH.PROFILE, {
          phone_number: phoneNumber,
        });
        console.log("Phone number updated successfully");
      }

      try {
        const method = academyProfile ? "patch" : "post";
        const academyData = {
          academy_name: academyName.trim(),
          description: academyProfile?.description || "",
          website_url: websiteUrl.trim() || null,
          contact_email: contactEmail.trim() || null,
        };

        const academyResponse = await apiClient[method](
          API_ENDPOINTS.ACADEMY.PROFILE,
          academyData
        );

        if (academyResponse.data) {
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

  // Password Reset Functions
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

  const handleLogout = () => {
    logout();
  };

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

  // Get dark mode value for display
  const darkModeValue = theme === "dark" ? "ON" : "OFF";

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-8 lg:px-12 xl:px-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Left Column - Preferences */}
          <div className="space-y-8">
            <h1 className="text-3xl font-bold">Preferences</h1>

            {/* Lesson experience section */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-medium text-muted-foreground mb-2">
                  Lesson experience
                </h2>
                <Separator />
              </div>
        <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sound-effects" className="text-base font-normal">
                    Sound effects
                  </Label>
                  <Switch
                    id="sound-effects"
                    checked={soundEffects}
                    onCheckedChange={setSoundEffects}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="animations" className="text-base font-normal">
                    Animations
                  </Label>
                  <Switch
                    id="animations"
                    checked={animations}
                    onCheckedChange={setAnimations}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="motivational-messages"
                    className="text-base font-normal"
                  >
                    Motivational messages
                  </Label>
                  <Switch
                    id="motivational-messages"
                    checked={motivationalMessages}
                    onCheckedChange={setMotivationalMessages}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="listening-exercises"
                    className="text-base font-normal"
                  >
                    Listening exercises
                  </Label>
                  <Switch
                    id="listening-exercises"
                    checked={listeningExercises}
                    onCheckedChange={setListeningExercises}
                  />
                </div>
              </div>
            </div>

            {/* Appearance section */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-medium text-muted-foreground mb-2">
                  Appearance
                </h2>
                <Separator />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode" className="text-base font-normal">
                  Dark mode
                </Label>
                <Select
                  value={theme || "light"}
                  onValueChange={(value) => setTheme(value as "light" | "dark")}
                >
                  <SelectTrigger id="dark-mode" className="w-32">
                    <SelectValue>
                      {darkModeValue}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">OFF</SelectItem>
                    <SelectItem value="dark">ON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar Navigation */}
          <div className="space-y-4">
            <PWAInstallCard />
            
            {/* Account Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link
                  to="/academy/settings"
                  className={`block text-sm transition-colors ${
                    location.pathname === "/academy/settings"
                      ? "text-primary font-medium"
                      : "text-foreground hover:text-primary"
                  }`}
                >
                  Preferences
                </Link>
                <Link
                  to="/academy/profile"
                  className={`block text-sm transition-colors ${
                    location.pathname === "/academy/profile"
                      ? "text-primary font-medium"
                      : "text-foreground hover:text-primary"
                  }`}
                >
                  Profile
                </Link>
                <Link
                  to="/academy/profile"
                  className="block text-sm text-foreground hover:text-primary transition-colors"
                >
                  Privacy settings
                </Link>
            </CardContent>
          </Card>

            {/* Subscription Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Subscription</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  to="/subscription"
                  className="block text-sm text-foreground hover:text-primary transition-colors"
                >
                  Choose a plan
                </Link>
              </CardContent>
            </Card>

            {/* Support Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Support</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  to="/help"
                  className="block text-sm text-foreground hover:text-primary transition-colors"
                >
                  Help Center
                </Link>
              </CardContent>
            </Card>

            {/* Logout Button */}
            <Button
              variant="link"
              onClick={handleLogout}
              className="w-full text-primary hover:text-primary/80 justify-center"
            >
              LOG OUT
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
