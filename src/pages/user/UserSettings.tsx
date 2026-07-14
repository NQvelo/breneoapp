import React, { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { useFontSize } from "@/contexts/FontSizeContext";
import { useLanguage, useTranslation } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import axios from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";
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
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Download,
  Bell,
  CreditCard,
  ChevronRight,
  LogOut,
  User,
  Shield,
  Palette,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  requestBrowserNotificationPermission,
  setPushNotificationsPreference,
  notifyPushNotificationsChanged,
} from "@/lib/browserNotifications";
import { bogService } from "@/api/bog/bogService";
import { PaymentTransaction } from "@/api/bog/bogService";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { ResumeImportCard } from "@/components/profile/ResumeImportCard";
import {
  SettingsGroupList,
  type SettingsListItemConfig,
} from "@/components/settings/SettingsGroupList";
import { SettingsDownloadAppCard } from "@/components/settings/SettingsDownloadAppCard";
import { SettingsAppVersionFooter } from "@/components/settings/SettingsAppVersionFooter";
import { SettingsMobileHeader } from "@/components/settings/SettingsMobileHeader";
import {
  SettingsActionRow,
  SettingsListRow,
  SettingsSectionCard,
  SettingsSegmentedRow,
  SettingsSubsection,
  SettingsToggleRow,
} from "@/components/settings/SettingsSectionUi";
import {
  getSettingsSectionLabel,
  type SettingsSection,
  isValidSettingsSection,
} from "@/constants/settingsSections";

