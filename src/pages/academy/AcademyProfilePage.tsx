import React, { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { toast } from "sonner";
import { useMobile } from "@/hooks/use-mobile";
import OptimizedAvatar from "@/components/ui/OptimizedAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Edit,
  Settings,
  LogOut,
  Mail,
  Globe,
  Phone,
  Trash2,
  Plus,
  Link2,
  ExternalLink,
  Camera,
  Upload,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import usePhoneVerification from "@/hooks/usePhoneVerification";
import { API_BASE_URL } from "@/api/auth/config";

// Academy Profile API endpoint
const ACADEMY_PROFILE_API = `${API_BASE_URL}/api/academy/profile/`;

interface AcademyProfile {
  id: string;
  academy_name: string;
  description: string;
  website_url: string;
  contact_email: string;
  logo_url: string | null;
}

interface SocialLinks {
  github?: string;
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  dribbble?: string;
  behance?: string;
}

type SocialPlatform = keyof SocialLinks;

// Social Platform Icons as React Components
const GitHubIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      clipRule="evenodd"
    />
  </svg>
);

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"
      clipRule="evenodd"
    />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10c5.523 0 10-4.477 10-10S17.523 2 12 2zm6.605 4.61a8.502 8.502 0 011.93 5.314c-.281-.054-3.101-.629-5.943-.271-.065-.141-.12-.293-.184-.445a25.416 25.416 0 00-.564-1.236c3.145-1.28 4.577-3.124 4.761-3.362zM12 3.475c2.17 0 4.154.813 5.662 2.148-.152.216-1.443 1.941-4.48 3.08-1.399-2.57-2.042-3.609-3.125-3.609-.92 0-1.816.12-2.675.339 1.433.9 3.113 1.698 5.046 2.19-.745-.469-1.396-1.012-1.911-1.59 1.473-.46 3.876-1.025 6.205-.924.762 1.618.76 3.12.76 3.162 0 .078-.006.158-.018.24a8.28 8.28 0 00-2.77.782c.504-.719 1.324-2.316 1.324-3.202 0-3.17-2.617-5.742-5.847-5.742-3.23 0-5.847 2.571-5.847 5.742 0 1.764 1.062 3.289 2.65 3.99-.107.3-.253.585-.422.856a8.404 8.404 0 01-4.56-3.576C2.454 7.257 6.787 3.475 12 3.475zM8.33 4.922a7.033 7.033 0 012.066-.312c2.099 0 3.771 1.12 3.771 2.882 0 .876-1.503 2.856-4.053 3.867-.498-1.491-.947-2.883-1.167-3.83-.73-.934-1.032-1.757-.617-2.607zm-2.443 4.589c.533-.135 1.145-.268 1.836-.398.231.936.675 2.32 1.197 3.845-2.57.52-4.661 1.201-6.194 1.984a8.545 8.545 0 013.161-5.431zm.87 6.854c1.523-1.123 3.554-1.898 6.023-2.469.406 1.185.729 2.404.966 3.643a8.646 8.646 0 01-6.989-1.174zm2.71 1.822c-.28-.991-.618-1.981-1.01-2.941 2.42-.44 4.71-.155 6.343.351-.106.527-.244 1.043-.411 1.549a8.654 8.654 0 01-4.922 1.041zm3.745 1.569c.254.554.54 1.084.855 1.58-1.492-.28-2.84-.953-3.963-1.896.374-1.228.615-2.494.719-3.789 1.391.175 2.819.379 4.256.522-.138.985-.367 1.938-.867 2.583zm2.612 1.564c.6-.768 1.043-1.64 1.3-2.6 1.453-.122 2.86-.308 4.205-.555a8.52 8.52 0 01-5.505 3.155z"
      clipRule="evenodd"
    />
  </svg>
);

const DribbbleIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.936-4.02 4.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.137 6.29 2.137 1.42 0 2.77-.29 4-.816zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.72C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702-1.81-1.61-4.19-2.586-6.795-2.586-.825 0-1.63.1-2.4.285zm10.335 3.483c-.218.29-1.935 2.493-5.724 4.04.24.49.47.985.68 1.486.08.18.15.36.22.53 3.41-.43 6.8.26 7.14.33-.02-2.42-.88-4.64-2.31-6.38z" />
  </svg>
);

const BehanceIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M22 7h-7v-2h7v2zm1.726 10c-.442 1.297-2.029 3-5.101 3-3.074 0-5.564-1.729-5.564-5.675 0-3.91 2.325-5.92 5.466-5.92 3.082 0 4.964 1.782 5.375 4.426.078.506.109 1.188.095 2.14h-8.027c.13 3.211 3.483 3.312 4.588 2.029h3.168zm-7.686-4h4.965c-.105-1.547-1.136-2.219-2.477-2.219-1.466 0-2.277.768-2.488 2.219zm-9.574 6.921h-6.466v-14.921h6.953c5.476.081 5.58 5.444 2.72 6.906 3.461 1.26 3.577 8.061-3.207 8.015zm-3.466-8.921h3.584c2.508 0 2.906-3-.312-3h-3.272v3zm3.391 3h-3.391v3.016h3.341c3.055 0 2.868-3.016.05-3.016z" />
  </svg>
);

// Helper function to get icon component
const getSocialIcon = (platform: SocialPlatform, className?: string) => {
  const iconProps = { className: className || "h-5 w-5" };
  switch (platform) {
    case "github":
      return <GitHubIcon {...iconProps} />;
    case "linkedin":
      return <LinkedInIcon {...iconProps} />;
    case "facebook":
      return <FacebookIcon {...iconProps} />;
    case "instagram":
      return <InstagramIcon {...iconProps} />;
    case "dribbble":
      return <DribbbleIcon {...iconProps} />;
    case "behance":
      return <BehanceIcon {...iconProps} />;
    default:
      return <Link2 className={className || "h-5 w-5"} />;
  }
};

