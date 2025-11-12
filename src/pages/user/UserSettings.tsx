import React, { useState, useEffect, useRef } from "react";
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
import { toast } from "sonner";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import axios from "axios";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Trash2,
  Download,
  LogOut,
  Mail,
  Bell,
  Shield,
  CreditCard,
  BookOpen,
  Link as LinkIcon,
  Eye,
  Globe,
} from "lucide-react";
import { PWAInstallCard } from "@/components/common/PWAInstallCard";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

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
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const isMobile = useMobile();
  const [searchParams, setSearchParams] = useSearchParams();
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
    getInitialSection()
  );

  // Scroll active button into view on mobile
  useEffect(() => {
    if (!isMobile || !scrollContainerRef.current) return;

    // Use a small timeout to ensure DOM is updated after ref assignment
    const timeoutId = setTimeout(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      // Find the active button by data attribute instead of ref
      const activeButton = container.querySelector(
        `[data-section="${activeSection}"]`
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
  const [passwordStep, setPasswordStep] = useState(1);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState({
    google: false,
    linkedin: false,
    github: false,
  });

  // Notifications
  const [emailJobMatches, setEmailJobMatches] = useState(true);
  const [emailNewCourses, setEmailNewCourses] = useState(true);
  const [emailSkillUpdates, setEmailSkillUpdates] = useState(true);
  const [inAppMessages, setInAppMessages] = useState(true);
  const [inAppProgress, setInAppProgress] = useState(true);
  const [newsletter, setNewsletter] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);

  // Privacy & Security
  const [activityVisibility, setActivityVisibility] = useState<
    "public" | "employers" | "academies" | "private"
  >("private");
  const [showSkills, setShowSkills] = useState(true);
  const [showTestResults, setShowTestResults] = useState(true);
  const [showCompletedCourses, setShowCompletedCourses] = useState(true);

  // Learning Preferences
  const [learningGoal, setLearningGoal] = useState<
    "job" | "skills" | "career_change"
  >("job");
  const [learningStyle, setLearningStyle] = useState<
    "video" | "reading" | "interactive"
  >("interactive");
  const [aiRecommendationFrequency, setAiRecommendationFrequency] = useState<
    "daily" | "weekly" | "monthly"
  >("weekly");

  // Accessibility
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">(
    "medium"
  );
  const [language, setLanguage] = useState("en");

  // Handler to change section
  const handleSectionChange = (section: SettingsSection) => {
    setActiveSection(section);
  };

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

    // Validate activityVisibility value
    const activityVisibilityValue = loadPreference(
      "privacy_activity_visibility",
      "private"
    );
    const validVisibilityValues = [
      "public",
      "employers",
      "academies",
      "private",
    ];
    if (validVisibilityValues.includes(activityVisibilityValue)) {
      setActivityVisibility(activityVisibilityValue);
    } else {
      setActivityVisibility("private");
    }

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
      loadPreference("privacy_show_completed_courses", true)
    );
    setLearningGoal(loadPreference("learning_goal", "job"));
    setLearningStyle(loadPreference("learning_style", "interactive"));
    setAiRecommendationFrequency(
      loadPreference("ai_recommendation_frequency", "weekly")
    );
    setFontSize(loadPreference("accessibility_font_size", "medium"));
    setLanguage(loadPreference("accessibility_language", "en"));
  }, []);

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
        JSON.stringify(emailJobMatches)
      );
    }
  }, [emailJobMatches, mounted]);
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        "notif_email_new_courses",
        JSON.stringify(emailNewCourses)
      );
    }
  }, [emailNewCourses, mounted]);
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        "notif_email_skill_updates",
        JSON.stringify(emailSkillUpdates)
      );
    }
  }, [emailSkillUpdates, mounted]);
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        "notif_in_app_messages",
        JSON.stringify(inAppMessages)
      );
    }
  }, [inAppMessages, mounted]);
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        "notif_in_app_progress",
        JSON.stringify(inAppProgress)
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
      localStorage.setItem(
        "privacy_activity_visibility",
        JSON.stringify(activityVisibility)
      );
    }
  }, [activityVisibility, mounted]);
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("privacy_show_skills", JSON.stringify(showSkills));
    }
  }, [showSkills, mounted]);
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        "privacy_show_test_results",
        JSON.stringify(showTestResults)
      );
    }
  }, [showTestResults, mounted]);
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        "privacy_show_completed_courses",
        JSON.stringify(showCompletedCourses)
      );
    }
  }, [showCompletedCourses, mounted]);
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("learning_goal", JSON.stringify(learningGoal));
    }
  }, [learningGoal, mounted]);
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("learning_style", JSON.stringify(learningStyle));
    }
  }, [learningStyle, mounted]);
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        "ai_recommendation_frequency",
        JSON.stringify(aiRecommendationFrequency)
      );
    }
  }, [aiRecommendationFrequency, mounted]);
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("accessibility_font_size", JSON.stringify(fontSize));
    }
  }, [fontSize, mounted]);
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

  const handleConnectAccount = async (
    provider: "google" | "linkedin" | "github"
  ) => {
    toast.info(`Connecting ${provider} account...`);
    // TODO: Implement OAuth connection
    setConnectedAccounts((prev) => ({ ...prev, [provider]: true }));
    toast.success(
      `${
        provider.charAt(0).toUpperCase() + provider.slice(1)
      } account connected!`
    );
  };

  const handleDisconnectAccount = (
    provider: "google" | "linkedin" | "github"
  ) => {
    setConnectedAccounts((prev) => ({ ...prev, [provider]: false }));
    toast.success(
      `${
        provider.charAt(0).toUpperCase() + provider.slice(1)
      } account disconnected.`
    );
  };

  const handleExportData = async () => {
    toast.info("Preparing your data export...");
    // TODO: Implement data export API call
    setTimeout(() => {
      toast.success(
        "Data export ready! Check your email for the download link."
      );
    }, 2000);
  };

  const handleLogoutAllDevices = async () => {
    try {
      // TODO: Implement logout all devices API call
      toast.success("Logged out from all devices successfully!");
    } catch (error) {
      toast.error("Failed to log out from all devices.");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      // TODO: Implement delete account API call
      toast.success("Account deletion request submitted.");
      logout();
    } catch (error) {
      toast.error("Failed to delete account.");
    }
  };

  const darkModeValue = theme === "dark" ? "ON" : "OFF";

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
                    className="bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed. Contact support if you need to
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
                      />
                      <Input
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
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

            {/* Two-Factor Authentication */}
            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable 2FA</Label>
                    <p className="text-sm text-muted-foreground">
                      Require a verification code in addition to your password
                    </p>
                  </div>
                  <Switch
                    checked={twoFactorEnabled}
                    onCheckedChange={setTwoFactorEnabled}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Connected Accounts */}
            <Card>
              <CardHeader>
                <CardTitle>Connected Accounts</CardTitle>
                <CardDescription>
                  Link your accounts for easier sign-in
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    <span>Google</span>
                  </div>
                  {connectedAccounts.google ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnectAccount("google")}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleConnectAccount("google")}
                    >
                      Connect
                    </Button>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5" />
                    <span>LinkedIn</span>
                  </div>
                  {connectedAccounts.linkedin ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnectAccount("linkedin")}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleConnectAccount("linkedin")}
                    >
                      Connect
                    </Button>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5" />
                    <span>GitHub</span>
                  </div>
                  {connectedAccounts.github ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnectAccount("github")}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleConnectAccount("github")}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Delete Account */}
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">
                  Delete Account
                </CardTitle>
                <CardDescription>
                  Permanently delete your account and all associated data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Are you absolutely sure?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently
                        delete your account and remove your data from our
                        servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        className="bg-destructive text-destructive-foreground"
                      >
                        Delete Account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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
        // Ensure activityVisibility is always a valid value
        const validActivityVisibility:
          | "public"
          | "employers"
          | "academies"
          | "private" =
          activityVisibility &&
          ["public", "employers", "academies", "private"].includes(
            activityVisibility
          )
            ? activityVisibility
            : "private";

        return (
          <div className="space-y-8">
            <h1 className="text-3xl font-bold">Privacy & Security</h1>

            <Card>
              <CardHeader>
                <CardTitle>Activity Visibility</CardTitle>
                <CardDescription>
                  Control who can see your activity and profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Who can see your activity</Label>
                  <Select
                    value={validActivityVisibility}
                    onValueChange={(
                      value: "public" | "employers" | "academies" | "private"
                    ) => setActivityVisibility(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="employers">Employers Only</SelectItem>
                      <SelectItem value="academies">Academies Only</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

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

            <Card>
              <CardHeader>
                <CardTitle>Session Management</CardTitle>
                <CardDescription>
                  Manage active sessions across devices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleLogoutAllDevices} variant="outline">
                  <LogOut className="h-4 w-4 mr-2" />
                  Log Out from All Devices
                </Button>
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
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Free Plan</p>
                    <p className="text-sm text-muted-foreground">
                      Access to basic features
                    </p>
                  </div>
                  <Link to="/subscription">
                    <Button>Upgrade to Pro</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Manage your payment methods</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  No payment methods on file
                </p>
                <Button variant="outline">Add Payment Method</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
                <CardDescription>
                  View and download your invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  No billing history available
                </p>
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
                <CardTitle>Learning Goal</CardTitle>
                <CardDescription>
                  What are you trying to achieve?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={learningGoal}
                  onValueChange={(value: "job" | "skills" | "career_change") =>
                    setLearningGoal(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="job">Find a Job</SelectItem>
                    <SelectItem value="skills">Develop New Skills</SelectItem>
                    <SelectItem value="career_change">Career Change</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preferred Learning Style</CardTitle>
                <CardDescription>How do you prefer to learn?</CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={learningStyle}
                  onValueChange={(value: "video" | "reading" | "interactive") =>
                    setLearningStyle(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="reading">Reading</SelectItem>
                    <SelectItem value="interactive">
                      Interactive Tasks
                    </SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

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
                  <Label>Dark Mode</Label>
                  <Select
                    value={theme || "light"}
                    onValueChange={(value) =>
                      setTheme(value as "light" | "dark")
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue>{darkModeValue}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">OFF</SelectItem>
                      <SelectItem value="dark">ON</SelectItem>
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
                  <Select
                    value={fontSize}
                    onValueChange={(value: "small" | "medium" | "large") =>
                      setFontSize(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
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
      {/* Mobile: Fixed Horizontal Scrollable Navigation */}
      {isMobile && (
        <div className="fixed top-[53px] left-0 right-0 z-40 bg-[#F8F9FA]/80 dark:bg-[#181818]/80 backdrop-blur-xl backdrop-saturate-150 border-b border-black/[0.03] dark:border-white/[0.03] md:hidden">
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto scrollbar-hide touch-pan-x"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="flex gap-4 px-6 py-4 min-w-max">
              {settingsSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  data-section={section.id}
                  ref={activeSection === section.id ? activeButtonRef : null}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSectionChange(section.id);
                  }}
                  onTouchStart={(e) => {
                    // Prevent scroll when tapping button
                    e.stopPropagation();
                  }}
                  className={cn(
                    "text-sm whitespace-nowrap transition-colors py-1 cursor-pointer touch-manipulation",
                    activeSection === section.id
                      ? "text-primary font-medium border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground active:text-foreground"
                  )}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-8 lg:px-12 xl:px-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Left Column - Content */}
          <div className={cn(isMobile && "mt-12 min-h-screen pb-12")}>
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
                          : "text-foreground hover:text-primary"
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
    </DashboardLayout>
  );
}
