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
  ExternalLink,
  Link2,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import apiClient, { createFormDataRequest } from "@/api/auth/apiClient";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    <path
      fillRule="evenodd"
      d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
      clipRule="evenodd"
    />
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
      d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
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
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10c5.523 0 10-4.477 10-10S17.523 2 12 2zm6.605 4.61a8.502 8.502 0 011.93 5.314c-.281-.054-3.101-.629-5.943-.271-.065-.141-.12-.293-.184-.445a25.416 25.416 0 00-.564-1.236c3.145-1.28 4.577-3.124 4.761-3.362zM12 3.475c2.17 0 4.154.813 5.662 2.148-.152.216-1.443 1.941-4.48 3.08-1.399-2.57-2.042-3.609-3.125-3.609-.92 0-1.816.12-2.675.339 1.433.9 3.113 1.698 5.046 2.19-.745-.469-1.396-1.012-1.911-1.59 1.473-.46 3.876-1.025 6.205-.924.762 1.618.76 3.12.76 3.162 0 .078-.006.158-.018.24a8.28 8.28 0 00-2.77.782c.504-.719 1.324-2.316 1.324-3.202 0-3.17-2.617-5.742-5.847-5.742-3.23 0-5.847 2.571-5.847 5.742 0 1.764 1.062 3.289 2.65 3.99-.107.3-.253.585-.422.856a8.404 8.404 0 01-4.56-3.576C2.454 7.257 6.787 3.475 12 3.475zM8.33 4.922a7.033 7.033 0 012.066-.312c2.099 0 3.771 1.12 3.771 2.882 0 .876-1.503 2.856-4.053 3.867-.498-1.491-.947-2.883-1.167-3.83-.73-.934-1.032-1.757-.617-2.607zm-2.443 4.589c.533-.135 1.145-.268 1.836-.398.231.936.675 2.32 1.197 3.845-2.57.52-4.661 1.201-6.194 1.984a8.545 8.545 0 013.161-5.431zm.87 6.854c1.523-1.123 3.554-1.898 6.023-2.469.406 1.185.729 2.404.966 3.643a8.646 8.646 0 01-6.989-1.174zm2.71 1.822c-.28-.991-.618-1.981-1.01-2.941 2.42-.44 4.71-.155 6.343.351-.106.527-.244 1.043-.411 1.549a8.654 8.654 0 01-4.922 1.041zm3.745 1.569c.254.554.54 1.084.855 1.58-1.492-.28-2.84-.953-3.963-1.896.374-1.228.615-2.494.719-3.789 1.391.175 2.819.379 4.256.522-.138.985-.367 1.938-.867 2.583zm2.612 1.564c.6-.768 1.043-1.64 1.3-2.6 1.453-.122 2.86-.308 4.205-.555a8.52 8.52 0 01-5.505 3.155z"
      clipRule="evenodd"
    />
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
  const [editingPlatform, setEditingPlatform] = useState<SocialPlatform | null>(
    null
  );
  const [socialLinkForm, setSocialLinkForm] = useState<{
    platform: SocialPlatform | "";
    url: string;
  }>({
    platform: "",
    url: "",
  });
  const [savingSocialLink, setSavingSocialLink] = useState(false);

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

  // Fetch social links from API
  useEffect(() => {
    const fetchSocialLinks = async () => {
      if (!user) return;

      setLoadingSocialLinks(true);
      try {
        const token = localStorage.getItem("authToken");
        console.log("🔑 User Auth Token:", token);
        const role = user?.user_type === "academy" ? "academy" : "user";
        const ownerId = user?.id;
        const userEmail = user?.email;
        const response = await apiClient.get("/api/social-links/", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          params: { role, owner: ownerId, user_email: userEmail },
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
        // console.error("❌ Error fetching social links:", error);
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

    fetchSocialLinks();
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

  // Handler to open social link modal (add new)
  const handleOpenSocialLinkModal = () => {
    setEditingPlatform(null);
    setSocialLinkForm({ platform: "", url: "" });
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

  // Handler to save/update social link
  const handleSaveSocialLink = async () => {
    if (!user || !socialLinkForm.platform || !socialLinkForm.url.trim()) {
      toast({
        title: "Error",
        description: "Please select a platform and provide a URL.",
        variant: "destructive",
      });
      return;
    }

    setSavingSocialLink(true);

    try {
      const token = localStorage.getItem("authToken");

      const platform = socialLinkForm.platform as SocialPlatform;
      const role = user?.user_type === "academy" ? "academy" : "user";
      const ownerId = user?.id;
      const userEmail = user?.email;

      // Update the specific platform in the object
      const updateData = {
        [platform]: socialLinkForm.url.trim(),
        role,
        owner: ownerId,
        user_email: userEmail,
        user: ownerId,
      } as Record<string, unknown>;

      // PATCH the social links object
      const response = await apiClient.patch("/api/social-links/", updateData, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });

      // Update local state with response
      if (response.data) {
        setSocialLinks({
          ...socialLinks,
          [platform]: socialLinkForm.url.trim(),
        });
      }

      // Re-fetch from server to ensure persisted state (owner scoping)
      try {
        const refreshed = await apiClient.get("/api/social-links/", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          params: { role, owner: ownerId, user_email: userEmail },
        });
        if (
          refreshed.data &&
          typeof refreshed.data === "object" &&
          !Array.isArray(refreshed.data)
        ) {
          setSocialLinks({
            github: refreshed.data.github || "",
            linkedin: refreshed.data.linkedin || "",
            facebook: refreshed.data.facebook || "",
            instagram: refreshed.data.instagram || "",
            dribbble: refreshed.data.dribbble || "",
            behance: refreshed.data.behance || "",
          });
        }
      } catch (e) {
        // ignored
      }

      setIsSocialLinkModalOpen(false);
      setSocialLinkForm({ platform: "", url: "" });
      setEditingPlatform(null);

      toast({
        title: "Success",
        description: editingPlatform
          ? "Social link updated successfully."
          : "Social link added successfully.",
      });
    } catch (error) {
      // console.error("❌ Error saving social link:", error);
      toast({
        title: "Error",
        description: "Failed to save social link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingSocialLink(false);
    }
  };

  // Handler to delete social link (set to empty string)
  const handleDeleteSocialLink = async (platform: SocialPlatform) => {
    if (
      !user ||
      !confirm("Are you sure you want to remove this social link?")
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("authToken");

      const role = user?.user_type === "academy" ? "academy" : "user";
      const ownerId = user?.id;
      const userEmail = user?.email;

      // PATCH to set the platform URL to empty string
      const updateData = {
        [platform]: "",
        role,
        owner: ownerId,
        user_email: userEmail,
        user: ownerId,
      } as Record<string, unknown>;

      await apiClient.patch("/api/social-links/", updateData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      // Update local state
      setSocialLinks((prev) => ({
        ...prev,
        [platform]: "",
      }));

      // Re-fetch to ensure server truth
      try {
        const refreshed = await apiClient.get("/api/social-links/", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          params: { role, owner: ownerId, user_email: userEmail },
        });
        if (
          refreshed.data &&
          typeof refreshed.data === "object" &&
          !Array.isArray(refreshed.data)
        ) {
          setSocialLinks({
            github: refreshed.data.github || "",
            linkedin: refreshed.data.linkedin || "",
            facebook: refreshed.data.facebook || "",
            instagram: refreshed.data.instagram || "",
            dribbble: refreshed.data.dribbble || "",
            behance: refreshed.data.behance || "",
          });
        }
      } catch (e) {
        // ignored
      }

      toast({
        title: "Success",
        description: "Social link removed successfully.",
      });
    } catch (error) {
      // console.error("❌ Error deleting social link:", error);
      toast({
        title: "Error",
        description: "Failed to remove social link. Please try again.",
        variant: "destructive",
      });
    }
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 pb-32 md:pb-0">
        {/* Left Column - Profile Summary */}
        <div className="lg:col-span-1 space-y-4 md:space-y-6">
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
              <Button
                variant="link"
                className="text-breneo-blue p-0 h-auto flex items-center gap-1"
                onClick={handleOpenSocialLinkModal}
              >
                <Plus size={16} />
                Add
              </Button>
            </CardHeader>
            <CardContent>
              {loadingSocialLinks ? (
                <div className="text-center py-4 text-gray-500">Loading...</div>
              ) : Object.entries(socialLinks).some(
                  ([_, url]) => url && url.trim() !== ""
                ) ? (
                <div className="space-y-3">
                  {(Object.entries(socialLinks) as [SocialPlatform, string][])
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
                    ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No social links added yet. Click "Add" to add your social
                  media profiles.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
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

      {/* Social Link Add/Edit Modal */}
      {isMobile ? (
        <Drawer
          open={isSocialLinkModalOpen}
          onOpenChange={setIsSocialLinkModalOpen}
        >
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>
                {editingPlatform ? "Edit Social Link" : "Add Social Link"}
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="social-platform">Platform *</Label>
                  <Select
                    value={socialLinkForm.platform}
                    onValueChange={(value) =>
                      setSocialLinkForm({
                        ...socialLinkForm,
                        platform: value as SocialPlatform,
                      })
                    }
                    disabled={savingSocialLink || !!editingPlatform}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select a platform" />
                    </SelectTrigger>
                    <SelectContent>
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
                  <Label htmlFor="social-url">URL *</Label>
                  <Input
                    id="social-url"
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
                {editingPlatform ? "Edit Social Link" : "Add Social Link"}
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
                        platform: value as SocialPlatform,
                      })
                    }
                    disabled={savingSocialLink || !!editingPlatform}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select a platform" />
                    </SelectTrigger>
                    <SelectContent>
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
    </DashboardLayout>
  );
};

export default ProfilePage;
