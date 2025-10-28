import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import OptimizedAvatar from "@/components/ui/OptimizedAvatar";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Edit,
  Phone,
  Mail,
  Plus,
  Settings,
  Award,
  Camera,
  Trash2,
  Upload,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import apiClient from "@/lib/api";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface SkillTestResult {
  final_role?: string;
  skills_json?: {
    tech?: Record<string, string>;
    soft?: Record<string, string>;
  };
}

interface ProfileData {
  about_me?: string | null;
  profile_image?: string | null;
  profile?: {
    about_me?: string | null;
    profile_image?: string | null;
    [key: string]: unknown;
  };
  user?: {
    about_me?: string | null;
    profile_image?: string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const ProfilePage = () => {
  // ✅ Get user, loading state, and logout function from AuthContext
  const { user, loading, logout } = useAuth();
  const isMobile = useMobile();
  const navigate = useNavigate();

  // State for skill test results
  const [skillResults, setSkillResults] = useState<SkillTestResult | null>(
    null
  );
  const [loadingResults, setLoadingResults] = useState(false);

  // State for profile data from API
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [aboutMe, setAboutMe] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());

  // Initialize profile image from user context on mount
  useEffect(() => {
    if (user?.profile_image) {
      setProfileImage(user.profile_image);
    }
  }, [user?.profile_image]);

  // About Me modal state
  const [isAboutMeModalOpen, setIsAboutMeModalOpen] = useState(false);
  const [aboutMeText, setAboutMeText] = useState("");
  const [updatingAboutMe, setUpdatingAboutMe] = useState(false);

  // Profile image options modal state
  const [isProfileImageModalOpen, setIsProfileImageModalOpen] = useState(false);

  const { toast } = useToast();

  // Fetch skill test results
  useEffect(() => {
    const fetchSkillResults = async () => {
      if (!user) return;

      setLoadingResults(true);
      try {
        // Pass user ID as query parameter to fetch user-specific results
        const response = await apiClient.get(
          `/api/skilltest/results/?user=${user.id}`
        );

        console.log("🔍 Skill test results response:", response.data);
        console.log("🔍 Response type:", typeof response.data);
        console.log("🔍 Is array?", Array.isArray(response.data));

        // Handle different response structures
        if (Array.isArray(response.data) && response.data.length > 0) {
          console.log("✅ Got array with length:", response.data.length);
          setSkillResults(response.data[0]);
        } else if (response.data && typeof response.data === "object") {
          console.log("✅ Got object response");
          setSkillResults(response.data);
        } else {
          console.log("⚠️ Unexpected response structure");
        }
      } catch (error) {
        console.error("❌ Error fetching skill test results:", error);
        setSkillResults(null);
      } finally {
        setLoadingResults(false);
      }
    };

    fetchSkillResults();
  }, [user]);

  // Debug: Log skillResults changes
  useEffect(() => {
    if (skillResults) {
      console.log("✅ SkillResults updated:", skillResults);
      console.log("✅ Final role:", skillResults.final_role);
      console.log("✅ Skills JSON:", skillResults.skills_json);
    }
  }, [skillResults]);

  // Fetch profile data from API endpoint
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;

      setLoadingProfile(true);

      // Check if we have an access token
      const token = localStorage.getItem("authToken");
      console.log("🔑 Access token exists:", !!token);
      if (token) {
        console.log("🔑 Token preview:", token.substring(0, 50) + "...");
      }

      try {
        // Prepare request headers with Bearer token
        const requestHeaders = token
          ? { Authorization: `Bearer ${token}` }
          : {};

        console.log("🌐 Making authenticated request to /api/profile/");
        console.log("🌐 Request URL: https://breneo.onrender.com/api/profile/");
        console.log("🌐 Request Method: GET");
        console.log("🌐 Request Headers:", requestHeaders);
        console.log("🌐 Bearer Token being sent:", token ? "✅ YES" : "❌ NO");
        console.log("🌐 Token length:", token?.length || 0);

        // Make the API call with explicit Authorization header
        const response = await apiClient.get("/api/profile/", {
          headers: requestHeaders,
        });

        // Log the raw response
        console.log("✅ API Request successful!");
        console.log("📊 Raw API Response:", response);
        console.log("📊 API Response Status:", response.status);
        console.log("📊 API Response Headers:", response.headers);
        console.log("📊 API Response Data:", response.data);

        // Check if data exists
        if (!response.data) {
          console.warn("⚠️ No data in response");
          setProfileData(null);
          setAboutMe(null);
          setProfileImage(null);
          return;
        }

        // Log the full profile data structure
        console.log(
          "📊 Full Profile Data Structure:",
          JSON.stringify(response.data, null, 2)
        );

        // Set all profile data
        setProfileData(response.data);

        // Log all available keys in the response
        console.log(
          "📊 All available keys in response.data:",
          Object.keys(response.data || {})
        );

        // Log nested structures if they exist
        if (response.data?.profile) {
          console.log(
            "📊 Profile object keys:",
            Object.keys(response.data.profile)
          );
          console.log("📊 Profile object:", response.data.profile);
        }
        if (response.data?.user) {
          console.log("📊 User object keys:", Object.keys(response.data.user));
          console.log("📊 User object:", response.data.user);
        }

        // Extract about_me if it exists in the response
        const aboutMeValue =
          response.data?.about_me ||
          response.data?.profile?.about_me ||
          response.data?.user?.about_me ||
          null;
        setAboutMe(aboutMeValue);
        console.log("✅ Extracted about_me value:", aboutMeValue);

        // Initialize aboutMeText with the fetched value
        setAboutMeText(aboutMeValue || "");

        // Extract profile_image if it exists in the response
        const profileImageValue =
          response.data?.profile_image ||
          response.data?.profile?.profile_image ||
          response.data?.user?.profile_image ||
          null;
        setProfileImage(profileImageValue);
        console.log("✅ Extracted profile_image value:", profileImageValue);

        // Log all other profile fields that might be useful
        console.log("📊 Available profile fields:");
        Object.entries(response.data || {}).forEach(([key, value]) => {
          if (key !== "profile" && key !== "user") {
            console.log(`  - ${key}:`, value);
          }
        });

        // Summary log of what the API returns
        console.log("═══════════════════════════════════════════");
        console.log("📋 SUMMARY: API Response from /api/profile/");
        console.log("═══════════════════════════════════════════");
        console.log("🔒 Authentication: Bearer Token ✅");
        console.log("✅ Response Status:", response.status);
        console.log("✅ Response Headers:", response.headers);
        console.log("✅ Full Response Data:", response.data);
        console.log("✅ All Top-Level Keys:", Object.keys(response.data || {}));
        console.log("✅ About Me:", aboutMeValue);
        console.log("✅ Profile Image:", profileImageValue);
        console.log("✅ User ID from context:", user.id);
        console.log("═══════════════════════════════════════════");
        console.log(
          "✅ SUCCESS: Protected endpoint accessed with Bearer token!"
        );
        console.log("✅ Full user profile data retrieved from /api/profile/");
        console.log("═══════════════════════════════════════════");
      } catch (error) {
        console.error("❌ Error fetching profile data:", error);
        if (error && typeof error === "object" && "response" in error) {
          const axiosError = error as {
            response?: { data?: unknown; status?: number };
            message?: string;
          };
          console.error("❌ Error response:", axiosError.response?.data);
          console.error("❌ Error status:", axiosError.response?.status);
          console.error("❌ Error message:", axiosError.message);
        }
        setProfileData(null);
        setAboutMe(null);
        setProfileImage(null);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfileData();
  }, [user]);

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

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      return;
    }

    setUploadingImage(true);

    // Clear current image to show fallback
    setProfileImage(null);

    try {
      const formData = new FormData();
      formData.append("profile_image", file);

      const token = localStorage.getItem("authToken");

      // Upload the image
      const uploadResponse = await apiClient.patch("/api/profile/", formData, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("✅ Image upload response:", uploadResponse.data);

      // Update local state
      const newProfileImage =
        uploadResponse.data?.profile_image ||
        uploadResponse.data?.profile?.profile_image ||
        uploadResponse.data?.user?.profile_image ||
        null;

      // Update the image with the new URL
      setProfileImage(newProfileImage);

      // Update timestamp to force image reload
      setImageTimestamp(Date.now());

      toast({
        title: "Success",
        description: "Profile image has been updated successfully.",
      });

      // Reload page to refresh user context with new profile image
      // This ensures the image persists and is available everywhere
      setTimeout(() => {
        window.location.reload();
      }, 500);

      console.log("✅ Profile image uploaded successfully");
    } catch (error) {
      console.error("❌ Error uploading profile image:", error);
      alert("Failed to upload profile image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Handler to open profile image options modal
  const handleImageModalClick = () => {
    setIsProfileImageModalOpen(true);
  };

  // Handler to trigger file input click from modal
  const handleUploadFromModal = () => {
    document.getElementById("profile-image-input")?.click();
    setIsProfileImageModalOpen(false);
  };

  // Handler to remove profile image
  const handleRemoveImage = async () => {
    if (!user) return;

    if (!confirm("Are you sure you want to remove your profile image?")) {
      setIsProfileImageModalOpen(false);
      return;
    }

    setUploadingImage(true);
    setIsProfileImageModalOpen(false);

    try {
      const token = localStorage.getItem("authToken");

      const response = await apiClient.patch(
        "/api/profile/",
        { profile_image: null },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        }
      );

      console.log("✅ Image removal response:", response.data);

      setProfileImage(null);
      setImageTimestamp(Date.now());

      // Refresh profile data
      const profileResponse = await apiClient.get("/api/profile/", {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      setProfileData(profileResponse.data);

      toast({
        title: "Success",
        description: "Profile image has been removed.",
      });

      // Reload page to refresh user context
      setTimeout(() => {
        window.location.reload();
      }, 500);

      console.log("✅ Profile image removed successfully");
    } catch (error) {
      console.error("❌ Error removing profile image:", error);
      toast({
        title: "Error",
        description: "Failed to remove profile image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Handler to open About Me edit modal
  const handleOpenAboutMeModal = () => {
    setAboutMeText(aboutMe || "");
    setIsAboutMeModalOpen(true);
  };

  // Handler to save About Me
  const handleSaveAboutMe = async () => {
    if (!user) return;

    setUpdatingAboutMe(true);

    try {
      const token = localStorage.getItem("authToken");

      const response = await apiClient.patch(
        "/api/profile/",
        { about_me: aboutMeText },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        }
      );

      console.log("✅ About Me updated:", response.data);

      // Update local state
      setAboutMe(aboutMeText);

      // Refresh full profile data
      const profileResponse = await apiClient.get("/api/profile/", {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      setProfileData(profileResponse.data);

      setIsAboutMeModalOpen(false);

      toast({
        title: "Success",
        description: "About Me has been updated successfully.",
      });
    } catch (error) {
      console.error("❌ Error updating about me:", error);
      toast({
        title: "Error",
        description: "Failed to update About Me. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingAboutMe(false);
    }
  };

  // ✅ Use the 'user' object from the context directly
  const { first_name, last_name, email, phone_number } = user;

  // Use profile image from user context (same as UserSettings)
  // profileImage state is updated after upload to show the new image
  const displayProfileImage = profileImage || user?.profile_image;

  // Combine all skills from tech and soft - only show top 5 with > 0%
  const getAllSkills = () => {
    if (!skillResults?.skills_json) {
      console.log("⚠️ No skills_json in results");
      return [];
    }

    const tech = skillResults.skills_json.tech || {};
    const soft = skillResults.skills_json.soft || {};

    console.log("🔍 Tech skills:", tech);
    console.log("🔍 Soft skills:", soft);

    // Combine both and convert to array
    const allSkills = [
      ...Object.entries(tech).map(([skill, percentage]) => ({
        name: skill,
        percentage: parseFloat(String(percentage).replace("%", "")),
        type: "tech",
      })),
      ...Object.entries(soft).map(([skill, percentage]) => ({
        name: skill,
        percentage: parseFloat(String(percentage).replace("%", "")),
        type: "soft",
      })),
    ];

    console.log("🔍 All skills before filtering:", allSkills);

    // Filter skills > 0%, sort by percentage descending, and limit to top 5
    const filtered = allSkills
      .filter((skill) => skill.percentage > 0)
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);

    console.log("🔍 Top 5 skills:", filtered);

    return filtered;
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Left Column - Profile Summary */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Header Card */}
          <Card>
            <CardContent className="flex flex-col items-center pb-6 pt-6">
              <div
                className="relative group cursor-pointer"
                onClick={handleImageModalClick}
              >
                <OptimizedAvatar
                  key={`avatar-${imageTimestamp}`}
                  src={displayProfileImage || undefined}
                  alt="Profile photo"
                  fallback={
                    first_name ? first_name.charAt(0).toUpperCase() : "U"
                  }
                  size="xl"
                  loading="eager"
                  className="h-32 w-32"
                />
                {uploadingImage ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-3xl z-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    <Camera className="h-8 w-8 text-white" />
                  </div>
                )}
              </div>
              <input
                id="profile-image-input"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploadingImage}
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
              <Button
                variant="link"
                className="text-breneo-blue p-0 h-auto"
                onClick={handleOpenAboutMeModal}
              >
                <Edit size={16} className="mr-2" />
                Edit
              </Button>
            </CardHeader>
            <CardContent>
              {loadingProfile ? (
                <div className="text-center py-4 text-gray-500">Loading...</div>
              ) : aboutMe ? (
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {aboutMe}
                </p>
              ) : (
                <p className="text-gray-500 italic">
                  No information available. Add some details about yourself!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Debug: All Profile Data Card */}
          {profileData && (
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader>
                <h3 className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  Debug: All Profile Data
                </h3>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-4 rounded overflow-auto max-h-96">
                  {JSON.stringify(profileData, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

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
            </CardHeader>
            <CardContent>
              {loadingResults ? (
                <div className="text-center py-4 text-gray-500">
                  Loading skill results...
                </div>
              ) : skillResults &&
                (skillResults.final_role || getAllSkills().length > 0) ? (
                <div className="space-y-4">
                  {/* Final Role */}
                  {skillResults.final_role && (
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <span className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                          Recommended Role
                        </span>
                      </div>
                      <Badge className="text-base px-4 py-2 bg-blue-600 hover:bg-blue-700">
                        {skillResults.final_role}
                      </Badge>
                    </div>
                  )}

                  {/* Skills List - Top 5 */}
                  {getAllSkills().length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                        Top Skills
                      </h4>
                      {getAllSkills().map((skill) => {
                        const isStrong = skill.percentage >= 70;
                        return (
                          <div key={skill.name} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-700 dark:text-gray-300">
                                {skill.name}
                              </span>
                              <span
                                className={`font-semibold ${
                                  isStrong
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-orange-600 dark:text-orange-400"
                                }`}
                              >
                                {skill.percentage.toFixed(0)}%
                              </span>
                            </div>
                            <Progress
                              value={skill.percentage}
                              className={`h-2 ${
                                isStrong
                                  ? "bg-green-100 dark:bg-green-900/30"
                                  : "bg-orange-100 dark:bg-orange-900/30"
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {getAllSkills().length === 0 && !loadingResults && (
                    <div className="text-center py-4 text-gray-500">
                      No skill test results available. Take a skill test to see
                      your results here.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No skill test results available. Take a skill test to see your
                  results here.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* About Me Edit Modal */}
      {isMobile ? (
        <Drawer open={isAboutMeModalOpen} onOpenChange={setIsAboutMeModalOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Edit About Me</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="about-me">Tell us about yourself</Label>
                  <Textarea
                    id="about-me"
                    placeholder="Share something about yourself..."
                    value={aboutMeText}
                    onChange={(e) => setAboutMeText(e.target.value)}
                    className="mt-2 min-h-[200px]"
                    disabled={updatingAboutMe}
                  />
                </div>
              </div>
            </div>
            <DrawerFooter>
              <Button onClick={handleSaveAboutMe} disabled={updatingAboutMe}>
                {updatingAboutMe ? "Saving..." : "Save Changes"}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" disabled={updatingAboutMe}>
                  Cancel
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isAboutMeModalOpen} onOpenChange={setIsAboutMeModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit About Me</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="about-me">Tell us about yourself</Label>
                  <Textarea
                    id="about-me"
                    placeholder="Share something about yourself..."
                    value={aboutMeText}
                    onChange={(e) => setAboutMeText(e.target.value)}
                    className="mt-2 min-h-[200px]"
                    disabled={updatingAboutMe}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAboutMeModalOpen(false)}
                disabled={updatingAboutMe}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveAboutMe} disabled={updatingAboutMe}>
                {updatingAboutMe ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Profile Image Options Modal */}
      {isMobile ? (
        <Drawer
          open={isProfileImageModalOpen}
          onOpenChange={setIsProfileImageModalOpen}
        >
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Profile Photo</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4">
              <div className="space-y-2">
                <Button
                  onClick={handleUploadFromModal}
                  className="w-full justify-start gap-3"
                  variant="ghost"
                  disabled={uploadingImage}
                >
                  <Upload className="h-5 w-5" />
                  {displayProfileImage ? "Update Photo" : "Upload Photo"}
                </Button>
                {displayProfileImage && (
                  <Button
                    onClick={handleRemoveImage}
                    className="w-full justify-start gap-3 text-red-600 hover:text-red-700"
                    variant="ghost"
                    disabled={uploadingImage}
                  >
                    <Trash2 className="h-5 w-5" />
                    Remove Photo
                  </Button>
                )}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog
          open={isProfileImageModalOpen}
          onOpenChange={setIsProfileImageModalOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Profile Photo</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-2">
                <Button
                  onClick={handleUploadFromModal}
                  className="w-full justify-start gap-3"
                  variant="ghost"
                  disabled={uploadingImage}
                >
                  <Upload className="h-5 w-5" />
                  {displayProfileImage ? "Update Photo" : "Upload Photo"}
                </Button>
                {displayProfileImage && (
                  <Button
                    onClick={handleRemoveImage}
                    className="w-full justify-start gap-3 text-red-600 hover:text-red-700"
                    variant="ghost"
                    disabled={uploadingImage}
                  >
                    <Trash2 className="h-5 w-5" />
                    Remove Photo
                  </Button>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsProfileImageModalOpen(false)}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
};

export default ProfilePage;
