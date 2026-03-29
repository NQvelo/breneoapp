import React, { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import {
  normalizeAcademyProfileApiResponse,
  normalizeSocialLinksFromApi,
  toAcademyProfilePayload,
  toAcademyTablePayload,
  type AcademyProfileApiRaw,
} from "@/api/academy";
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
  Camera,
  Upload,
  Check,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";

// Academy data is fetched from api/academy/profile/ (backend links academy to User in auth/user table)
interface AcademyProfile {
  id: string;
  academy_name: string;
  description: string;
  website_url: string;
  contact_email: string;
  logo_url: string | null;
  is_verified?: boolean;
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

/** Image URL from academy profile API responses (field names differ by backend). */
function extractAcademyProfileImageUrl(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const nested = (key: string): Record<string, unknown> | null => {
    const v = o[key];
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  };
  const fromNested = (n: Record<string, unknown> | null, k: string) =>
    n && typeof n[k] === "string" ? (n[k] as string) : null;
  const profile = nested("profile");
  const userObj = nested("user");
  const candidates = [
    o.profile_image,
    o.logo_url,
    o.profile_photo_url,
    fromNested(profile, "profile_image"),
    fromNested(userObj, "profile_image"),
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

function normalizeAcademyAvatarSrc(
  src: string | null | undefined,
): string | undefined {
  if (!src?.trim()) return undefined;
  const v = src.trim();
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (v.startsWith("/")) return v;
  return `/${v}`;
}

const AcademyProfilePage = () => {
  const {
    user,
    logout,
    loading: authLoading,
    updateUser,
    updateAcademyDisplay,
  } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [academyProfile, setAcademyProfile] = useState<AcademyProfile | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const socialLinksApiUnavailableRef = useRef(false);
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
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());

  /** Local upload / auth user / academy row (`logo_url` ↔ `profile_image` on API). */
  const displayProfileImage =
    profileImage || user?.profile_image || academyProfile?.logo_url || null;
  const avatarDisplaySrc =
    normalizeAcademyAvatarSrc(displayProfileImage) ??
    displayProfileImage ??
    undefined;

  // Academy accounts are not authorized for GET/PATCH `/api/profile/` (403). Load photo from academy profile.
  useEffect(() => {
    if (authLoading || !user) return;
    if (user.profile_image) {
      setProfileImage(user.profile_image);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.ACADEMY.PROFILE);
        if (cancelled) return;
        const url = extractAcademyProfileImageUrl(res.data);
        if (url) setProfileImage(url);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, user?.profile_image]);

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
          const academyResponse = await apiClient.get(
            API_ENDPOINTS.ACADEMY.PROFILE,
          );

          if (academyResponse.data) {
            const data = academyResponse.data as AcademyProfileApiRaw;
            const normalized = normalizeAcademyProfileApiResponse(
              data,
              user?.id != null ? String(user.id) : undefined,
            );
            setAcademyProfile(normalized);
            setFormState({
              academy_name: normalized.academy_name,
              description: normalized.description,
              website_url: normalized.website_url,
              contact_email: normalized.contact_email,
            });
            if (data.social_links && typeof data.social_links === "object") {
              setSocialLinks(normalizeSocialLinksFromApi(data.social_links));
              socialLinksApiUnavailableRef.current = true;
            }
            {
              const profileImg =
                extractAcademyProfileImageUrl(data) ??
                normalized.logo_url ??
                null;
              updateAcademyDisplay({
                name: normalized.academy_name,
                email: normalized.contact_email,
                is_verified: Boolean(
                  data.is_verified ?? normalized.is_verified,
                ),
                profile_image: profileImg,
              });
            }
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
              "✅ Academy profile not found (404) - user may need to create one",
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
                "✅ Profile not found based on error message - treating as 404, allowing user to create profile",
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
                "❌ Token was cleared - checking if it's a server error or real expiration",
              );

              // If error message suggests profile issue, still allow creation
              if (
                errorMessage.includes("academy") ||
                errorMessage.includes("profile")
              ) {
                console.log(
                  "⚠️ Error mentions academy/profile - might be missing profile, allowing creation",
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
              "⚠️ Token exists but got 401 - treating as missing profile, allowing user to create profile",
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
              "Could not load academy profile data. Please try again.",
            );
          }
        }

        // Academy users: session restore may skip GET /api/profile/; display name is PATCH /api/academy/profile/ with JSON `name`.
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
  }, [user, toast, authLoading, updateAcademyDisplay]); // ✅ Add authLoading as dependency

  // Fetch social links from API (only when user email is present; skip after 404)
  useEffect(() => {
    const fetchSocialLinks = async () => {
      if (!user || !academyProfile) return;
      if (!user?.email?.trim()) return;
      if (socialLinksApiUnavailableRef.current) return;

      setLoadingSocialLinks(true);
      try {
        const token = localStorage.getItem("authToken");
        const role = "academy";
        const academyId = academyProfile.id;
        const userEmail = user.email.trim();

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
      } catch (error: unknown) {
        const status = (error as { response?: { status?: number } })?.response
          ?.status;
        if (status === 404) socialLinksApiUnavailableRef.current = true;
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
      const trimmedName = formState.academy_name.trim();
      const academyBody = toAcademyProfilePayload({
        academy_name: trimmedName,
        description: formState.description.trim() || null,
        website_url: formState.website_url.trim() || null,
        contact_email: formState.contact_email.trim() || null,
      });

      const method = academyProfile ? "patch" : "post";
      await apiClient[method](API_ENDPOINTS.ACADEMY.PROFILE, academyBody);

      const refresh = await apiClient.get(API_ENDPOINTS.ACADEMY.PROFILE);
      const refreshedRaw = refresh.data as AcademyProfileApiRaw;
      const n = normalizeAcademyProfileApiResponse(
        refreshedRaw,
        user?.id != null ? String(user.id) : undefined,
      );
      const refreshedImage =
        extractAcademyProfileImageUrl(refreshedRaw) || n.logo_url || null;

      const updatedProfile: AcademyProfile = {
        id: n.id || academyProfile?.id || String(refreshedRaw.id ?? ""),
        academy_name: n.academy_name || trimmedName,
        description: n.description,
        website_url: n.website_url,
        contact_email: n.contact_email,
        logo_url: refreshedImage ?? academyProfile?.logo_url ?? null,
        is_verified: n.is_verified,
      };
      setAcademyProfile(updatedProfile);
      setFormState({
        academy_name: updatedProfile.academy_name,
        description: updatedProfile.description,
        website_url: updatedProfile.website_url,
        contact_email: updatedProfile.contact_email,
      });

      updateUser({
        first_name: n.first_name ?? trimmedName,
      });
      updateAcademyDisplay({
        name: updatedProfile.academy_name,
        email: updatedProfile.contact_email,
        is_verified: n.is_verified,
        profile_image: refreshedImage ?? null,
      });

      toast.success(
        academyProfile
          ? "Your academy profile has been updated."
          : "Your academy profile has been created.",
      );
      setIsEditing(false);
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      let errorMessage = "Failed to update profile. Please try again.";

      if (axiosError.response?.status === 403) {
        errorMessage =
          "Could not update academy profile. Check that you are logged in as an academy user.";
      } else if (axiosError.response?.data) {
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { id, value } = e.target;
    setFormState((prev) => ({ ...prev, [id]: value }));
  };

  const handleSignOut = () => {
    logout();
    navigate("/");
  };

  const handleDeleteWebsite = async () => {
    if (!academyProfile) return;

    setIsSubmitting(true);
    try {
      const response = await apiClient.patch(
        API_ENDPOINTS.ACADEMY.PROFILE,
        toAcademyTablePayload({
          description: academyProfile.description,
          website_url: null,
          contact_email: academyProfile.contact_email,
        }),
      );

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

        const response = await apiClient.patch(
          API_ENDPOINTS.ACADEMY.PROFILE,
          toAcademyTablePayload({
            description: academyProfile.description,
            website_url: normalizedUrl || null,
            contact_email: academyProfile.contact_email,
          }),
        );

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
              : "Website added successfully.",
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
          "Missing required information: academy ID or user email",
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
              },
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
          refreshError,
        );
        // Don't throw - we already updated local state, so continue
      }

      toast.success(
        editingPlatform
          ? "Social link updated successfully."
          : "Social link added successfully.",
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

  /** Photo lives on the academy row (`/api/academy/profile/`), same as AcademySettings — not `/api/profile/` (403 for academy). */
  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB.");
      return;
    }

    setUploadingImage(true);
    setProfileImage(null);

    try {
      const formData = new FormData();
      formData.append("profile_image", file);

      const uploadResponse = await apiClient.patch(
        API_ENDPOINTS.ACADEMY.PROFILE,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const newProfileImage =
        extractAcademyProfileImageUrl(uploadResponse.data) ||
        (uploadResponse.data?.profile_image as string | undefined) ||
        (uploadResponse.data as { profile?: { profile_image?: string } })
          ?.profile?.profile_image ||
        (uploadResponse.data as { user?: { profile_image?: string } })?.user
          ?.profile_image ||
        (uploadResponse.data?.logo_url as string | undefined) ||
        null;

      setProfileImage(newProfileImage);
      setImageTimestamp(Date.now());
      if (user) {
        updateUser({ profile_image: newProfileImage });
      }
      updateAcademyDisplay({ profile_image: newProfileImage });
      if (academyProfile) {
        setAcademyProfile({
          ...academyProfile,
          logo_url: newProfileImage ?? academyProfile.logo_url,
        });
      }

      toast.success("Profile image has been updated successfully.");

      setTimeout(() => {
        window.location.reload();
      }, 500);
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

  const handleRemoveImage = async () => {
    if (!user) return;

    if (!confirm("Are you sure you want to remove your profile image?")) {
      setIsProfileImageModalOpen(false);
      return;
    }

    setUploadingImage(true);
    setIsProfileImageModalOpen(false);

    try {
      await apiClient.patch(API_ENDPOINTS.ACADEMY.PROFILE, {
        profile_image: null,
      });

      setProfileImage(null);
      setImageTimestamp(Date.now());
      updateUser({ profile_image: null });
      updateAcademyDisplay({ profile_image: null });
      if (academyProfile) {
        setAcademyProfile({ ...academyProfile, logo_url: null });
      }

      toast.success("Profile image has been removed.");

      setTimeout(() => {
        window.location.reload();
      }, 500);
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
          "Missing required information: academy ID or user email",
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
            refreshedLinks,
          );
        }
      } catch (refreshError) {
        console.warn(
          "⚠️ Could not refresh social links from server:",
          refreshError,
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

  const displayName =
    academyProfile?.academy_name?.trim() ||
    user?.first_name?.trim() ||
    "Academy";
  const avatarFallback = displayName.charAt(0).toUpperCase() || "A";
  const websiteRaw = academyProfile?.website_url?.trim() ?? "";
  const websiteHref =
    websiteRaw && !/^https?:\/\//i.test(websiteRaw)
      ? `https://${websiteRaw}`
      : websiteRaw;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto pt-2 pb-40 md:pb-6 px-2 sm:px-6 lg:px-8 space-y-4 md:space-y-6">
        {/* Personal information — matches user Profile layout */}
        <Card className="border-0 rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-3 border-b-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Personal information
            </h3>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => navigate("/academy/settings")}
                aria-label="Settings"
              >
                <Settings className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={handleSignOut}
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </Button>
              {academyProfile && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setIsEditing(true)}
                  aria-label="Edit profile"
                >
                  <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="flex flex-row items-center gap-4 mb-4">
              <div className="flex-shrink-0">
                <div
                  className="relative group cursor-pointer rounded-full overflow-hidden w-12 h-12 sm:w-14 sm:h-14"
                  onClick={handleImageModalClick}
                >
                  <OptimizedAvatar
                    key={`avatar-${imageTimestamp}`}
                    src={avatarDisplaySrc}
                    alt="Profile photo"
                    fallback={avatarFallback}
                    size="lg"
                    loading="eager"
                    className="rounded-full"
                  />
                  {uploadingImage ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full z-10">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <Camera className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                  )}
                </div>
                <input
                  id="profile-image-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                    {displayName}
                  </h1>
                  {academyProfile?.is_verified === true && (
                    <span
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#5D78FF_0%,#2EB9D1_100%)] text-white shadow-sm ring-2 ring-white dark:ring-gray-950"
                      title="Verified academy"
                      aria-label="Verified academy"
                    >
                      <Check
                        className="h-2.5 w-2.5"
                        strokeWidth={3.5}
                        aria-hidden
                      />
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {websiteHref ? (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 hover:underline"
                >
                  <Globe className="h-4 w-4 text-gray-500" />
                  {websiteRaw.length > 40
                    ? `${websiteRaw.slice(0, 37)}...`
                    : websiteRaw.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
              ) : null}
              {user?.email && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100">
                  <Mail className="h-4 w-4 text-gray-500" />
                  {user.email}
                </span>
              )}
              {academyProfile?.contact_email &&
                academyProfile.contact_email !== user?.email && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100">
                    <Mail className="h-4 w-4 text-gray-500" />
                    {academyProfile.contact_email}
                  </span>
                )}
              {user?.phone_number && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100">
                  <Phone className="h-4 w-4 text-gray-500" />
                  {user.phone_number}
                </span>
              )}
              {(Object.entries(socialLinks) as [SocialPlatform, string][])
                .filter(([_, url]) => url?.trim())
                .map(([platform, url]) => (
                  <span
                    key={platform}
                    className="inline-flex items-center gap-1.5 max-w-full"
                  >
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 hover:underline max-w-full min-w-0"
                    >
                      {getSocialIcon(
                        platform,
                        "h-4 w-4 text-gray-500 shrink-0",
                      )}
                      <span className="truncate">
                        {url.length > 35
                          ? `${url.slice(0, 32)}...`
                          : url.replace(/^https?:\/\/(www\.)?/, "")}
                      </span>
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-full"
                      onClick={() => handleEditSocialLink(platform)}
                      aria-label={`Edit ${platformLabels[platform]}`}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-full text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteSocialLink(platform)}
                      aria-label={`Remove ${platformLabels[platform]}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </span>
                ))}
            </div>

            {academyProfile && (
              <Button
                variant="link"
                className="text-breneo-blue p-0 h-auto mt-3 text-sm font-normal"
                onClick={handleOpenSocialLinkModal}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add social link or website
              </Button>
            )}
          </CardContent>
        </Card>

        {/* About — same card pattern as user “About Me” */}
        <Card className="border-0 rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-3 border-b-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              About
            </h3>
            {academyProfile && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => setIsEditing(true)}
                aria-label="Edit about"
              >
                <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="px-6 py-4">
            {academyProfile?.description?.trim() ? (
              <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                {academyProfile.description.length > 200
                  ? `${academyProfile.description.substring(0, 200)}...`
                  : academyProfile.description}
              </p>
            ) : (
              <p className="text-sm text-gray-500 italic">
                No description yet. Use Edit to tell students about your
                academy.
              </p>
            )}
            {academyProfile &&
              (academyProfile.description?.trim().length ?? 0) > 200 && (
                <Button
                  variant="link"
                  className="text-breneo-blue p-0 h-auto mt-2 font-normal text-sm hover:underline"
                  onClick={() => setIsEditing(true)}
                >
                  View more
                </Button>
              )}
          </CardContent>
        </Card>

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
                          ),
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
                          ),
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
                    {displayProfileImage ? "Update Photo" : "Upload Photo"}
                  </Button>
                  {displayProfileImage ? (
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
                    {displayProfileImage ? "Update Photo" : "Upload Photo"}
                  </Button>
                  {displayProfileImage ? (
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
