import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import {
  Heart,
  ArrowLeft,
  Briefcase,
  MapPin,
  DollarSign,
  PiggyBank,
  Clock,
  Calendar,
  Calendar as CalendarIcon,
  Building2,
  ExternalLink,
  AlertCircle,
  Globe,
  Users,
  Factory,
  Home,
  GraduationCap,
  Award,
  Target,
  FileText,
  CheckCircle2,
  Sparkles,
  Smile,
  Shield,
  Car,
  UtensilsCrossed,
  Coffee,
  Dumbbell,
  Stethoscope,
  Eye,
  TrendingUp,
  Share2,
  Copy,
  Facebook,
  Linkedin,
  Loader2,
  XCircle,
  ThumbsUp,
} from "lucide-react";

import { numericIdToUuid, cn } from "@/lib/utils";
import { jobService, JobDetail, CompanyInfo } from "@/api/jobs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMobile } from "@/hooks/use-mobile";
import { RadialProgress } from "@/components/ui/radial-progress";
import {
  calculateMatchPercentage,
  getMatchQualityLabel,
  extractJobSkills,
} from "@/utils/jobMatchUtils";
import { Zap } from "lucide-react";

const JobDetailPage = () => {
  const { jobId: rawJobId } = useParams<{ jobId: string }>();
  // Decode the job ID in case it was URL-encoded
  const jobId = rawJobId ? decodeURIComponent(rawJobId) : undefined;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [showFixedBar, setShowFixedBar] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const mainContentRef = React.useRef<HTMLDivElement>(null);

  // Fetch job details using the job service
  const {
    data: jobDetail,
    isLoading,
    error,
  } = useQuery<JobDetail>({
    queryKey: ["jobDetail", jobId],
    queryFn: async () => {
      if (!jobId) throw new Error("Job ID is required");
      console.log("🔍 Fetching job details for ID:", jobId);
      try {
        const detail = await jobService.fetchJobDetail(jobId);
        console.log("✅ Job details fetched successfully");
        console.log("📋 Job Title:", detail.title || detail.job_title);
        console.log("🏢 Company:", detail.company_name || detail.employer_name);
        console.log("📍 Location:", detail.location || detail.job_location);
        console.log(
          "📝 Description length:",
          detail.description?.length || detail.job_description?.length || 0
        );
        return detail;
      } catch (err) {
        console.error("❌ Error fetching job details:", err);
        throw err;
      }
    },
    enabled: !!jobId,
    retry: 1,
    retryDelay: 1000,
  });

  // Fetch saved jobs
  const { data: savedJobs = [] } = useQuery<string[]>({
    queryKey: ["savedJobs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        // Fetch from profile API
        const profileResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
        const savedJobsArray = profileResponse.data?.saved_jobs || [];
        return savedJobsArray.map((id: string | number) => String(id));
      } catch (error) {
        console.error("Error fetching saved jobs from profile API:", error);
        return [];
      }
    },
    enabled: !!user,
  });

  // Fetch user skills for matching
  const { data: userSkills = [], isLoading: isLoadingUserSkills } = useQuery<string[]>({
    queryKey: ["userSkills", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const response = await apiClient.get(
          `/api/skilltest/results/?user=${user.id}`
        );
        
        let skillTestData = null;
        if (Array.isArray(response.data) && response.data.length > 0) {
          skillTestData = response.data[0];
        } else if (response.data && typeof response.data === "object") {
          skillTestData = response.data;
        }

        if (skillTestData && (skillTestData.skills_json)) {
          const skillsJson = skillTestData.skills_json || {};
          const techSkills = Object.keys(skillsJson.tech || {});
          const softSkills = Object.keys(skillsJson.soft || {});
          return [...techSkills, ...softSkills];
        }
        return [];
      } catch (error) {
        console.error("Error fetching user skills for matching:", error);
        return [];
      }
    },
    enabled: !!user,
  });

  const jobIdForSave = jobDetail?.id || jobDetail?.job_id || jobId || "";
  const isSaved = savedJobs?.includes(String(jobIdForSave));



  // Handle scroll detection for fixed bottom bar
  useEffect(() => {
    if (!jobDetail) {
      setShowFixedBar(false);
      return;
    }

    let scrollContainer: HTMLElement | null = null;
    let cleanup: (() => void) | null = null;

    const findScrollContainer = (): HTMLElement | null => {
      // Try multiple selectors to find the scrollable container
      // DashboardLayout uses a main element with overflow-y-auto
      const selectors = [
        'main[class*="overflow-y-auto"]',
        'main[class*="overflow"]',
        "main",
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
          return element;
        }
      }

      return null;
    };

    const handleScroll = () => {
      if (scrollContainer) {
        // Check scroll position of the container
        const scrollTop = scrollContainer.scrollTop;
        const shouldShow = scrollTop > 100;
        setShowFixedBar(shouldShow);

        // On mobile, hide navbar when scrolling
        if (isMobile) {
          // Find mobile navbar by its structure: div with md:hidden, fixed, bottom-0, z-50
          const allFixedBottom = Array.from(
            document.querySelectorAll(".fixed.bottom-0")
          );
          const mobileNav = allFixedBottom.find((el) => {
            const htmlEl = el as HTMLElement;
            return (
              htmlEl.classList.contains("md:hidden") &&
              htmlEl.classList.contains("z-50") &&
              htmlEl.querySelector("nav.flex.justify-around") !== null
            );
          }) as HTMLElement;

          if (mobileNav) {
            if (shouldShow) {
              mobileNav.style.transform = "translateY(100%)";
              mobileNav.style.opacity = "0";
            } else {
              mobileNav.style.transform = "translateY(0)";
              mobileNav.style.opacity = "1";
            }
            mobileNav.style.transition =
              "transform 0.3s ease-in-out, opacity 0.3s ease-in-out";
          }
        }

        // Detect sidebar state by checking main element's margin-left
        const mainEl = scrollContainer.closest("main") as HTMLElement;
        if (mainEl) {
          const computedStyle = window.getComputedStyle(mainEl);
          const marginLeft = parseInt(computedStyle.marginLeft) || 0;
          // 96px = 24rem (collapsed), 272px = 17rem (expanded)
          setSidebarCollapsed(marginLeft <= 100);
        }
      } else {
        // Fallback to window scroll
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const shouldShow = scrollTop > 100;
        setShowFixedBar(shouldShow);
      }
    };

    // Setup scroll listener with retry mechanism
    const setupListener = () => {
      scrollContainer = findScrollContainer();

      if (scrollContainer) {
        scrollContainer.addEventListener("scroll", handleScroll, {
          passive: true,
        });
        // Check initial scroll position
        handleScroll();
        cleanup = () => {
          scrollContainer?.removeEventListener("scroll", handleScroll);
        };
      } else {
        // Fallback to window scroll
        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll();
        cleanup = () => {
          window.removeEventListener("scroll", handleScroll);
        };
      }
    };

    // Try to setup immediately
    setupListener();

    // Retry after a delay if container not found initially
    const retryTimeout = setTimeout(() => {
      if (!scrollContainer) {
        setupListener();
      }
    }, 300);

    return () => {
      clearTimeout(retryTimeout);
      if (cleanup) {
        cleanup();
      }
      // Reset mobile navbar visibility on cleanup
      if (isMobile) {
        const allFixedBottom = Array.from(
          document.querySelectorAll(".fixed.bottom-0")
        );
        const mobileNav = allFixedBottom.find((el) => {
          const htmlEl = el as HTMLElement;
          return (
            htmlEl.classList.contains("md:hidden") &&
            htmlEl.classList.contains("z-50") &&
            htmlEl.querySelector("nav.flex.justify-around") !== null
          );
        }) as HTMLElement;

        if (mobileNav) {
          mobileNav.style.transform = "";
          mobileNav.style.opacity = "";
          mobileNav.style.transition = "";
        }
      }
    };
  }, [jobDetail, isMobile]); // Re-attach when job detail loads or mobile state changes

  // Save/unsave job mutation
  const saveJobMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not logged in");
      if (!jobDetail) throw new Error("Job details not available");

      try {
        const jobIdForSaveString = String(jobIdForSave);
        const endpoint = `${API_ENDPOINTS.JOBS.SAVE_JOB}${jobIdForSaveString}/`;

        // Backend toggles save/unsave on POST
        await apiClient.post(endpoint);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to save job. Please try again.";
        throw new Error(errorMessage);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedJobs", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success(isSaved ? "Job Unsaved" : "Job Saved");
    },
    onError: (error: Error) => {
      console.error("Error saving job:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save job";
      toast.error(errorMessage);
    },
  });

  // Format salary
  const formatSalary = () => {
    if (!jobDetail) return "By agreement";

    if (jobDetail.salary && typeof jobDetail.salary === "string") {
      return jobDetail.salary;
    }

    const minSalary = jobDetail.min_salary;
    const maxSalary = jobDetail.max_salary;
    const salaryCurrency = jobDetail.salary_currency || "$";
    const salaryPeriod = jobDetail.salary_period || "yearly";

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
        salaryCurrency.includes(sym)
      );
      if (isCurrencyBefore) {
        return `${salaryCurrency}${minSalaryFormatted} - ${salaryCurrency}${maxSalaryFormatted}${
          periodLabel ? `/${periodLabel}` : ""
        }`;
      } else {
        return `${minSalaryFormatted} - ${maxSalaryFormatted} ${salaryCurrency}${
          periodLabel ? `/${periodLabel}` : ""
        }`;
      }
    } else if (minSalary && typeof minSalary === "number") {
      const minSalaryFormatted = minSalary.toLocaleString();
      const currencySymbols = ["$", "€", "£", "₾", "₹", "¥"];
      const isCurrencyBefore = currencySymbols.some((sym) =>
        salaryCurrency.includes(sym)
      );
      return isCurrencyBefore
        ? `${salaryCurrency}${minSalaryFormatted}+`
        : `${minSalaryFormatted}+ ${salaryCurrency}`;
    }

    return "By agreement";
  };

  // Get apply URL
  const getApplyUrl = (): string => {
    if (!jobDetail) return "";
    const jobDetailAny = jobDetail as Record<string, unknown>;

    // Check new API structure - apply_url is primary field
    if (
      jobDetail.apply_url &&
      typeof jobDetail.apply_url === "string"
    ) {
      return jobDetail.apply_url;
    }

    // Check all possible apply URL fields in order of preference
    const applyUrl =
      jobDetail.apply_url ||
      jobDetail.job_apply_link ||
      jobDetail.url ||
      (jobDetailAny.job_apply_link && typeof jobDetailAny.job_apply_link === "string"
        ? jobDetailAny.job_apply_link
        : null) ||
      jobDetail.applyUrl ||
      jobDetail.applyLink ||
      jobDetail.application_url ||
      jobDetail.application_link ||
      jobDetail.link ||
      "";

    // Also check company_info object
    if (!applyUrl && jobDetail.company_info) {
      const companyInfo = jobDetail.company_info as CompanyInfo & {
        apply_url?: string;
        url?: string;
      };
      if (companyInfo.apply_url && typeof companyInfo.apply_url === "string") {
        return companyInfo.apply_url;
      }
      if (companyInfo.url && typeof companyInfo.url === "string") {
        return companyInfo.url;
      }
    }

    // Check nested company object
    if (
      !applyUrl &&
      jobDetail.company &&
      typeof jobDetail.company === "object"
    ) {
      const companyObj = jobDetail.company as Record<string, unknown>;
      if (companyObj.apply_url && typeof companyObj.apply_url === "string") {
        return companyObj.apply_url;
      }
      if (companyObj.url && typeof companyObj.url === "string") {
        return companyObj.url;
      }
    }

    // Check employer object
    if (
      !applyUrl &&
      jobDetail.employer &&
      typeof jobDetail.employer === "object"
    ) {
      const employerObj = jobDetail.employer as Record<string, unknown>;
      if (employerObj.apply_url && typeof employerObj.apply_url === "string") {
        return employerObj.apply_url;
      }
      if (employerObj.url && typeof employerObj.url === "string") {
        return employerObj.url;
      }
    }

    return applyUrl;
  };

  // Get company name
  const getCompanyName = () => {
    if (!jobDetail) return "";
    const jobDetailAny = jobDetail as Record<string, unknown>;

    // Check new API structure - company_name is primary field
    if (
      jobDetail.company_name &&
      typeof jobDetail.company_name === "string" &&
      jobDetail.company_name.trim()
    ) {
      return String(jobDetail.company_name).trim();
    }

    // Check if company is a string
    if (typeof jobDetail.company === "string" && jobDetail.company.trim()) {
      return String(jobDetail.company).trim();
    }

    // Check employer_name as fallback
    if (
      jobDetail.employer_name &&
      typeof jobDetail.employer_name === "string" &&
      jobDetail.employer_name.trim()
    ) {
      return String(jobDetail.employer_name).trim();
    }

    // Check JSearch-specific employer_name field
    if (
      jobDetailAny.employer_name &&
      typeof jobDetailAny.employer_name === "string"
    ) {
      return String(jobDetailAny.employer_name).trim();
    }

    // Check company_info object first (most detailed)
    if (jobDetail.company_info) {
      const companyInfo = jobDetail.company_info as CompanyInfo;
      if (
        companyInfo.name &&
        typeof companyInfo.name === "string" &&
        companyInfo.name.trim()
      ) {
        return String(companyInfo.name).trim();
      }
      if (
        companyInfo.company_name &&
        typeof companyInfo.company_name === "string" &&
        companyInfo.company_name.trim()
      ) {
        return String(companyInfo.company_name).trim();
      }
      if (
        companyInfo.employer_name &&
        typeof companyInfo.employer_name === "string" &&
        companyInfo.employer_name.trim()
      ) {
        return String(companyInfo.employer_name).trim();
      }
    }

    // Check root level fields
    if (
      jobDetail.company_name &&
      typeof jobDetail.company_name === "string" &&
      jobDetail.company_name.trim()
    ) {
      return String(jobDetail.company_name).trim();
    }
    if (
      jobDetail.employer_name &&
      typeof jobDetail.employer_name === "string" &&
      jobDetail.employer_name.trim()
    ) {
      return String(jobDetail.employer_name).trim();
    }

    // Check nested company object
    if (jobDetail.company && typeof jobDetail.company === "object") {
      const companyObj = jobDetail.company as CompanyInfo;
      if (
        companyObj.name &&
        typeof companyObj.name === "string" &&
        companyObj.name.trim()
      ) {
        return String(companyObj.name).trim();
      }
      if (
        companyObj.company_name &&
        typeof companyObj.company_name === "string" &&
        companyObj.company_name.trim()
      ) {
        return String(companyObj.company_name).trim();
      }
      if (
        companyObj.employer_name &&
        typeof companyObj.employer_name === "string" &&
        companyObj.employer_name.trim()
      ) {
        return String(companyObj.employer_name).trim();
      }
    }

    // Check employer object
    if (jobDetail.employer && typeof jobDetail.employer === "object") {
      const employerObj = jobDetail.employer as CompanyInfo;
      if (
        employerObj.name &&
        typeof employerObj.name === "string" &&
        employerObj.name.trim()
      ) {
        return String(employerObj.name).trim();
      }
      if (
        employerObj.company_name &&
        typeof employerObj.company_name === "string" &&
        employerObj.company_name.trim()
      ) {
        return String(employerObj.company_name).trim();
      }
      if (
        employerObj.employer_name &&
        typeof employerObj.employer_name === "string" &&
        employerObj.employer_name.trim()
      ) {
        return String(employerObj.employer_name).trim();
      }
    }

    // If still no company name found, return empty string (will be handled in UI)
    return "";
  };

  // Get job title
  const getJobTitle = () => {
    if (!jobDetail) return "Untitled Position";
    // Check all possible title fields - new API uses 'title' as primary
    const jobDetailAny = jobDetail as Record<string, unknown>;
    return (
      jobDetail.title ||
      jobDetail.job_title ||
      (jobDetailAny.title as string) ||
      (jobDetailAny.job_title as string) ||
      "Untitled Position"
    );
  };

  // Get location
  const getLocation = () => {
    if (!jobDetail) return "Location not specified";
    const jobDetailAny = jobDetail as Record<string, unknown>;

    // Helper to stringify various location shapes
    const stringFrom = (val: unknown) => {
      if (!val && val !== 0) return "";
      if (typeof val === "string") return val;
      if (typeof val === "number") return String(val);
      if (Array.isArray(val)) return val.map((v) => String(v)).join(", ");
      if (typeof val === "object") {
        // Try common object fields
        const obj = val as Record<string, unknown>;
        return (
          (obj.city as string) ||
          (obj.name as string) ||
          (obj.label as string) ||
          Object.values(obj)
            .filter(Boolean)
            .slice(0, 3)
            .map((v) => String(v))
            .join(", ") ||
          ""
        );
      }
      return String(val);
    };

    // 1) Prefer explicit location fields (string/array/object)
    const locationField = jobDetail.location ?? jobDetail.job_location;
    if (locationField) {
      const s = stringFrom(locationField);
      if (s) return s;
    }

    // 2) JSearch-specific or root city/state/country fields
    const parts = [] as string[];
    const city =
      jobDetailAny.job_city ?? jobDetail.city ?? (jobDetailAny.city as unknown);
    const state =
      jobDetailAny.job_state ??
      jobDetail.state ??
      (jobDetailAny.state as unknown);
    const country =
      jobDetailAny.job_country ??
      jobDetail.country ??
      (jobDetailAny.country as unknown);

    const cityStr = stringFrom(city);
    const stateStr = stringFrom(state);
    const countryStr = stringFrom(country);

    if (cityStr) parts.push(cityStr);
    if (stateStr) parts.push(stateStr);
    if (countryStr) parts.push(countryStr);

    if (parts.length > 0) return parts.join(", ");

    // 3) Fallback to composing any city/state/country values
    const fallback = [jobDetail.city, jobDetail.state, jobDetail.country]
      .map((v) => stringFrom(v))
      .filter(Boolean)
      .join(" ")
      .trim();

    return fallback || "Location not specified";
  };

  // Fetch company details from API
  const [companyDetails, setCompanyDetails] = useState<CompanyInfo | null>(null);
  const [isLoadingCompanyDetails, setIsLoadingCompanyDetails] = useState(false);
  const [companyLogoFromAPI, setCompanyLogoFromAPI] = useState<string | undefined>(undefined);

  // Fetch company details when company name is available
  useEffect(() => {
    const fetchCompanyDetails = async () => {
      if (!jobDetail) {
        setCompanyDetails(null);
        setCompanyLogoFromAPI(undefined);
        return;
      }

      const companyName = getCompanyName();
      if (!companyName || !companyName.trim()) {
        setCompanyDetails(null);
        setCompanyLogoFromAPI(undefined);
        return;
      }

      setIsLoadingCompanyDetails(true);
      try {
        // Fetch from the company API endpoint
        const encodedCompanyName = encodeURIComponent(companyName.trim());
        const companyApiUrl = `https://breneo-job-aggregator-k7ti.onrender.com/api/companies/${encodedCompanyName}`;
        
        console.log("🔍 Fetching company details from:", companyApiUrl);
        
        const response = await fetch(companyApiUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log("✅ Company details fetched:", data);
          
          // Extract company info from response
          const companyInfo: CompanyInfo = {
            name: data.name || data.company_name || companyName,
            company_name: data.company_name || data.name || companyName,
            logo: data.logo || data.company_logo || data.logo_url,
            company_logo: data.company_logo || data.logo || data.logo_url,
            logo_url: data.logo_url || data.logo || data.company_logo,
            website: data.website || data.company_url || data.website_url,
            company_url: data.company_url || data.website || data.website_url,
            description: data.description || data.company_description,
            company_description: data.company_description || data.description,
            size: data.size || data.company_size,
            company_size: data.company_size || data.size,
            industry: data.industry || data.company_industry,
            company_industry: data.company_industry || data.industry,
            founded: data.founded || data.company_founded,
            company_founded: data.company_founded || data.founded,
            headquarters: data.headquarters || data.company_headquarters,
            company_headquarters: data.company_headquarters || data.headquarters,
            ...data, // Include any other fields
          };

          setCompanyDetails(companyInfo);
          
          // Set logo from API if available
          const logoUrl = companyInfo.logo || companyInfo.company_logo || companyInfo.logo_url;
          if (logoUrl && typeof logoUrl === "string") {
            try {
              const url = new URL(logoUrl);
              if (url.protocol.startsWith("http")) {
                setCompanyLogoFromAPI(logoUrl);
              }
            } catch {
              // Invalid URL, don't set
            }
          }
        } else {
          console.log("⚠️ Company details not found or API error:", response.status);
          setCompanyDetails(null);
          setCompanyLogoFromAPI(undefined);
        }
      } catch (error) {
        console.error("❌ Error fetching company details:", error);
        setCompanyDetails(null);
        setCompanyLogoFromAPI(undefined);
      } finally {
        setIsLoadingCompanyDetails(false);
      }
    };

    fetchCompanyDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobDetail]);

  // Get company logo - check API first, then fallback to job detail fields
  const getCompanyLogo = () => {
    // First, check if we have logo from company API
    if (companyLogoFromAPI) {
      return companyLogoFromAPI;
    }

    if (!jobDetail) return undefined;
    const jobDetailAny = jobDetail as Record<string, unknown>;

    // Check JSearch-specific employer_logo field first
    if (
      jobDetailAny.employer_logo &&
      typeof jobDetailAny.employer_logo === "string"
    ) {
      const logoUrl = String(jobDetailAny.employer_logo);
      // Validate URL
      try {
        const url = new URL(logoUrl);
        if (url.protocol.startsWith("http")) {
          return logoUrl;
        }
      } catch {
        // Invalid URL, continue checking other fields
      }
    }

    // Check root level fields first
    if (jobDetail.company_logo && typeof jobDetail.company_logo === "string") {
      const logoUrl = String(jobDetail.company_logo);
      try {
        const url = new URL(logoUrl);
        if (url.protocol.startsWith("http")) {
          return logoUrl;
        }
      } catch {
        // Invalid URL, continue
      }
    }
    if (
      jobDetail.employer_logo &&
      typeof jobDetail.employer_logo === "string"
    ) {
      const logoUrl = String(jobDetail.employer_logo);
      try {
        const url = new URL(logoUrl);
        if (url.protocol.startsWith("http")) {
          return logoUrl;
        }
      } catch {
        // Invalid URL, continue
      }
    }
    if (jobDetail.logo_url && typeof jobDetail.logo_url === "string") {
      const logoUrl = String(jobDetail.logo_url);
      try {
        const url = new URL(logoUrl);
        if (url.protocol.startsWith("http")) {
          return logoUrl;
        }
      } catch {
        // Invalid URL, continue
      }
    }

    // Check company_info object
    if (jobDetail.company_info) {
      const companyInfo = jobDetail.company_info as CompanyInfo;
      const logoFields = [
        companyInfo.logo,
        companyInfo.company_logo,
        companyInfo.employer_logo,
        companyInfo.logo_url,
      ];
      for (const logoField of logoFields) {
        if (logoField && typeof logoField === "string") {
          const logoUrl = String(logoField);
          try {
            const url = new URL(logoUrl);
            if (url.protocol.startsWith("http")) {
              return logoUrl;
            }
          } catch {
            // Invalid URL, continue
          }
        }
      }
    }

    // Check nested company object
    if (jobDetail.company && typeof jobDetail.company === "object") {
      const companyObj = jobDetail.company as CompanyInfo;
      const logoFields = [
        companyObj.logo,
        companyObj.company_logo,
        companyObj.employer_logo,
        companyObj.logo_url,
      ];
      for (const logoField of logoFields) {
        if (logoField && typeof logoField === "string") {
          const logoUrl = String(logoField);
          try {
            const url = new URL(logoUrl);
            if (url.protocol.startsWith("http")) {
              return logoUrl;
            }
          } catch {
            // Invalid URL, continue
          }
        }
      }
    }

    // Check employer object
    if (jobDetail.employer && typeof jobDetail.employer === "object") {
      const employerObj = jobDetail.employer as CompanyInfo;
      const logoFields = [
        employerObj.logo,
        employerObj.company_logo,
        employerObj.employer_logo,
        employerObj.logo_url,
      ];
      for (const logoField of logoFields) {
        if (logoField && typeof logoField === "string") {
          const logoUrl = String(logoField);
          try {
            const url = new URL(logoUrl);
            if (url.protocol.startsWith("http")) {
              return logoUrl;
            }
          } catch {
            // Invalid URL, continue
          }
        }
      }
    }

    return undefined;
  };

  // Get company website - prioritize API data, then fallback to job detail
  const getCompanyWebsite = (): string | undefined => {
    if (companyDetails?.website || companyDetails?.company_url || companyDetails?.website_url) {
      return companyDetails.website || companyDetails.company_url || companyDetails.website_url;
    }
    if (!jobDetail) return undefined;
    const website =
      (jobDetail.company_info as CompanyInfo)?.website ||
      (jobDetail.company_info as CompanyInfo)?.company_url ||
      (jobDetail.company_info as CompanyInfo)?.website_url ||
      jobDetail.company_url;
    return typeof website === "string" ? website : undefined;
  };

  // Get company description - prioritize API data, then fallback to job detail
  const getCompanyDescription = () => {
    if (companyDetails?.description || companyDetails?.company_description) {
      return companyDetails.description || companyDetails.company_description;
    }
    if (!jobDetail) return undefined;
    return (
      (jobDetail.company_info as CompanyInfo)?.description ||
      (jobDetail.company_info as CompanyInfo)?.company_description ||
      undefined
    );
  };

  // Get company size - prioritize API data, then fallback to job detail
  const getCompanySize = () => {
    if (companyDetails?.size || companyDetails?.company_size) {
      return companyDetails.size || companyDetails.company_size;
    }
    if (!jobDetail) return undefined;
    return (
      (jobDetail.company_info as CompanyInfo)?.size ||
      (jobDetail.company_info as CompanyInfo)?.company_size ||
      undefined
    );
  };

  // Get company industry - prioritize API data, then fallback to job detail
  const getCompanyIndustry = () => {
    if (companyDetails?.industry || companyDetails?.company_industry) {
      return companyDetails.industry || companyDetails.company_industry;
    }
    if (!jobDetail) return undefined;
    return (
      (jobDetail.company_info as CompanyInfo)?.industry ||
      (jobDetail.company_info as CompanyInfo)?.company_industry ||
      undefined
    );
  };

  // Get company founded year - prioritize API data, then fallback to job detail
  const getCompanyFounded = () => {
    if (companyDetails?.founded || companyDetails?.company_founded) {
      return companyDetails.founded || companyDetails.company_founded;
    }
    if (!jobDetail) return undefined;
    return (
      (jobDetail.company_info as CompanyInfo)?.founded ||
      (jobDetail.company_info as CompanyInfo)?.company_founded ||
      undefined
    );
  };

  // Get company headquarters - prioritize API data, then fallback to job detail
  const getCompanyHeadquarters = () => {
    if (companyDetails?.headquarters || companyDetails?.company_headquarters) {
      return companyDetails.headquarters || companyDetails.company_headquarters;
    }
    if (!jobDetail) return undefined;
    return (
      (jobDetail.company_info as CompanyInfo)?.headquarters ||
      (jobDetail.company_info as CompanyInfo)?.company_headquarters ||
      undefined
    );
  };

  // Get employment type
  const getEmploymentType = () => {
    if (!jobDetail) return "Full Time";
    const jobDetailAny = jobDetail as Record<string, unknown>;
    // Check all possible employment type fields including JSearch format
    return (
      jobDetail.employment_type ||
      jobDetail.job_employment_type ||
      (jobDetailAny.job_employment_type as string) ||
      "Full Time"
    );
  };

  // Get work arrangement
  const getWorkArrangement = () => {
    if (!jobDetail) return "On-site";
    const jobDetailAny = jobDetail as Record<string, unknown>;
    // Check all possible remote flags including JSearch format
    const isRemote =
      jobDetail.is_remote ||
      jobDetail.remote === true ||
      jobDetailAny.job_is_remote === true ||
      jobDetailAny.remote === true;
    if (isRemote) return "Remote";
    const title = getJobTitle().toLowerCase();
    if (title.includes("hybrid")) return "Hybrid";
    return "On-site";
  };

  // Get description
  const getDescription = () => {
    if (!jobDetail) return "No description available.";
    const jobDetailAny = jobDetail as Record<string, unknown>;
    // Check all possible description fields including JSearch format
    const description =
      jobDetail.description ||
      jobDetail.job_description ||
      (jobDetailAny.job_description as string | undefined) ||
      undefined;

    // Handle different data types
    if (!description) return "No description available.";
    if (typeof description === "string") return description;
    if (Array.isArray(description)) {
      // Convert array to string (join with newlines)
      return (description as unknown[]).map((d) => String(d)).join("\n");
    }
    if (typeof description === "object") {
      // Convert object to string representation
      return JSON.stringify(description, null, 2);
    }
    // Convert to string as fallback
    return String(description);
  };

  // Get requirements/qualifications
  const getRequirements = () => {
    if (!jobDetail) return undefined;
    const requirements =
      jobDetail.requirements ||
      jobDetail.job_requirements ||
      jobDetail.qualifications ||
      undefined;

    // Handle different data types
    if (!requirements) return undefined;
    if (typeof requirements === "string") return requirements;
    if (Array.isArray(requirements)) {
      // Convert array to string (join with newlines)
      return (requirements as unknown[]).map((r) => String(r)).join("\n");
    }
    if (typeof requirements === "object") {
      // Convert object to string representation
      return JSON.stringify(requirements, null, 2);
    }
    // Convert to string as fallback
    return String(requirements);
  };

  // Get required experience
  const getRequiredExperience = () => {
    if (!jobDetail) return undefined;
    return (
      jobDetail.required_experience ||
      jobDetail.job_required_experience ||
      jobDetail.experience ||
      undefined
    );
  };

  // Get required skills
  const getRequiredSkills = (): string[] => {
    if (!jobDetail) return [];
    const skills =
      jobDetail.required_skills ||
      jobDetail.skills ||
      jobDetail.job_skills ||
      undefined;

    if (typeof skills === "string") {
      // Try to parse comma-separated or newline-separated skills
      return skills
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (Array.isArray(skills)) {
      return skills.filter(Boolean);
    }
    return [];
  };

  // Get education requirements
  const getEducationRequired = () => {
    if (!jobDetail) return undefined;
    return (
      jobDetail.education ||
      jobDetail.education_required ||
      jobDetail.required_education ||
      undefined
    );
  };

  // Parse benefits into an array of benefit items
  const getBenefitsList = (): string[] => {
    if (!jobDetail) return [];
    const benefits =
      jobDetail.benefits ||
      jobDetail.job_benefits ||
      jobDetail.perks ||
      undefined;

    if (!benefits) return [];

    // Handle array
    if (Array.isArray(benefits)) {
      return benefits.map((b) => String(b)).filter(Boolean);
    }

    // Handle string - split by common delimiters
    if (typeof benefits === "string") {
      // Try splitting by newlines, commas, or semicolons
      return benefits
        .split(/[\n,;]/)
        .map((b: string) => b.trim())
        .filter(Boolean) as string[];
    }

    // Handle object - extract keys or values
    if (typeof benefits === "object") {
      // If it's an object with boolean values, return the keys
      const entries = Object.entries(benefits);
      if (entries.every(([_, v]) => typeof v === "boolean")) {
        return entries.filter(([_, v]) => v === true).map(([k]) => k);
      }
      // Otherwise return all keys
      return Object.keys(benefits);
    }

    return [];
  };

  // Get benefit icon based on benefit name
  const getBenefitIcon = (benefit: string) => {
    const benefitLower = benefit.toLowerCase().replace(/[_\s-]/g, "");

    // Health & Insurance
    if (
      benefitLower.includes("health") ||
      benefitLower.includes("medical") ||
      benefitLower.includes("insurance")
    ) {
      return <Stethoscope className="h-5 w-5" />;
    }
    if (benefitLower.includes("dental")) {
      return <Smile className="h-5 w-5" />;
    }
    if (benefitLower.includes("vision") || benefitLower.includes("eye")) {
      return <Eye className="h-5 w-5" />;
    }

    // Time off
    if (
      benefitLower.includes("pto") ||
      benefitLower.includes("paidtimeoff") ||
      benefitLower.includes("vacation") ||
      benefitLower.includes("holiday")
    ) {
      return <Calendar className="h-5 w-5" />;
    }
    if (benefitLower.includes("sick") || benefitLower.includes("leave")) {
      return <Heart className="h-5 w-5" />;
    }

    // Financial
    if (
      benefitLower.includes("salary") ||
      benefitLower.includes("pay") ||
      benefitLower.includes("compensation") ||
      benefitLower.includes("bonus")
    ) {
      return <DollarSign className="h-5 w-5" />;
    }
    if (
      benefitLower.includes("401k") ||
      benefitLower.includes("retirement") ||
      benefitLower.includes("pension")
    ) {
      return <Briefcase className="h-5 w-5" />;
    }
    if (
      benefitLower.includes("stock") ||
      benefitLower.includes("equity") ||
      benefitLower.includes("options")
    ) {
      return <TrendingUp className="h-5 w-5" />;
    }

    // Work-life
    if (
      benefitLower.includes("remote") ||
      benefitLower.includes("workfromhome") ||
      benefitLower.includes("wfh")
    ) {
      return <Home className="h-5 w-5" />;
    }
    if (benefitLower.includes("flexible") || benefitLower.includes("flex")) {
      return <Clock className="h-5 w-5" />;
    }

    // Professional Development
    if (
      benefitLower.includes("training") ||
      benefitLower.includes("learning") ||
      benefitLower.includes("education") ||
      benefitLower.includes("development")
    ) {
      return <GraduationCap className="h-5 w-5" />;
    }
    if (
      benefitLower.includes("conference") ||
      benefitLower.includes("certification")
    ) {
      return <Award className="h-5 w-5" />;
    }

    // Perks
    if (
      benefitLower.includes("gym") ||
      benefitLower.includes("fitness") ||
      benefitLower.includes("wellness")
    ) {
      return <Dumbbell className="h-5 w-5" />;
    }
    if (
      benefitLower.includes("food") ||
      benefitLower.includes("meal") ||
      benefitLower.includes("snack") ||
      benefitLower.includes("catering")
    ) {
      return <UtensilsCrossed className="h-5 w-5" />;
    }
    if (
      benefitLower.includes("coffee") ||
      benefitLower.includes("drink") ||
      benefitLower.includes("beverage")
    ) {
      return <Coffee className="h-5 w-5" />;
    }
    if (
      benefitLower.includes("parking") ||
      benefitLower.includes("transport") ||
      benefitLower.includes("commute")
    ) {
      return <Car className="h-5 w-5" />;
    }

    // Default
    return <Sparkles className="h-5 w-5" />;
  };

  // Format benefit name for display
  const formatBenefitName = (benefit: string): string => {
    // Replace underscores and hyphens with spaces, then capitalize
    return benefit
      .replace(/[_-]/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Get application deadline
  const getApplicationDeadline = () => {
    if (!jobDetail) return undefined;
    return (
      jobDetail.application_deadline ||
      jobDetail.deadline ||
      jobDetail.expires_at ||
      jobDetail.expiration_date ||
      undefined
    );
  };

  // Format date for display
  const formatDate = (dateString?: string): string | undefined => {
    if (!dateString) return undefined;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return as-is if invalid
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Get job category/industry
  const getJobCategory = () => {
    if (!jobDetail) return undefined;
    return (
      jobDetail.job_category ||
      jobDetail.category ||
      jobDetail.industry ||
      jobDetail.job_industry ||
      undefined
    );
  };

  // Get current page URL for sharing
  const getShareUrl = () => {
    return window.location.href;
  };

  // Get share text
  const getShareText = () => {
    if (!jobDetail) return "Check out this job!";
    const title = getJobTitle();
    const company = getCompanyName();
    return `Check out this ${title} position at ${company}!`;
  };

  // Handle native share (mobile)
  const handleNativeShare = async () => {
    if (!navigator.share) {
      // Fallback to dropdown if native share is not available
      return false;
    }

    try {
      await navigator.share({
        title: getJobTitle(),
        text: getShareText(),
        url: getShareUrl(),
      });
      toast.success("Shared successfully!");
      return true;
    } catch (error) {
      // User cancelled or error occurred
      if ((error as Error).name !== "AbortError") {
        console.error("Error sharing:", error);
      }
      return false;
    }
  };

  // Handle copy link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      toast.success("Link copied to clipboard!");
    } catch (error) {
      console.error("Error copying link:", error);
      toast.error("Failed to copy link");
    }
  };

  // Handle Facebook share
  const handleFacebookShare = () => {
    const url = encodeURIComponent(getShareUrl());
    const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    window.open(facebookShareUrl, "_blank", "width=600,height=400");
  };

  // Handle LinkedIn share
  const handleLinkedInShare = () => {
    const url = encodeURIComponent(getShareUrl());
    const title = encodeURIComponent(getJobTitle());
    const summary = encodeURIComponent(getShareText());
    const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}&summary=${summary}`;
    window.open(linkedInShareUrl, "_blank", "width=600,height=400");
  };

  // Handle share button click (for mobile native share)
  const handleShareClick = async () => {
    if (navigator.share) {
      const shared = await handleNativeShare();
      // If native share failed or was cancelled, we could fallback to dropdown
      // but for now, we'll just let it fail silently
    }
  };

  const matchPercentage = calculateMatchPercentage(
    userSkills,
    jobDetail ? extractJobSkills(jobDetail) : [],
    getJobTitle()
  );
  const matchLabel = getMatchQualityLabel(matchPercentage);

  return (
    <DashboardLayout>
      <div
        ref={mainContentRef}
        className="max-w-5xl mx-auto pt-0 sm:pt-4 pb-40 sm:pb-32 md:pb-24 sm:px-4 md:px-6"
      >
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <p className="font-semibold">Error loading job details</p>
                  <p className="text-sm">{(error as Error).message}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-3/4 mb-4" />
                <Skeleton className="h-4 w-1/2 mb-6" />
                <div className="flex items-center gap-4 mb-6">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-1/3 mb-2" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                </div>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
        )}

        {!isLoading && jobDetail && (
          <Card className="bg-transparent border-0 shadow-none h-full">
            <CardContent className="p-1 sm:p-6 space-y-5">
              {/* Job Header */}
              <div>
                <div className="flex flex-col md:flex-row md:items-start gap-6 bg-white rounded-3xl p-6 shadow-none border-0">
                  {/* Left Side: Job Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4 mb-3">
                      {getCompanyLogo() ? (
                        <img
                          src={getCompanyLogo()}
                          alt={getCompanyName() || "Company logo"}
                          className="h-12 w-12 rounded-md object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 flex-shrink-0">
                          <Building2 className="h-6 w-6" />
                        </div>
                      )}

                      <div className="flex flex-col min-w-0">
                        {getCompanyName() && (
                          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 truncate">
                            {getCompanyName()}
                          </p>
                        )}
                        <h1 className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white truncate">
                          {getJobTitle()}
                        </h1>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <MapPin className="h-4 w-4" />
                        <span>{getLocation()}</span>
                      </div>
                    </div>

                    {/* Job Highlights */}
                    <div className="flex flex-col md:flex-row md:flex-wrap gap-2 md:gap-4 mb-6 text-sm md:text-base font-medium text-gray-700 dark:text-gray-200 ">
                      <div className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
                        <PiggyBank className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                        <span>{formatSalary()}</span>
                      </div>
                      <div className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
                        <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                        <span>{getEmploymentType()}</span>
                      </div>
                      <div className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
                        <Briefcase className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                        <span>{getWorkArrangement()}</span>
                      </div>
                      {jobDetail.posted_at || jobDetail.fetched_at || jobDetail.date_posted || jobDetail.posted_date ? (
                        <div className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap text-sm md:text-base font-medium text-gray-700 dark:text-gray-200">
                          <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0 text-gray-700 dark:text-gray-200" />
                          <span>
                            {formatDate(
                              String(jobDetail.posted_at || 
                              jobDetail.fetched_at || 
                              jobDetail.date_posted || 
                              jobDetail.posted_date || "")
                            ) ||
                              String(jobDetail.posted_at ||
                              jobDetail.fetched_at ||
                              jobDetail.date_posted ||
                              jobDetail.posted_date || "")}
                          </span>
                        </div>
                      ) : null}
                    </div>

                  </div>

                  {/* Right Side: Action Buttons - Aligned to Top */}
                  <div className="flex flex-row items-start gap-2 md:pt-0">
                    {getApplyUrl() ? (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => window.open(getApplyUrl(), "_blank")}
                      >
                        Apply Now
                      </Button>
                    ) : (
                      <Button
                        disabled
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        Apply Link Not Available
                      </Button>
                    )}
                    <div className="flex flex-row items-start gap-2 ml-auto">
                      {user && (
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={() => saveJobMutation.mutate()}
                          disabled={saveJobMutation.isPending}
                          aria-label={isSaved ? "Unsave job" : "Save job"}
                          className="h-10 w-10 [&_svg]:size-4 dark:bg-[#181818] dark:hover:bg-[#252525]"
                        >
                          <Heart
                            className={`h-4 w-4 ${
                              isSaved
                                ? "text-red-500 fill-red-500 animate-heart-pop"
                                : ""
                            }`}
                          />
                        </Button>
                      )}
                      {/* Share Button */}
                      {isMobile && navigator.share ? (
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={handleShareClick}
                          aria-label="Share job"
                          className="h-10 w-10 [&_svg]:size-4 dark:bg-[#181818] dark:hover:bg-[#252525]"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="secondary"
                              size="icon"
                              aria-label="Share job"
                              className="h-10 w-10 [&_svg]:size-4 dark:bg-[#181818] dark:hover:bg-[#252525]"
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleCopyLink}>
                              <Copy className="mr-2 h-4 w-4" />
                              <span>Copy Link</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleFacebookShare}>
                              <Facebook className="mr-2 h-4 w-4" />
                              <span>Share on Facebook</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleLinkedInShare}>
                              <Linkedin className="mr-2 h-4 w-4" />
                              <span>Share on LinkedIn</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              </div>



              {/* Job Match Section - Standalone Card */}
              {user && userSkills.length > 0 && (
                <div className="bg-white rounded-3xl p-6 shadow-none border-0 mt-6">
                  <div className="flex flex-row items-start gap-5">
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0 pt-1">
                      <RadialProgress
                        value={matchPercentage}
                        size={56}
                        strokeWidth={4}
                        showLabel={false}
                        percentageTextSize="md"
                        className="flex-shrink-0"
                      />
                      <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        MATCH SCORE
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-start gap-2 mb-2">
                        <div className="bg-breneo-accent/10 p-1.5 rounded-lg">
                          <Zap className="h-4 w-4 text-breneo-accent fill-breneo-accent" />
                        </div>
                        <span className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                          {matchLabel || "Match Analysis"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
                        This score is calculated by comparing your profile skills with the job requirements. We prioritize exact matches and key skills mentioned in the job title to ensure the best fit for your career path.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Job Details Section - Combined */}
              {(jobDetail.responsibilities || jobDetail.qualifications || jobDetail.team_description || jobDetail.benefits) && (
                <div className="bg-white rounded-3xl p-6 shadow-none border-0 mt-6 space-y-6">
                  {/* Responsibilities */}
                  {jobDetail.responsibilities && (
                    <div>
                      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                        <Target className="h-5 w-5" />
                        Responsibilities
                      </h2>
                      <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-line">
                        <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                          {jobDetail.responsibilities}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Qualifications */}
                  {jobDetail.qualifications && (
                    <div>
                      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                        <Award className="h-5 w-5" />
                        Qualifications
                      </h2>
                      <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-line">
                        <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                          {jobDetail.qualifications}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Team Description - Only show if available */}
                  {jobDetail.team_description && (
                    <div>
                      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                        <Users className="h-5 w-5" />
                        About the Team
                      </h2>
                      <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-line">
                        <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                          {jobDetail.team_description}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Benefits */}
                  {jobDetail.benefits && (
                    <div>
                      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                        <Sparkles className="h-5 w-5" />
                        Benefits
                      </h2>
                      <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-line">
                        <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                          {jobDetail.benefits}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}



              {/* Job Details Grid */}
              {(getRequiredExperience() ||
                getEducationRequired() ||
                getRequiredSkills().length > 0 ||
                getJobCategory() ||
                getApplicationDeadline()) && (
                <div className="rounded-3xl p-6 shadow-none border-0 mt-6">
                  <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
                    <CheckCircle2 className="h-5 w-5" />
                    Job Details
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getRequiredExperience() && (
                      <div className="flex items-start gap-3">
                        <Briefcase className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Required Experience
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                            {getRequiredExperience()}
                          </p>
                        </div>
                      </div>
                    )}

                    {getEducationRequired() && (
                      <div className="flex items-start gap-3">
                        <GraduationCap className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Education Required
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                            {getEducationRequired()}
                          </p>
                        </div>
                      </div>
                    )}

                    {getJobCategory() && (
                      <div className="flex items-start gap-3">
                        <Factory className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Category/Industry
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                            {getJobCategory()}
                          </p>
                        </div>
                      </div>
                    )}

                    {getApplicationDeadline() && (
                      <div className="flex items-start gap-3">
                        <CalendarIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Application Deadline
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                            {formatDate(getApplicationDeadline()) ||
                              getApplicationDeadline()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Required Skills */}
                  {getRequiredSkills().length > 0 && (
                    <div className="mt-6 pt-6">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Required Skills
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {getRequiredSkills().map((skill, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            <Award className="h-3 w-3" />
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Benefits & Perks - Moved to Bottom */}
              {getBenefitsList().length > 0 && (
                <div className="pt-8">
                  <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
                    <Sparkles className="h-5 w-5" />
                    Benefits & Perks
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {getBenefitsList().map((benefit, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-3xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex-shrink-0 text-breneo-accent">
                          {getBenefitIcon(benefit)}
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {formatBenefitName(benefit)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

                {/* Company Details Section - Redesigned */}
                <div className="bg-white rounded-3xl p-6 shadow-none border-0 mt-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                       <Building2 className="h-5 w-5" />
                       Company Details
                    </h2>
                  </div>

                  {isLoadingCompanyDetails ? (
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                       <Loader2 className="h-5 w-5 animate-spin text-breneo-accent" />
                       <p className="text-sm">Loading company information...</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                        {/* Header: Name and Logo */}
                        <div className="flex items-center gap-4">
                           <div className="flex-shrink-0">
                             {getCompanyLogo() ? (
                               <img
                                 src={getCompanyLogo()}
                                 alt={getCompanyName() || "Company logo"}
                                 className="h-14 w-14 md:h-14 md:w-14 rounded-2xl object-cover bg-white shadow-sm border border-gray-100 dark:border-gray-800"
                                 onError={(e) => {
                                   (e.target as HTMLImageElement).style.display = "none";
                                   ((e.target as HTMLImageElement).nextElementSibling as HTMLElement).style.display = "flex";
                                 }}
                               />
                             ) : null}
                             <div
                               className={`h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-gradient-to-br from-breneo-accent to-breneo-blue flex items-center justify-center text-white shadow-sm ${
                                 getCompanyLogo() ? "hidden" : "flex"
                               }`}
                             >
                               <Building2 className="h-8 w-8" />
                             </div>
                           </div>

                           <h3 className="text-xl md:text-xl font-bold text-gray-900 dark:text-white break-words">
                             {getCompanyName() || "Company Name"}
                           </h3>
                        </div>

                        {/* Description */}
                        {getCompanyDescription() && (
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                              {getCompanyDescription()}
                            </p>
                          </div>
                        )}

                        {/* Details List */}
                        <div className="space-y-4 pt-2">
                           {getCompanyFounded() && (
                              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-200">
                                <Calendar className="h-5 w-5" />
                                <span className="text-base font-medium">Founded in {getCompanyFounded()}</span>
                              </div>
                           )}
                           
                           {getCompanyHeadquarters() && (
                              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-200">
                                <MapPin className="h-5 w-5" />
                                <span className="text-base font-medium">{getCompanyHeadquarters()}</span>
                              </div>
                           )}

                           {getCompanySize() && (
                              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-200">
                                <Users className="h-5 w-5" />
                                <span className="text-base font-medium">{getCompanySize()} employees</span>
                              </div>
                        )}
                        {/* Socials / Website */}
                        {getCompanyWebsite() && (
                          <div className="flex gap-2">
                            <a
                              href={getCompanyWebsite()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-5 h-10 rounded-full bg-primary text-white dark:text-black hover:opacity-80 transition-opacity font-medium text-sm"
                              title="Visit Website"
                            >
                               <Globe className="h-4 w-4" />
                               Visit Website
                            </a>
                          </div>
                        )}
                        </div>
                    </div>


                  )}
                </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && !jobDetail && !error && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="font-semibold mb-2">No job details found</p>
                <p className="text-sm">Job ID: {jobId || "Not provided"}</p>
                <p className="text-sm mt-2">
                  The API may not have returned data for this job.
                </p>
                <Button
                  onClick={() => {
                    queryClient.invalidateQueries({
                      queryKey: ["jobDetail", jobId],
                    });
                  }}
                  variant="outline"
                  className="mt-4"
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Fixed Bottom Bar - Shows when scrolling */}
      {jobDetail && (
        <div
          className={cn(
            "fixed bottom-0 right-0 z-[60]",
            "bg-[#F8F9FA] dark:bg-[#181818]",
            "border-t border-black/[0.03] dark:border-white/[0.03]",
            "shadow-lg transition-all duration-300 ease-in-out",
            sidebarCollapsed ? "md:left-24" : "md:left-[17rem]",
            "left-0",
            showFixedBar
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-full pointer-events-none"
          )}
        >
          <div className="px-5 sm:px-9 md:px-12 lg:px-14 py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Job Title */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {getJobTitle()}
                </h3>
                {getCompanyName() && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {getCompanyName()}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Save Button */}
                {user && (
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => saveJobMutation.mutate()}
                    disabled={saveJobMutation.isPending}
                    aria-label={isSaved ? "Unsave job" : "Save job"}
                    className="h-10 w-10 [&_svg]:size-4 bg-gray-200 dark:bg-border/50 hover:bg-gray-300 dark:hover:bg-border/70"
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        isSaved
                          ? "text-red-500 fill-red-500 animate-heart-pop"
                          : ""
                      }`}
                    />
                  </Button>
                )}

                {/* Share Button */}
                {isMobile && navigator.share ? (
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={handleShareClick}
                    aria-label="Share job"
                    className="h-10 w-10 [&_svg]:size-4 bg-gray-200 dark:bg-border/50 hover:bg-gray-300 dark:hover:bg-border/70"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        aria-label="Share job"
                        className="h-10 w-10 [&_svg]:size-4 bg-gray-200 dark:bg-border/50 hover:bg-gray-300 dark:hover:bg-border/70"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleCopyLink}>
                        <Copy className="mr-2 h-4 w-4" />
                        <span>Copy Link</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleFacebookShare}>
                        <Facebook className="mr-2 h-4 w-4" />
                        <span>Share on Facebook</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleLinkedInShare}>
                        <Linkedin className="mr-2 h-4 w-4" />
                        <span>Share on LinkedIn</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Apply Button - Last */}
                {getApplyUrl() ? (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => window.open(getApplyUrl(), "_blank")}
                    className="whitespace-nowrap"
                  >
                    Apply Now
                  </Button>
                ) : (
                  <Button
                    disabled
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    Apply Unavailable
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default JobDetailPage;
