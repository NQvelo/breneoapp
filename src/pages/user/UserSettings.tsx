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
import { useFontSize } from "@/contexts/FontSizeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import axios from "axios";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { jobService, ApiJob } from "@/api/jobs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Download,
  Mail,
  Bell,
  CreditCard,
  BookOpen,
  Eye,
  AlertCircle,
  Info,
  Briefcase,
  GraduationCap,
  Heart,
  ExternalLink,
} from "lucide-react";
import { PWAInstallCard } from "@/components/common/PWAInstallCard";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  BogAccessTokenResponse,
  requestBogAccessToken,
  createBogOrder,
} from "@/services/payments/bogAuth";

type SettingsSection =
  | "account"
  | "notifications"
  | "privacy"
  | "subscription"
  | "learning"
  | "accessibility"
  | "saved";

const settingsSections: Array<{ id: SettingsSection; label: string }> = [
  { id: "account", label: "Account Settings" },
  { id: "notifications", label: "Notifications" },
  { id: "privacy", label: "Privacy & Security" },
  { id: "subscription", label: "Subscription & Billing" },
  { id: "learning", label: "Learning Preferences" },
  { id: "accessibility", label: "Theme & Accessibility" },
  { id: "saved", label: "Saved Jobs & Courses" },
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
      "saved",
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

  // Handle payment redirect status
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      toast.success(
        "Payment successful! Your subscription has been activated."
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

  const [bogAuthLoading, setBogAuthLoading] = useState(false);
  const [bogAuthError, setBogAuthError] = useState<string | null>(null);
  const [bogTokenInfo, setBogTokenInfo] =
    useState<BogAccessTokenResponse | null>(null);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

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
    contextFontSize
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
      loadPreference("privacy_show_completed_courses", true)
    );
    setAiRecommendationFrequency(
      loadPreference("ai_recommendation_frequency", "weekly")
    );
    // Font size is now managed by FontSizeContext, but we keep local state for UI
    const savedFontSize = loadPreference(
      "breneo-font-size",
      contextFontSize
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
      localStorage.setItem(
        "ai_recommendation_frequency",
        JSON.stringify(aiRecommendationFrequency)
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

  // Fetch saved jobs
  const { data: savedJobIds = [], isLoading: loadingSavedJobs } = useQuery<
    string[]
  >({
    queryKey: ["savedJobs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const profileResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
        const savedJobsArray = profileResponse.data?.saved_jobs || [];
        return savedJobsArray.map((id: string | number) => String(id));
      } catch (error) {
        console.error("Error fetching saved jobs:", error);
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Fetch saved courses
  const { data: savedCourseIds = [], isLoading: loadingSavedCourses } =
    useQuery<string[]>({
      queryKey: ["savedCourses", user?.id],
      queryFn: async () => {
        if (!user?.id) return [];
        try {
          const profileResponse = await apiClient.get(
            API_ENDPOINTS.AUTH.PROFILE
          );
          const savedCoursesArray = profileResponse.data?.saved_courses || [];
          return savedCoursesArray.map((id: string | number) => String(id));
        } catch (error) {
          console.error("Error fetching saved courses:", error);
          return [];
        }
      },
      enabled: !!user?.id,
    });

  useEffect(() => {
    if (savedCourseIds && savedCourseIds.length > 0) {
      console.log("📚 Saved course IDs:", savedCourseIds);
    } else if (savedCourseIds) {
      console.log("📚 Saved course IDs: none");
    }
  }, [savedCourseIds]);

  // Fetch job details for saved jobs
  // Note: We'll fetch a batch of jobs and filter by saved IDs
  const { data: savedJobs = [], isLoading: loadingJobDetails } = useQuery({
    queryKey: ["savedJobDetails", savedJobIds],
    queryFn: async () => {
      if (!savedJobIds || savedJobIds.length === 0) return [];
      try {
        // Fetch jobs using the job service with a general query
        // We'll filter the results to match saved job IDs
        const response = await jobService.fetchActiveJobs({
          query: "",
          filters: {
            country: "Georgia",
            countries: [],
            jobTypes: [],
            isRemote: false,
            skills: [],
          },
          pageSize: 100, // Fetch a larger batch to find saved jobs
        });

        // Filter to only include saved jobs
        const jobs = (response.jobs || [])
          .filter((job) => {
            const jobId = job.job_id || job.id || "";
            return savedJobIds.includes(String(jobId));
          })
          .map((job) => {
            const jobId = String(job.job_id || job.id || "");
            return {
              id: jobId,
              title: (job.job_title || job.title || "Unknown Job") as string,
              company: (job.company_name ||
                job.employer_name ||
                job.company ||
                "Unknown Company") as string,
              location: (job.location ||
                [job.job_city, job.job_state, job.job_country]
                  .filter(Boolean)
                  .join(", ") ||
                "Unknown Location") as string,
              url: (job.job_apply_link ||
                job.url ||
                job.apply_url ||
                "") as string,
            };
          });

        return jobs;
      } catch (error) {
        console.error("Error fetching saved job details:", error);
        return [];
      }
    },
    enabled: savedJobIds.length > 0,
  });

  // Fetch course details for saved courses
  const { data: savedCourses = [], isLoading: loadingCourseDetails } = useQuery(
    {
      queryKey: ["savedCourseDetails", savedCourseIds],
      queryFn: async () => {
        if (!savedCourseIds || savedCourseIds.length === 0) return [];
        try {
          const { data, error } = await supabase
            .from("courses")
            .select("id, title, provider, category, level, duration")
            .in("id", savedCourseIds);

          if (error) {
            console.error("Error fetching saved course details:", error);
            return [];
          }

          return (data || []).map((course) => ({
            id: course.id,
            title: course.title,
            provider: course.provider,
            category: course.category,
            level: course.level,
            duration: course.duration,
          }));
        } catch (error) {
          console.error("Error fetching saved course details:", error);
          return [];
        }
      },
      enabled: savedCourseIds.length > 0,
    }
  );

  // Mutation to unsave a job
  const unsaveJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      if (!user?.id) throw new Error("User not logged in");

      const profileResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
      const currentSavedJobs = profileResponse.data?.saved_jobs || [];

      const updatedSavedJobs = currentSavedJobs.filter(
        (id: string | number) => String(id) !== jobId
      );

      await apiClient.patch(API_ENDPOINTS.AUTH.PROFILE, {
        saved_jobs: updatedSavedJobs,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedJobs", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["savedJobDetails"] });
      toast.success("Job unsaved successfully");
    },
    onError: (error: Error) => {
      console.error("Error unsaving job:", error);
      toast.error("Failed to unsave job. Please try again.");
    },
  });

  // Mutation to toggle save/unsave a course
  const unsaveCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      if (!user?.id) throw new Error("User not logged in");

      // Use the correct API endpoint (toggles save/unsave)
      await apiClient.post(`/api/save-course/${courseId}/`);
    },
    onMutate: async (courseId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["savedCourses", user?.id] });
      await queryClient.cancelQueries({ queryKey: ["savedCourseDetails"] });

      // Snapshot the previous values
      const previousSavedCourses = queryClient.getQueryData<string[]>([
        "savedCourses",
        user?.id,
      ]);
      const previousSavedCourseDetails = queryClient.getQueryData([
        "savedCourseDetails",
      ]);

      // Optimistically update savedCourses
      queryClient.setQueryData<string[]>(["savedCourses", user?.id], (prev) => {
        if (!prev) return prev;
        const courseIdString = String(courseId);
        return prev.includes(courseIdString)
          ? prev.filter((c) => c !== courseIdString)
          : [...prev, courseIdString];
      });

      // Optimistically update savedCourseDetails
      queryClient.setQueryData(
        ["savedCourseDetails"],
        (
          prev:
            | Array<{
                id: string;
                title: string;
                provider: string;
                category: string;
                level: string;
                duration: string;
              }>
            | undefined
        ) => {
          if (!prev) return prev;
          const courseIdString = String(courseId);
          return prev.filter((course) => String(course.id) !== courseIdString);
        }
      );

      // Return context for rollback
      return { previousSavedCourses, previousSavedCourseDetails };
    },
    onError: (error: unknown, courseId: string, context) => {
      // Rollback on error
      if (context?.previousSavedCourses) {
        queryClient.setQueryData(
          ["savedCourses", user?.id],
          context.previousSavedCourses
        );
      }
      if (context?.previousSavedCourseDetails) {
        queryClient.setQueryData(
          ["savedCourseDetails"],
          context.previousSavedCourseDetails
        );
      }

      console.error("Error toggling course save:", error);
      toast.error("Failed to update course. Please try again.");
    },
    onSuccess: () => {
      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["savedCourses", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["savedCourseDetails"] });
      toast.success("Course updated successfully");
    },
  });

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

  const handleExportData = async () => {
    toast.info("Preparing your data export...");
    // TODO: Implement data export API call
    setTimeout(() => {
      toast.success(
        "Data export ready! Check your email for the download link."
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

      console.log("📤 Updating profile with PATCH method:");
      console.log("📝 Request payload:", updateData);

      // Use the same pattern as phone_number and about_me updates
      const response = await apiClient.patch(
        API_ENDPOINTS.AUTH.PROFILE,
        updateData,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        }
      );

      console.log("✅ Profile update response:", response.data);

      // Refresh profile data (same pattern as phone_number/about_me)
      const profileResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });

      console.log("✅ Refreshed profile data:", profileResponse.data);

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

            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your name and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveProfile();
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => {
                        isEditingRef.current = true;
                        setFirstName(e.target.value);
                      }}
                      placeholder="Enter your first name"
                      disabled={profileLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => {
                        isEditingRef.current = true;
                        setLastName(e.target.value);
                      }}
                      placeholder="Enter your last name"
                      disabled={profileLoading}
                    />
                  </div>

                  <Separator />

                  <Button type="submit" disabled={profileLoading}>
                    {profileLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>

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
                <div className="space-y-3">
                  {!bogTokenInfo && (
                    <p className="text-sm text-muted-foreground">
                      Authenticate with Bank of Georgia to add a payment method.
                    </p>
                  )}
                  {bogTokenInfo && (
                    <div className="rounded-3xl border border-primary/40 bg-primary/5 p-4 text-sm">
                      <p className="font-medium text-primary">
                        Bank of Georgia authorization ready
                      </p>
                      <p className="text-muted-foreground">
                        Token type: {bogTokenInfo.token_type}
                      </p>
                      <p className="text-muted-foreground">
                        Expires in: {bogTokenInfo.expires_in} seconds
                      </p>
                      <p className="text-muted-foreground break-all">
                        Access token: {bogTokenInfo.access_token}
                      </p>
                    </div>
                  )}
                  {bogAuthError && (
                    <Alert
                      variant={
                        bogAuthError.includes("not found") ||
                        bogAuthError.includes("endpoint")
                          ? "default"
                          : "destructive"
                      }
                    >
                      {bogAuthError.includes("not found") ||
                      bogAuthError.includes("endpoint") ? (
                        <Info className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <AlertTitle>
                        {bogAuthError.includes("not found") ||
                        bogAuthError.includes("endpoint")
                          ? "Backend Setup Required"
                          : "Payment Error"}
                      </AlertTitle>
                      <AlertDescription className="text-sm">
                        {bogAuthError.includes("not found") ||
                        bogAuthError.includes("endpoint") ? (
                          <div className="space-y-2">
                            <p>
                              The payment backend endpoint is not yet
                              implemented. To enable payments:
                            </p>
                            <ol className="list-decimal list-inside space-y-1 ml-2">
                              <li>
                                Implement{" "}
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                  POST /api/payments/bog/orders/
                                </code>{" "}
                                on your backend server
                              </li>
                              <li>
                                See{" "}
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                  BACKEND_PAYMENT_SETUP.md
                                </code>{" "}
                                for implementation details
                              </li>
                            </ol>
                          </div>
                        ) : (
                          bogAuthError
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setPendingPlan(null);
                      setBogAuthError(null);
                      try {
                        setBogAuthLoading(true);
                        const token = await requestBogAccessToken();
                        setBogTokenInfo(token);
                        toast.success(
                          "Bank of Georgia authentication successful."
                        );
                      } catch (error) {
                        const message =
                          error instanceof Error
                            ? error.message
                            : "Authentication failed with Bank of Georgia.";
                        setBogAuthError(message);
                        toast.error(
                          "Unable to authenticate with Bank of Georgia."
                        );
                      } finally {
                        setBogAuthLoading(false);
                      }
                    }}
                    disabled={bogAuthLoading}
                  >
                    {bogAuthLoading && !pendingPlan
                      ? "Authorizing..."
                      : "Refresh Authorization"}
                  </Button>
                </div>
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

      case "saved":
        return (
          <div className="space-y-8">
            <h1 className="text-3xl font-bold">Saved Jobs & Courses</h1>

            {/* Saved Jobs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Saved Jobs
                </CardTitle>
                <CardDescription>
                  Manage your saved job listings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSavedJobs || loadingJobDetails ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="h-16 bg-muted animate-pulse rounded-3xl"
                      />
                    ))}
                  </div>
                ) : savedJobIds.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No saved jobs yet.</p>
                    <p className="text-sm mt-2">
                      Start saving jobs from the{" "}
                      <Link to="/jobs" className="text-primary hover:underline">
                        jobs page
                      </Link>
                      .
                    </p>
                  </div>
                ) : savedJobs.length === 0 && savedJobIds.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground mb-2">
                      {savedJobIds.length} saved job
                      {savedJobIds.length !== 1 ? "s" : ""} (details loading...)
                    </div>
                    {savedJobIds.map((jobId) => (
                      <div
                        key={jobId}
                        className="flex items-center justify-between p-4 border rounded-3xl"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono text-muted-foreground truncate">
                            Job ID: {jobId}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(`/jobs/${encodeURIComponent(jobId)}`)
                            }
                            className="flex items-center gap-1"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => unsaveJobMutation.mutate(jobId)}
                            disabled={unsaveJobMutation.isPending}
                            className="text-destructive hover:text-destructive"
                          >
                            <Heart className="h-4 w-4 text-red-500 fill-red-500 animate-heart-pop" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedJobs.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between p-4 border rounded-3xl hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">
                            {job.title}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {job.company} • {job.location}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(`/jobs/${encodeURIComponent(job.id)}`)
                            }
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => unsaveJobMutation.mutate(job.id)}
                            disabled={unsaveJobMutation.isPending}
                            className="text-destructive hover:text-destructive"
                          >
                            <Heart className="h-4 w-4 text-red-500 fill-red-500 animate-heart-pop" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Saved Courses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Saved Courses
                </CardTitle>
                <CardDescription>
                  Manage your saved course listings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSavedCourses || loadingCourseDetails ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="h-16 bg-muted animate-pulse rounded-3xl"
                      />
                    ))}
                  </div>
                ) : savedCourses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No saved courses yet.</p>
                    <p className="text-sm mt-2">
                      Start saving courses from the{" "}
                      <Link
                        to="/courses"
                        className="text-primary hover:underline"
                      >
                        courses page
                      </Link>
                      .
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedCourses.map((course) => (
                      <div
                        key={course.id}
                        className="flex items-center justify-between p-4 border rounded-3xl hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">
                            {course.title}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {course.provider} • {course.category} •{" "}
                            {course.level} • {course.duration}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/course/${course.id}`)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              unsaveCourseMutation.mutate(course.id)
                            }
                            disabled={unsaveCourseMutation.isPending}
                            className="text-destructive hover:text-destructive"
                          >
                            <Heart className="h-4 w-4 text-red-500 fill-red-500 animate-heart-pop" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
