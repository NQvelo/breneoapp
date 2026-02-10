import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import OptimizedAvatar from "@/components/ui/OptimizedAvatar";
import { Button } from "@/components/ui/button";
import {
  Edit,
  Phone,
  Mail,
  Plus,
  Award,
  Camera,
  Trash2,
  Upload,
  ExternalLink,
  Link2,
  AlertCircle,
  Eye,
  Settings,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useMobile } from "@/hooks/use-mobile";
import { useTranslation } from "@/contexts/LanguageContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { cn } from "@/lib/utils";
import {
  Briefcase,
  GraduationCap,
  ArrowRight,
  MapPin,
  Heart,
  Loader2,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { supabase } from "@/integrations/supabase/client";
import { fetchJobDetail } from "@/api/jobs/jobService";
import { RadialProgress } from "@/components/ui/radial-progress";
import {
  calculateMatchPercentage,
  getMatchQualityLabel,
} from "@/utils/jobMatchUtils";
import { ApiJob } from "@/api/jobs/types";
import { profileApi } from "@/api/profile";
import type {
  EducationEntry,
  WorkExperienceEntry,
  UserSkill,
} from "@/api/profile/types";
import {
  EditPersonalInfoModal,
  EditEducationModal,
  EditWorkExperienceModal,
  EditSkillsModal,
} from "@/components/profile";
import { refreshUserIndustryProfile } from "@/services/industry/refreshUserIndustryProfile";

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
  academy_id?: string | null;
  academy_logo?: string | null;
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
  matchPercentage?: number;
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

// Helper function to extract skills from job data (copied from JobsPage.tsx for consistency)
const extractJobSkills = (job: Record<string, unknown>): string[] => {
  const skills: string[] = [];
  const textToSearch = [
    (job.job_title as string) || (job.title as string) || "",
    (job.description as string) || (job.job_description as string) || "",
    (job.job_required_experience as string) ||
      (job.required_experience as string) ||
      "",
  ]
    .join(" ")
    .toLowerCase();

  // Common tech skills keywords
  const skillKeywords: Record<string, string[]> = {
    javascript: [
      "javascript",
      "js",
      "node.js",
      "nodejs",
      "react",
      "vue",
      "angular",
    ],
    python: ["python", "django", "flask", "fastapi"],
    java: ["java", "spring", "spring boot"],
    "c++": ["c++", "cpp", "c plus plus"],
    "c#": ["c#", "csharp", "dotnet", ".net"],
    go: ["go", "golang"],
    rust: ["rust"],
    php: ["php", "laravel", "symfony"],
    ruby: ["ruby", "rails"],
    swift: ["swift", "ios"],
    kotlin: ["kotlin", "android"],
    typescript: ["typescript", "ts"],
    html: ["html", "html5"],
    css: ["css", "css3", "sass", "scss", "tailwind"],
    sql: ["sql", "mysql", "postgresql", "mongodb", "database"],
    react: ["react", "reactjs", "react.js"],
    vue: ["vue", "vuejs", "vue.js"],
    angular: ["angular", "angularjs"],
    "node.js": ["node.js", "nodejs", "node"],
    express: ["express", "express.js"],
    django: ["django"],
    flask: ["flask"],
    spring: ["spring", "spring boot"],
    laravel: ["laravel"],
    rails: ["rails", "ruby on rails"],
    git: ["git", "github", "gitlab"],
    docker: ["docker", "containerization"],
    kubernetes: ["kubernetes", "k8s"],
    aws: ["aws", "amazon web services"],
    azure: ["azure", "microsoft azure"],
    gcp: ["gcp", "google cloud", "google cloud platform"],
    linux: ["linux", "unix"],
    "machine learning": [
      "machine learning",
      "ml",
      "deep learning",
      "neural network",
    ],
    "data science": ["data science", "data analysis", "data analytics"],
    ai: ["artificial intelligence", "ai", "nlp", "natural language processing"],
    blockchain: ["blockchain", "ethereum", "solidity", "web3"],
    devops: ["devops", "ci/cd", "continuous integration"],
    testing: ["testing", "qa", "quality assurance", "test automation"],
    ui: ["ui", "user interface", "ux", "user experience"],
    design: ["design", "figma", "sketch", "adobe"],
  };

  Object.keys(skillKeywords).forEach((skill) => {
    const keywords = skillKeywords[skill];
    if (keywords.some((keyword) => textToSearch.includes(keyword))) {
      skills.push(skill);
    }
  });

  return [...new Set(skills)];
};

const ProfilePage = () => {
  // ✅ Get user, loading state, and logout function from AuthContext
  const { user, loading, logout } = useAuth();
  const isMobile = useMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const t = useTranslation();

  // State for skill test results
  const [skillResults, setSkillResults] = useState<SkillTestResult | null>(
    null,
  );
  const [loadingResults, setLoadingResults] = useState(false);

  // State for profile data from API
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [aboutMe, setAboutMe] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"profile" | "saved">("profile");
  const [activeSavedTab, setActiveSavedTab] = useState<"courses" | "jobs">(
    "courses",
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());

  // Update active view based on hash
  useEffect(() => {
    const hash = location.hash;
    if (
      hash === "#saved" ||
      hash === "#savedjobs" ||
      hash === "#savedcourses"
    ) {
      setActiveView("saved");
      if (hash === "#savedjobs") {
        setActiveSavedTab("jobs");
      } else {
        setActiveSavedTab("courses");
      }
    } else {
      setActiveView("profile");
    }
  }, [location.hash]);

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

  // Social links state
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    github: "",
    linkedin: "",
    facebook: "",
    instagram: "",
    dribbble: "",
    behance: "",
  });

  // Profile sections (Personal info, Education, Work experience, Skills)
  const [educations, setEducations] = useState<EducationEntry[]>([]);
  const [workExperiences, setWorkExperiences] = useState<WorkExperienceEntry[]>(
    [],
  );
  const [profileSkills, setProfileSkills] = useState<UserSkill[]>([]);
  const [loadingEducations, setLoadingEducations] = useState(false);
  const [loadingWorkExperiences, setLoadingWorkExperiences] = useState(false);
  const [loadingProfileSkills, setLoadingProfileSkills] = useState(false);
  const [isPersonalInfoModalOpen, setIsPersonalInfoModalOpen] = useState(false);
  const [isEducationModalOpen, setIsEducationModalOpen] = useState(false);
  const [isWorkExperienceModalOpen, setIsWorkExperienceModalOpen] =
    useState(false);
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);
  // Ref to track manual updates to prevent useEffect from overwriting
  const manualSocialLinkUpdateRef = useRef(false);
  const socialLinksUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Ref to track if we've already processed the current profileData
  const processedProfileDataRef = useRef<string | null>(null);

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
            savedCourseIdsList = data.saved_courses.map((id: string | number) =>
              String(id),
            );
          } else if (data.profile && typeof data.profile === "object") {
            const profile = data.profile as Record<string, unknown>;
            if (Array.isArray(profile.saved_courses)) {
              savedCourseIdsList = profile.saved_courses.map(
                (id: string | number) => String(id),
              );
            }
          } else if (data.user && typeof data.user === "object") {
            const userData = data.user as Record<string, unknown>;
            if (Array.isArray(userData.saved_courses)) {
              savedCourseIdsList = userData.saved_courses.map(
                (id: string | number) => String(id),
              );
            }
          }
        }

        // If no saved courses found, return empty array
        if (!savedCourseIdsList || savedCourseIdsList.length === 0) {
          return [];
        }

        // Limit to 6 for display if in profile view (optional, but requested to show only when tapped)
        // Actually the user said "dont be displayed" in default view, so we can just fetch all.
        const idsToFetch = savedCourseIdsList;

        // Fetch course details from Supabase using the IDs from API
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select(
            "id, title, provider, category, level, duration, image, description, academy_id",
          )
          .in("id", idsToFetch);

        if (coursesError) {
          console.error(
            "Error fetching course details from Supabase:",
            coursesError,
          );
          return [];
        }

        // Get unique academy_ids
        const uniqueAcademyIds = [
          ...new Set(
            coursesData
              ?.map((c) => c.academy_id)
              .filter((id): id is string => !!id) || [],
          ),
        ];

        // Fetch academy profiles from Django API
        const academyProfilesMap = new Map<string, string | null>();

        if (uniqueAcademyIds.length > 0) {
          await Promise.all(
            uniqueAcademyIds.map(async (academyId) => {
              try {
                const response = await apiClient.get(
                  `${API_ENDPOINTS.ACADEMY.DETAIL}${academyId}/`,
                );

                if (response.data) {
                  const responseData = response.data as Record<string, unknown>;
                  const profileData =
                    (responseData.profile_data as Record<string, unknown>) ||
                    responseData;

                  const getStringField = (
                    field: string,
                    source: Record<string, unknown> = profileData,
                  ) => {
                    const value = source[field];
                    return typeof value === "string" ? value : undefined;
                  };

                  const logoUrl =
                    getStringField("logo_url", profileData) ||
                    getStringField("logoUrl", profileData) ||
                    getStringField("logo", profileData) ||
                    getStringField("logo_url", responseData) ||
                    getStringField("logoUrl", responseData) ||
                    null;

                  academyProfilesMap.set(academyId, logoUrl);
                }
              } catch (error) {
                console.debug(
                  `Could not fetch academy profile for ${academyId}`,
                );
                academyProfilesMap.set(academyId, null);
              }
            }),
          );
        }

        return (coursesData || []).map((course) => {
          const academyLogo =
            course.academy_id && academyProfilesMap.has(course.academy_id)
              ? academyProfilesMap.get(course.academy_id) || null
              : null;

          return {
            id: course.id,
            title: course.title || "",
            provider: course.provider || "",
            category: course.category || "",
            level: course.level || "",
            duration: course.duration || "",
            image: normalizeImagePath(course.image),
            description: course.description || "",
            academy_id: course.academy_id || null,
            academy_logo: academyLogo ? normalizeImagePath(academyLogo) : null,
          } as SavedCourse;
        });
      } catch (error) {
        console.error("Error fetching saved courses from API profile:", error);
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
          context.previousSavedCourses,
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
          : "Course saved to your profile.",
      );
    },
  });

  // Fetch saved job IDs
  const { data: savedJobIds = [] } = useQuery<string[]>({
    queryKey: ["savedJobIds", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const profileResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
        const savedJobsArray = profileResponse.data?.saved_jobs || [];

        // Handle both array of IDs and array of objects
        if (!Array.isArray(savedJobsArray)) return [];

        return savedJobsArray
          .map((item: unknown) => {
            if (typeof item === "string" || typeof item === "number") {
              return String(item);
            }
            if (item && typeof item === "object") {
              const obj = item as Record<string, unknown>;
              if (obj.id) return String(obj.id);
              if (obj.job_id) return String(obj.job_id);
            }
            return null;
          })
          .filter((id): id is string => id !== null);
      } catch (error) {
        console.error("Error fetching saved job IDs:", error);
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Fetch saved jobs with details
  const { data: savedJobs = [], isLoading: loadingSavedJobs } = useQuery<
    SavedJob[]
  >({
    queryKey: ["savedJobs", user?.id, skillResults],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const profileResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
        const savedJobsArray = profileResponse.data?.saved_jobs || [];

        if (!Array.isArray(savedJobsArray) || savedJobsArray.length === 0) {
          return [];
        }

        // Extract job IDs
        const jobIds = savedJobsArray
          .map((item: unknown) => {
            if (typeof item === "string" || typeof item === "number") {
              return String(item);
            }
            if (item && typeof item === "object") {
              const obj = item as Record<string, unknown>;
              if (obj.id) return String(obj.id);
              if (obj.job_id) return String(obj.job_id);
            }
            return null;
          })
          .filter((id): id is string => id !== null);

        // Fetch job details for each ID using logic from SavedPage.tsx
        const jobPromises = jobIds.map(async (jobId) => {
          try {
            const jobDetail = await fetchJobDetail(jobId);
            if (!jobDetail) return null;

            // Extract job data
            const jobTitle = (jobDetail.title ||
              jobDetail.job_title ||
              jobDetail.position ||
              "Untitled Position") as string;

            const companyName =
              jobDetail.company_name ||
              jobDetail.employer_name ||
              (typeof jobDetail.company === "string"
                ? jobDetail.company
                : null) ||
              "Unknown Company";

            const jobCity = jobDetail.job_city || jobDetail.city || "";
            const jobState = jobDetail.job_state || jobDetail.state || "";
            const jobCountry = jobDetail.job_country || jobDetail.country || "";
            const location =
              jobDetail.job_location ||
              jobDetail.location ||
              [jobCity, jobState, jobCountry].filter(Boolean).join(", ") ||
              "Location not specified";

            const logo =
              jobDetail.employer_logo ||
              jobDetail.company_logo ||
              jobDetail.companyLogo ||
              jobDetail.logo_url ||
              (typeof jobDetail.company === "object" && jobDetail.company
                ? (
                    jobDetail.company as {
                      logo?: string;
                      company_logo?: string;
                    }
                  ).logo ||
                  (jobDetail.company as { company_logo?: string }).company_logo
                : undefined);

            // Format salary
            let salary = "By agreement";
            const minSalary = jobDetail.job_min_salary || jobDetail.min_salary;
            const maxSalary = jobDetail.job_max_salary || jobDetail.max_salary;
            const salaryCurrency = (jobDetail.job_salary_currency ||
              jobDetail.salary_currency ||
              "$") as string;
            const salaryPeriod = (jobDetail.job_salary_period ||
              jobDetail.salary_period ||
              "yearly") as string;

            if (
              minSalary &&
              maxSalary &&
              typeof minSalary === "number" &&
              typeof maxSalary === "number"
            ) {
              const periodLabel = salaryPeriod === "monthly" ? "Monthly" : "";
              const minSalaryFormatted = minSalary.toLocaleString();
              const maxSalaryFormatted = maxSalary.toLocaleString();
              const currencySymbols = ["$", "€", "£", "₾", "₹", "¥"];
              const isCurrencyBefore = currencySymbols.some((sym) =>
                salaryCurrency.includes(sym),
              );
              if (isCurrencyBefore) {
                salary = `${salaryCurrency}${minSalaryFormatted} - ${salaryCurrency}${maxSalaryFormatted}${
                  periodLabel ? `/${periodLabel}` : ""
                }`;
              } else {
                salary = `${minSalaryFormatted} - ${maxSalaryFormatted} ${salaryCurrency}${
                  periodLabel ? `/${periodLabel}` : ""
                }`;
              }
            } else if (minSalary && typeof minSalary === "number") {
              const minSalaryFormatted = minSalary.toLocaleString();
              const currencySymbols = ["$", "€", "£", "₾", "₹", "¥"];
              const isCurrencyBefore = currencySymbols.some((sym) =>
                salaryCurrency.includes(sym),
              );
              salary = isCurrencyBefore
                ? `${salaryCurrency}${minSalaryFormatted}+`
                : `${minSalaryFormatted}+ ${salaryCurrency}`;
            } else if (
              jobDetail.salary &&
              typeof jobDetail.salary === "string"
            ) {
              salary = jobDetail.salary;
            }

            // Format employment type
            const employmentTypeRaw = (jobDetail.job_employment_type ||
              jobDetail.employment_type ||
              jobDetail.type ||
              "FULLTIME") as string;
            const jobTypeLabels: Record<string, string> = {
              FULLTIME: "Full time",
              PARTTIME: "Part time",
              CONTRACTOR: "Contract",
              INTERN: "Internship",
            };
            const employmentType =
              jobTypeLabels[employmentTypeRaw] ||
              employmentTypeRaw ||
              "Full time";

            // Determine work arrangement
            let workArrangement = "On-site";
            const isRemote =
              jobDetail.job_is_remote ||
              jobDetail.is_remote ||
              jobDetail.remote === true;
            if (isRemote) {
              workArrangement = "Remote";
            } else if (jobTitle?.toLowerCase().includes("hybrid")) {
              workArrangement = "Hybrid";
            }

            // Calculate match percentage if skill results are available
            let matchPercentage = 0;
            if (skillResults?.skills_json) {
              const tech = skillResults.skills_json.tech || {};
              const soft = skillResults.skills_json.soft || {};
              const userSkills = [...Object.keys(tech), ...Object.keys(soft)];
              const jobSkills = extractJobSkills(jobDetail);
              matchPercentage = calculateMatchPercentage(
                userSkills,
                jobSkills,
                jobTitle,
              );
            }

            return {
              id: jobId,
              title: jobTitle,
              company: companyName,
              location:
                typeof location === "string"
                  ? location
                  : "Location not specified",
              url: jobDetail.url || "",
              company_logo: logo,
              salary,
              employment_type: employmentType,
              work_arrangement: workArrangement,
              matchPercentage,
            } as SavedJob;
          } catch (error) {
            console.error(`Error fetching job detail for ID ${jobId}:`, error);
            return null;
          }
        });

        const jobs = await Promise.all(jobPromises);
        return jobs.filter(
          (job): job is SavedJob =>
            job !== null && job.title !== `Job ${job.id}`,
        );
      } catch (error) {
        console.error("Error fetching saved jobs:", error);
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
      await apiClient.post(`${API_ENDPOINTS.JOBS.SAVE_JOB}${jobId}/`);
    },
    onMutate: async (jobId: string) => {
      await queryClient.cancelQueries({ queryKey: ["savedJobIds", user?.id] });
      await queryClient.cancelQueries({ queryKey: ["savedJobs", user?.id] });

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

      return { previousSavedJobIds };
    },
    onError: (error, jobId, context) => {
      if (context?.previousSavedJobIds && user?.id) {
        queryClient.setQueryData(
          ["savedJobIds", user?.id],
          context.previousSavedJobIds,
        );
      }
      console.error("Error updating saved jobs:", error);
      toast.error("Failed to update saved jobs. Please try again.");
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ["savedJobIds", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["savedJobs", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });

      const savedJobsList = queryClient.getQueryData<string[]>([
        "savedJobIds",
        user?.id,
      ]);
      const isCurrentlySaved = savedJobsList?.includes(String(jobId));
      toast.success(
        isCurrentlySaved
          ? "Removed from saved jobs."
          : "Job saved to your profile.",
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
          `/api/skilltest/results/?user=${user.id}`,
        );

        // console.log("🔍 Skill test results response:", response.data);
        // console.log("🔍 Response type:", typeof response.data);
        // console.log("🔍 Is array?", Array.isArray(response.data));

        // Handle different response structures
        if (Array.isArray(response.data) && response.data.length > 0) {
          // console.log("✅ Got array with length:", response.data.length);
          setSkillResults(response.data[0]);
        } else if (response.data && typeof response.data === "object") {
          // console.log("✅ Got object response");
          setSkillResults(response.data);
        } else {
          // console.log("⚠️ Unexpected response structure");
        }
      } catch (error) {
        // console.error("❌ Error fetching skill test results:", error);
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
      // console.log("✅ SkillResults updated:", skillResults);
      // console.log("✅ Final role:", skillResults.final_role);
      // console.log("✅ Skills JSON:", skillResults.skills_json);
    }
  }, [skillResults]);

  // Fetch profile data from API endpoint
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;

      setLoadingProfile(true);

      // Check if we have an access token
      const token = localStorage.getItem("authToken");
      // console.log("🔑 Access token exists:", !!token);
      if (token) {
        // console.log("🔑 Token preview:", token.substring(0, 50) + "...");
      }

      try {
        // Prepare request headers with Bearer token
        const requestHeaders = token
          ? { Authorization: `Bearer ${token}` }
          : {};

        // console.log("🌐 Making authenticated request to /api/profile/");
        // console.log("🌐 Request URL: (api base)/api/profile/");
        // console.log("🌐 Request Method: GET");
        // console.log("🌐 Request Headers:", requestHeaders);
        // console.log("🌐 Bearer Token being sent:", token ? "✅ YES" : "❌ NO");
        // console.log("🌐 Token length:", token?.length || 0);

        // Make the API call with explicit Authorization header
        const response = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE, {
          headers: requestHeaders,
        });

        // Log the raw response
        // console.log("✅ API Request successful!");
        // console.log("📊 Raw API Response:", response);
        // console.log("📊 API Response Status:", response.status);
        // console.log("📊 API Response Headers:", response.headers);
        // console.log("📊 API Response Data:", response.data);

        // Check if data exists
        if (!response.data) {
          console.warn("⚠️ No data in response");
          setProfileData(null);
          setAboutMe(null);
          setProfileImage(null);
          return;
        }

        // Log the full profile data structure
        // console.log(
        //   "📊 Full Profile Data Structure:",
        //   JSON.stringify(response.data, null, 2)
        // );

        // Set all profile data
        setProfileData(response.data);

        // Log all available keys in the response
        // console.log(
        //   "📊 All available keys in response.data:",
        //   Object.keys(response.data || {})
        // );

        // Log nested structures if they exist
        if (response.data?.profile) {
          // console.log(
          //   "📊 Profile object keys:",
          //   Object.keys(response.data.profile)
          // );
          // console.log("📊 Profile object:", response.data.profile);
        }
        if (response.data?.user) {
          // console.log("📊 User object keys:", Object.keys(response.data.user));
          // console.log("📊 User object:", response.data.user);
        }

        // Extract about_me if it exists in the response
        const aboutMeValue =
          response.data?.about_me ||
          response.data?.profile?.about_me ||
          response.data?.user?.about_me ||
          null;
        setAboutMe(aboutMeValue);
        // console.log("✅ Extracted about_me value:", aboutMeValue);

        // Initialize aboutMeText with the fetched value
        setAboutMeText(aboutMeValue || "");

        // Extract profile_image if it exists in the response
        const profileImageValue =
          response.data?.profile_image ||
          response.data?.profile?.profile_image ||
          response.data?.user?.profile_image ||
          null;
        setProfileImage(profileImageValue);
        // console.log("✅ Extracted profile_image value:", profileImageValue);

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
          // console.log(
          //   "✅ Found social links in profile response:",
          //   socialLinksFromProfile
          // );
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
        // console.log("📊 Available profile fields:");
        Object.entries(response.data || {}).forEach(([key, value]) => {
          if (key !== "profile" && key !== "user") {
            console.log(`  - ${key}:`, value);
          }
        });

        // Summary log of what the API returns
        // console.log("═══════════════════════════════════════════");
        // console.log("📋 SUMMARY: API Response from /api/profile/");
        // console.log("═══════════════════════════════════════════");
        // console.log("🔒 Authentication: Bearer Token ✅");
        // console.log("✅ Response Status:", response.status);
        // console.log("✅ Response Headers:", response.headers);
        // console.log("✅ Full Response Data:", response.data);
        // console.log("✅ All Top-Level Keys:", Object.keys(response.data || {}));
        // console.log("✅ About Me:", aboutMeValue);
        // console.log("✅ Profile Image:", profileImageValue);
        // console.log("✅ User ID from context:", user.id);
        // console.log("═══════════════════════════════════════════");
        // console.log(
        //   "✅ SUCCESS: Protected endpoint accessed with Bearer token!"
        // );
        // console.log("✅ Full user profile data retrieved from /api/profile/");
        // console.log("═══════════════════════════════════════════");
      } catch (error) {
        const status =
          error && typeof error === "object" && "response" in error
            ? (error as { response?: { status?: number } }).response?.status
            : undefined;
        if (status === 401) {
          // Session expired or invalid; apiClient interceptor will refresh or redirect to login
          console.warn(
            "Profile request unauthorized (401). Session may have expired.",
          );
        } else {
          console.error("Error fetching profile data:", error);
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

  // Fetch educations, work experiences, profile skills for profile sections
  const fetchEducations = async () => {
    if (!user?.id) return;
    setLoadingEducations(true);
    try {
      const data = await profileApi.getEducations();
      setEducations(Array.isArray(data) ? data : []);
    } catch {
      setEducations([]);
    } finally {
      setLoadingEducations(false);
    }
  };
  const fetchWorkExperiences = async () => {
    if (!user?.id) return;
    setLoadingWorkExperiences(true);
    try {
      const data = await profileApi.getWorkExperiences();
      setWorkExperiences(Array.isArray(data) ? data : []);
    } catch {
      setWorkExperiences([]);
    } finally {
      setLoadingWorkExperiences(false);
    }
  };
  const fetchProfileSkills = async () => {
    if (!user?.id) return;
    setLoadingProfileSkills(true);
    try {
      const data = await profileApi.getMySkills();
      setProfileSkills(Array.isArray(data) ? data : []);
    } catch {
      setProfileSkills([]);
    } finally {
      setLoadingProfileSkills(false);
    }
  };
  useEffect(() => {
    if (!user?.id) return;
    fetchEducations();
    fetchWorkExperiences();
    fetchProfileSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch when user id changes
  }, [user?.id]);

  // Extract social links from profile data (fetched from /api/profile/ endpoint)
  useEffect(() => {
    if (!user) return;

    // Skip if we just made a manual update (prevent overwriting)
    if (manualSocialLinkUpdateRef.current) {
      // console.log(
      //   "⏭️ Skipping social links extraction - manual update in progress"
      // );
      return;
    }

    // Create a stable reference key for the current profileData
    const profileDataKey = profileData
      ? JSON.stringify({
          social_links: profileData.social_links,
          profile_social_links:
            profileData.profile &&
            typeof profileData.profile === "object" &&
            "social_links" in profileData.profile
              ? (profileData.profile as Record<string, unknown>).social_links
              : undefined,
          user_social_links:
            profileData.user &&
            typeof profileData.user === "object" &&
            "social_links" in profileData.user
              ? (profileData.user as Record<string, unknown>).social_links
              : undefined,
        })
      : null;

    // Skip if we've already processed this exact profileData
    if (processedProfileDataRef.current === profileDataKey) {
      return;
    }

    // Mark this profileData as processed
    processedProfileDataRef.current = profileDataKey;

    try {
      // Extract social links from profile data
      if (profileData) {
        // console.log(
        //   "🔍 Extracting social links from profileData:",
        //   profileData
        // );
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

        // console.log(
        //   "🔍 Extracted socialLinksFromProfile:",
        //   socialLinksFromProfile
        // );

        if (
          socialLinksFromProfile &&
          typeof socialLinksFromProfile === "object"
        ) {
          // console.log(
          //   "✅ Using social links from profile data:",
          //   socialLinksFromProfile
          // );
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
          // Only update if links have actually changed
          setSocialLinks((prev) => {
            const hasChanged = Object.keys(extractedLinks).some(
              (key) =>
                prev[key as keyof SocialLinks] !==
                extractedLinks[key as keyof typeof extractedLinks],
            );
            if (!hasChanged) {
              return prev; // Return previous to prevent unnecessary re-render
            }
            return extractedLinks;
          });
        } else {
          // No social links in profile - only set empty if we don't have any links
          console.log("⚠️ No social links found in profile data");
          // Don't reset if we already have links (might be a manual update)
          setSocialLinks((prev) => {
            const hasAnyLinks = Object.values(prev).some(
              (v) => v && v.trim() !== "",
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
            (v) => v && v.trim() !== "",
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
          (v) => v && v.trim() !== "",
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
    // The ref check inside prevents duplicate processing even if profileData object reference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profileData]);

  // Cleanup timeout on unmount
  useEffect(() => {
    const timeoutRef = socialLinksUpdateTimeoutRef;
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
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

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
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
        },
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

  // Profile section modal handlers
  const handleSavePersonalInfo = async (
    payload: Parameters<typeof profileApi.updateProfile>[0],
  ) => {
    await profileApi.updateProfile(payload);
    const res = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
    const data = res.data as Record<string, unknown>;
    const profileObj = data?.profile as Record<string, unknown> | undefined;
    const userObj = data?.user as Record<string, unknown> | undefined;
    setProfileData(data as ProfileData);
    setAboutMe(
      (data?.about_me ?? profileObj?.about_me ?? userObj?.about_me) as
        | string
        | null,
    );
    setProfileImage(
      (data?.profile_image ??
        profileObj?.profile_image ??
        userObj?.profile_image) as string | null,
    );
    if (data?.social_links && typeof data.social_links === "object") {
      const sl = data.social_links as Record<string, string>;
      setSocialLinks({
        github: sl.github ?? "",
        linkedin: sl.linkedin ?? "",
        facebook: sl.facebook ?? "",
        instagram: sl.instagram ?? "",
        dribbble: sl.dribbble ?? "",
        behance: sl.behance ?? "",
      });
    }
    toast.success("Profile updated.");
  };

  const handleSaveEducation = async (
    created: {
      school_name: string;
      major?: string;
      degree_type?: string;
      gpa?: string | null;
      start_date: string;
      end_date?: string | null;
      is_current: boolean;
    }[],
    updated: { id: number; payload: Partial<EducationEntry> }[],
    deletedIds: number[],
  ) => {
    for (const c of created) {
      await profileApi.createEducation(c);
    }
    for (const { id, payload } of updated) {
      await profileApi.updateEducation(id, payload);
    }
    for (const id of deletedIds) {
      await profileApi.deleteEducation(id);
    }
    await fetchEducations();
    toast.success("Education updated.");
  };

  const handleSaveWorkExperience = async (
    created: {
      job_title: string;
      company: string;
      job_type?: string | null;
      location?: string | null;
      start_date: string;
      end_date?: string | null;
      is_current: boolean;
    }[],
    updated: { id: number; payload: Partial<WorkExperienceEntry> }[],
    deletedIds: number[],
  ) => {
    for (const c of created) {
      await profileApi.createWorkExperience(c);
    }
    for (const { id, payload } of updated) {
      await profileApi.updateWorkExperience(id, payload);
    }
    for (const id of deletedIds) {
      await profileApi.deleteWorkExperience(id);
    }
    const freshList = await profileApi.getWorkExperiences().catch(() => []);
    setWorkExperiences(Array.isArray(freshList) ? freshList : []);
    if (user?.id) {
      try {
        await refreshUserIndustryProfile(String(user.id), Array.isArray(freshList) ? freshList : []);
      } catch {
        // Industry profile is a cache; non-blocking if Supabase unavailable or wrong auth
      }
    }
    toast.success("Work experience updated.");
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
        },
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

  const handleSendPhoneVerification = async () => {
    try {
      await triggerPhoneVerificationCode();
      toast.info(
        phone_number
          ? `We've sent a 6-digit code to ${phone_number}.`
          : "We've sent a 6-digit code to your phone.",
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

    const tech = skillResults?.skills_json?.tech || {};
    const soft = skillResults?.skills_json?.soft || {};

    // console.log("🔍 Tech skills:", tech);
    // console.log("🔍 Soft skills:", soft);

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

    // console.log("🔍 All skills before filtering:", allSkills);

    // Filter skills > 0%, sort by percentage descending, and limit to top 5
    const filtered = allSkills
      .filter((skill) => skill.percentage > 0)
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);

    // console.log("🔍 Top 5 skills:", filtered);

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
    // Guard clause: return null if skills is undefined, null, or not an object
    if (!skills || typeof skills !== "object" || Array.isArray(skills)) {
      return null;
    }

    const primaryColor = "#19B5FE"; // breneo-blue (primary color)

    const chartData = Object.entries(skills)
      .filter(([_, pct]) => parseFloat(String(pct).replace("%", "")) > 0)
      .map(([skill, pct], idx) => {
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

        // Unique id per entry so Recharts and gradient keys never collide
        const safeName = String(skill).replace(/\s+/g, "-").slice(0, 30);
        const uniqueId = `skill-${idx}-${safeName}`;
        const gradientId = `gradient-primary-${uniqueId}`;

        return {
          id: uniqueId,
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
      x?: string | number;
      y?: string | number;
      width?: string | number;
      height?: string | number;
      payload?: { skill?: string };
      value?: string | { name?: string } | unknown;
    }) => {
      const { x, y, width, height, payload, value } = props;
      // Handle case where value might be an object
      let skillName = "";
      if (typeof value === "string") {
        skillName = value;
      } else if (value && typeof value === "object" && "name" in value) {
        skillName = String((value as { name?: string }).name || "");
      } else if (payload?.skill) {
        skillName = payload.skill;
      }

      // Convert x, y, width, height to numbers for calculations
      const xNum =
        typeof x === "number" ? x : typeof x === "string" ? parseFloat(x) : 0;
      const yNum =
        typeof y === "number" ? y : typeof y === "string" ? parseFloat(y) : 0;
      const widthNum =
        typeof width === "number"
          ? width
          : typeof width === "string"
            ? parseFloat(width)
            : 0;
      const heightNum =
        typeof height === "number"
          ? height
          : typeof height === "string"
            ? parseFloat(height)
            : 0;

      if (!xNum || !yNum || !widthNum || !heightNum || !skillName) {
        return null;
      }

      const centerX = xNum + widthNum / 2;
      // Position skill name at fixed bottom position of chart
      // Chart height is 250px, bottom margin is 80px, so bottom is at ~170px
      // Use a fixed Y position that's always at the bottom regardless of bar height
      // Added more space between bars and skill names
      const chartHeight = 250;
      const bottomMargin = 80;
      const skillY = chartHeight - bottomMargin + 25; // Fixed position at bottom with more space

      // Split long skill names into multiple lines
      // Max characters per line based on bar width (approximately 8-10 chars per 50px width)
      const maxCharsPerLine = Math.max(8, Math.floor(widthNum / 6));
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
      x?: string | number;
      y?: string | number;
      width?: string | number;
      height?: string | number;
      value?: number | { name?: string } | unknown;
      payload?: { skill?: string };
    }) => {
      const { x, y, width, height, value, payload } = props;
      // Handle case where value might be an object or number
      let percentage = 0;
      if (typeof value === "number") {
        percentage = value;
      } else if (value && typeof value === "object" && "name" in value) {
        // If value is an object, try to extract a numeric value or default to 0
        percentage = 0;
      }
      const skillName = payload?.skill || "";

      // Convert x, y, width, height to numbers for calculations
      const xNum =
        typeof x === "number"
          ? x
          : typeof x === "string"
            ? parseFloat(x) || 0
            : 0;
      const yNum =
        typeof y === "number"
          ? y
          : typeof y === "string"
            ? parseFloat(y) || 0
            : 0;
      const widthNum =
        typeof width === "number"
          ? width
          : typeof width === "string"
            ? parseFloat(width) || 0
            : 0;
      const heightNum =
        typeof height === "number"
          ? height
          : typeof height === "string"
            ? parseFloat(height) || 0
            : 0;

      if (!xNum || !yNum || !widthNum || !heightNum) {
        return null;
      }

      const centerX = xNum + widthNum / 2;
      // Position percentage at fixed bottom position of chart
      // Chart height is 250px, bottom margin is 80px, so bottom is at ~170px
      // Adjust position based on whether skill name is wrapped to 2 lines
      // Added more space between skill name and percentage
      const chartHeight = 250;
      const bottomMargin = 80;
      const maxCharsPerLine = Math.max(8, Math.floor(widthNum / 6));
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
                    <div className="rounded-3xl border-0 bg-white dark:bg-gray-800 p-4 backdrop-blur-sm">
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
              key={`bar-${chartData.map((e) => e.id).join("-")}`}
              dataKey="percentage"
              radius={[8, 8, 8, 8]}
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.id}
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
      {/* Profile/Saved/Jobs Switcher */}
      <div className="fixed bottom-[85px] left-1/2 -translate-x-1/2 z-40 md:static md:translate-x-0 md:left-auto md:flex md:justify-center md:mb-6 md:w-auto">
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 500, damping: 40, mass: 1 }}
          className="relative inline-flex items-center bg-gray-100/80 dark:bg-[#242424]/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-3xl p-1 shadow-sm"
        >
          <motion.button
            layout
            onClick={() => navigate("#")}
            className={`relative px-6 py-2.5 rounded-l-3xl rounded-r-3xl text-sm transition-colors duration-200 whitespace-nowrap outline-none ${
              activeView === "profile"
                ? "text-gray-900 dark:text-gray-100 font-bold"
                : "text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {activeView === "profile" && (
              <motion.div
                layoutId="active-pill"
                className="absolute inset-0 bg-white dark:bg-gray-700 rounded-l-3xl rounded-r-3xl"
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 40,
                  mass: 1,
                }}
              />
            )}
            <span className="relative z-10">Profile</span>
          </motion.button>

          <AnimatePresence mode="popLayout" initial={false}>
            {activeView === "profile" ? (
              <motion.button
                layout
                key="saved-summary"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => navigate("#savedcourses")}
                className="relative px-6 py-2.5 rounded-l-3xl rounded-r-3xl text-sm transition-colors duration-200 text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-200 whitespace-nowrap outline-none"
              >
                <span className="relative z-10">Saved</span>
              </motion.button>
            ) : (
              <motion.div
                key="saved-tabs"
                layout
                className="flex items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.button
                  layout
                  key="saved-courses"
                  onClick={() => navigate("#savedcourses")}
                  className={`relative px-4 py-2.5 md:px-6 rounded-l-3xl rounded-r-3xl text-sm transition-colors duration-200 whitespace-nowrap outline-none ${
                    activeSavedTab === "courses"
                      ? "text-gray-900 dark:text-gray-100 font-bold"
                      : "text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
                >
                  {activeSavedTab === "courses" && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute inset-0 bg-white dark:bg-gray-700 rounded-l-3xl rounded-r-3xl"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 40,
                        mass: 1,
                      }}
                    />
                  )}
                  <span className="relative z-10">Saved Courses</span>
                </motion.button>
                <motion.button
                  layout
                  key="saved-jobs"
                  onClick={() => navigate("#savedjobs")}
                  className={`relative px-4 py-2.5 md:px-6 rounded-l-3xl rounded-r-3xl text-sm transition-colors duration-200 whitespace-nowrap outline-none ${
                    activeSavedTab === "jobs"
                      ? "text-gray-900 dark:text-gray-100 font-bold"
                      : "text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
                >
                  {activeSavedTab === "jobs" && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute inset-0 bg-white dark:bg-gray-700 rounded-l-3xl rounded-r-3xl"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 40,
                        mass: 1,
                      }}
                    />
                  )}
                  <span className="relative z-10">Saved Jobs</span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {activeView === "profile" ? (
        <div className="max-w-7xl mx-auto pt-2 pb-32 md:pb-6 px-2 sm:px-6 lg:px-8 space-y-4 md:space-y-6">
          {/* 1. Personal information */}
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
                  onClick={() => navigate("/settings")}
                  aria-label="Settings"
                >
                  <Settings className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setIsPersonalInfoModalOpen(true)}
                  aria-label="Edit personal information"
                >
                  <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </Button>
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
                      src={displayProfileImage || undefined}
                      alt="Profile photo"
                      fallback={
                        first_name ? first_name.charAt(0).toUpperCase() : "U"
                      }
                      size="lg"
                      loading="eager"
                      className="h-12 w-12 sm:h-14 sm:w-14 rounded-full"
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
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {first_name} {last_name}
                  </h1>
                  {(user as { job_title?: string })?.job_title && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {(user as { job_title?: string }).job_title}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(profileData as Record<string, unknown>)?.country_region ||
                (profileData as Record<string, unknown>)?.city ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    {[
                      (profileData as Record<string, unknown>)?.country_region,
                      (profileData as Record<string, unknown>)?.city,
                    ]
                      .filter(Boolean)
                      .join(", ") || "Location not set"}
                  </span>
                ) : null}
                {email && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100">
                    <Mail className="h-4 w-4 text-gray-500" />
                    {email}
                  </span>
                )}
                {phone_number && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100">
                    <Phone className="h-4 w-4 text-gray-500" />
                    {phone_number}
                  </span>
                )}
                {(Object.entries(socialLinks) as [SocialPlatform, string][])
                  .filter(([_, url]) => url?.trim())
                  .map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 hover:underline"
                    >
                      {getSocialIcon(platform, "h-4 w-4 text-gray-500")}
                      {url.length > 35
                        ? `${url.slice(0, 32)}...`
                        : url.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* 2. About Me */}
          <Card className="border-0 rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-3 border-b-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              About Me
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={handleOpenAboutMeModal}
              aria-label="Edit about me"
            >
              <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
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

          {/* 3. Education */}
          <Card className="border-0 rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-3 border-b-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Education
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => setIsEducationModalOpen(true)}
                aria-label="Edit education"
              >
                <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </Button>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {loadingEducations ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : educations.length === 0 ? (
                <p className="text-sm text-gray-500">No education added yet.</p>
              ) : (
                <div className="relative">
                  {educations.map((entry, index) => (
                    <div key={entry.id} className="flex gap-4 pb-6 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className="h-3 w-3 rounded-full bg-[#36B0E3] shrink-0" />
                        {index < educations.length - 1 && (
                          <div className="w-px flex-1 min-h-[2rem] bg-[#36B0E3]/30 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                          {entry.start_date}
                          {entry.is_current
                            ? " → Present"
                            : entry.end_date
                              ? ` → ${entry.end_date}`
                              : ""}
                        </p>
                        <p className="font-bold text-gray-900 dark:text-gray-100">
                          {entry.school_name}
                        </p>
                        {(entry.degree_type || entry.major) && (
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {[entry.degree_type, entry.major]
                              .filter(Boolean)
                              .join(" in ")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. Work experience */}
          <Card className="border-0 rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-3 border-b-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Work experience
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => setIsWorkExperienceModalOpen(true)}
                aria-label="Edit work experience"
              >
                <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </Button>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {loadingWorkExperiences ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : workExperiences.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No work experience added yet.
                </p>
              ) : (
                <div className="relative">
                  {workExperiences.map((entry, index) => (
                    <div key={entry.id} className="flex gap-4 pb-6 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className="h-3 w-3 rounded-full bg-[#36B0E3] shrink-0" />
                        {index < workExperiences.length - 1 && (
                          <div className="w-px flex-1 min-h-[2rem] bg-[#36B0E3]/30 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                          {entry.start_date}
                          {entry.is_current
                            ? " → Present"
                            : entry.end_date
                              ? ` → ${entry.end_date}`
                              : ""}
                        </p>
                        <p className="font-bold text-gray-900 dark:text-gray-100">
                          {entry.company}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {entry.job_title}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5. Skills */}
          <Card className="border-0 rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-3 border-b-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Skills
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => setIsSkillsModalOpen(true)}
                aria-label="Edit skills"
              >
                <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </Button>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {loadingProfileSkills ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : profileSkills.length === 0 ? (
                <p className="text-sm text-gray-500">No skills added yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profileSkills.map((s) => (
                    <Badge
                      key={s.id}
                      variant="outline"
                      className="capitalize px-3 py-1.5 text-xs rounded-[10px] bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                    >
                      {s.skill_name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Personal Skills Card */}
          <Card className="border-0 rounded-3xl">
            <CardHeader className="p-4 pb-3 border-b-0">
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
                (skillResults?.final_role || getAllSkills().length > 0) ? (
                <div className="space-y-4">
                  {/* Final Role */}
                  {skillResults?.final_role && (
                    <div className="bg-gradient-to-r from-breneo-blue/10 to-breneo-blue/5 dark:from-breneo-blue/20 dark:to-breneo-blue/10 p-4 rounded-3xl border-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="bg-breneo-blue/10 rounded-full p-2">
                          <Award className="h-5 w-5 text-breneo-blue" />
                        </div>
                        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                          Recommended Role
                        </span>
                      </div>
                      <Badge className="text-sm px-3 py-1.5 bg-breneo-blue hover:bg-breneo-blue/90 text-white border-0">
                        {skillResults?.final_role}
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
                        {skillResults?.skills_json?.tech &&
                          Object.keys(skillResults.skills_json.tech).length >
                            0 && (
                            <Card className="border-0 rounded-3xl">
                              <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-sm">
                                  Technical Skills
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-2 pt-0 pb-4">
                                {renderSkillsChart(
                                  skillResults.skills_json.tech,
                                  "Technical Skills",
                                )}
                              </CardContent>
                            </Card>
                          )}

                        {/* Soft Skills */}
                        {skillResults?.skills_json?.soft &&
                          Object.keys(skillResults.skills_json.soft).length >
                            0 && (
                            <Card className="border-0 rounded-3xl">
                              <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-sm">
                                  Soft Skills
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-2 pt-0 pb-4">
                                {renderSkillsChart(
                                  skillResults.skills_json.soft,
                                  "Soft Skills",
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
        </div>
      ) : (
        <div className="max-w-7xl mx-auto pb-32 md:pb-6">
          {/* Saved Courses Tab */}
          {activeSavedTab === "courses" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                Saved Courses
              </h2>
              {loadingSavedCourses ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="border-0 rounded-3xl">
                      <CardContent className="p-0">
                        <Skeleton className="h-40 w-full rounded-t-3xl" />
                        <div className="p-4">
                          <Skeleton className="h-5 w-3/4 mb-2" />
                          <Skeleton className="h-4 w-1/2 mb-3" />
                          <Skeleton className="h-3 w-full" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : savedCourses.length === 0 ? (
                <Card className="rounded-3xl border-0 shadow-sm bg-card/50">
                  <CardContent className="p-12 text-center">
                    <GraduationCap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No saved courses
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Start saving courses to view them here!
                    </p>
                    <Button
                      onClick={() => navigate("/courses")}
                      variant="default"
                    >
                      Browse Courses
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {savedCourses.map((course) => {
                    const isCourseSaved = savedCourseIds.includes(
                      String(course.id),
                    );
                    return (
                      <Link
                        key={course.id}
                        to={`/course/${course.id}`}
                        className="block"
                      >
                        <Card className="relative transition-all duration-200 cursor-pointer group border-0 rounded-3xl w-full flex flex-col h-full bg-card hover:shadow-soft">
                          <CardContent className="p-0 overflow-hidden rounded-3xl flex flex-col flex-grow relative">
                            <div className="relative w-full h-40 overflow-hidden rounded-t-3xl isolate">
                              <img
                                src={course.image || "/placeholder.svg"}
                                alt={course.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    "/placeholder.svg";
                                }}
                              />
                            </div>
                            <div className="p-4 flex flex-col flex-grow min-h-[140px]">
                              <h3 className="font-semibold text-base mb-2 line-clamp-2 group-hover:text-breneo-blue transition-colors">
                                {course.title}
                              </h3>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                                {course.provider}
                              </p>
                              <div className="flex items-center justify-between gap-3 mt-auto flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {course.duration && (
                                    <Badge className="rounded-[10px] px-3 py-1 text-[13px] font-medium bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100">
                                      {course.duration}
                                    </Badge>
                                  )}
                                  {course.level && (
                                    <Badge className="rounded-[10px] px-3 py-1 text-[13px] font-medium bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100">
                                      {course.level}
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    saveCourseMutation.mutate(
                                      String(course.id),
                                    );
                                  }}
                                  disabled={saveCourseMutation.isPending}
                                  aria-label="Unsave course"
                                  className={cn(
                                    "bg-[#E6E7EB] hover:bg-[#E6E7EB]/90 dark:bg-[#3A3A3A] dark:hover:bg-[#4A4A4A] h-10 w-10 flex-shrink-0",
                                    isCourseSaved
                                      ? "text-red-500 bg-red-50 hover:bg-red-50/90 dark:bg-red-900/40 dark:hover:bg-red-900/60"
                                      : "text-black dark:text-white",
                                  )}
                                >
                                  {saveCourseMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Heart
                                      className={cn(
                                        "h-4 w-4 transition-colors",
                                        isCourseSaved
                                          ? "text-red-500 fill-red-500"
                                          : "text-black dark:text-white",
                                      )}
                                    />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Saved Jobs Tab */}
          {activeSavedTab === "jobs" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                Saved Jobs
              </h2>
              {loadingSavedJobs ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="border-0 rounded-3xl">
                      <CardContent className="p-4">
                        <Skeleton className="h-4 w-20 mb-2" />
                        <Skeleton className="h-6 w-3/4 mb-4" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : savedJobs.length === 0 ? (
                <Card className="rounded-3xl border-0 shadow-sm bg-card/50">
                  <CardContent className="p-12 text-center">
                    <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No saved jobs
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Start saving jobs to view them here!
                    </p>
                    <Button onClick={() => navigate("/jobs")} variant="default">
                      Browse Jobs
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {savedJobs.map((job) => {
                    const isJobSaved = savedJobIds.includes(String(job.id));
                    return (
                      <Card
                        key={job.id}
                        className="group flex flex-col transition-all duration-200 border-0 overflow-hidden rounded-3xl cursor-pointer bg-card hover:shadow-soft"
                        onClick={() => {
                          if (job.url) {
                            window.open(job.url, "_blank");
                          } else {
                            navigate(`/jobs/${encodeURIComponent(job.id)}`);
                          }
                        }}
                      >
                        <CardContent className="px-5 pt-5 pb-4 flex flex-col flex-grow">
                          {/* Company Logo and Info */}
                          <div className="flex items-start gap-3 mb-3">
                            <div className="flex-shrink-0 relative w-10 h-10">
                              {job.company_logo ? (
                                <img
                                  src={job.company_logo}
                                  alt={`${job.company} logo`}
                                  className="w-10 h-10 rounded-md object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700 relative z-10"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                    const fallback =
                                      target.nextElementSibling as HTMLElement;
                                    if (fallback) {
                                      fallback.classList.remove("hidden");
                                      fallback.classList.add("flex");
                                    }
                                  }}
                                />
                              ) : null}
                              <div
                                className={`w-10 h-10 rounded-md bg-breneo-blue/10 flex items-center justify-center ${job.company_logo ? "hidden absolute inset-0" : ""}`}
                              >
                                <Briefcase className="h-5 w-5 text-breneo-blue" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm truncate text-gray-600 dark:text-gray-400">
                                {job.company}
                              </h3>
                              <p className="mt-0.5 text-xs text-gray-500 truncate">
                                {job.location}
                              </p>
                            </div>
                          </div>

                          {/* Job Title */}
                          <h4 className="font-bold text-base mb-2 line-clamp-2 min-h-[2.5rem] group-hover:text-breneo-blue transition-colors">
                            {job.title}
                          </h4>

                          {/* Job Details as chips */}
                          <div className="mt-1 flex flex-wrap gap-2">
                            {job.employment_type && (
                              <Badge className="rounded-[10px] px-3 py-1 text-[13px] font-medium bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100 border-0">
                                {job.employment_type}
                              </Badge>
                            )}
                            {job.work_arrangement && (
                              <Badge className="rounded-[10px] px-3 py-1 text-[13px] font-medium bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100 border-0">
                                {job.work_arrangement}
                              </Badge>
                            )}
                          </div>

                          {/* Match percentage & Save button */}
                          <div className="mt-7 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <RadialProgress
                                value={job.matchPercentage ?? 0}
                                size={44}
                                strokeWidth={5}
                                showLabel={false}
                                percentageTextSize="sm"
                                className="text-breneo-blue"
                              />
                              <span className="text-xs font-semibold text-gray-700 dark:text-gray-100">
                                {getMatchQualityLabel(job.matchPercentage)}
                              </span>
                            </div>
                            <Button
                              variant="secondary"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                saveJobMutation.mutate(job.id);
                              }}
                              disabled={saveJobMutation.isPending}
                              aria-label="Unsave job"
                              className={cn(
                                "bg-[#E6E7EB] hover:bg-[#E6E7EB]/90 dark:bg-[#3A3A3A] dark:hover:bg-[#4A4A4A] h-10 w-10 border-0",
                                isJobSaved
                                  ? "text-red-500 bg-red-50 hover:bg-red-50/90 dark:bg-red-900/40 dark:hover:bg-red-900/60"
                                  : "text-black dark:text-white",
                              )}
                            >
                              {saveJobMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Heart
                                  className={cn(
                                    "h-4 w-4 transition-colors",
                                    isJobSaved
                                      ? "text-red-500 fill-red-500"
                                      : "text-black dark:text-white",
                                  )}
                                />
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Profile section modals */}
      <EditPersonalInfoModal
        open={isPersonalInfoModalOpen}
        onOpenChange={setIsPersonalInfoModalOpen}
        initial={{
          first_name:
            first_name ??
            ((user as Record<string, unknown>)?.first_name as string),
          last_name:
            last_name ??
            ((user as Record<string, unknown>)?.last_name as string),
          email: email ?? "",
          phone_number: phone_number ?? "",
          country_region: (profileData as Record<string, unknown>)
            ?.country_region as string,
          city: (profileData as Record<string, unknown>)?.city as string,
          about_me: aboutMe,
          social_links: { ...socialLinks } as Record<string, string>,
        }}
        onSave={handleSavePersonalInfo}
      />
      <EditEducationModal
        open={isEducationModalOpen}
        onOpenChange={setIsEducationModalOpen}
        entries={educations}
        onSave={handleSaveEducation}
      />
      <EditWorkExperienceModal
        open={isWorkExperienceModalOpen}
        onOpenChange={setIsWorkExperienceModalOpen}
        entries={workExperiences}
        onSave={handleSaveWorkExperience}
      />
      <EditSkillsModal
        open={isSkillsModalOpen}
        onOpenChange={setIsSkillsModalOpen}
        skills={profileSkills}
        onAddSkill={async (name) => {
          await profileApi.addSkill(name);
        }}
        onRemoveSkill={(skillId) => profileApi.removeSkill(skillId)}
        onRefresh={fetchProfileSkills}
      />

      {/* About Me Edit Modal */}
      <Sheet open={isAboutMeModalOpen} onOpenChange={setIsAboutMeModalOpen}>
        <SheetContent
          side="rightProfile"
          overlayClassName="backdrop-blur-sm bg-black/20 dark:bg-black/40"
          className="flex flex-col h-full overflow-hidden px-4 py-6 md:p-8 bg-white dark:bg-[#181818]"
        >
          <SheetHeader className="bg-white dark:bg-[#181818] pb-3">
            <SheetTitle className="flex-1 min-w-0">Edit About Me</SheetTitle>
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <Button
                size="sm"
                onClick={handleSaveAboutMe}
                disabled={updatingAboutMe}
              >
                {updatingAboutMe ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-10 w-10 p-0 shrink-0"
                onClick={() => setIsAboutMeModalOpen(false)}
                disabled={updatingAboutMe}
                aria-label="Cancel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
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
        </SheetContent>
      </Sheet>

      {/* Profile Image Options Modal */}
      <Sheet
        open={isProfileImageModalOpen}
        onOpenChange={setIsProfileImageModalOpen}
      >
        <SheetContent
          side="rightProfile"
          overlayClassName="backdrop-blur-sm bg-black/20 dark:bg-black/40"
          className="flex flex-col h-full overflow-hidden px-4 py-6 md:p-8 bg-white dark:bg-[#181818]"
        >
          <SheetHeader className="bg-white dark:bg-[#181818] pb-3">
            <SheetTitle className="flex-1 min-w-0">Profile Photo</SheetTitle>
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <Button
                variant="secondary"
                size="sm"
                className="h-10 w-10 p-0 shrink-0"
                onClick={() => setIsProfileImageModalOpen(false)}
                aria-label="Cancel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
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
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
};

export default ProfilePage;