// Platform display names
const platformLabels: Record<SocialPlatform, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
  dribbble: "Dribbble",
  behance: "Behance",
};

interface UserProfile {
  profile_image?: string | null;
  about_me?: string | null;
  created_at?: string | null;
  email?: string | null;
  full_name?: string | null;
  id?: string;
  interests?: string[] | null;
  onboarding_completed?: boolean | null;
  updated_at?: string | null;
}

const AcademyProfilePage = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [academyProfile, setAcademyProfile] = useState<AcademyProfile | null>(
    null
  );
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactFormState, setContactFormState] = useState({
    contact_email: "",
  });
  const [formState, setFormState] = useState({
    academy_name: "",
    description: "",
    website_url: "",
    contact_email: "",
  });
  // Social links state
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    github: "",
    linkedin: "",
    facebook: "",
    instagram: "",
    dribbble: "",
    behance: "",
  });
  const [loadingSocialLinks, setLoadingSocialLinks] = useState(false);
  const [isSocialLinkModalOpen, setIsSocialLinkModalOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<
    SocialPlatform | "website" | null
  >(null);
  const [socialLinkForm, setSocialLinkForm] = useState<{
    platform: string;
    url: string;
  }>({
    platform: "",
    url: "",
  });
  const [savingSocialLink, setSavingSocialLink] = useState(false);
  // Profile image upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isProfileImageModalOpen, setIsProfileImageModalOpen] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const phoneVerifiedFromServer = useMemo(() => {
    const getValue = (source: unknown, key: string) => {
      if (source && typeof source === "object") {
        return (source as Record<string, unknown>)[key];
      }
      return undefined;
    };

    const candidates = [
      getValue(user as unknown, "phone_verified"),
      getValue(user as unknown, "is_phone_verified"),
      getValue(userProfile as unknown, "phone_verified"),
      getValue(userProfile as unknown, "is_phone_verified"),
    ];

    return candidates.some((value) => value === true || value === "true");
  }, [user, userProfile]);

  const {
    isPhoneVerified,
    isSendingCode,
    isVerifyingCode,
    codeSent,
    codeInput,
    resendCooldown,
    sendCode: triggerPhoneVerificationCode,
    verifyCode: confirmPhoneVerificationCode,
    setCodeInput,
  } = usePhoneVerification({
    phoneNumber: user?.phone_number,
    ownerId: user?.id,
    role: user?.user_type ?? "academy",
    initiallyVerified: phoneVerifiedFromServer,
  });

  const handleSendPhoneVerification = async () => {
    try {
      await triggerPhoneVerificationCode();
      toast.info(
        user?.phone_number
          ? `We've sent a 6-digit code to ${user.phone_number}.`
          : "We've sent a 6-digit code to your phone."
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to send verification code. Please try again.";
      toast.error(message);
    }
  };

  const handleConfirmPhoneVerification = async () => {
    try {
      const success = await confirmPhoneVerificationCode();
      if (success) {
        toast.success("Your phone number has been verified successfully.");
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Verification failed. Please check the code and try again.";
      toast.error(message);
    }
  };

  // Initialize profile image from user context on mount
  useEffect(() => {
    if (user?.profile_image) {
      setProfileImage(user.profile_image);
    }
  }, [user?.profile_image]);

  useEffect(() => {
    const fetchProfileData = async () => {
      // ✅ CRITICAL FIX: Wait for auth loading to complete AND user to be available
      // Don't make API calls while authentication is still being restored
      if (authLoading) {
        // Still loading authentication, wait...
        return;
      }

      if (!user) {
        setLoading(false);
        return;
      }

      // ✅ Check if token exists before making API calls
      const hasToken =
        typeof window !== "undefined" && !!localStorage.getItem("authToken");
      if (!hasToken) {
        console.error("❌ No token available, cannot fetch academy profile");
        setLoading(false);
        toast.error("Please log in again to access your academy profile.");
        return;
      }

      setLoading(true);
      try {
        // Fetch academy profile from API
        try {
          const academyResponse = await apiClient.get(ACADEMY_PROFILE_API);

          if (academyResponse.data) {
            const data = academyResponse.data;
            setAcademyProfile(data);
            setFormState({
              academy_name: data.academy_name || "",
              description: data.description || "",
              website_url: data.website_url || "",
              contact_email: data.contact_email || "",
            });
            setContactFormState({
              contact_email: data.contact_email || "",
            });
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

          console.log("🔍 Academy profile API response:", {
            status,
            url: academyError.config?.url,
            hasToken: !!localStorage.getItem("authToken"),
            errorData,
          });

          // 404 means academy profile doesn't exist yet - this is okay, user can create it
          if (status === 404) {
            console.log(
              "✅ Academy profile not found (404) - user may need to create one"
            );
            // Don't show error toast for 404, this is expected for new academies
            setAcademyProfile(null);
          }
          // 403 means forbidden - user might not have academy role or permissions
          else if (status === 403) {
            console.error("Access forbidden to academy profile");
            toast.error("You don't have permission to access academy profile.");
          }
          // 401 might mean:
          // 1. Token expired and refresh failed (but check error detail first)
          // 2. Profile doesn't exist yet (backend returns 401 instead of 404)
          // 3. User doesn't have academy role/permissions
          else if (status === 401) {
            const errorDetail = errorData?.detail || errorData?.message || "";
            console.warn("⚠️ Academy profile returned 401", {
              errorDetail,
              url: academyError.config?.url,
            });

            // Check error message first - "User not found" or similar means profile doesn't exist
            const errorMessage = String(errorDetail).toLowerCase();
            const isProfileNotFound =
              errorMessage.includes("not found") ||
              errorMessage.includes("does not exist") ||
              errorMessage.includes("no profile") ||
              errorMessage.includes("user not found");

            if (isProfileNotFound) {
              // Profile doesn't exist - this is expected for new academies
              console.log(
                "✅ Profile not found based on error message - treating as 404, allowing user to create profile"
              );
              setAcademyProfile(null);
              return; // Exit early - this is not an auth error
            }

            // Check if we still have a valid token after the interceptor attempted refresh
            const hasToken =
              typeof window !== "undefined" &&
              !!localStorage.getItem("authToken");

            if (!hasToken) {
              // Token was cleared - this might be a real auth error
              // But check if it's because refresh endpoint had a server error (500)
              console.error(
                "❌ Token was cleared - checking if it's a server error or real expiration"
              );

              // If error message suggests profile issue, still allow creation
              if (
                errorMessage.includes("academy") ||
                errorMessage.includes("profile")
              ) {
                console.log(
                  "⚠️ Error mentions academy/profile - might be missing profile, allowing creation"
                );
                setAcademyProfile(null);
                return;
              }

              // Otherwise, it's likely a real auth error
              toast({
                title: "Authentication Error",
                description: "Your session has expired. Please log in again.",
                variant: "destructive",
              });
              // Don't set academyProfile to null here - let ProtectedRoute handle redirect
              return;
            }

            // Token still exists - likely means:
            // 1. Profile doesn't exist (backend returns 401 for this)
            // 2. Permission issue (but token is valid)
            // Either way, allow user to create profile if they don't have one
            console.log(
              "⚠️ Token exists but got 401 - treating as missing profile, allowing user to create profile"
            );

            // Treat 401 like 404 - allow user to create profile
            // Don't show error toast, just set profile to null
            // The UI will show the "create profile" option
            setAcademyProfile(null);
          }
          // Other errors (500, network errors, etc.)
          else {
            console.error("Error fetching academy profile:", academyError);
            toast.error(
              "Could not load academy profile data. Please try again."
            );
          }
        }

        // Fetch user profile from API (optional - we already have user data from auth context)
        // ✅ FIX: Only fetch if we don't have profile_image already, and silently handle 401/403 errors
        // This fetch is non-critical since we have user data from auth context
        if (!user?.profile_image) {
          // Only fetch if we don't have profile image - use silent error handling
          apiClient
            .get(API_ENDPOINTS.AUTH.PROFILE)
            .then((profileResponse) => {
              if (profileResponse.data) {
                setUserProfile(profileResponse.data);
              }
            })
            .catch((profileError: unknown) => {
              // ✅ FIX: Silently ignore all errors - user profile is optional
              // We already have user data from auth context, so this fetch is just for additional details
              // Don't log anything - the page works fine without it
              const axiosError = profileError as AxiosError;
              const status = axiosError?.response?.status;

              // Only log unexpected errors (500, network errors, etc.) - not auth errors
              if (status && status !== 401 && status !== 403) {
                const errorMsg = axiosError?.message || String(profileError);
                console.warn(
                  "Could not fetch user profile (non-critical):",
                  status || errorMsg
                );
              }
              // Silently continue without user profile - not required for academy profile page
            });
        }
      } catch (error: unknown) {
        // This outer catch is for unexpected errors
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Unexpected error in fetchProfileData:", errorMessage);
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user, toast, authLoading]); // ✅ Add authLoading as dependency

  // Fetch social links from API
  useEffect(() => {
    const fetchSocialLinks = async () => {
      if (!user || !academyProfile) return;

      setLoadingSocialLinks(true);
      try {
        const token = localStorage.getItem("authToken");
        const role = "academy";
        const academyId = academyProfile.id;
        const userEmail = user?.email;

        const response = await apiClient.get("/api/social-links/", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          params: { role, academy: academyId, user_email: userEmail },
        });

        // Handle object response with platform keys
        if (
          response.data &&
          typeof response.data === "object" &&
          !Array.isArray(response.data)
        ) {
          setSocialLinks({
            github: response.data.github || "",
            linkedin: response.data.linkedin || "",
            facebook: response.data.facebook || "",
            instagram: response.data.instagram || "",
            dribbble: response.data.dribbble || "",
            behance: response.data.behance || "",
          });
        } else {
          // Default empty state
          setSocialLinks({
            github: "",
            linkedin: "",
            facebook: "",
            instagram: "",
            dribbble: "",
            behance: "",
          });
        }
      } catch (error) {
        // Silently handle errors - social links are optional
        setSocialLinks({
          github: "",
          linkedin: "",
          facebook: "",
          instagram: "",
          dribbble: "",
          behance: "",
        });
      } finally {
        setLoadingSocialLinks(false);
      }
    };

    if (academyProfile) {
      fetchSocialLinks();
    }
  }, [user, academyProfile]);

  const handleUpdateProfile = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to update your profile.",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!formState.academy_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Academy name is required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Use POST if profile doesn't exist, PATCH if it does
      const method = academyProfile ? "patch" : "post";
      const response = await apiClient[method](ACADEMY_PROFILE_API, {
        academy_name: formState.academy_name.trim(),
        description: formState.description.trim() || null,
        website_url: formState.website_url.trim() || null,
        contact_email: formState.contact_email.trim() || null,
      });

      if (response.data) {
        // Update academy profile state
        const updatedProfile: AcademyProfile = {
          id: academyProfile?.id || response.data.id || "",
          academy_name: formState.academy_name.trim(),
          description: formState.description.trim() || "",
          website_url: formState.website_url.trim() || "",
          contact_email: formState.contact_email.trim() || "",
          logo_url: academyProfile?.logo_url || response.data.logo_url || null,
        };
        setAcademyProfile(updatedProfile);
        // Update form state to match the saved profile
        setFormState({
          academy_name: updatedProfile.academy_name,
          description: updatedProfile.description,
          website_url: updatedProfile.website_url,
          contact_email: updatedProfile.contact_email,
        });
        toast.success(
          academyProfile
            ? "Your academy profile has been updated."
            : "Your academy profile has been created."
        );
        setIsEditing(false);
      }
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      let errorMessage = "Failed to update profile. Please try again.";

      if (axiosError.response?.data) {
        const errorData = axiosError.response.data as {
          detail?: string;
          message?: string;
        };
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      console.error("Error updating academy profile:", errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormState((prev) => ({ ...prev, [id]: value }));
  };

  const handleSignOut = () => {
    logout();
    navigate("/");
  };

  const handleContactModalOpen = () => {
    if (academyProfile) {
      setContactFormState({
        contact_email: academyProfile.contact_email || "",
      });
    }
    setIsContactModalOpen(true);
  };

  const handleUpdateContactInfo = async () => {
    if (!academyProfile) return;

    setIsSubmitting(true);
    try {
      const response = await apiClient.patch(ACADEMY_PROFILE_API, {
        academy_name: academyProfile.academy_name,
        description: academyProfile.description,
        website_url: academyProfile.website_url || null,
        contact_email: contactFormState.contact_email.trim() || null,
      });

      if (response && response.data) {
        const updatedProfile: AcademyProfile = {
          ...academyProfile,
          contact_email: contactFormState.contact_email.trim() || "",
        };
        setAcademyProfile(updatedProfile);
        setFormState((prev) => ({
          ...prev,
          contact_email: updatedProfile.contact_email,
        }));
        toast.success("Contact information has been updated.");
        setIsContactModalOpen(false);
      } else {
        throw new Error("No response data received");
      }
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      let errorMessage =
        "Failed to update contact information. Please try again.";

      if (axiosError.response?.data) {
        const errorData = axiosError.response.data as {
          detail?: string;
          message?: string;
        };
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      console.error("Error updating contact information:", error);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWebsite = async () => {
    if (!academyProfile) return;

    setIsSubmitting(true);
    try {
      const response = await apiClient.patch(ACADEMY_PROFILE_API, {
        academy_name: academyProfile.academy_name,
        description: academyProfile.description,
        website_url: null,
        contact_email: academyProfile.contact_email,
      });

      if (response.data) {
        const updatedProfile: AcademyProfile = {
          ...academyProfile,
          website_url: "",
        };
        setAcademyProfile(updatedProfile);
        setFormState((prev) => ({
          ...prev,
          website_url: "",
        }));
        toast({
          title: "Success",
          description: "Website has been removed.",
        });
      }
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      let errorMessage = "Failed to remove website. Please try again.";

      if (axiosError.response?.data) {
        const errorData = axiosError.response.data as {
          detail?: string;
          message?: string;
        };
        errorMessage = errorData.detail || errorData.message || errorMessage;
      }

      console.error("Error removing website:", errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler to open social link modal (add new)
  const handleOpenSocialLinkModal = () => {
    setEditingPlatform(null);
    setSocialLinkForm({ platform: "", url: "" });
    setIsSocialLinkModalOpen(true);
  };

  // Handler to open website modal
  const handleOpenWebsiteModal = () => {
    setEditingPlatform("website");
    setSocialLinkForm({
      platform: "website",
      url: academyProfile?.website_url || "",
    });
    setIsSocialLinkModalOpen(true);
  };

  // Handler to open social link modal (edit existing)
  const handleEditSocialLink = (platform: SocialPlatform) => {
    setEditingPlatform(platform);
    setSocialLinkForm({
      platform: platform,
      url: socialLinks[platform] || "",
    });
    setIsSocialLinkModalOpen(true);
  };

  // Helper function to validate URL
  const isValidUrl = (urlString: string): boolean => {
    try {
      const url = new URL(urlString);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      // If URL constructor throws, try adding https://
      try {
        const url = new URL(`https://${urlString}`);
        return true;
      } catch {
        return false;
      }
    }
  };

  // Handler to save/update social link or website
  const handleSaveSocialLink = async () => {
    if (
      !user ||
      !academyProfile ||
      !socialLinkForm.platform ||
      !socialLinkForm.url.trim()
    ) {
      toast.error("Please select a platform and provide a URL.");
      return;
    }

    // Validate URL format
    const urlToValidate = socialLinkForm.url.trim();
    if (!isValidUrl(urlToValidate)) {
      toast.error("Please enter a valid URL (e.g., https://example.com).");
      return;
    }

    setSavingSocialLink(true);

    try {
      // Handle website separately (save to academy profile)
      if (socialLinkForm.platform === "website") {
        // Normalize URL - add https:// if missing
        let normalizedUrl = urlToValidate;
        if (
          !normalizedUrl.startsWith("http://") &&
          !normalizedUrl.startsWith("https://")
        ) {
          normalizedUrl = `https://${normalizedUrl}`;
        }

        const response = await apiClient.patch(ACADEMY_PROFILE_API, {
          academy_name: academyProfile.academy_name,
          description: academyProfile.description,
          website_url: normalizedUrl || null,
          contact_email: academyProfile.contact_email,
        });

        if (response && response.data) {
          const updatedProfile: AcademyProfile = {
            ...academyProfile,
            website_url: normalizedUrl || "",
          };
          setAcademyProfile(updatedProfile);
          setFormState((prev) => ({
            ...prev,
            website_url: updatedProfile.website_url,
          }));

          toast.success(
            editingPlatform === "website"
              ? "Website updated successfully."
              : "Website added successfully."
          );

          setIsSocialLinkModalOpen(false);
          setSocialLinkForm({ platform: "", url: "" });
          setEditingPlatform(null);
        } else {
          throw new Error("No response data received");
        }
        return;
      }

      // Handle social links (save to social-links API)
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authentication token is missing");
      }

      const platform = socialLinkForm.platform as SocialPlatform;
      const role = "academy";
      const academyId = academyProfile.id;
      const userEmail = user?.email;

      if (!academyId || !userEmail) {
        throw new Error(
          "Missing required information: academy ID or user email"
        );
      }

      // Normalize URL - add https:// if missing
      let normalizedUrl = urlToValidate;
      if (
        !normalizedUrl.startsWith("http://") &&
        !normalizedUrl.startsWith("https://")
      ) {
        normalizedUrl = `https://${normalizedUrl}`;
      }

      // Prepare the data object with all required fields
      const socialLinkData = {
        [platform]: normalizedUrl,
        role,
        academy: academyId,
        user_email: userEmail,
      } as Record<string, unknown>;

      console.log("💾 Saving social link:", {
        platform,
        url: normalizedUrl,
        role,
        academy: academyId,
        user_email: userEmail,
      });

      // Try PATCH first (for updates), then POST if it fails (for creates)
      let response;
      try {
        // Attempt PATCH (update existing record)
        response = await apiClient.patch("/api/social-links/", socialLinkData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        console.log("✅ Social link saved via PATCH:", response.data);
      } catch (patchError) {
        const axiosPatchError = patchError as AxiosError;
        // If PATCH fails with 404 or similar, try POST (create new record)
        if (
          axiosPatchError.response?.status === 404 ||
          axiosPatchError.response?.status === 400
        ) {
          console.log("⚠️ PATCH failed, trying POST to create new record...");
          try {
            response = await apiClient.post(
              "/api/social-links/",
              socialLinkData,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              }
            );
            console.log("✅ Social link created via POST:", response.data);
          } catch (postError) {
            // If POST also fails, throw the original error
            console.error("❌ Both PATCH and POST failed:", postError);
            throw patchError;
          }
        } else {
          // For other errors, throw the original error
          throw patchError;
        }
      }

      if (!response || !response.data) {
        throw new Error("No response data received from server");
      }

      // Update local state immediately with the saved value
      setSocialLinks((prev) => ({
        ...prev,
        [platform]: normalizedUrl,
      }));

      // Re-fetch from server to ensure we have the persisted state
      try {
        const refreshed = await apiClient.get("/api/social-links/", {
          headers: { Authorization: `Bearer ${token}` },
          params: { role, academy: academyId, user_email: userEmail },
        });

        if (
          refreshed.data &&
          typeof refreshed.data === "object" &&
          !Array.isArray(refreshed.data)
        ) {
          const refreshedLinks = {
            github: refreshed.data.github || "",
            linkedin: refreshed.data.linkedin || "",
            facebook: refreshed.data.facebook || "",
            instagram: refreshed.data.instagram || "",
            dribbble: refreshed.data.dribbble || "",
            behance: refreshed.data.behance || "",
          };
          setSocialLinks(refreshedLinks);
          console.log("✅ Social links refreshed from server:", refreshedLinks);
        }
      } catch (refreshError) {
        console.warn(
          "⚠️ Could not refresh social links from server:",
          refreshError
        );
        // Don't throw - we already updated local state, so continue
      }

      toast.success(
        editingPlatform
          ? "Social link updated successfully."
          : "Social link added successfully."
      );

      setIsSocialLinkModalOpen(false);
      setSocialLinkForm({ platform: "", url: "" });
      setEditingPlatform(null);
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      let errorMessage = "Failed to save. Please try again.";

      if (axiosError.response?.data) {
        const errorData = axiosError.response.data as {
          detail?: string;
          message?: string;
        };
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      console.error("Error saving social link/website:", error);
      toast.error(errorMessage);
    } finally {
      setSavingSocialLink(false);
    }
  };

  // Profile image upload handler
  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB.");
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
      const uploadResponse = await apiClient.patch(
        API_ENDPOINTS.AUTH.PROFILE,
        formData,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("✅ Image upload response:", uploadResponse.data);

      // Update local state
      const newProfileImage =
        uploadResponse.data?.profile_image ||
        uploadResponse.data?.profile?.profile_image ||
        uploadResponse.data?.user?.profile_image ||
        null;

      // Update the image with the new URL
      setProfileImage(newProfileImage);

      toast.success("Profile image has been updated successfully.");

      // Reload page to refresh user context with new profile image
      // This ensures the image persists and is available everywhere
      setTimeout(() => {
        window.location.reload();
      }, 500);

      console.log("✅ Profile image uploaded successfully");
    } catch (error: unknown) {
      console.error("❌ Error uploading profile image:", error);
      const axiosError = error as AxiosError;
      let errorMessage = "Failed to upload profile image. Please try again.";

      if (axiosError.response?.data) {
        const errorData = axiosError.response.data as {
          detail?: string;
          message?: string;
        };
        errorMessage = errorData.detail || errorData.message || errorMessage;
      }

      toast.error(errorMessage);
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
        API_ENDPOINTS.AUTH.PROFILE,
        { profile_image: null },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        }
      );

      console.log("✅ Image removal response:", response.data);

      setProfileImage(null);

      // Refresh profile data
      const profileResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      if (profileResponse.data) {
        // Update any profile data state if needed
      }

      toast.success("Profile image has been removed.");

      // Reload page to refresh user context
      setTimeout(() => {
        window.location.reload();
      }, 500);

      console.log("✅ Profile image removed successfully");
    } catch (error: unknown) {
      console.error("❌ Error removing profile image:", error);
      toast.error("Failed to remove profile image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteSocialLink = async (platform: SocialPlatform) => {
    if (
      !user ||
      !academyProfile ||
      !confirm("Are you sure you want to remove this social link?")
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authentication token is missing");
      }

      const role = "academy";
      const academyId = academyProfile.id;
      const userEmail = user?.email;

      if (!academyId || !userEmail) {
        throw new Error(
          "Missing required information: academy ID or user email"
        );
      }

      console.log("🗑️ Deleting social link:", {
        platform,
        role,
        academy: academyId,
        user_email: userEmail,
      });

      // PATCH to set the platform URL to empty string
      const updateData = {
        [platform]: "",
        role,
        academy: academyId,
        user_email: userEmail,
      } as Record<string, unknown>;

      const response = await apiClient.patch("/api/social-links/", updateData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response || !response.data) {
        throw new Error("No response data received from server");
      }

      console.log("✅ Social link deleted:", response.data);

      // Update local state immediately
      setSocialLinks((prev) => ({
        ...prev,
        [platform]: "",
      }));

      // Re-fetch to ensure server state is synchronized
      try {
        const refreshed = await apiClient.get("/api/social-links/", {
          headers: { Authorization: `Bearer ${token}` },
          params: { role, academy: academyId, user_email: userEmail },
        });
        if (
          refreshed.data &&
          typeof refreshed.data === "object" &&
          !Array.isArray(refreshed.data)
        ) {
          const refreshedLinks = {
            github: refreshed.data.github || "",
            linkedin: refreshed.data.linkedin || "",
            facebook: refreshed.data.facebook || "",
            instagram: refreshed.data.instagram || "",
            dribbble: refreshed.data.dribbble || "",
            behance: refreshed.data.behance || "",
          };
          setSocialLinks(refreshedLinks);
          console.log(
            "✅ Social links refreshed from server after deletion:",
            refreshedLinks
          );
        }
      } catch (refreshError) {
        console.warn(
          "⚠️ Could not refresh social links from server:",
          refreshError
        );
        // Don't throw - we already updated local state
      }

      toast.success("Social link removed successfully.");
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      let errorMessage = "Failed to remove social link. Please try again.";

      if (axiosError.response?.data) {
        const errorData = axiosError.response.data as {
          detail?: string;
          message?: string;
        };
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      console.error("❌ Error deleting social link:", error);
      toast.error(errorMessage);
    }
  };

  // Show loading while auth is loading or profile data is loading
  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-breneo-blue mx-auto mb-2"></div>
            <p>Loading profile...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show message if academy profile doesn't exist yet (404 case)
  // Allow users to create profile from this page as well
  if (!academyProfile && !loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col justify-center items-center h-64 space-y-4">
          <h2 className="text-2xl font-bold">Academy Profile Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Your academy profile hasn't been set up yet.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => setIsEditing(true)}>Create Profile</Button>
            <Button
              variant="outline"
              onClick={() => navigate("/academy/settings")}
            >
              Go to Settings
            </Button>
          </div>
        </div>
        {/* Edit Dialog - Allow creating profile from here */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Academy Profile</DialogTitle>
              <DialogDescription>
                Enter your academy's information to create your profile. Click
                save when you're done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="academy_name" className="text-right">
                  Academy Name *
                </Label>
                <Input
                  id="academy_name"
                  value={formState.academy_name}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="Enter academy name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formState.description}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="Describe your academy"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="website_url" className="text-right">
                  Website URL
                </Label>
                <Input
                  id="website_url"
                  value={formState.website_url}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="https://example.com"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="contact_email" className="text-right">
                  Contact Email
                </Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formState.contact_email}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="contact@academy.com"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateProfile} disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Profile"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    );
  }

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
                  src={
                    profileImage ||
                    user?.profile_image ||
                    userProfile?.profile_image ||
                    undefined
                  }
                  alt={academyProfile?.academy_name || "Academy"}
                  fallback={(() => {
                    if (academyProfile?.academy_name) {
                      return academyProfile.academy_name
                        .charAt(0)
                        .toUpperCase();
                    }
                    if (user?.first_name) {
                      return user.first_name.charAt(0).toUpperCase();
                    }
                    if (user?.email) {
                      return user.email.charAt(0).toUpperCase();
                    }
                    return "A";
                  })()}
                  size="xl"
                  loading="lazy"
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
              {/* Hidden file input */}
              <input
                id="profile-image-input"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="hidden"
              />
              {(user?.first_name || user?.last_name) && (
                <h1 className="text-2xl font-bold mt-4 text-center">
                  {`${user.first_name || ""} ${user.last_name || ""}`.trim()}
                </h1>
              )}
              {academyProfile?.academy_name && (
                <p className="text-lg text-gray-600 dark:text-gray-400 mt-2 text-center">
                  {academyProfile.academy_name}
                </p>
              )}
              <div className="mt-4 flex items-center gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-[4] flex items-center justify-center gap-2"
                  onClick={() => navigate("/academy/settings")}
                >
                  <Settings size={16} />
                  Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="flex-[1] flex items-center justify-center border-breneo-danger text-breneo-danger hover:bg-breneo-danger/10"
                >
                  <LogOut size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-bold">Contact Information</h3>
              {academyProfile && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleContactModalOpen}
                >
                  <Edit size={16} className="text-breneo-blue" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {user?.phone_number && (
                <div className="flex items-center gap-3">
                  <div className="bg-breneo-blue/10 rounded-full p-2">
                    <Phone size={18} className="text-breneo-blue" />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                    <span className="text-sm">{user.phone_number}</span>
                    <Badge
                      variant={isPhoneVerified ? "secondary" : "outline"}
                      className={
                        isPhoneVerified
                          ? "mt-1 sm:mt-0 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                          : "mt-1 sm:mt-0 border-orange-300 text-orange-600"
                      }
                    >
                      {isPhoneVerified ? "Verified" : "Unverified"}
                    </Badge>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="bg-breneo-blue/10 rounded-full p-2">
                  <Mail size={18} className="text-breneo-blue" />
                </div>
                <span className="text-sm">{user?.email || "Not provided"}</span>
              </div>
              {academyProfile?.contact_email && (
                <div className="flex items-center gap-3">
                  <div className="bg-breneo-blue/10 rounded-full p-2">
                    <Mail size={18} className="text-breneo-blue" />
                  </div>
                  <span className="text-sm">
                    {academyProfile.contact_email}
                  </span>
                </div>
              )}
              {!isPhoneVerified && (
                <Alert className="border-orange-300 bg-orange-50 dark:border-orange-900/60 dark:bg-orange-950/30">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-600 mt-1" />
                    <div className="flex-1 space-y-3">
                      <div>
                        <AlertTitle>Verify your phone number</AlertTitle>
                        <AlertDescription>
                          Confirm your phone number to ensure students and
                          partners can trust your academy.
                        </AlertDescription>
                      </div>
                      <div className="space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Button
                            onClick={handleSendPhoneVerification}
                            disabled={
                              !user?.phone_number ||
                              isSendingCode ||
                              (codeSent && resendCooldown > 0)
                            }
                          >
                            {isSendingCode
                              ? "Sending..."
                              : codeSent
                              ? "Resend code"
                              : "Send verification code"}
                          </Button>
                          {resendCooldown > 0 && (
                            <span className="text-xs text-orange-700 dark:text-orange-300">
                              You can request a new code in {resendCooldown}s
                            </span>
                          )}
                        </div>
                        {codeSent && (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Input
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={6}
                              placeholder="Enter 6-digit code"
                              value={codeInput}
                              onChange={(event) =>
                                setCodeInput(
                                  event.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 6)
                                )
                              }
                              className="sm:max-w-[200px]"
                            />
                            <Button
                              onClick={handleConfirmPhoneVerification}
                              disabled={
                                codeInput.length !== 6 || isVerifyingCode
                              }
                            >
                              {isVerifyingCode ? "Verifying..." : "Verify"}
                            </Button>
                          </div>
                        )}
                        {!user?.phone_number && (
                          <div className="pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate("/academy/settings")}
                            >
                              Add phone number in settings
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Social Networks Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-bold">Social Networks</h3>
              {academyProfile && (
                <Button
                  variant="link"
                  className="text-breneo-blue p-0 h-auto flex items-center gap-1"
                  onClick={handleOpenSocialLinkModal}
                >
                  <Plus size={16} />
                  Add
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loadingSocialLinks ? (
                <div className="text-center py-4 text-gray-500">Loading...</div>
              ) : (
                <div className="space-y-3">
                  {/* Social Links */}
                  {Object.entries(socialLinks).some(
                    ([_, url]) => url && url.trim() !== ""
                  ) ? (
                    (Object.entries(socialLinks) as [SocialPlatform, string][])
                      .filter(([_, url]) => url && url.trim() !== "")
                      .map(([platform, url]) => (
                        <div
                          key={platform}
                          className="flex items-center justify-between group"
                        >
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 flex-1 hover:text-breneo-blue transition-colors"
                          >
                            <div className="bg-breneo-blue/10 rounded-full p-2">
                              {getSocialIcon(
                                platform,
                                "h-[18px] w-[18px] text-breneo-blue"
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {platformLabels[platform]}
                              </p>
                            </div>
                            <ExternalLink
                              size={14}
                              className="text-gray-400 group-hover:text-breneo-blue"
                            />
                          </a>
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditSocialLink(platform)}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteSocialLink(platform)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      No social links added yet. Click "Add" to add your social
                      media profiles or website.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Academy Information Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-bold">Academy Information</h3>
              {academyProfile && (
                <Button
                  variant="link"
                  className="text-breneo-blue p-0 h-auto"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit size={16} className="mr-1" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {academyProfile?.academy_name && (
                <div className="space-y-1">
                  <h4 className="font-semibold">Academy Name</h4>
                  <p className="text-gray-700 dark:text-gray-300">
                    {academyProfile.academy_name}
                  </p>
                </div>
              )}
              <div className="space-y-1">
                <h4 className="font-semibold">Description</h4>
                <p className="text-gray-700 dark:text-gray-300">
                  {academyProfile?.description || "No description provided."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Academy Profile</DialogTitle>
              <DialogDescription>
                Make changes to your academy's information here. Click save when
                you're done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="academy_name" className="text-right">
                  Academy Name
                </Label>
                <Input
                  id="academy_name"
                  value={formState.academy_name}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formState.description}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="website_url" className="text-right">
                  Website URL
                </Label>
                <Input
                  id="website_url"
                  value={formState.website_url}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="contact_email" className="text-right">
                  Contact Email
                </Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formState.contact_email}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateProfile} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Contact Information Edit Modal */}
        {isMobile ? (
          <Drawer
            open={isContactModalOpen}
            onOpenChange={setIsContactModalOpen}
          >
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Edit Contact Information</DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_email_mobile">Contact Email</Label>
                    <Input
                      id="contact_email_mobile"
                      type="email"
                      value={contactFormState.contact_email}
                      disabled
                      className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                      placeholder="contact@academy.com"
                    />
                    <p className="text-xs text-gray-500">
                      Email cannot be changed or deleted
                    </p>
                  </div>
                </div>
              </div>
              <DrawerFooter className="pt-4">
                <Button
                  onClick={handleUpdateContactInfo}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
                <DrawerClose asChild>
                  <Button variant="outline" disabled={isSubmitting}>
                    Cancel
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog
            open={isContactModalOpen}
            onOpenChange={setIsContactModalOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Contact Information</DialogTitle>
                <DialogDescription>
                  Update your contact information. Email cannot be changed.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Contact Email</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={contactFormState.contact_email}
                      disabled
                      className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                      placeholder="contact@academy.com"
                    />
                    <p className="text-xs text-gray-500">
                      Email cannot be changed or deleted
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsContactModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateContactInfo}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Social Link Add/Edit Modal */}
        {isMobile ? (
          <Drawer
            open={isSocialLinkModalOpen}
            onOpenChange={setIsSocialLinkModalOpen}
          >
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>
                  {editingPlatform === "website"
                    ? "Edit Website"
                    : editingPlatform
                    ? "Edit Social Link"
                    : "Add Link"}
                </DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="social-platform-mobile">Platform *</Label>
                    <Select
                      value={socialLinkForm.platform}
                      onValueChange={(value) =>
                        setSocialLinkForm({
                          ...socialLinkForm,
                          platform: value,
                        })
                      }
                      disabled={savingSocialLink || !!editingPlatform}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select a platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="website">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            <span>Website</span>
                          </div>
                        </SelectItem>
                        {(Object.keys(platformLabels) as SocialPlatform[]).map(
                          (platform) => (
                            <SelectItem key={platform} value={platform}>
                              <div className="flex items-center gap-2">
                                {getSocialIcon(platform, "h-4 w-4")}
                                <span>{platformLabels[platform]}</span>
                              </div>
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="social-url-mobile">URL *</Label>
                    <Input
                      id="social-url-mobile"
                      type="url"
                      placeholder="https://..."
                      value={socialLinkForm.url}
                      onChange={(e) =>
                        setSocialLinkForm({
                          ...socialLinkForm,
                          url: e.target.value,
                        })
                      }
                      className="mt-2"
                      disabled={savingSocialLink}
                      required
                    />
                  </div>
                </div>
              </div>
              <DrawerFooter>
                <Button
                  onClick={handleSaveSocialLink}
                  disabled={savingSocialLink}
                >
                  {savingSocialLink
                    ? "Saving..."
                    : editingPlatform
                    ? "Update"
                    : "Add"}
                </Button>
                <DrawerClose asChild>
                  <Button variant="outline" disabled={savingSocialLink}>
                    Cancel
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog
            open={isSocialLinkModalOpen}
            onOpenChange={setIsSocialLinkModalOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPlatform === "website"
                    ? "Edit Website"
                    : editingPlatform
                    ? "Edit Social Link"
                    : "Add Link"}
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="social-platform-desktop">Platform *</Label>
                    <Select
                      value={socialLinkForm.platform}
                      onValueChange={(value) =>
                        setSocialLinkForm({
                          ...socialLinkForm,
                          platform: value,
                        })
                      }
                      disabled={savingSocialLink || !!editingPlatform}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select a platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="website">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            <span>Website</span>
                          </div>
                        </SelectItem>
                        {(Object.keys(platformLabels) as SocialPlatform[]).map(
                          (platform) => (
                            <SelectItem key={platform} value={platform}>
                              <div className="flex items-center gap-2">
                                {getSocialIcon(platform, "h-4 w-4")}
                                <span>{platformLabels[platform]}</span>
                              </div>
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="social-url-desktop">URL *</Label>
                    <Input
                      id="social-url-desktop"
                      type="url"
                      placeholder="https://..."
                      value={socialLinkForm.url}
                      onChange={(e) =>
                        setSocialLinkForm({
                          ...socialLinkForm,
                          url: e.target.value,
                        })
                      }
                      className="mt-2"
                      disabled={savingSocialLink}
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSocialLinkModalOpen(false);
                    setSocialLinkForm({ platform: "", url: "" });
                    setEditingPlatform(null);
                  }}
                  disabled={savingSocialLink}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveSocialLink}
                  disabled={savingSocialLink}
                >
                  {savingSocialLink
                    ? "Saving..."
                    : editingPlatform
                    ? "Update"
                    : "Add"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Profile Image Upload Modal */}
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
                    {profileImage || user?.profile_image
                      ? "Update Photo"
                      : "Upload Photo"}
                  </Button>
                  {profileImage || user?.profile_image ? (
                    <Button
                      onClick={handleRemoveImage}
                      className="w-full justify-start gap-3 text-red-600 hover:text-red-700"
                      variant="ghost"
                      disabled={uploadingImage}
                    >
                      <Trash2 className="h-5 w-5" />
                      Remove Photo
                    </Button>
                  ) : null}
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
                    {profileImage || user?.profile_image
                      ? "Update Photo"
                      : "Upload Photo"}
                  </Button>
                  {profileImage || user?.profile_image ? (
                    <Button
                      onClick={handleRemoveImage}
                      className="w-full justify-start gap-3 text-red-600 hover:text-red-700"
                      variant="ghost"
                      disabled={uploadingImage}
                    >
                      <Trash2 className="h-5 w-5" />
                      Remove Photo
                    </Button>
                  ) : null}
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
      </div>
    </DashboardLayout>
  );
};

export default AcademyProfilePage;
