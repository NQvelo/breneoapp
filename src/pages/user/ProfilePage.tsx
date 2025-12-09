import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertCircle,
  Eye,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import apiClient, { createFormDataRequest } from "@/api/auth/apiClient";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import usePhoneVerification from "@/hooks/usePhoneVerification";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Briefcase, GraduationCap, ArrowRight, MapPin, Heart, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { supabase } from "@/integrations/supabase/client";
import { fetchJobDetail } from "@/api/jobs/jobService";
import { jobService } from "@/api/jobs";
import { filterATSJobs } from "@/utils/jobFilterUtils";

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

interface SavedCourse {
  id: string;
  title: string;
  provider: string;
  category: string;
  level: string;
  duration: string;
  image: string;
  description: string;
}

/**
 * Normalizes image paths to ensure they're absolute
 * Prevents relative paths from being resolved relative to current route
 */
const normalizeImagePath = (imagePath: string | null | undefined): string => {
  if (!imagePath) {
    return "/lovable-uploads/no_photo.png";
  }

  // If it's already an absolute URL (http/https), return as-is
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  // If it's already an absolute path (starts with /), return as-is
  if (imagePath.startsWith("/")) {
    return imagePath;
  }

  // Otherwise, make it absolute by adding leading slash
  return `/${imagePath}`;
};