export default function SettingsPage() {
  const { user, logout, refreshUser, employerDisplay, academyDisplay } =
    useAuth();
  const { theme, setTheme } = useTheme();
  const { fontSize: contextFontSize, setFontSize: setContextFontSize } =
    useFontSize();
  const { language: contextLanguage, setLanguage: setContextLanguage } =
    useLanguage();
  const t = useTranslation();
  const isMobile = useMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const sectionFromUrl = searchParams.get("section");
  const activeSection = isValidSettingsSection(sectionFromUrl)
    ? sectionFromUrl
    : null;
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  /** Same email shown in AppSidebar (employer company / academy profile when applicable). */
  const recoveryEmail = useMemo(() => {
    const role =
      user?.user_type ||
      (typeof window !== "undefined"
        ? localStorage.getItem("userRole")
        : null) ||
      "";
    if (role === "employer" && employerDisplay?.email?.trim()) {
      return employerDisplay.email.trim();
    }
    if (role === "academy" && academyDisplay?.email?.trim()) {
      return academyDisplay.email.trim();
    }
    return (user?.email ?? "").trim();
  }, [
    user?.user_type,
    user?.email,
    employerDisplay?.email,
    academyDisplay?.email,
  ]);

  useEffect(() => {
    if (!changePasswordOpen) return;
    setPasswordModalEmail(recoveryEmail);
  }, [changePasswordOpen, recoveryEmail]);

  const handleChangePasswordOpenChange = (open: boolean) => {
    setChangePasswordOpen(open);
    if (!open) {
      setPasswordStep(1);
      setPasswordModalEmail(recoveryEmail);
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const renderChangePasswordModalContent = () => (
    <div className="space-y-4">
      {passwordStep === 1 && (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="change-password-email">
              {t.settings.changePassword.email}
            </Label>
            <Input
              id="change-password-email"
              type="email"
              value={passwordModalEmail}
              readOnly
              aria-readonly="true"
              placeholder={t.auth.email}
              className="h-[3.2rem] cursor-default bg-muted/50 text-foreground"
              autoComplete="email"
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={passwordLoading || !passwordModalEmail.trim()}
          >
            {passwordLoading
              ? t.settings.changePassword.sending
              : t.settings.changePassword.sendCode}
          </Button>
        </form>
      )}
      {passwordStep === 2 && (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="change-password-code">
              {t.settings.changePassword.verificationCode}
            </Label>
            <Input
              id="change-password-code"
              placeholder={t.settings.changePassword.verificationCodePlaceholder}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-[3.2rem]"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={passwordLoading}>
              {passwordLoading
                ? t.settings.changePassword.verifying
                : t.settings.changePassword.verifyCode}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPasswordStep(1)}
            >
              {t.common.back}
            </Button>
          </div>
        </form>
      )}
      {passwordStep === 3 && (
        <form onSubmit={handleSetNewPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="change-password-new">
              {t.settings.changePassword.newPassword}
            </Label>
            <Input
              id="change-password-new"
              type="password"
              placeholder={t.settings.changePassword.newPassword}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-[3.2rem]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="change-password-confirm">
              {t.settings.changePassword.confirmPassword}
            </Label>
            <Input
              id="change-password-confirm"
              type="password"
              placeholder={t.settings.changePassword.confirmPassword}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-[3.2rem]"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={passwordLoading}>
              {passwordLoading
                ? t.settings.changePassword.updating
                : t.settings.changePassword.updatePassword}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPasswordStep(2)}
            >
              {t.common.back}
            </Button>
          </div>
        </form>
      )}
    </div>
  );

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

  // Password reset
  const [passwordStep, setPasswordStep] = useState(1);
  const [passwordModalEmail, setPasswordModalEmail] = useState("");
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

  const { subscriptionInfo, loading: subscriptionLoading } = useSubscription();
  const [paymentHistory, setPaymentHistory] = useState<PaymentTransaction[]>(
    [],
  );
  const [historyLoading, setHistoryLoading] = useState(false);

  // Privacy & Security
  const [showSkills, setShowSkills] = useState(true);
  const [showTestResults, setShowTestResults] = useState(true);
  const [showCompletedCourses, setShowCompletedCourses] = useState(true);

  // Accessibility
  const [fontSize, setFontSize] = useState<"small" | "medium" | "big">(
    contextFontSize,
  );
  const [language, setLanguage] = useState<"en" | "ka">(contextLanguage);

  // Handler to change section
  const handleSectionChange = (section: SettingsSection) => {
    setSearchParams({ section }, { replace: false });
  };

  const handleBackToList = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("section");
    setSearchParams(nextParams, { replace: true });
  };

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
          return parsed;
        }
      } catch (error) {
        console.error(`Error loading preference ${key}:`, error);
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
    const savedFontSize = loadPreference(
      "breneo-font-size",
      contextFontSize,
    ) as string;
    const mappedFontSize = savedFontSize === "large" ? "big" : savedFontSize;
    if (["small", "medium", "big"].includes(mappedFontSize)) {
      setFontSize(mappedFontSize as "small" | "medium" | "big");
      setContextFontSize(mappedFontSize as "small" | "medium" | "big");
    }
    const savedLanguage = loadPreference("accessibility_language", "en");
    if (savedLanguage === "en" || savedLanguage === "ka") {
      setLanguage(savedLanguage);
    } else {
      setLanguage("en");
    }
  }, []);

  // Fetch only payment history (subscription comes from context)
  useEffect(() => {
    if (!mounted || activeSection !== "subscription") return;

    const loadPaymentHistory = async () => {
      try {
        setHistoryLoading(true);
        const historyData = await bogService.fetchPaymentHistory();
        setPaymentHistory(historyData);
      } catch (error) {
        console.error("Failed to fetch payment history:", error);
      } finally {
        setHistoryLoading(false);
      }
    };

    loadPaymentHistory();
  }, [mounted, activeSection]);

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

  const handlePushNotificationsChange = async (checked: boolean) => {
    if (checked) {
      const result = await requestBrowserNotificationPermission();
      if (result !== "granted") {
        toast.error(t.notifications.notificationPermissionDenied);
        return;
      }
      setPushNotifications(true);
      setPushNotificationsPreference(true);
      notifyPushNotificationsChanged();
      return;
    }

    setPushNotifications(false);
    setPushNotificationsPreference(false);
    notifyPushNotificationsChanged();
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
    const email = passwordModalEmail.trim();
    if (!email) {
      toast.error("Email not found. Please log in again.");
      setPasswordLoading(false);
      return;
    }
    try {
      const res = await apiClient.post(API_ENDPOINTS.AUTH.PASSWORD_RESET, {
        email,
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
    const email = passwordModalEmail.trim();
    if (!email) {
      toast.error("Email not found. Please log in again.");
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await apiClient.post(
        API_ENDPOINTS.AUTH.PASSWORD_RESET_VERIFY,
        {
          email,
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
    const email = passwordModalEmail.trim();
    if (!email) {
      toast.error("Email not found. Please log in again.");
      return;
    }
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
          email,
          code: code,
          new_password: newPassword,
          confirm_password: confirmPassword,
        },
      );
      toast.success(res.data.message || "Password updated successfully!");
      handleChangePasswordOpenChange(false);
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

  const darkModeValue =
    theme === "dark"
      ? t.settings.themeMode.on
      : theme === "system"
        ? t.settings.themeMode.auto
        : t.settings.themeMode.off;

  const languageLabel =
    language === "ka"
      ? t.settings.languageLabel.georgian
      : t.settings.languageLabel.english;

  const fontSizeLabel =
    fontSize === "small"
      ? t.settings.fontSize.small
      : fontSize === "big"
        ? t.settings.fontSize.large
        : t.settings.fontSize.medium;

  const notificationsEnabled =
    emailJobMatches ||
    emailNewCourses ||
    emailSkillUpdates ||
    inAppMessages ||
    inAppProgress ||
    newsletter ||
    pushNotifications;

  const settingsGroups = useMemo((): SettingsListItemConfig[][] => {
    const openSection = (section: SettingsSection) => () =>
      handleSectionChange(section);

    return [
      [
        {
          id: "account",
          title: getSettingsSectionLabel("account", t),
          subtitle: recoveryEmail || t.settings.list.manageAccount,
          icon: User,
          iconBgClass: "bg-sky-100 dark:bg-sky-950/50",
          iconColorClass: "text-sky-600 dark:text-sky-400",
          onClick: openSection("account"),
        },
        {
          id: "notifications",
          title: getSettingsSectionLabel("notifications", t),
          subtitle: notificationsEnabled
            ? t.settings.list.on
            : t.settings.list.off,
          icon: Bell,
          iconBgClass: "bg-sky-100 dark:bg-sky-950/50",
          iconColorClass: "text-sky-600 dark:text-sky-400",
          onClick: openSection("notifications"),
        },
      ],
      [
        {
          id: "accessibility",
          title: getSettingsSectionLabel("accessibility", t),
          subtitle: `${darkModeValue} · ${languageLabel} · ${fontSizeLabel}`,
          icon: Palette,
          iconBgClass: "bg-amber-100 dark:bg-amber-950/40",
          iconColorClass: "text-amber-600 dark:text-amber-400",
          onClick: openSection("accessibility"),
        },
      ],
      [
        {
          id: "privacy",
          title: getSettingsSectionLabel("privacy", t),
          subtitle: t.settings.list.privacySubtitle,
          icon: Shield,
          iconBgClass: "bg-pink-100 dark:bg-pink-950/40",
          iconColorClass: "text-pink-600 dark:text-pink-400",
          onClick: openSection("privacy"),
        },
      ],
      [
        {
          id: "subscription",
          title: getSettingsSectionLabel("subscription", t),
          subtitle: subscriptionLoading
            ? t.settings.list.loading
            : subscriptionInfo?.plan_name || t.settings.list.freePlan,
          icon: CreditCard,
          iconBgClass: "bg-emerald-100 dark:bg-emerald-950/40",
          iconColorClass: "text-emerald-600 dark:text-emerald-400",
          onClick: openSection("subscription"),
        },
      ],
    ];
  }, [
    t,
    recoveryEmail,
    notificationsEnabled,
    darkModeValue,
    languageLabel,
    fontSizeLabel,
    subscriptionLoading,
    subscriptionInfo?.plan_name,
  ]);

  const logoutItem: SettingsListItemConfig = {
    id: "logout",
    title: t.settings.logout,
    subtitle: t.settings.list.logoutSubtitle,
    icon: LogOut,
    iconBgClass: "bg-gray-100 dark:bg-white/10",
    iconColorClass: "text-gray-900 dark:text-gray-100",
    onClick: () => setLogoutConfirmOpen(true),
  };

  const renderContent = () => {
    if (!activeSection) return null;

    switch (activeSection) {
      case "account":
        return <ResumeImportCard />;

      case "notifications":
        return (
          <div className="space-y-4">
            <SettingsSectionCard>
              <div className="space-y-6">
                <SettingsSubsection title={t.settings.notificationsPage.email}>
                  <SettingsToggleRow
                    label={t.settings.notificationsPage.jobMatches}
                    description={t.settings.notificationsPage.jobMatchesDesc}
                  >
                    <Switch
                      checked={emailJobMatches}
                      onCheckedChange={setEmailJobMatches}
                    />
                  </SettingsToggleRow>
                  <SettingsToggleRow
                    label={t.settings.notificationsPage.newCourses}
                    description={t.settings.notificationsPage.newCoursesDesc}
                  >
                    <Switch
                      checked={emailNewCourses}
                      onCheckedChange={setEmailNewCourses}
                    />
                  </SettingsToggleRow>
                  <SettingsToggleRow
                    label={t.settings.notificationsPage.skillUpdates}
                    description={t.settings.notificationsPage.skillUpdatesDesc}
                  >
                    <Switch
                      checked={emailSkillUpdates}
                      onCheckedChange={setEmailSkillUpdates}
                    />
                  </SettingsToggleRow>
                  <SettingsToggleRow
                    label={t.settings.notificationsPage.newsletter}
                    description={t.settings.notificationsPage.newsletterDesc}
                  >
                    <Switch
                      checked={newsletter}
                      onCheckedChange={setNewsletter}
                    />
                  </SettingsToggleRow>
                </SettingsSubsection>

                <SettingsSubsection title={t.settings.notificationsPage.inApp}>
                  <SettingsToggleRow
                    label={t.settings.notificationsPage.messages}
                    description={t.settings.notificationsPage.messagesDesc}
                  >
                    <Switch
                      checked={inAppMessages}
                      onCheckedChange={setInAppMessages}
                    />
                  </SettingsToggleRow>
                  <SettingsToggleRow
                    label={t.settings.notificationsPage.progressReminders}
                    description={
                      t.settings.notificationsPage.progressRemindersDesc
                    }
                  >
                    <Switch
                      checked={inAppProgress}
                      onCheckedChange={setInAppProgress}
                    />
                  </SettingsToggleRow>
                </SettingsSubsection>

                <SettingsSubsection title={t.settings.notificationsPage.push}>
                  <SettingsToggleRow
                    label={t.settings.notificationsPage.pushEnabled}
                    description={t.settings.notificationsPage.pushEnabledDesc}
                  >
                    <Switch
                      checked={pushNotifications}
                      onCheckedChange={(checked) =>
                        void handlePushNotificationsChange(checked)
                      }
                    />
                  </SettingsToggleRow>
                </SettingsSubsection>
              </div>
            </SettingsSectionCard>
          </div>
        );

      case "privacy": {
        return (
          <div className="space-y-4">
            <SettingsSectionCard>
              <div className="space-y-6">
                <SettingsSubsection title={t.settings.privacyPage.security}>
                  <SettingsActionRow
                    label={t.settings.privacyPage.changePassword}
                    description={t.settings.privacyPage.changePasswordDesc}
                    onClick={() => setChangePasswordOpen(true)}
                    trailing={
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                    }
                  />
                </SettingsSubsection>

                <SettingsSubsection title={t.settings.privacyPage.dataVisibility}>
                  <SettingsToggleRow
                    label={t.settings.privacyPage.showSkills}
                    description={t.settings.privacyPage.showSkillsDesc}
                  >
                    <Switch
                      checked={showSkills}
                      onCheckedChange={setShowSkills}
                    />
                  </SettingsToggleRow>
                  <SettingsToggleRow
                    label={t.settings.privacyPage.showTestResults}
                    description={t.settings.privacyPage.showTestResultsDesc}
                  >
                    <Switch
                      checked={showTestResults}
                      onCheckedChange={setShowTestResults}
                    />
                  </SettingsToggleRow>
                  <SettingsToggleRow
                    label={t.settings.privacyPage.showCompletedCourses}
                    description={t.settings.privacyPage.showCompletedCoursesDesc}
                  >
                    <Switch
                      checked={showCompletedCourses}
                      onCheckedChange={setShowCompletedCourses}
                    />
                  </SettingsToggleRow>
                </SettingsSubsection>

                {/* <SettingsSubsection title="Data management">
                  <div className="rounded-2xl bg-gray-50/90 px-4 py-4 dark:bg-white/5">
                    <Button
                      onClick={handleExportData}
                      variant="outline"
                      className="rounded-full"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download My Data
                    </Button>
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      Request a copy of all your data. You&apos;ll receive an
                      email with a download link.
                    </p>
                  </div>
                </SettingsSubsection> */}
              </div>
            </SettingsSectionCard>
          </div>
        );
      }

      case "subscription":
        return (
          <div className="space-y-4">
            <SettingsSectionCard>
              <div className="space-y-6">
                <div className="flex justify-end">
                  {/* <Badge
                    variant="secondary"
                    className="text-[10px] font-bold uppercase tracking-wider"
                  >
                    BOG Checkout
                  </Badge> */}
                </div>

                <SettingsSubsection title={t.settings.subscriptionPage.currentPlan}>
                  <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-sky-100/70 p-5 dark:from-sky-950/30 dark:to-sky-900/10">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <p className="text-2xl font-bold">
                            {subscriptionLoading
                              ? "..."
                              : subscriptionInfo?.plan_name ||
                                t.settings.list.freePlan}
                          </p>
                          {subscriptionInfo?.is_active && (
                            <Badge className="h-5 border-0 bg-green-500 px-2 text-[10px] font-bold uppercase tracking-tight text-white">
                              {t.settings.subscriptionPage.activeNow}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {subscriptionInfo?.is_active
                            ? t.settings.subscriptionPage.nextRenewal.replace(
                                "{date}",
                                subscriptionInfo.next_payment_date ||
                                  t.settings.subscriptionPage.monthly,
                              )
                            : t.settings.subscriptionPage.basicAccess}
                        </p>
                      </div>
                      {subscriptionInfo?.is_active ? (
                        <Button
                          variant="default"
                          size="sm"
                          className="relative h-9 shrink-0 rounded-full border-0 bg-breneo-blue px-4 text-xs font-semibold text-white shadow-sm hover:bg-breneo-blue/90 dark:text-white"
                          onClick={() => {
                            setSearchParams(
                              { section: "subscription", upgrade: "true" },
                              { replace: true },
                            );
                          }}
                        >
                          {t.settings.subscriptionPage.changePlan}
                        </Button>
                      ) : (
                        !subscriptionLoading && (
                          <Button
                            className="relative shrink-0 rounded-full shadow-lg shadow-primary/20"
                            onClick={() => {
                              setSearchParams(
                                { section: "subscription", upgrade: "true" },
                                { replace: true },
                              );
                            }}
                          >
                            {t.settings.subscriptionPage.unlockPro}
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                </SettingsSubsection>

                <SettingsSubsection title={t.settings.subscriptionPage.paymentMethod}>
                  {subscriptionLoading ? (
                    <p className="text-sm text-muted-foreground">
                      {t.settings.subscriptionPage.loadingPaymentMethods}
                    </p>
                  ) : subscriptionInfo?.card_mask ? (
                    <SettingsListRow
                      primary={(() => {
                        const mask = subscriptionInfo.card_mask;
                        const type =
                          subscriptionInfo.card_type ||
                          t.settings.subscriptionPage.card;

                        if (mask && mask !== "N/A") {
                          const last4 = mask.length > 4 ? mask.slice(-4) : mask;
                          return `${type} •••• ${last4}`;
                        }
                        return `${type} ••••`;
                      })()}
                      secondary={t.settings.subscriptionPage.savedViaBog}
                      trailing={
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase"
                        >
                          {t.settings.subscriptionPage.default}
                        </Badge>
                      }
                    />
                  ) : (
                    <p className="rounded-2xl bg-gray-50/90 px-4 py-3.5 text-sm text-muted-foreground dark:bg-white/5">
                      {t.settings.subscriptionPage.noPaymentMethods}
                    </p>
                  )}
                </SettingsSubsection>

                <SettingsSubsection title={t.settings.subscriptionPage.billingHistory}>
                  {historyLoading ? (
                    <div className="flex flex-col items-center justify-center space-y-3 py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                      <p className="text-sm text-muted-foreground">
                        {t.settings.subscriptionPage.fetchingHistory}
                      </p>
                    </div>
                  ) : paymentHistory.length > 0 ? (
                    <div className="space-y-2.5">
                      {paymentHistory.map((transaction) => (
                        <SettingsListRow
                          key={transaction.id}
                          primary={
                            transaction.description ||
                            t.settings.subscriptionPage.subscriptionPayment
                          }
                          secondary={new Date(
                            transaction.date,
                          ).toLocaleDateString()}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-2xl bg-gray-50/90 px-4 py-10 text-center dark:bg-white/5">
                      <div className="mb-3 rounded-full bg-white p-3 shadow-sm dark:bg-[#1a1a1a]">
                        <Download className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      <p className="text-base font-semibold text-foreground">
                        {t.settings.subscriptionPage.noHistoryTitle}
                      </p>
                      <p className="mt-1 max-w-[250px] text-sm text-muted-foreground">
                        {t.settings.subscriptionPage.noHistoryDesc}
                      </p>
                    </div>
                  )}
                </SettingsSubsection>
              </div>
            </SettingsSectionCard>
          </div>
        );

      case "accessibility":
        return (
          <div className="space-y-4">
            <SettingsSectionCard>
              <div className="space-y-2.5">
                <SettingsSegmentedRow
                  label={t.settings.theme}
                  value={theme || "light"}
                  onChange={(value) =>
                    handleThemeChange(value as "light" | "dark" | "system")
                  }
                  options={[
                    {
                      value: "light",
                      label: t.settings.themeMode.light,
                      icon: <Sun className="h-3.5 w-3.5" />,
                    },
                    {
                      value: "dark",
                      label: t.settings.themeMode.dark,
                      icon: <Moon className="h-3.5 w-3.5" />,
                    },
                    {
                      value: "system",
                      label: t.settings.themeMode.auto,
                      icon: <Monitor className="h-3.5 w-3.5" />,
                    },
                  ]}
                />

                <SettingsSegmentedRow
                  label={t.settings.fontSize.title}
                  value={fontSize}
                  onChange={handleFontSizeChange}
                  options={[
                    { value: "small", label: t.settings.fontSize.small },
                    { value: "medium", label: t.settings.fontSize.medium },
                    { value: "big", label: t.settings.fontSize.large },
                  ]}
                />

                <SettingsSegmentedRow
                  label={t.settings.language}
                  value={language}
                  onChange={handleLanguageChange}
                  options={[
                    { value: "en", label: t.settings.languageLabel.english },
                    { value: "ka", label: t.settings.languageLabel.georgian },
                  ]}
                />
              </div>
            </SettingsSectionCard>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <p className="text-muted-foreground">{t.settings.sectionNotFound}</p>
          </div>
        );
    }
  };

  const showListView = activeSection === null;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl px-2 pt-2 pb-32 sm:px-6 md:py-6 md:pb-6 lg:px-8">
        <SettingsMobileHeader
          activeSection={activeSection}
          onBack={handleBackToList}
        />
        {showListView ? (
          <div className="lg:grid lg:grid-cols-[1fr_400px] lg:items-start lg:gap-8">
            <SettingsGroupList
              groups={settingsGroups}
              footerItem={logoutItem}
              beforeFooter={
                <div className="lg:hidden">
                  <SettingsDownloadAppCard variant="compact" />
                </div>
              }
            />
            <div className="hidden lg:block lg:sticky lg:top-28">
              <SettingsDownloadAppCard variant="sidebar" />
            </div>
          </div>
        ) : (
          renderContent()
        )}
        <SettingsAppVersionFooter />
      </div>

      {isMobile ? (
        <Drawer
          open={changePasswordOpen}
          onOpenChange={handleChangePasswordOpenChange}
        >
          <DrawerContent className="border-none bg-white dark:bg-background">
            <DrawerHeader>
              <DrawerTitle>{t.settings.changePassword.title}</DrawerTitle>
              <DrawerDescription>
                {t.settings.changePassword.description}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-6 pb-6">
              {renderChangePasswordModalContent()}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog
          open={changePasswordOpen}
          onOpenChange={handleChangePasswordOpenChange}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t.settings.changePassword.title}</DialogTitle>
              <DialogDescription>
                {t.settings.changePassword.description}
              </DialogDescription>
            </DialogHeader>
            {renderChangePasswordModalContent()}
          </DialogContent>
        </Dialog>
      )}

      {isMobile ? (
        <Drawer open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
          <DrawerContent className="border-none bg-white dark:bg-background">
            <DrawerHeader className="pb-2">
              <DrawerTitle>{t.settings.logoutConfirm.title}</DrawerTitle>
              <DrawerDescription className="mt-1">
                {t.settings.logoutConfirm.description}
              </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter className="flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setLogoutConfirmOpen(false)}
              >
                {t.common.cancel}
              </Button>
              <Button
                className="flex-1 bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:text-white dark:hover:bg-red-700"
                onClick={() => {
                  setLogoutConfirmOpen(false);
                  logout();
                }}
              >
                {t.settings.logoutConfirm.confirm}
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
          <DialogContent className="max-w-sm gap-3">
            <DialogHeader className="space-y-1">
              <DialogTitle>{t.settings.logoutConfirm.title}</DialogTitle>
              <DialogDescription>
                {t.settings.logoutConfirm.description}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-row gap-2 sm:space-x-0">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setLogoutConfirmOpen(false)}
              >
                {t.common.cancel}
              </Button>
              <Button
                className="flex-1 bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:text-white dark:hover:bg-red-700"
                onClick={() => {
                  setLogoutConfirmOpen(false);
                  logout();
                }}
              >
                {t.settings.logoutConfirm.confirm}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
