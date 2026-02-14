import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { useFontSize } from "@/contexts/FontSizeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import axios from "axios";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  Mail,
  Bell,
  CreditCard,
  BookOpen,
  AlertCircle,
  LogOut,
} from "lucide-react";
import { PWAInstallCard } from "@/components/common/PWAInstallCard";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { bogService } from "@/api/bog/bogService";
import { PaymentTransaction } from "@/api/bog/bogService";

type SettingsSection =
  | "account"
  | "notifications"
  | "privacy"
  | "subscription"
  | "learning"
  | "accessibility";

const settingsSections: Array<{ id: SettingsSection; label: string }> = [
  { id: "account", label: "Account Settings" },
  { id: "notifications", label: "Notifications" },
  { id: "privacy", label: "Privacy & Security" },
  { id: "subscription", label: "Subscription & Billing" },
  { id: "learning", label: "Learning Preferences" },
  { id: "accessibility", label: "Theme & Accessibility" },
];

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { fontSize: contextFontSize, setFontSize: setContextFontSize } =
    useFontSize();
  const { language: contextLanguage, setLanguage: setContextLanguage } =
    useLanguage();
  const isMobile = useMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeButtonRef = useRef<HTMLButtonElement>(null);

  // Get initial section from URL or default to account
  const getInitialSection = (): SettingsSection => {
    const validSections: SettingsSection[] = [
      "account",
      "notifications",
      "privacy",
      "subscription",
      "learning",
      "accessibility",
    ];
    try {
      const sectionFromUrl = searchParams.get("section") as SettingsSection;
      if (sectionFromUrl && validSections.includes(sectionFromUrl)) {
        return sectionFromUrl;
      }
    } catch (error) {
      console.error("Error getting initial section:", error);
    }
    return "account";
  };

  const [activeSection, setActiveSection] = useState<SettingsSection>(() =>
    getInitialSection(),
  );
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  // Handle payment redirect status
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      toast.success(
        "Payment successful! Your subscription has been activated.",
      );
      // Clean up URL
      setSearchParams((prev) => {
        prev.delete("payment");
        return prev;
      });
    } else if (paymentStatus === "failed") {
      toast.error("Payment failed. Please try again.");
      // Clean up URL
      setSearchParams((prev) => {
        prev.delete("payment");
        return prev;
      });
    }
  }, [searchParams, setSearchParams]);

  // Scroll active button into view on mobile (for horizontal switcher)
  useEffect(() => {
    if (!isMobile || !scrollContainerRef.current) return;

    const timeoutId = setTimeout(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const activeButton = container.querySelector(
        `[data-section="${activeSection}"]`,
      ) as HTMLButtonElement;

      if (!activeButton) return;

      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      const scrollLeft = container.scrollLeft;
      const buttonLeft = buttonRect.left - containerRect.left + scrollLeft;
      const buttonWidth = buttonRect.width;
      const containerWidth = containerRect.width;

      // Center the button in the container
      const targetScroll = buttonLeft - containerWidth / 2 + buttonWidth / 2;

      container.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: "smooth",
      });
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [activeSection, isMobile]);

  // Account Settings
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const isEditingRef = useRef(false);
  const [passwordStep, setPasswordStep] = useState(1);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Notifications
  const [emailJobMatches, setEmailJobMatches] = useState(true);
  const [emailNewCourses, setEmailNewCourses] = useState(true);
  const [emailSkillUpdates, setEmailSkillUpdates] = useState(true);
  const [inAppMessages, setInAppMessages] = useState(true);
  const [inAppProgress, setInAppProgress] = useState(true);
  const [newsletter, setNewsletter] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);

  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    is_active: boolean;
    plan_name?: string;
    next_payment_date?: string;
    card_mask?: string;
    card_type?: string;
  } | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Privacy & Security
  const [showSkills, setShowSkills] = useState(true);
  const [showTestResults, setShowTestResults] = useState(true);
  const [showCompletedCourses, setShowCompletedCourses] = useState(true);

  // Learning Preferences
  const [aiRecommendationFrequency, setAiRecommendationFrequency] = useState<
    "daily" | "weekly" | "monthly"
  >("weekly");

  // Accessibility
  const [fontSize, setFontSize] = useState<"small" | "medium" | "big">(
    contextFontSize,
  );
  const [language, setLanguage] = useState<"en" | "ka">(contextLanguage);

  // Handler to change section
  const handleSectionChange = (section: SettingsSection) => {
    setActiveSection(section);
  };

  // Initialize name fields from user data (only when not actively editing)
  useEffect(() => {
    if (user && !isEditingRef.current) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.first_name, user?.last_name]); // Update when user ID or name fields change

  // Sync fontSize and language with context
  useEffect(() => {
    setFontSize(contextFontSize);
  }, [contextFontSize]);

  useEffect(() => {
    setLanguage(contextLanguage);
  }, [contextLanguage]);

  // Load preferences from localStorage and set mounted
  useEffect(() => {
    setMounted(true);
    // Load all preferences with error handling
    const loadPreference = <T,>(key: string, defaultValue: T): T => {
      try {
        const saved = localStorage.getItem(key);
        if (saved !== null) {
          const parsed = JSON.parse(saved);
          // Validate the parsed value matches the expected type
          return parsed;
        }
      } catch (error) {
        console.error(`Error loading preference ${key}:`, error);
        // Clear invalid data
        localStorage.removeItem(key);
      }
      return defaultValue;
    };

    setEmailJobMatches(loadPreference("notif_email_job_matches", true));
    setEmailNewCourses(loadPreference("notif_email_new_courses", true));
    setEmailSkillUpdates(loadPreference("notif_email_skill_updates", true));
    setInAppMessages(loadPreference("notif_in_app_messages", true));
    setInAppProgress(loadPreference("notif_in_app_progress", true));
    setNewsletter(loadPreference("notif_newsletter", false));
    setPushNotifications(loadPreference("notif_push", false));
    setShowSkills(loadPreference("privacy_show_skills", true));
    setShowTestResults(loadPreference("privacy_show_test_results", true));
    setShowCompletedCourses(
      loadPreference("privacy_show_completed_courses", true),
    );
    setAiRecommendationFrequency(
      loadPreference("ai_recommendation_frequency", "weekly"),
    );
    // Font size is now managed by FontSizeContext, but we keep local state for UI
    const savedFontSize = loadPreference(
      "breneo-font-size",
      contextFontSize,
    ) as string;
    // Map "large" to "big" if needed for backward compatibility
    const mappedFontSize = savedFontSize === "large" ? "big" : savedFontSize;
    if (["small", "medium", "big"].includes(mappedFontSize)) {
      setFontSize(mappedFontSize as "small" | "medium" | "big");
      setContextFontSize(mappedFontSize as "small" | "medium" | "big");
    }
    const savedLanguage = loadPreference("accessibility_language", "en");
    // Ensure only valid language codes are used
    if (savedLanguage === "en" || savedLanguage === "ka") {
      setLanguage(savedLanguage);
    } else {
      setLanguage("en");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch subscription info and payment history
  useEffect(() => {
    if (!mounted || activeSection !== "subscription") return;

    const loadData = async () => {
      try {
        setSubscriptionLoading(true);
        setHistoryLoading(true);
        
        const [subData, historyData] = await Promise.all([
          bogService.fetchSubscription(),
          bogService.fetchPaymentHistory()
        ]);
        
        setSubscriptionInfo(subData);
        setPaymentHistory(historyData);
      } catch (error) {
        console.error("Failed to fetch subscription data:", error);
      } finally {
        setSubscriptionLoading(false);
        setHistoryLoading(false);
      }
    };

    loadData();
  }, [mounted, activeSection]);

  // Update URL when section changes (only after component is mounted)
  useEffect(() => {
    if (!mounted) return;
    setSearchParams({ section: activeSection }, { replace: false });
  }, [activeSection, mounted, setSearchParams]);

  // Save preferences to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        "notif_email_job_matches",
        JSON.stringify(emailJobMatches),
      );
    }
  }, [emailJobMatches, mounted]);
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        "notif_email_new_courses",
        JSON.stringify(emailNewCourses),
      );
    }
  }, [emailNewCourses, mounted]);
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        "notif_email_skill_updates",
        JSON.stringify(emailSkillUpdates),
      );
    }
  }, [emailSkillUpdates, mounted]);
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        "notif_in_app_messages",
        JSON.stringify(inAppMessages),
      );
    }
  }, [inAppMessages, mounted]);
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        "notif_in_app_progress",
        JSON.stringify(inAppProgress),
      );
    }
  }, [inAppProgress, mounted]);
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("notif_newsletter", JSON.stringify(newsletter));
    }
  }, [newsletter, mounted]);
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("notif_push", JSON.stringify(pushNotifications));
    }
  }, [pushNotifications, mounted]);
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("privacy_show_skills", JSON.stringify(showSkills));
    }
  }, [showSkills, mounted]);
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        "privacy_show_test_results",
        JSON.stringify(showTestResults),
      );
    }
  }, [showTestResults, mounted]);
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        "privacy_show_completed_courses",
        JSON.stringify(showCompletedCourses),
      );
    }
  }, [showCompletedCourses, mounted]);
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        "ai_recommendation_frequency",
        JSON.stringify(aiRecommendationFrequency),
      );
    }
  }, [aiRecommendationFrequency, mounted]);
  // Handle font size change - apply immediately
  const handleFontSizeChange = (value: "small" | "medium" | "big") => {
    setFontSize(value);
    setContextFontSize(value);
  };

  // Handle language change - apply immediately
  const handleLanguageChange = (value: "en" | "ka") => {
    setLanguage(value);
    setContextLanguage(value);
    localStorage.setItem("accessibility_language", JSON.stringify(value));
  };

  // Handle theme change - apply immediately
  const handleThemeChange = (value: "light" | "dark" | "system") => {
    setTheme(value);
    localStorage.setItem("theme", value);
  };
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("accessibility_language", JSON.stringify(language));
    }
  }, [language, mounted]);

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
        },
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
        },
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

  const handleExportData = async () => {
    toast.info("Preparing your data export...");
    // TODO: Implement data export API call
    setTimeout(() => {
      toast.success(
        "Data export ready! Check your email for the download link.",
      );
    }, 2000);
  };

  const handleSaveProfile = async () => {
    if (!user) {
      toast.error("User not found. Please log in again.");
      return;
    }

    // Validate inputs
    if (!firstName.trim() && !lastName.trim()) {
      toast.error("Please enter at least a first name or last name");
      return;
    }

    // Set editing flag to true to prevent useEffect from resetting inputs during save
    isEditingRef.current = true;
    setProfileLoading(true);

    try {
      const token = localStorage.getItem("authToken");

      // Prepare update payload - only include fields that have values
      const updateData: { first_name?: string; last_name?: string } = {};

      if (firstName.trim()) {
        updateData.first_name = firstName.trim();
      }

      if (lastName.trim()) {
        updateData.last_name = lastName.trim();
      }

      // console.log("📤 Updating profile with PATCH method:");
      // console.log("📝 Request payload:", updateData);

      // Use the same pattern as phone_number and about_me updates
      const response = await apiClient.patch(
        API_ENDPOINTS.AUTH.PROFILE,
        updateData,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        },
      );

      // console.log("✅ Profile update response:", response.data);

      // Refresh profile data (same pattern as phone_number/about_me)
      const profileResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });

      // console.log("✅ Refreshed profile data:", profileResponse.data);

      // Update local state with new values
      if (profileResponse.data) {
        const profileData = profileResponse.data as Record<string, unknown>;
        const updatedFirstName =
          profileData.first_name ||
          (profileData.user as Record<string, unknown>)?.first_name ||
          (profileData.profile as Record<string, unknown>)?.first_name;
        const updatedLastName =
          profileData.last_name ||
          (profileData.user as Record<string, unknown>)?.last_name ||
          (profileData.profile as Record<string, unknown>)?.last_name;

        if (updatedFirstName !== undefined) {
          setFirstName(String(updatedFirstName || ""));
        }
        if (updatedLastName !== undefined) {
          setLastName(String(updatedLastName || ""));
        }
      }

      toast.success("Profile updated successfully!");

      // Reset editing flag
      isEditingRef.current = false;

      // Reload to update user context (same pattern as phone_number/about_me)
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err: unknown) {
      console.error("❌ Error updating profile:", err);
      // Reset editing flag on error so user can try again
      isEditingRef.current = false;

      if (axios.isAxiosError(err)) {
        const errorData = err.response?.data;
        const errorMessage =
          (typeof errorData === "object" && errorData !== null
            ? (errorData as Record<string, unknown>).error ||
              (errorData as Record<string, unknown>).message ||
              (errorData as Record<string, unknown>).detail
            : null) ||
          err.message ||
          "Failed to update profile";

        console.error("❌ Error details:", {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: errorData,
          message: err.message,
        });

        toast.error(String(errorMessage));
      } else {
        console.error("❌ Non-Axios error:", err);
        toast.error("Failed to update profile. Please try again.");
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const darkModeValue =
    theme === "dark" ? "ON" : theme === "system" ? "AUTO" : "OFF";

  const renderContent = () => {
    switch (activeSection) {
      case "account":
        return (
          <div className="space-y-8">
            <h1 className="text-3xl font-bold">Account Settings</h1>

            {/* Email & Password */}
            <Card>
              <CardHeader>
                <CardTitle>Email & Password</CardTitle>
                <CardDescription>
                  Manage your login credentials and security
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    value={user?.email || ""}
                    disabled
                    className="h-[3.2rem] bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be edited. Contact support if you need to
                    update it.
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Change Password</Label>
                  {passwordStep === 1 && (
                    <form onSubmit={handleSendCode} className="space-y-4">
                      <Button type="submit" disabled={passwordLoading}>
                        {passwordLoading
                          ? "Sending..."
                          : "Send Verification Code"}
                      </Button>
                    </form>
                  )}
                  {passwordStep === 2 && (
                    <form onSubmit={handleVerifyCode} className="space-y-4">
                      <Input
                        placeholder="Enter 6-digit code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="h-[3.2rem]"
                      />
                      <div className="flex gap-2">
                        <Button type="submit" disabled={passwordLoading}>
                          {passwordLoading ? "Verifying..." : "Verify Code"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setPasswordStep(1)}
                        >
                          Back
                        </Button>
                      </div>
                    </form>
                  )}
                  {passwordStep === 3 && (
                    <form onSubmit={handleSetNewPassword} className="space-y-4">
                      <Input
                        type="password"
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-[3.2rem]"
                      />
                      <Input
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-[3.2rem]"
                      />
                      <div className="flex gap-2">
                        <Button type="submit" disabled={passwordLoading}>
                          {passwordLoading ? "Updating..." : "Update Password"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setPasswordStep(2)}
                        >
                          Back
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Log out */}
            <Card>
              <CardHeader>
                <CardTitle>Log out</CardTitle>
                <CardDescription>
                  Sign out of your account on this device
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:border-red-900/50 dark:hover:bg-red-900/20"
                  onClick={() => setLogoutConfirmOpen(true)}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-8">
            <h1 className="text-3xl font-bold">Notifications</h1>

            <Card>
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>
                  Control how and when you receive email updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Job Matches</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when new jobs match your profile
                    </p>
                  </div>
                  <Switch
                    checked={emailJobMatches}
                    onCheckedChange={setEmailJobMatches}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>New Courses</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about new courses in your interests
                    </p>
                  </div>
                  <Switch
                    checked={emailNewCourses}
                    onCheckedChange={setEmailNewCourses}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Skill Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about skill recommendations and updates
                    </p>
                  </div>
                  <Switch
                    checked={emailSkillUpdates}
                    onCheckedChange={setEmailSkillUpdates}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Newsletter</Label>
                    <p className="text-sm text-muted-foreground">
                      Subscribe to our weekly newsletter
                    </p>
                  </div>
                  <Switch
                    checked={newsletter}
                    onCheckedChange={setNewsletter}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>In-App Notifications</CardTitle>
                <CardDescription>
                  Manage notifications within the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Messages</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify me about new messages
                    </p>
                  </div>
                  <Switch
                    checked={inAppMessages}
                    onCheckedChange={setInAppMessages}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Progress Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Get reminders about your learning progress
                    </p>
                  </div>
                  <Switch
                    checked={inAppProgress}
                    onCheckedChange={setInAppProgress}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Push Notifications</CardTitle>
                <CardDescription>
                  Receive notifications even when you're not on the site
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow Breneo to send you push notifications
                    </p>
                  </div>
                  <Switch
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "privacy": {
        return (
          <div className="space-y-8">
            <h1 className="text-3xl font-bold">Privacy & Security</h1>

            <Card>
              <CardHeader>
                <CardTitle>Data Visibility</CardTitle>
                <CardDescription>
                  Manage what information is visible on your profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Skills</Label>
                    <p className="text-sm text-muted-foreground">
                      Display your skills on your profile
                    </p>
                  </div>
                  <Switch
                    checked={showSkills}
                    onCheckedChange={setShowSkills}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Test Results</Label>
                    <p className="text-sm text-muted-foreground">
                      Display your skill test results
                    </p>
                  </div>
                  <Switch
                    checked={showTestResults}
                    onCheckedChange={setShowTestResults}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Completed Courses</Label>
                    <p className="text-sm text-muted-foreground">
                      Display courses you've completed
                    </p>
                  </div>
                  <Switch
                    checked={showCompletedCourses}
                    onCheckedChange={setShowCompletedCourses}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>
                  Download or export your data (GDPR compliance)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleExportData} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download My Data
                </Button>
                <p className="text-sm text-muted-foreground">
                  Request a copy of all your data. You'll receive an email with
                  a download link.
                </p>
              </CardContent>
            </Card>
          </div>
        );
      }

      case "subscription":
        return (
          <div className="space-y-8">
            <h1 className="text-3xl font-bold">Subscription & Billing</h1>

            <Card>
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>
                  Your current subscription plan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-6 border rounded-3xl bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-2xl font-bold">
                        {subscriptionLoading ? "..." : (subscriptionInfo?.plan_name || "Free Plan")}
                      </p>
                      {subscriptionInfo?.is_active && (
                        <Badge className="bg-green-500 text-white border-0 text-[10px] h-5 uppercase px-2 font-bold tracking-tight">
                          Active Now
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {subscriptionInfo?.is_active 
                        ? `Next automatic renewal: ${subscriptionInfo.next_payment_date || "Monthly"}` 
                        : "Basic access with limited features"}
                    </p>
                  </div>
                  {!subscriptionInfo?.is_active && !subscriptionLoading && (
                    <Button 
                      className="relative z-10 shadow-lg shadow-primary/20"
                      onClick={() => {
                        setSearchParams({ section: "subscription", upgrade: "true" }, { replace: true });
                      }}
                    >
                      Unlock Pro Features
                    </Button>
                  )}
                  {/* Decorative background element */}
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Methods 2</CardTitle>
                <CardDescription>Manage your payment methods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {subscriptionLoading ? (
                    <p className="text-sm text-muted-foreground">Loading payment methods...</p>
                  ) : subscriptionInfo?.card_mask ? (
                    <div className="flex items-center justify-between p-4 border rounded-2xl bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {subscriptionInfo.card_mask && subscriptionInfo.card_mask !== "N/A" 
                              ? `${subscriptionInfo.card_type || "Card"} ( ${subscriptionInfo.card_mask} )` 
                              : "Saved Card"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Saved via Bank of Georgia
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase">Default</Badge>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                  No payment methods saved. Subscribe to a plan to save your card.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Billing History</CardTitle>
                    <CardDescription>
                      View and manage your recent transactions
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider px-2.5">
                    BOG Checkout
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground">Fetching transaction history...</p>
                  </div>
                ) : paymentHistory.length > 0 ? (
                  <div className="overflow-hidden rounded-xl border">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">Date</th>
                            <th className="px-4 py-3 text-left font-medium">Description</th>
                            <th className="px-4 py-3 text-right font-medium">Amount</th>
                            <th className="px-4 py-3 text-center font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {paymentHistory.map((transaction) => (
                            <tr key={transaction.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 text-muted-foreground tabular-nums whitespace-nowrap">
                                {new Date(transaction.date).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 font-medium">
                                <div className="flex flex-col">
                                  <span>{transaction.description || "Subscription Payment"}</span>
                                  {transaction.card_mask && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {transaction.payment_method}: {transaction.card_mask}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-semibold">
                                {transaction.amount} {transaction.currency}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Badge 
                                  variant={transaction.status === "completed" ? "default" : "secondary"}
                                  className={`text-[10px] uppercase h-5 px-1.5 ${transaction.status === "completed" ? "bg-green-500/10 text-green-600 border-green-200" : ""}`}
                                >
                                  {transaction.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed rounded-3xl bg-muted/20">
                    <div className="bg-muted p-3 rounded-full mb-3">
                      <Download className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <CardTitle className="text-base mb-1">No transaction history found</CardTitle>
                    <CardDescription className="max-w-[250px]">
                      When you start subscribing to plans, your payment history will appear here.
                    </CardDescription>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case "learning":
        return (
          <div className="space-y-8">
            <h1 className="text-3xl font-bold">Learning Preferences</h1>

            <Card>
              <CardHeader>
                <CardTitle>AI Recommendations</CardTitle>
                <CardDescription>
                  How often would you like AI recommendations?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={aiRecommendationFrequency}
                  onValueChange={(value: "daily" | "weekly" | "monthly") =>
                    setAiRecommendationFrequency(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interests & Career Paths</CardTitle>
                <CardDescription>
                  Manage your interests and preferred career paths
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/interests">
                  <Button variant="outline">Manage Interests</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        );

      case "accessibility":
        return (
          <div className="space-y-8">
            <h1 className="text-3xl font-bold">Theme & Accessibility</h1>

            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Customize the look and feel of the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Theme</Label>
                  <Select
                    value={theme || "light"}
                    onValueChange={(value) =>
                      handleThemeChange(value as "light" | "dark" | "system")
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue>{darkModeValue}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">Auto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Accessibility</CardTitle>
                <CardDescription>
                  Adjust settings for better accessibility
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Font Size</Label>
                  <Select value={fontSize} onValueChange={handleFontSizeChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="big">Big</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={language} onValueChange={handleLanguageChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ka">Georgian (ქართული)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <div className="space-y-8">
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Section not found</p>
          </div>
        );
    }
  };

  return (
    <DashboardLayout>
      {/* Mobile: Settings Sections Switcher */}
      {isMobile && (
        <div
          className="fixed bottom-[85px] left-1/2 -translate-x-1/2 z-40 md:hidden"
          style={{ width: "380px" }}
        >
          <div className="relative rounded-full overflow-hidden">
            <div
              ref={scrollContainerRef}
              className="overflow-x-auto scrollbar-hide touch-pan-x"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <motion.div
                layout
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 40,
                  mass: 1,
                }}
                className="relative inline-flex items-center bg-gray-100/90 dark:bg-[#242424]/90 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-full p-1 shadow-sm min-w-max"
              >
                {settingsSections.map((section, index) => {
                  const isFirst = index === 0;
                  const isLast = index === settingsSections.length - 1;
                  const isActive = activeSection === section.id;

                  return (
                    <motion.button
                      key={section.id}
                      layout
                      type="button"
                      data-section={section.id}
                      ref={
                        activeSection === section.id ? activeButtonRef : null
                      }
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSectionChange(section.id);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                      }}
                      className={`relative px-6 py-2.5 text-sm transition-colors duration-200 whitespace-nowrap outline-none touch-manipulation ${
                        isFirst ? "rounded-l-full" : ""
                      } ${isLast ? "rounded-r-full" : ""} ${
                        !isFirst && !isLast ? "rounded-none" : ""
                      } ${
                        isActive
                          ? "text-gray-900 dark:text-gray-100 font-bold"
                          : "text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-200"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-settings-pill"
                          className="absolute inset-0 bg-white dark:bg-gray-700 rounded-full"
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 40,
                            mass: 1,
                          }}
                        />
                      )}
                      <span className="relative z-10">{section.label}</span>
                    </motion.button>
                  );
                })}
              </motion.div>
            </div>
            {/* Right side fade gradient */}
            <div className="absolute right-0 top-0 bottom-0 w-12 pointer-events-none bg-gradient-to-l from-gray-100/90 dark:from-[#242424]/90 to-transparent rounded-r-full" />
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-8 lg:px-12 xl:px-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Left Column - Content */}
          <div className={cn(isMobile && "min-h-screen pb-32")}>
            {renderContent()}
            {/* Mobile App Install Card - Mobile Only */}
            {isMobile && (
              <div className="mt-8">
                <PWAInstallCard compact />
              </div>
            )}
          </div>

          {/* Right Column - Sidebar Navigation (Desktop Only) */}
          {!isMobile && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {settingsSections.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSectionChange(section.id);
                      }}
                      className={cn(
                        "w-full text-left text-sm transition-colors",
                        activeSection === section.id
                          ? "text-primary font-medium"
                          : "text-foreground hover:text-primary",
                      )}
                    >
                      {section.label}
                    </button>
                  ))}
                </CardContent>
              </Card>

              <PWAInstallCard />
            </div>
          )}
        </div>
      </div>

      <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log out</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={() => {
                setLogoutConfirmOpen(false);
                logout();
              }}
            >
              Log out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