interface SavedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  company_logo?: string;
  salary?: string;
  employment_type?: string;
  work_arrangement?: string;
}

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
  const queryClient = useQueryClient();

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

  // Contact Information edit modal state (combined phone and email)
  const [isContactEditModalOpen, setIsContactEditModalOpen] = useState(false);
  const [phoneEditValue, setPhoneEditValue] = useState("");
  const [emailEditValue, setEmailEditValue] = useState("");
  const [updatingContact, setUpdatingContact] = useState(false);

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

  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // Ref to track manual updates to prevent useEffect from overwriting
  const manualSocialLinkUpdateRef = useRef(false);
  const socialLinksUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch saved course IDs from API profile endpoint
  const { data: savedCourseIds = [] } = useQuery<string[]>({
    queryKey: ["savedCourseIds", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const profileResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
        const savedCoursesArray = profileResponse.data?.saved_courses || [];
        return savedCoursesArray.map((id: string | number) => String(id));
      } catch (error) {
        console.error("Error fetching saved course IDs:", error);
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Fetch saved courses from API profile endpoint
  const { data: savedCourses = [], isLoading: loadingSavedCourses } = useQuery({
    queryKey: ["savedCourses", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      try {
        // Fetch profile data from API
        const response = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);

        // Extract saved_courses array from profile response
        let savedCourseIdsList: string[] = [];

        if (response.data && typeof response.data === "object") {
          const data = response.data as Record<string, unknown>;

          // Check for saved_courses in various possible locations
          if (Array.isArray(data.saved_courses)) {
            savedCourseIdsList = data.saved_courses.map((id: string | number) => String(id));
          } else if (data.profile && typeof data.profile === "object") {
            const profile = data.profile as Record<string, unknown>;
            if (Array.isArray(profile.saved_courses)) {
              savedCourseIdsList = profile.saved_courses.map((id: string | number) => String(id));
            }
          } else if (data.user && typeof data.user === "object") {
            const userData = data.user as Record<string, unknown>;
            if (Array.isArray(userData.saved_courses)) {
              savedCourseIdsList = userData.saved_courses.map((id: string | number) => String(id));
            }
          }
        }

        // If no saved courses found, return empty array
        if (!savedCourseIdsList || savedCourseIdsList.length === 0) {
          return [];
        }

        // Limit to 6 for display
        const limitedIds = savedCourseIdsList.slice(0, 6);

        // Fetch course details from Supabase using the IDs from API
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select(
            "id, title, provider, category, level, duration, image, description"
          )
          .in("id", limitedIds);

        if (coursesError) {
          console.error(
            "Error fetching course details from Supabase:",
            coursesError
          );
          return [];
        }

        return (coursesData || []).map((course) => {
          return {
            id: course.id,
            title: course.title || "",
            provider: course.provider || "",
            category: course.category || "",
            level: course.level || "",
            duration: course.duration || "",
            image: normalizeImagePath(course.image),
            description: course.description || "",
          } as SavedCourse;
        });
      } catch (error) {
        console.error("Error fetching saved courses from API profile:", error);
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Fetch saved jobs from API profile endpoint
  const { data: savedJobs = [], isLoading: loadingSavedJobs } = useQuery({
    queryKey: ["savedJobs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        // Fetch profile data from API
        const response = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);

        // Extract saved_jobs array from profile response
        let savedJobIds: string[] = [];

        if (response.data && typeof response.data === "object") {
          const data = response.data as Record<string, unknown>;

          // Check for saved_jobs in various possible locations
          if (Array.isArray(data.saved_jobs)) {
            savedJobIds = data.saved_jobs.map((id: string | number) =>
              String(id)
            );
          } else if (data.profile && typeof data.profile === "object") {
            const profile = data.profile as Record<string, unknown>;
            if (Array.isArray(profile.saved_jobs)) {
              savedJobIds = profile.saved_jobs.map((id: string | number) =>
                String(id)
              );
            }
          } else if (data.user && typeof data.user === "object") {
            const userData = data.user as Record<string, unknown>;
            if (Array.isArray(userData.saved_jobs)) {
              savedJobIds = userData.saved_jobs.map((id: string | number) =>
                String(id)
              );
            }
          }
        }

        console.log("📋 ProfilePage - Saved job IDs from API:", savedJobIds);

        // If no saved jobs found, return empty array
        if (!savedJobIds || savedJobIds.length === 0) {
          console.log("📋 ProfilePage - No saved jobs found");
          return [];
        }

        // Limit to 6 for display
        const limitedIds = savedJobIds.slice(0, 6);

        // Try to fetch job details for each saved job ID
        const jobPromises = limitedIds.map(async (jobId) => {
          try {
            console.log(`📋 ProfilePage - Fetching job detail for ID: ${jobId}`);
            const jobDetail = await fetchJobDetail(jobId);
            console.log(`✅ ProfilePage - Successfully fetched job: ${jobId}`, jobDetail);
            return {
              id: jobId,
              title: (jobDetail.job_title || jobDetail.title || "Untitled Job") as string,
              company: (jobDetail.company_name ||
                jobDetail.employer_name ||
                jobDetail.company ||
                "Unknown Company") as string,
              location: (jobDetail.location ||
                jobDetail.job_location ||
                [jobDetail.city, jobDetail.state, jobDetail.country]
                  .filter(Boolean)
                  .join(", ") ||
                "Location not specified") as string,
              url: (jobDetail.job_apply_link ||
                jobDetail.url ||
                jobDetail.apply_url ||
                "") as string,
              company_logo: (jobDetail.company_logo ||
                jobDetail.employer_logo ||
                jobDetail.logo_url ||
                undefined) as string | undefined,
              salary: (jobDetail.min_salary && jobDetail.max_salary
                ? `${jobDetail.min_salary}-${jobDetail.max_salary} ${
                    jobDetail.salary_currency || ""
                  }`
                : jobDetail.salary || undefined) as string | undefined,
              employment_type: (jobDetail.employment_type ||
                jobDetail.job_employment_type ||
                undefined) as string | undefined,
              work_arrangement: (jobDetail.is_remote ? "Remote" : undefined) as
                | string
                | undefined,
            } as SavedJob;
          } catch (error) {
            console.error(`❌ ProfilePage - Error fetching job detail for ID ${jobId}:`, error);
            // Try fallback: fetch from batch and filter
            try {
              console.log(`🔄 ProfilePage - Trying fallback batch fetch for ${jobId}`);
              const batchResponse = await jobService.fetchActiveJobs({
                query: "",
                filters: {
                  country: "",
                  countries: [],
                  jobTypes: [],
                  isRemote: false,
                  datePosted: undefined,
                  skills: [],
                },
                page: 1,
                pageSize: 100,
              });

              // Filter to only allowed ATS platforms
              const allowedATSJobs = filterATSJobs(batchResponse.jobs);

              const foundJob = allowedATSJobs.find((job) => {
                const foundId = String(job.job_id || job.id || "");
                return foundId === String(jobId);
              });

              if (foundJob) {
                console.log(`✅ ProfilePage - Found job ${jobId} in batch`);
                const jobIdStr = String(foundJob.job_id || foundJob.id || "");
                return {
                  id: jobIdStr,
                  title: (foundJob.job_title || foundJob.title || "Untitled Job") as string,
                  company: (foundJob.company_name ||
                    foundJob.employer_name ||
                    foundJob.company ||
                    "Unknown Company") as string,
                  location: (foundJob.location ||
                    [foundJob.job_city, foundJob.job_state, foundJob.job_country]
                      .filter(Boolean)
                      .join(", ") ||
                    "Location not specified") as string,
                  url: (foundJob.job_apply_link ||
                    foundJob.url ||
                    foundJob.apply_url ||
                    "") as string,
                  company_logo: (foundJob.company_logo ||
                    foundJob.employer_logo ||
                    foundJob.logo_url ||
                    undefined) as string | undefined,
                  salary: (foundJob.job_min_salary && foundJob.job_max_salary
                    ? `${foundJob.job_min_salary}-${foundJob.job_max_salary} ${
                        foundJob.job_salary_currency || ""
                      }`
                    : foundJob.salary || undefined) as string | undefined,
                  employment_type: (foundJob.employment_type ||
                    foundJob.job_employment_type ||
                    undefined) as string | undefined,
                  work_arrangement: (foundJob.job_is_remote || foundJob.is_remote ? "Remote" : undefined) as
                    | string
                    | undefined,
                } as SavedJob;
              }
            } catch (fallbackError) {
              console.error(`❌ ProfilePage - Fallback also failed for ${jobId}:`, fallbackError);
            }

            // Return a minimal job object so it still displays
            return {
              id: jobId,
              title: `Job ${jobId}`,
              company: "Details unavailable",
              location: "",
              url: "",
            } as SavedJob;
          }
        });

        const jobs = await Promise.all(jobPromises);
        // Filter out jobs with "Details unavailable" if they have no other info
        const validJobs = jobs.filter((job) => {
          // Keep jobs that have at least a title that's not just "Job {id}"
          return job.title && job.title !== `Job ${job.id}`;
        });

        console.log(`📋 ProfilePage - Returning ${validJobs.length} valid jobs out of ${jobs.length} total`);
        return validJobs;
      } catch (error) {
        console.error("❌ ProfilePage - Error fetching saved jobs from API profile:", error);
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Save course mutation
  const saveCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      if (!user?.id) {
        throw new Error("Please log in to save courses.");
      }
      await apiClient.post(`/api/save-course/${courseId}/`);
    },
    onMutate: async (courseId: string) => {
      await queryClient.cancelQueries({
        queryKey: ["savedCourses", user?.id],
      });
      const previousSavedCourses = queryClient.getQueryData<string[]>([
        "savedCourses",
        user?.id,
      ]);
      queryClient.setQueryData<string[]>(["savedCourses", user?.id], (prev) => {
        if (!prev) return prev;
        const idString = String(courseId);
        return prev.includes(idString)
          ? prev.filter((c) => c !== idString)
          : [...prev, idString];
      });
      return { previousSavedCourses };
    },
    onError: (error, courseId, context) => {
      if (context?.previousSavedCourses && user?.id) {
        queryClient.setQueryData(
          ["savedCourses", user?.id],
          context.previousSavedCourses
        );
      }
      console.error("Error updating saved courses:", error);
      toast.error("Failed to update saved courses. Please try again.");
    },
    onSuccess: (_, courseId) => {
      queryClient.invalidateQueries({ queryKey: ["savedCourses", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      const savedCoursesList = queryClient.getQueryData<string[]>([
        "savedCourses",
        user?.id,
      ]);
      const isCurrentlySaved = savedCoursesList?.includes(String(courseId));
      toast.success(
        isCurrentlySaved
          ? "Removed from saved courses."
          : "Course saved to your profile."
      );
    },
  });

  // Fetch saved job IDs for checking if jobs are saved
  const { data: savedJobIds = [] } = useQuery<string[]>({
    queryKey: ["savedJobIds", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const profileResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
        const savedJobsArray = profileResponse.data?.saved_jobs || [];
        return savedJobsArray.map((id: string | number) => String(id));
      } catch (error) {
        console.error("Error fetching saved job IDs:", error);
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Save job mutation
  const saveJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      if (!user?.id) {
        throw new Error("Please log in to save jobs.");
      }
      const endpoint = `${API_ENDPOINTS.JOBS.SAVE_JOB}${jobId}/`;
      await apiClient.post(endpoint);
    },
    onMutate: async (jobId: string) => {
      await queryClient.cancelQueries({
        queryKey: ["savedJobs", user?.id],
      });
      await queryClient.cancelQueries({
        queryKey: ["savedJobIds", user?.id],
      });
      const previousSavedJobs = queryClient.getQueryData<string[]>([
        "savedJobs",
        user?.id,
      ]);
      const previousSavedJobIds = queryClient.getQueryData<string[]>([
        "savedJobIds",
        user?.id,
      ]);
      queryClient.setQueryData<string[]>(["savedJobIds", user?.id], (prev) => {
        if (!prev) return prev;
        const idString = String(jobId);
        return prev.includes(idString)
          ? prev.filter((j) => j !== idString)
          : [...prev, idString];
      });
      return { previousSavedJobs, previousSavedJobIds };
    },
    onError: (error, jobId, context) => {
      if (context?.previousSavedJobIds && user?.id) {
        queryClient.setQueryData(
          ["savedJobIds", user?.id],
          context.previousSavedJobIds
        );
      }
      console.error("Error updating saved jobs:", error);
      toast.error("Failed to update saved jobs. Please try again.");
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ["savedJobs", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["savedJobIds", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      const savedJobsList = queryClient.getQueryData<string[]>([
        "savedJobIds",
        user?.id,
      ]);
      const isCurrentlySaved = savedJobsList?.includes(String(jobId));
      toast.success(
        isCurrentlySaved
          ? "Removed from saved jobs."
          : "Job saved to your profile."
      );
    },
  });

  const phoneVerifiedFromServer = React.useMemo(() => {
    const getValue = (source: unknown, key: string) => {
      if (source && typeof source === "object") {
        return (source as Record<string, unknown>)[key];
      }
      return undefined;
    };

    const profileRoot = profileData as unknown;

    const candidates = [
      getValue(profileRoot, "phone_verified"),
      getValue(profileRoot, "is_phone_verified"),
      getValue(getValue(profileRoot, "profile"), "phone_verified"),
      getValue(getValue(profileRoot, "profile"), "is_phone_verified"),
      getValue(getValue(profileRoot, "user"), "phone_verified"),
      getValue(getValue(profileRoot, "user"), "is_phone_verified"),
      getValue(user as unknown, "phone_verified"),
      getValue(user as unknown, "is_phone_verified"),
    ];

    return candidates.some((value) => value === true || value === "true");
  }, [profileData, user]);

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

        // Extract social links from profile response if available
        const socialLinksFromProfile =
          response.data?.social_links ||
          response.data?.profile?.social_links ||
          response.data?.user?.social_links ||
          response.data?.social_networks ||
          response.data?.profile?.social_networks ||
          null;

        if (
          socialLinksFromProfile &&
          typeof socialLinksFromProfile === "object"
        ) {
          console.log(
            "✅ Found social links in profile response:",
            socialLinksFromProfile
          );
          setSocialLinks({
            github:
              ((socialLinksFromProfile as Record<string, unknown>)
                .github as string) || "",
            linkedin:
              ((socialLinksFromProfile as Record<string, unknown>)
                .linkedin as string) || "",
            facebook:
              ((socialLinksFromProfile as Record<string, unknown>)
                .facebook as string) || "",
            instagram:
              ((socialLinksFromProfile as Record<string, unknown>)
                .instagram as string) || "",
            dribbble:
              ((socialLinksFromProfile as Record<string, unknown>)
                .dribbble as string) || "",
            behance:
              ((socialLinksFromProfile as Record<string, unknown>)
                .behance as string) || "",
          });
        }

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

  // Extract social links from profile data (fetched from /api/profile/ endpoint)
  useEffect(() => {
    if (!user) return;

    // Skip if we just made a manual update (prevent overwriting)
    if (manualSocialLinkUpdateRef.current) {
      console.log(
        "⏭️ Skipping social links extraction - manual update in progress"
      );
      return;
    }

    setLoadingSocialLinks(true);

    try {
      // Extract social links from profile data
      if (profileData) {
        console.log(
          "🔍 Extracting social links from profileData:",
          profileData
        );
        const socialLinksFromProfile =
          (profileData as Record<string, unknown>)?.social_links ||
          (
            (profileData as Record<string, unknown>).profile as Record<
              string,
              unknown
            >
          )?.social_links ||
          (
            (profileData as Record<string, unknown>).user as Record<
              string,
              unknown
            >
          )?.social_links ||
          (profileData as Record<string, unknown>)?.social_networks ||
          (
            (profileData as Record<string, unknown>).profile as Record<
              string,
              unknown
            >
          )?.social_networks ||
          null;

        console.log(
          "🔍 Extracted socialLinksFromProfile:",
          socialLinksFromProfile
        );

        if (
          socialLinksFromProfile &&
          typeof socialLinksFromProfile === "object"
        ) {
          console.log(
            "✅ Using social links from profile data:",
            socialLinksFromProfile
          );
          const extractedLinks = {
            github:
              ((socialLinksFromProfile as Record<string, unknown>)
                .github as string) || "",
            linkedin:
              ((socialLinksFromProfile as Record<string, unknown>)
                .linkedin as string) || "",
            facebook:
              ((socialLinksFromProfile as Record<string, unknown>)
                .facebook as string) || "",
            instagram:
              ((socialLinksFromProfile as Record<string, unknown>)
                .instagram as string) || "",
            dribbble:
              ((socialLinksFromProfile as Record<string, unknown>)
                .dribbble as string) || "",
            behance:
              ((socialLinksFromProfile as Record<string, unknown>)
                .behance as string) || "",
          };
          console.log("✅ Setting social links to:", extractedLinks);
          setSocialLinks(extractedLinks);
        } else {
          // No social links in profile - only set empty if we don't have any links
          console.log("⚠️ No social links found in profile data");
          // Don't reset if we already have links (might be a manual update)
          setSocialLinks((prev) => {
            const hasAnyLinks = Object.values(prev).some(
              (v) => v && v.trim() !== ""
            );
            if (hasAnyLinks) {
              console.log("⚠️ Keeping existing social links:", prev);
              return prev;
            }
            return {
              github: "",
              linkedin: "",
              facebook: "",
              instagram: "",
              dribbble: "",
              behance: "",
            };
          });
        }
      } else {
        // Profile data not loaded yet - don't reset if we have links
        console.log("⚠️ Profile data not loaded yet");
        setSocialLinks((prev) => {
          const hasAnyLinks = Object.values(prev).some(
            (v) => v && v.trim() !== ""
          );
          if (hasAnyLinks) {
            return prev;
          }
          return {
            github: "",
            linkedin: "",
            facebook: "",
            instagram: "",
            dribbble: "",
            behance: "",
          };
        });
      }
    } catch (error) {
      console.error("❌ Error extracting social links from profile:", error);
      // Don't reset on error if we have links
      setSocialLinks((prev) => {
        const hasAnyLinks = Object.values(prev).some(
          (v) => v && v.trim() !== ""
        );
        if (hasAnyLinks) {
          return prev;
        }
        return {
          github: "",
          linkedin: "",
          facebook: "",
          instagram: "",
          dribbble: "",
          behance: "",
        };
      });
    } finally {
      setLoadingSocialLinks(false);
    }
  }, [user, profileData]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (socialLinksUpdateTimeoutRef.current) {
        clearTimeout(socialLinksUpdateTimeoutRef.current);
      }
    };
  }, []);

  // ✅ Use the 'user' object from the context directly
  const { first_name, last_name, email, phone_number } = user || {};

  // Phone verification hook - must be called before any early returns
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
    phoneNumber: phone_number || "",
    ownerId: user?.id,
    role: user?.user_type,
    initiallyVerified: phoneVerifiedFromServer,
  });

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
    setIsLogoutConfirmOpen(true);
  };

  const handleConfirmLogout = () => {
    setIsLogoutConfirmOpen(false);
    logout();
  };

  const handleCancelLogout = () => {
    setIsLogoutConfirmOpen(false);
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

      toast.success("Profile image has been updated successfully.");

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

      toast.success("Profile image has been removed.");

      // Reload page to refresh user context
      setTimeout(() => {
        window.location.reload();
      }, 500);

      console.log("✅ Profile image removed successfully");
    } catch (error) {
      console.error("❌ Error removing profile image:", error);
      toast.error("Failed to remove profile image. Please try again.");
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

  // Helper function to validate and normalize URL
  const normalizeUrl = (urlString: string): string => {
    const trimmed = urlString.trim();
    if (!trimmed) return trimmed;

    // If it already starts with http:// or https://, return as is
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }

    // Otherwise, add https://
    return `https://${trimmed}`;
  };

  // Helper function to validate URL
  const isValidUrl = (urlString: string): boolean => {
    try {
      const url = new URL(normalizeUrl(urlString));
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  // Handler to save/update social link
  const handleSaveSocialLink = async () => {
    console.log("🚀 handleSaveSocialLink called");
    console.log("🚀 Form data:", socialLinkForm);
    console.log("🚀 User:", user);
    console.log("🚀 Current social links:", socialLinks);

    if (!user) {
      console.error("❌ No user found");
      toast.error("Please log in to save social links.");
      return;
    }

    if (!socialLinkForm.platform || !socialLinkForm.url.trim()) {
      console.error("❌ Missing platform or URL");
      toast.error("Please select a platform and provide a URL.");
      return;
    }

    // Validate URL
    if (!isValidUrl(socialLinkForm.url)) {
      console.error("❌ Invalid URL:", socialLinkForm.url);
      toast.error(
        "Please enter a valid URL (e.g., https://example.com or example.com)."
      );
      return;
    }

    console.log("✅ Validation passed, starting save...");
    setSavingSocialLink(true);

    try {
      const platform = socialLinkForm.platform as SocialPlatform;
      const token = localStorage.getItem("authToken");

      // Normalize the URL before saving
      const normalizedUrl = normalizeUrl(socialLinkForm.url.trim());

      // Prepare updated social links object with all existing links plus the new one
      const updatedSocialLinks = {
        ...socialLinks,
        [platform]: normalizedUrl,
      };

      // Filter out empty strings - only send platforms with values
      const socialLinksToSend: Record<string, string> = {};
      Object.entries(updatedSocialLinks).forEach(([key, value]) => {
        if (value && value.trim() !== "") {
          socialLinksToSend[key] = value;
        }
      });

      console.log("📤 Sending social links to API:", socialLinksToSend);
      console.log("📤 Platform:", platform);
      console.log("📤 Normalized URL:", normalizedUrl);
      console.log(
        "📤 Full payload:",
        JSON.stringify({ social_links: socialLinksToSend }, null, 2)
      );

      // Set flag to prevent useEffect from overwriting - MUST BE SET BEFORE ANY STATE UPDATES
      manualSocialLinkUpdateRef.current = true;

      // Clear any existing timeout
      if (socialLinksUpdateTimeoutRef.current) {
        clearTimeout(socialLinksUpdateTimeoutRef.current);
      }

      console.log("🔒 Manual update flag set to true");

      // Update local state immediately for UI feedback
      setSocialLinks(updatedSocialLinks);
      console.log("✅ Updated local state immediately:", updatedSocialLinks);

      // Save to profile endpoint with social_links object
      // Try sending as nested object first, if that fails, try sending individual fields
      let response;
      try {
        console.log("📤 Attempting PATCH with social_links object...");
        response = await apiClient.patch(
          API_ENDPOINTS.AUTH.PROFILE,
          {
            social_links: socialLinksToSend,
          },
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : undefined,
              "Content-Type": "application/json",
            },
          }
        );
        console.log("✅ PATCH successful with social_links object");
      } catch (apiError) {
        console.error(
          "❌ PATCH with social_links object failed, error:",
          apiError
        );

        // Check if it's a validation error about the format
        const error = apiError as {
          response?: {
            data?: unknown;
            status?: number;
          };
        };

        // If 400 error, try sending individual fields instead
        if (error.response?.status === 400) {
          console.log(
            "🔄 Trying alternative format - sending individual fields..."
          );
          try {
            // Try sending social links as individual fields on the profile
            const individualFieldsPayload: Record<string, unknown> = {};
            Object.entries(socialLinksToSend).forEach(([key, value]) => {
              individualFieldsPayload[key] = value;
            });

            console.log(
              "📤 Trying individual fields payload:",
              individualFieldsPayload
            );
            response = await apiClient.patch(
              API_ENDPOINTS.AUTH.PROFILE,
              individualFieldsPayload,
              {
                headers: {
                  Authorization: token ? `Bearer ${token}` : undefined,
                  "Content-Type": "application/json",
                },
              }
            );
            console.log("✅ PATCH successful with individual fields");
          } catch (individualError) {
            console.error(
              "❌ PATCH with individual fields also failed:",
              individualError
            );
            // Reset flag on error
            manualSocialLinkUpdateRef.current = false;
            throw apiError; // Throw original error
          }
        } else {
          // Reset flag on error
          manualSocialLinkUpdateRef.current = false;
          throw apiError;
        }
      }

      console.log("✅ Response status:", response.status);
      console.log("✅ Response data:", JSON.stringify(response.data, null, 2));
      console.log("✅ Response headers:", response.headers);

      // After successful PATCH, refetch the profile to get the latest data from server
      // This ensures we have the most up-to-date social links
      try {
        console.log("🔄 Refetching profile data to verify save...");
        const refreshedProfileResponse = await apiClient.get(
          API_ENDPOINTS.AUTH.PROFILE,
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : undefined,
            },
          }
        );

        console.log(
          "✅ Refreshed profile data:",
          JSON.stringify(refreshedProfileResponse.data, null, 2)
        );

        if (refreshedProfileResponse.data) {
          const refreshedData = refreshedProfileResponse.data as Record<
            string,
            unknown
          >;

          // Update profile data
          setProfileData(refreshedProfileResponse.data as ProfileData);

          // Extract social links from refreshed data
          const socialLinksFromRefreshed =
            refreshedData?.social_links ||
            (refreshedData?.profile as Record<string, unknown>)?.social_links ||
            (refreshedData?.user as Record<string, unknown>)?.social_links ||
            null;

          console.log(
            "🔍 Social links from refreshed profile:",
            socialLinksFromRefreshed
          );

          if (
            socialLinksFromRefreshed &&
            typeof socialLinksFromRefreshed === "object" &&
            !Array.isArray(socialLinksFromRefreshed)
          ) {
            const extractedLinks = {
              github:
                ((socialLinksFromRefreshed as Record<string, unknown>)
                  .github as string) || "",
              linkedin:
                ((socialLinksFromRefreshed as Record<string, unknown>)
                  .linkedin as string) || "",
              facebook:
                ((socialLinksFromRefreshed as Record<string, unknown>)
                  .facebook as string) || "",
              instagram:
                ((socialLinksFromRefreshed as Record<string, unknown>)
                  .instagram as string) || "",
              dribbble:
                ((socialLinksFromRefreshed as Record<string, unknown>)
                  .dribbble as string) || "",
              behance:
                ((socialLinksFromRefreshed as Record<string, unknown>)
                  .behance as string) || "",
            };
            console.log(
              "✅ Setting social links from refreshed data:",
              extractedLinks
            );
            setSocialLinks(extractedLinks);
          } else {
            console.log(
              "⚠️ No social links in refreshed data, checking if our update was saved..."
            );
            // If no social links in response, check if our update should have been there
            // This might indicate the API doesn't return social_links in the response
            console.log("⚠️ Keeping local update:", updatedSocialLinks);
          }
        }
      } catch (refreshError) {
        console.error("❌ Error refreshing profile after save:", refreshError);
        // Even if refresh fails, keep the local update since PATCH succeeded
        console.log("⚠️ Keeping local update due to refresh error");
      }

      // Reset the manual update flag after a delay
      if (socialLinksUpdateTimeoutRef.current) {
        clearTimeout(socialLinksUpdateTimeoutRef.current);
      }
      socialLinksUpdateTimeoutRef.current = setTimeout(() => {
        manualSocialLinkUpdateRef.current = false;
        console.log("✅ Manual update flag reset after timeout");
      }, 3000);

      setIsSocialLinkModalOpen(false);
      setSocialLinkForm({ platform: "", url: "" });
      setEditingPlatform(null);

      toast.success(
        editingPlatform
          ? "Social link updated successfully."
          : "Social link added successfully."
      );
    } catch (error) {
      console.error("❌ Error saving social link:", error);
      let errorMessage = "Failed to save social link. Please try again.";

      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: {
            data?: unknown;
            status?: number;
            statusText?: string;
          };
          message?: string;
          request?: unknown;
        };

        console.error("❌ Full error object:", {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          message: axiosError.message,
          request: axiosError.request,
        });

        if (axiosError.response?.data) {
          const errorData = axiosError.response.data as {
            detail?: string;
            message?: string;
            social_links?: unknown;
            [key: string]: unknown;
          };

          // Check for field-specific errors
          if (errorData.social_links) {
            errorMessage =
              typeof errorData.social_links === "string"
                ? errorData.social_links
                : "Invalid social links format. Please check your input.";
          } else {
            errorMessage =
              errorData.detail || errorData.message || errorMessage;
          }

          console.error(
            "❌ Error response data:",
            JSON.stringify(errorData, null, 2)
          );
        }

        // Provide more specific error messages based on status code
        if (axiosError.response?.status === 400) {
          errorMessage =
            "Invalid request. Please check the URL format and try again.";
        } else if (axiosError.response?.status === 401) {
          errorMessage = "Authentication failed. Please log in again.";
        } else if (axiosError.response?.status === 403) {
          errorMessage = "You don't have permission to update social links.";
        } else if (axiosError.response?.status === 500) {
          errorMessage =
            "Server error. Please try again later or contact support.";
        }
      } else if (error instanceof Error) {
        console.error("❌ Error message:", error.message);
        errorMessage = error.message || errorMessage;
      }

      toast.error(errorMessage);
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

      // Create a new object without the platform to remove
      const updatedSocialLinks = { ...socialLinks };
      delete updatedSocialLinks[platform];

      // Filter out empty strings - only send platforms with values
      const socialLinksToSend: Record<string, string> = {};
      Object.entries(updatedSocialLinks).forEach(([key, value]) => {
        if (value && value.trim() !== "") {
          socialLinksToSend[key] = value;
        }
      });

      console.log("📤 Removing social link, sending:", socialLinksToSend);
      console.log(
        "📤 Full payload:",
        JSON.stringify({ social_links: socialLinksToSend }, null, 2)
      );

      // Set flag to prevent useEffect from overwriting - MUST BE SET BEFORE ANY STATE UPDATES
      manualSocialLinkUpdateRef.current = true;

      // Clear any existing timeout
      if (socialLinksUpdateTimeoutRef.current) {
        clearTimeout(socialLinksUpdateTimeoutRef.current);
      }

      console.log("🔒 Manual update flag set to true (delete)");

      // Update local state immediately - set the removed platform to empty string
      const finalSocialLinks = {
        ...socialLinks,
        [platform]: "",
      };
      setSocialLinks(finalSocialLinks);
      console.log("✅ Updated local state immediately:", finalSocialLinks);

      // Save to profile endpoint with updated social_links object (without the removed platform)
      let response;
      try {
        response = await apiClient.patch(
          API_ENDPOINTS.AUTH.PROFILE,
          {
            social_links: socialLinksToSend,
          },
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : undefined,
              "Content-Type": "application/json",
            },
          }
        );
      } catch (apiError) {
        // Reset flag on error
        manualSocialLinkUpdateRef.current = false;
        throw apiError;
      }

      console.log("✅ Response status:", response.status);
      console.log("✅ Response data:", JSON.stringify(response.data, null, 2));
      console.log("✅ Response headers:", response.headers);

      // After successful PATCH, refetch the profile to get the latest data from server
      try {
        console.log("🔄 Refetching profile data to verify delete...");
        const refreshedProfileResponse = await apiClient.get(
          API_ENDPOINTS.AUTH.PROFILE,
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : undefined,
            },
          }
        );

        console.log(
          "✅ Refreshed profile data (delete):",
          JSON.stringify(refreshedProfileResponse.data, null, 2)
        );

        if (refreshedProfileResponse.data) {
          const refreshedData = refreshedProfileResponse.data as Record<
            string,
            unknown
          >;

          // Update profile data
          setProfileData(refreshedProfileResponse.data as ProfileData);

          // Extract social links from refreshed data
          const socialLinksFromRefreshed =
            refreshedData?.social_links ||
            (refreshedData?.profile as Record<string, unknown>)?.social_links ||
            (refreshedData?.user as Record<string, unknown>)?.social_links ||
            null;

          console.log(
            "🔍 Social links from refreshed profile (delete):",
            socialLinksFromRefreshed
          );

          if (
            socialLinksFromRefreshed &&
            typeof socialLinksFromRefreshed === "object" &&
            !Array.isArray(socialLinksFromRefreshed)
          ) {
            const extractedLinks = {
              github:
                ((socialLinksFromRefreshed as Record<string, unknown>)
                  .github as string) || "",
              linkedin:
                ((socialLinksFromRefreshed as Record<string, unknown>)
                  .linkedin as string) || "",
              facebook:
                ((socialLinksFromRefreshed as Record<string, unknown>)
                  .facebook as string) || "",
              instagram:
                ((socialLinksFromRefreshed as Record<string, unknown>)
                  .instagram as string) || "",
              dribbble:
                ((socialLinksFromRefreshed as Record<string, unknown>)
                  .dribbble as string) || "",
              behance:
                ((socialLinksFromRefreshed as Record<string, unknown>)
                  .behance as string) || "",
            };
            console.log(
              "✅ Setting social links from refreshed data (delete):",
              extractedLinks
            );
            setSocialLinks(extractedLinks);
          } else {
            console.log("⚠️ No social links in refreshed data after delete");
            // The platform should be removed, so finalSocialLinks is correct
            console.log(
              "✅ Keeping local update (platform removed):",
              finalSocialLinks
            );
          }
        }
      } catch (refreshError) {
        console.error(
          "❌ Error refreshing profile after delete:",
          refreshError
        );
        // Keep the local update since PATCH succeeded
      }

      // Reset the manual update flag after a delay
      if (socialLinksUpdateTimeoutRef.current) {
        clearTimeout(socialLinksUpdateTimeoutRef.current);
      }
      socialLinksUpdateTimeoutRef.current = setTimeout(() => {
        manualSocialLinkUpdateRef.current = false;
        console.log("✅ Manual update flag reset after timeout (delete)");
      }, 3000);

      toast.success("Social link removed successfully.");
    } catch (error) {
      console.error("❌ Error deleting social link:", error);
      let errorMessage = "Failed to remove social link. Please try again.";

      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: {
            data?: unknown;
            status?: number;
            statusText?: string;
          };
          message?: string;
        };

        console.error("❌ Full error object:", {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          message: axiosError.message,
        });

        if (axiosError.response?.data) {
          const errorData = axiosError.response.data as {
            detail?: string;
            message?: string;
            [key: string]: unknown;
          };
          errorMessage = errorData.detail || errorData.message || errorMessage;
          console.error(
            "❌ Error response data:",
            JSON.stringify(errorData, null, 2)
          );
        }
      }

      toast.error(errorMessage);
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

      toast.success("About Me has been updated successfully.");
    } catch (error) {
      console.error("❌ Error updating about me:", error);
      toast.error("Failed to update About Me. Please try again.");
    } finally {
      setUpdatingAboutMe(false);
    }
  };

  // Handler to open contact information edit modal
  const handleOpenContactEditModal = () => {
    setPhoneEditValue(phone_number || "");
    setEmailEditValue(email || "");
    setIsContactEditModalOpen(true);
  };

  // Handler to save contact information (phone and email)
  const handleSaveContact = async () => {
    if (!user) return;

    // Validate email
    if (!emailEditValue.trim()) {
      toast.error("Email cannot be empty.");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailEditValue.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setUpdatingContact(true);

    try {
      const token = localStorage.getItem("authToken");

      // Prepare update payload
      const updateData: { phone_number?: string; email: string } = {
        email: emailEditValue.trim(),
      };

      // Only include phone_number if it's provided
      if (phoneEditValue.trim()) {
        updateData.phone_number = phoneEditValue.trim();
      }

      const response = await apiClient.patch(
        API_ENDPOINTS.AUTH.PROFILE,
        updateData,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        }
      );

      console.log("✅ Contact information updated:", response.data);

      // Refresh profile data
      const profileResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      setProfileData(profileResponse.data);

      // Reload to update user context
      setTimeout(() => {
        window.location.reload();
      }, 500);

      setIsContactEditModalOpen(false);

      toast.success("Contact information has been updated successfully.");
    } catch (error) {
      console.error("❌ Error updating contact information:", error);
      const errorMessage =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { detail?: string } } }).response
              ?.data?.detail ||
            "Failed to update contact information. Please try again."
          : "Failed to update contact information. Please try again.";
      toast.error(errorMessage);
    } finally {
      setUpdatingContact(false);
    }
  };

  const handleSendPhoneVerification = async () => {
    try {
      await triggerPhoneVerificationCode();
      toast.info(
        phone_number
          ? `We've sent a 6-digit code to ${phone_number}.`
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

  // Prepare data for pie charts
  const prepareSkillPieData = (skill: { name: string; percentage: number }) => {
    return [
      {
        name: skill.name,
        value: skill.percentage,
        fill: skill.percentage >= 70 ? "#10b981" : "#f59e0b",
      },
      { name: "Remaining", value: 100 - skill.percentage, fill: "#e5e7eb" },
    ];
  };

  const COLORS = {
    strong: "#10b981", // green-500
    moderate: "#f59e0b", // amber-500
    light: "#e5e7eb", // gray-200
  };

  // Render skills as a modern vertical bar chart with primary color and opacity
  const renderSkillsChart = (skills: Record<string, string>, title: string) => {
    const primaryColor = "#19B5FE"; // breneo-blue (primary color)

    const chartData = Object.entries(skills)
      .filter(([_, pct]) => parseFloat(String(pct).replace("%", "")) > 0)
      .map(([skill, pct]) => {
        const percentage = parseFloat(String(pct).replace("%", ""));

        // Calculate opacity based on percentage
        // If >= 40%, use full opacity (1.0) to make results more visible
        // Otherwise, scale opacity from 0.3 to 1.0 based on percentage
        let opacity: number;
        if (percentage >= 40) {
          opacity = 1.0; // Full opacity for bars 40% and higher
        } else {
          // Scale from 0% to 40%: opacity ranges from 0.3 to 1.0
          // Formula: opacity = 0.3 + (percentage / 40) * 0.7
          opacity = 0.3 + (percentage / 40) * 0.7;
        }

        // Create unique gradient ID for each opacity level
        const gradientId = `gradient-primary-${Math.round(opacity * 100)}`;

        return {
          skill,
          percentage,
          displayPct: pct,
          fill: primaryColor,
          opacity,
          gradientId,
        };
      })
      .sort((a, b) => b.percentage - a.percentage); // Sort by percentage descending

    if (chartData.length === 0) {
      return (
        <div className="text-center text-gray-500 dark:text-gray-400 py-4">
          No skills data available
        </div>
      );
    }

    const chartConfig = {
      percentage: {
        label: "Percentage",
      },
    };

    // Custom label component to show skill name at bottom of chart (below bars)
    const CustomInsideLabel = (props: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      payload?: { skill?: string };
      value?: string;
    }) => {
      const { x, y, width, height, payload, value } = props;
      const skillName = payload?.skill || value || "";

      if (!x || !y || !width || !height || !skillName) {
        return null;
      }

      const centerX = x + width / 2;
      // Position skill name at fixed bottom position of chart
      // Chart height is 250px, bottom margin is 80px, so bottom is at ~170px
      // Use a fixed Y position that's always at the bottom regardless of bar height
      // Added more space between bars and skill names
      const chartHeight = 250;
      const bottomMargin = 80;
      const skillY = chartHeight - bottomMargin + 25; // Fixed position at bottom with more space

      // Split long skill names into multiple lines
      // Max characters per line based on bar width (approximately 8-10 chars per 50px width)
      const maxCharsPerLine = Math.max(8, Math.floor(width / 6));
      const words = skillName.split(" ");
      const lines: string[] = [];
      let currentLine = "";

      // Try to split by words first, then by characters if needed
      for (const word of words) {
        if (word.length > maxCharsPerLine) {
          // If a single word is too long, split it by characters
          if (currentLine) {
            lines.push(currentLine);
            currentLine = "";
          }
          // Split the long word into chunks
          for (let i = 0; i < word.length; i += maxCharsPerLine) {
            lines.push(word.slice(i, i + maxCharsPerLine));
          }
        } else if ((currentLine + " " + word).length <= maxCharsPerLine) {
          currentLine = currentLine ? currentLine + " " + word : word;
        } else {
          if (currentLine) {
            lines.push(currentLine);
          }
          currentLine = word;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }

      // If still too long, split by characters
      if (
        lines.length === 0 ||
        (lines.length === 1 && lines[0].length > maxCharsPerLine * 1.5)
      ) {
        lines.length = 0;
        for (let i = 0; i < skillName.length; i += maxCharsPerLine) {
          lines.push(skillName.slice(i, i + maxCharsPerLine));
        }
      }

      // Limit to 2 lines max
      const displayLines = lines.slice(0, 2);
      const lineHeight = 14;
      const startY = skillY - (displayLines.length - 1) * (lineHeight / 2);

      return (
        <text
          x={centerX}
          y={startY}
          fill="#374151"
          textAnchor="middle"
          fontSize={12}
          fontWeight={600}
          className="dark:fill-gray-200"
        >
          {displayLines.map((line, index) => (
            <tspan key={index} x={centerX} dy={index === 0 ? 0 : lineHeight}>
              {line}
            </tspan>
          ))}
        </text>
      );
    };

    // Custom label component to show percentage at bottom of chart (below bars)
    const CustomBottomLabel = (props: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      value?: number;
      payload?: { skill?: string };
    }) => {
      const { x, y, width, height, value, payload } = props;
      const percentage = value || 0;
      const skillName = payload?.skill || "";

      if (!x || !y || !width || !height) {
        return null;
      }

      const centerX = x + width / 2;
      // Position percentage at fixed bottom position of chart
      // Chart height is 250px, bottom margin is 80px, so bottom is at ~170px
      // Adjust position based on whether skill name is wrapped to 2 lines
      // Added more space between skill name and percentage
      const chartHeight = 250;
      const bottomMargin = 80;
      const maxCharsPerLine = Math.max(8, Math.floor(width / 6));
      const isLongName = skillName.length > maxCharsPerLine * 1.2;
      // If skill name is wrapped, move percentage down a bit more
      const percentY = chartHeight - bottomMargin + (isLongName ? 70 : 60);

      return (
        <text
          x={centerX}
          y={percentY}
          fill="#374151"
          textAnchor="middle"
          fontSize={13}
          fontWeight={700}
          className="dark:fill-gray-200"
        >
          {`${percentage.toFixed(0)}%`}
        </text>
      );
    };

    return (
      <div className="w-full -mb-4">
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 10, left: 10, bottom: 80 }}
            barCategoryGap="25%"
          >
            <defs>
              {chartData.map((entry) => {
                // Create darker shade for gradient bottom
                const darkerShade = "#0EA5E9"; // Slightly darker blue
                return (
                  <linearGradient
                    key={entry.gradientId}
                    id={entry.gradientId}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={entry.fill}
                      stopOpacity={entry.opacity}
                    />
                    <stop
                      offset="100%"
                      stopColor={darkerShade}
                      stopOpacity={entry.opacity}
                    />
                  </linearGradient>
                );
              })}
            </defs>
            <XAxis dataKey="skill" hide={true} />
            <YAxis type="number" domain={[0, 100]} hide={true} />
            <ChartTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 backdrop-blur-sm">
                      <div className="flex flex-col gap-2">
                        <span className="font-semibold text-base text-gray-900 dark:text-gray-100">
                          {data.skill}
                        </span>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: primaryColor,
                              opacity: data.opacity,
                            }}
                          />
                          <span
                            className="font-bold text-lg"
                            style={{
                              color: primaryColor,
                              opacity: data.opacity,
                            }}
                          >
                            {data.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="percentage"
              radius={[8, 8, 8, 8]}
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#${entry.gradientId})`}
                  style={{
                    transition: "all 0.3s ease",
                  }}
                />
              ))}
              {/* Skill name at bottom inside bar */}
              <LabelList content={CustomInsideLabel} dataKey="skill" />
              {/* Percentage at bottom inside bar */}
              <LabelList content={CustomBottomLabel} dataKey="percentage" />
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 pb-32 md:pb-0">
        {/* Left Column - Profile Summary, Contact Info, Social Networks */}
        <div className="lg:col-span-1">
          <div className="space-y-4 md:space-y-6">
            {/* Profile Header Card */}
            <Card className="bg-transparent border-0 md:bg-card md:border">
              <CardContent className="pb-4 pt-6 px-6 md:pb-6">
                {/* Mobile: Horizontal layout, Desktop: Vertical centered */}
                <div className="flex flex-col md:items-center">
                  {/* Top Section: Name/Info on left, Picture on right (Mobile) | Picture on top, Name below (Desktop) */}
                  <div className="flex items-start justify-between gap-4 mb-4 md:flex-col md:items-center md:mb-4">
                    {/* Profile Picture - Right side (Mobile) | Top (Desktop) */}
                    <div className="relative flex-shrink-0 order-2 md:relative md:order-1">
                      <div
                        className="relative group cursor-pointer rounded-full overflow-hidden"
                        onClick={handleImageModalClick}
                      >
                        <OptimizedAvatar
                          key={`avatar-${imageTimestamp}`}
                          src={displayProfileImage || undefined}
                          alt="Profile photo"
                          fallback={
                            first_name
                              ? first_name.charAt(0).toUpperCase()
                              : "U"
                          }
                          size="lg"
                          loading="eager"
                          className="h-16 w-16 md:h-28 md:w-28 rounded-full"
                        />
                        {uploadingImage ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full z-10">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <Camera className="h-5 w-5 md:h-7 md:w-7 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                    <input
                      id="profile-image-input"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />

                    {/* Name and Info - Left side (Mobile) | Below picture (Desktop) */}
                    <div className="flex-1 min-w-0 order-1 md:text-center md:flex-none md:mb-4 md:order-2">
                      <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                        {first_name} {last_name}
                      </h1>
                      {(user as { job_title?: string; position?: string })
                        ?.job_title && (
                        <p className="text-sm font-semibold md:font-normal text-gray-900 dark:text-gray-100 md:text-gray-600 md:dark:text-gray-400 mb-1">
                          {(user as { job_title?: string }).job_title}
                        </p>
                      )}
                      {(user as { city?: string; location?: string })?.city ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {(user as { city?: string }).city}
                          {(user as { country?: string })?.country &&
                            `, ${(user as { country?: string }).country}`}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {phone_number || "Location not specified"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Hidden Profile Badge */}
                  {(user as { is_profile_hidden?: boolean })
                    ?.is_profile_hidden && (
                    <div className="mb-4 md:text-center">
                      <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 border-0">
                        <Eye size={12} className="mr-1" />
                        Hidden Profile
                      </Badge>
                    </div>
                  )}

                  {/* Bottom Section: Settings and Logout Buttons */}
                  <div className="flex items-center gap-2 w-full pt-3 md:mt-2 md:pt-0">
                    <Button
                      variant="outline"
                      className="flex-[5] md:flex-1 flex items-center justify-center gap-2 h-12 px-6 bg-breneo-blue/10 text-breneo-blue border-0 hover:bg-breneo-blue/20 dark:hover:bg-breneo-blue/30"
                      onClick={() => navigate("/settings")}
                    >
                      <Settings size={16} />
                      <span>Settings</span>
                    </Button>
                    <Button
                      variant="default"
                      size="icon"
                      onClick={handleLogout}
                      className="h-12 w-12 bg-red-100 text-red-600 hover:bg-red-200 active:bg-red-300 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 dark:active:bg-red-900/70"
                    >
                      <LogOut size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between p-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Contact Information
                </h3>
                <Button
                  variant="link"
                  className="text-breneo-blue p-0 h-auto font-normal hover:underline"
                  onClick={handleOpenContactEditModal}
                >
                  Edit
                </Button>
              </CardHeader>
              <CardContent className="space-y-0 p-0">
                <div className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-breneo-blue/10 rounded-full p-2 flex-shrink-0">
                      <Phone size={18} className="text-breneo-blue" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {phone_number || "Not provided"}
                    </span>
                  </div>
                </div>
                <div className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-breneo-blue/10 rounded-full p-2 flex-shrink-0">
                      <Mail size={18} className="text-breneo-blue" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {email}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Social Networks Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between p-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Social Networks
                </h3>
                <Button
                  variant="link"
                  className="text-breneo-blue p-0 h-auto font-normal hover:underline"
                  onClick={handleOpenSocialLinkModal}
                >
                  Add
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {loadingSocialLinks ? (
                  <div className="text-center py-4 text-gray-500 text-sm px-6">
                    Loading...
                  </div>
                ) : Object.entries(socialLinks).some(
                    ([_, url]) => url && url.trim() !== ""
                  ) ? (
                  <div>
                    {(Object.entries(socialLinks) as [SocialPlatform, string][])
                      .filter(([_, url]) => url && url.trim() !== "")
                      .map(([platform, url], index, filteredArray) => (
                        <div
                          key={platform}
                          className={`px-6 py-4 ${
                            index < filteredArray.length - 1
                              ? "border-b border-gray-200 dark:border-gray-700"
                              : ""
                          } group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}
                        >
                          <div className="flex items-center justify-between">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 flex-1 min-w-0"
                            >
                              <div className="bg-breneo-blue/10 rounded-full p-2 flex-shrink-0">
                                {getSocialIcon(
                                  platform,
                                  "h-[18px] w-[18px] text-breneo-blue"
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {platformLabels[platform]}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {url
                                    .replace(/^https?:\/\//, "")
                                    .replace(/^www\./, "")}
                                </p>
                              </div>
                            </a>
                            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                              <button
                                type="button"
                                className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 dark:hover:bg-gray-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditSocialLink(platform);
                                }}
                              >
                                <Edit
                                  size={14}
                                  className="text-gray-600 dark:text-gray-400"
                                />
                              </button>
                              <button
                                type="button"
                                className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 dark:hover:bg-primary/20"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSocialLink(platform);
                                }}
                              >
                                <Trash2
                                  size={14}
                                  className="text-gray-600 dark:text-gray-400"
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm px-6">
                    No social links added yet. Click "Add" to add your social
                    media profiles.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* About Me Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                About Me
              </h3>
              <Button
                variant="link"
                className="text-breneo-blue p-0 h-auto font-normal hover:underline"
                onClick={handleOpenAboutMeModal}
              >
                Edit
              </Button>
            </CardHeader>
            <CardContent className="px-6 py-4">
              {loadingProfile ? (
                <div className="text-center py-4 text-gray-500">Loading...</div>
              ) : aboutMe ? (
                <div>
                  <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                    {aboutMe.length > 200
                      ? `${aboutMe.substring(0, 200)}...`
                      : aboutMe}
                  </p>
                  {aboutMe.length > 200 && (
                    <Button
                      variant="link"
                      className="text-breneo-blue p-0 h-auto mt-2 font-normal text-sm hover:underline"
                      onClick={handleOpenAboutMeModal}
                    >
                      View More
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
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
            <CardHeader className="p-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Personal Skills
              </h3>
            </CardHeader>
            <CardContent className="px-6 py-4">
              {loadingResults ? (
                <div className="text-center py-4 text-gray-500">
                  Loading skill results...
                </div>
              ) : skillResults &&
                (skillResults.final_role || getAllSkills().length > 0) ? (
                <div className="space-y-4">
                  {/* Final Role */}
                  {skillResults.final_role && (
                    <div className="bg-gradient-to-r from-breneo-blue/10 to-breneo-blue/5 dark:from-breneo-blue/20 dark:to-breneo-blue/10 p-4 rounded-3xl border border-breneo-blue/20 dark:border-breneo-blue/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="bg-breneo-blue/10 rounded-full p-2">
                          <Award className="h-5 w-5 text-breneo-blue" />
                        </div>
                        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                          Recommended Role
                        </span>
                      </div>
                      <Badge className="text-sm px-3 py-1.5 bg-breneo-blue hover:bg-breneo-blue/90 text-white border-0">
                        {skillResults.final_role}
                      </Badge>
                    </div>
                  )}

                  {/* Skills with Charts */}
                  {skillResults?.skills_json && (
                    <div>
                      <h4 className="font-semibold text-base text-gray-900 dark:text-gray-100 mb-4">
                        Top Skills
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Technical Skills */}
                        {skillResults.skills_json.tech &&
                          Object.keys(skillResults.skills_json.tech).length >
                            0 && (
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-sm">
                                  Technical Skills
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-2 pt-0 pb-4">
                                {renderSkillsChart(
                                  skillResults.skills_json.tech,
                                  "Technical Skills"
                                )}
                              </CardContent>
                            </Card>
                          )}

                        {/* Soft Skills */}
                        {skillResults.skills_json.soft &&
                          Object.keys(skillResults.skills_json.soft).length >
                            0 && (
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-sm">
                                  Soft Skills
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-2 pt-0 pb-4">
                                {renderSkillsChart(
                                  skillResults.skills_json.soft,
                                  "Soft Skills"
                                )}
                              </CardContent>
                            </Card>
                          )}
                      </div>
                    </div>
                  )}

                  {getAllSkills().length === 0 && !loadingResults && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No skill test results available. Take a skill test to see
                      your results here.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No skill test results available. Take a skill test to see your
                  results here.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saved Courses Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Saved Courses
              </h3>
              {savedCourses.length > 0 && (
                <Button
                  variant="link"
                  className="text-breneo-blue p-0 h-auto font-normal hover:underline"
                  onClick={() => navigate("/courses")}
                >
                  View All
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {loadingSavedCourses ? (
                <div className="px-6 py-4 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-start gap-3 animate-pulse">
                      <Skeleton className="w-12 h-12 rounded-3xl flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-3 w-2/3" />
                        <div className="flex items-center gap-2 mt-2">
                          <Skeleton className="h-7 w-20" />
                          <Skeleton className="h-7 w-7 rounded-full" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : savedCourses.length > 0 ? (
                <div>
                  {savedCourses.map((course, index) => {
                    const isCourseSaved = savedCourseIds?.includes(String(course.id)) ?? false;
                    return (
                      <div
                        key={course.id}
                        className={`px-6 py-4 ${
                          index < savedCourses.length - 1
                            ? "border-b border-gray-200 dark:border-gray-700"
                            : ""
                        } hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <img
                              src={normalizeImagePath(course.image)}
                              alt={course.title}
                              className="w-12 h-12 rounded-3xl object-cover cursor-pointer"
                              onClick={() => navigate(`/course/${course.id}`)}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "/lovable-uploads/no_photo.png";
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 
                                className="font-medium text-sm text-gray-900 dark:text-gray-100 line-clamp-1 cursor-pointer hover:text-breneo-blue transition-colors flex-1"
                                onClick={() => navigate(`/course/${course.id}`)}
                              >
                                {course.title}
                              </h4>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 border-breneo-blue text-breneo-blue hover:bg-breneo-blue hover:text-white"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/course/${course.id}`);
                                  }}
                                >
                                  View
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="bg-[#E6E7EB] hover:bg-[#E6E7EB]/90 h-7 w-7 p-0 rounded-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    saveCourseMutation.mutate(course.id);
                                  }}
                                  disabled={saveCourseMutation.isPending}
                                  aria-label={isCourseSaved ? "Unsave course" : "Save course"}
                                >
                                  {saveCourseMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Heart
                                      className={`h-3 w-3 transition-colors ${
                                        isCourseSaved
                                          ? "text-red-500 fill-red-500 animate-heart-pop"
                                          : "text-black"
                                      }`}
                                    />
                                  )}
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                              {course.provider}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{course.level}</span>
                              <span>•</span>
                              <span>{course.duration}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {savedCourses.length >= 6 && (
                    <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        variant="link"
                        className="text-breneo-blue p-0 h-auto font-normal text-sm w-full justify-center hover:underline"
                        onClick={() => navigate("/courses")}
                      >
                        View All Saved Courses
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm px-6">
                  No saved courses yet. Browse courses and save your favorites!
                  <Button
                    variant="link"
                    className="mt-2 text-breneo-blue font-normal text-sm hover:underline"
                    onClick={() => navigate("/courses")}
                  >
                    Browse Courses
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saved Jobs Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Saved Jobs
              </h3>
              {savedJobs.length > 0 && (
                <Button
                  variant="link"
                  className="text-breneo-blue p-0 h-auto font-normal hover:underline"
                  onClick={() => navigate("/jobs")}
                >
                  View All
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {loadingSavedJobs ? (
                <div className="px-6 py-4 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-start gap-3 animate-pulse">
                      <Skeleton className="w-12 h-12 rounded-3xl flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-3 w-2/3" />
                        <div className="flex items-center gap-2 mt-2">
                          <Skeleton className="h-7 w-20" />
                          <Skeleton className="h-7 w-7 rounded-full" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : savedJobs.length > 0 ? (
                <div>
                  {savedJobs.map((job, index) => {
                    const isJobSaved = savedJobIds?.includes(String(job.id)) ?? false;
                    return (
                      <div
                        key={job.id}
                        className={`px-6 py-4 ${
                          index < savedJobs.length - 1
                            ? "border-b border-gray-200 dark:border-gray-700"
                            : ""
                        } hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            {job.company_logo ? (
                              <img
                                src={job.company_logo}
                                alt={`${job.company} logo`}
                                className="w-12 h-12 rounded-3xl object-cover border border-gray-200 dark:border-gray-700"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                  if (target.nextElementSibling) {
                                    (
                                      target.nextElementSibling as HTMLElement
                                    ).style.display = "flex";
                                  }
                                }}
                              />
                            ) : null}
                            {!job.company_logo && (
                              <div className="w-12 h-12 rounded-3xl bg-breneo-blue/10 flex items-center justify-center">
                                <Briefcase className="h-6 w-6 text-breneo-blue" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 
                                className="font-medium text-sm text-gray-900 dark:text-gray-100 line-clamp-1 cursor-pointer hover:text-breneo-blue transition-colors flex-1"
                                onClick={() => navigate(`/jobs/${encodeURIComponent(job.id)}`)}
                              >
                                {job.title}
                              </h4>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 border-breneo-blue text-breneo-blue hover:bg-breneo-blue hover:text-white"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (job.url) {
                                      window.open(job.url, "_blank");
                                    } else {
                                      navigate(`/jobs/${encodeURIComponent(job.id)}`);
                                    }
                                  }}
                                >
                                  View
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="bg-[#E6E7EB] hover:bg-[#E6E7EB]/90 h-7 w-7 p-0 rounded-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    saveJobMutation.mutate(job.id);
                                  }}
                                  disabled={saveJobMutation.isPending}
                                  aria-label={isJobSaved ? "Unsave job" : "Save job"}
                                >
                                  {saveJobMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Heart
                                      className={`h-3 w-3 transition-colors ${
                                        isJobSaved
                                          ? "text-red-500 fill-red-500 animate-heart-pop"
                                          : "text-black"
                                      }`}
                                    />
                                  )}
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                              {job.company}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                              <MapPin className="h-3 w-3" />
                              <span className="line-clamp-1">{job.location}</span>
                            </div>
                            {job.salary && (
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {job.salary}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {savedJobs.length >= 6 && (
                    <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        variant="link"
                        className="text-breneo-blue p-0 h-auto font-normal text-sm w-full justify-center hover:underline"
                        onClick={() => navigate("/jobs")}
                      >
                        View All Saved Jobs
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm px-6">
                  No saved jobs yet. Browse jobs and save your favorites!
                  <Button
                    variant="link"
                    className="mt-2 text-breneo-blue font-normal text-sm hover:underline"
                    onClick={() => navigate("/jobs")}
                  >
                    Browse Jobs
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Logout Confirmation */}
      {isMobile ? (
        <Drawer
          open={isLogoutConfirmOpen}
          onOpenChange={setIsLogoutConfirmOpen}
        >
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Log out</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Are you sure you want to log out?
              </p>
            </div>
            <DrawerFooter>
              <Button
                onClick={handleConfirmLogout}
                className="bg-red-500 text-white hover:bg-red-600 active:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 dark:active:bg-red-800"
              >
                Log out
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog
          open={isLogoutConfirmOpen}
          onOpenChange={setIsLogoutConfirmOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log out</DialogTitle>
              <DialogDescription>
                Are you sure you want to log out?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelLogout}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmLogout}
                className="bg-red-500 text-white hover:bg-red-600 active:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 dark:active:bg-red-800"
              >
                Log out
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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

      {/* Contact Information Edit Modal (Phone and Email) */}
      {isMobile ? (
        <Drawer
          open={isContactEditModalOpen}
          onOpenChange={setIsContactEditModalOpen}
        >
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Edit Contact Information</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone-number">Phone Number</Label>
                  <Input
                    id="phone-number"
                    type="tel"
                    placeholder="+995591552495"
                    value={phoneEditValue}
                    onChange={(e) => setPhoneEditValue(e.target.value)}
                    className="mt-2"
                    disabled={updatingContact}
                  />
                </div>
                <div>
                  <Label htmlFor="email-address">Email Address</Label>
                  <Input
                    id="email-address"
                    type="email"
                    placeholder="example@email.com"
                    value={emailEditValue}
                    onChange={(e) => setEmailEditValue(e.target.value)}
                    className="mt-2"
                    disabled={updatingContact}
                    required
                  />
                </div>
              </div>
            </div>
            <DrawerFooter>
              <Button
                onClick={handleSaveContact}
                disabled={updatingContact || !emailEditValue.trim()}
              >
                {updatingContact ? "Saving..." : "Save Changes"}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" disabled={updatingContact}>
                  Cancel
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog
          open={isContactEditModalOpen}
          onOpenChange={setIsContactEditModalOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Contact Information</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone-number-desktop">Phone Number</Label>
                  <Input
                    id="phone-number-desktop"
                    type="tel"
                    placeholder="+995591552495"
                    value={phoneEditValue}
                    onChange={(e) => setPhoneEditValue(e.target.value)}
                    className="mt-2"
                    disabled={updatingContact}
                  />
                </div>
                <div>
                  <Label htmlFor="email-address-desktop">Email Address</Label>
                  <Input
                    id="email-address-desktop"
                    type="email"
                    placeholder="example@email.com"
                    value={emailEditValue}
                    onChange={(e) => setEmailEditValue(e.target.value)}
                    className="mt-2"
                    disabled={updatingContact}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsContactEditModalOpen(false)}
                disabled={updatingContact}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveContact}
                disabled={updatingContact || !emailEditValue.trim()}
              >
                {updatingContact ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
};

export default ProfilePage;
