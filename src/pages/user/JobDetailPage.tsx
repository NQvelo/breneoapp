import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Bookmark,
  ArrowLeft,
  Briefcase,
  MapPin,
  DollarSign,
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
  Heart,
  Smile,
  Shield,
  Car,
  UtensilsCrossed,
  Coffee,
  Dumbbell,
  Stethoscope,
  Eye,
  TrendingUp,
} from "lucide-react";
import { jobService, JobDetail, CompanyInfo } from "@/api/jobs";

const JobDetailPage = () => {
  const { jobId: rawJobId } = useParams<{ jobId: string }>();
  // Decode the job ID in case it was URL-encoded
  const jobId = rawJobId ? decodeURIComponent(rawJobId) : undefined;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
      // @ts-expect-error - saved_jobs table exists but is not in generated types
      const { data } = await supabase
        .from("saved_jobs")
        .select("job_id")
        .eq("user_id", user.id);
      // @ts-expect-error - data type inference issue
      return data?.map((item: { job_id: string }) => item.job_id) || [];
    },
    enabled: !!user,
  });

  const jobIdForSave = jobDetail?.id || jobDetail?.job_id || jobId || "";
  const isSaved = savedJobs.includes(jobIdForSave);

  // Save/unsave job mutation
  const saveJobMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not logged in");
      if (!jobDetail) throw new Error("Job details not available");

      const jobData = {
        id: jobIdForSave,
        title: jobDetail.title || jobDetail.job_title || "Untitled Position",
        company:
          jobDetail.company ||
          jobDetail.company_name ||
          jobDetail.employer_name ||
          "Unknown Company",
        location:
          jobDetail.location ||
          jobDetail.job_location ||
          `${jobDetail.city || ""} ${jobDetail.state || ""} ${
            jobDetail.country || ""
          }`.trim() ||
          "Location not specified",
        url:
          jobDetail.apply_url ||
          jobDetail.job_apply_link ||
          jobDetail.url ||
          "",
        company_logo:
          jobDetail.company_logo ||
          jobDetail.employer_logo ||
          jobDetail.logo_url ||
          undefined,
        is_saved: !isSaved,
        salary: jobDetail.salary || "By agreement",
        employment_type:
          jobDetail.employment_type ||
          jobDetail.job_employment_type ||
          "Full Time",
        work_arrangement: jobDetail.work_arrangement || "On-site",
      };

      if (isSaved) {
        // @ts-expect-error - saved_jobs table exists but is not in generated types
        await supabase
          .from("saved_jobs")
          .delete()
          .eq("user_id", user.id)
          .eq("job_id", jobIdForSave);
      } else {
        // @ts-expect-error - saved_jobs table exists but is not in generated types
        await supabase
          .from("saved_jobs")
          // @ts-expect-error - insert type inference issue
          .insert({
            user_id: user.id,
            job_id: jobIdForSave,
            job_data: jobData,
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedJobs", user?.id] });
      toast.success(isSaved ? "Job Unsaved" : "Job Saved");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save job");
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

    // Check JSearch-specific job_apply_link field first
    if (
      jobDetailAny.job_apply_link &&
      typeof jobDetailAny.job_apply_link === "string"
    ) {
      return jobDetailAny.job_apply_link;
    }

    // Check all possible apply URL fields in order of preference
    const applyUrl =
      jobDetail.apply_url ||
      jobDetail.job_apply_link ||
      jobDetail.url ||
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

    // Check JSearch-specific employer_name field first
    if (
      jobDetailAny.employer_name &&
      typeof jobDetailAny.employer_name === "string"
    ) {
      return jobDetailAny.employer_name.trim();
    }

    // Check if company is a string
    if (typeof jobDetail.company === "string" && jobDetail.company.trim()) {
      return jobDetail.company.trim();
    }

    // Check company_info object first (most detailed)
    if (jobDetail.company_info) {
      const companyInfo = jobDetail.company_info as CompanyInfo;
      if (companyInfo.name && companyInfo.name.trim()) {
        return companyInfo.name.trim();
      }
      if (companyInfo.company_name && companyInfo.company_name.trim()) {
        return companyInfo.company_name.trim();
      }
      if (companyInfo.employer_name && companyInfo.employer_name.trim()) {
        return companyInfo.employer_name.trim();
      }
    }

    // Check root level fields
    if (jobDetail.company_name && jobDetail.company_name.trim()) {
      return jobDetail.company_name.trim();
    }
    if (jobDetail.employer_name && jobDetail.employer_name.trim()) {
      return jobDetail.employer_name.trim();
    }

    // Check nested company object
    if (jobDetail.company && typeof jobDetail.company === "object") {
      const companyObj = jobDetail.company as CompanyInfo;
      if (companyObj.name && companyObj.name.trim()) {
        return companyObj.name.trim();
      }
      if (companyObj.company_name && companyObj.company_name.trim()) {
        return companyObj.company_name.trim();
      }
      if (companyObj.employer_name && companyObj.employer_name.trim()) {
        return companyObj.employer_name.trim();
      }
    }

    // Check employer object
    if (jobDetail.employer && typeof jobDetail.employer === "object") {
      const employerObj = jobDetail.employer as CompanyInfo;
      if (employerObj.name && employerObj.name.trim()) {
        return employerObj.name.trim();
      }
      if (employerObj.company_name && employerObj.company_name.trim()) {
        return employerObj.company_name.trim();
      }
      if (employerObj.employer_name && employerObj.employer_name.trim()) {
        return employerObj.employer_name.trim();
      }
    }

    // If still no company name found, return empty string (will be handled in UI)
    return "";
  };

  // Get job title
  const getJobTitle = () => {
    if (!jobDetail) return "Untitled Position";
    // Check all possible title fields including JSearch format
    const jobDetailAny = jobDetail as Record<string, unknown>;
    return (
      jobDetail.title ||
      jobDetail.job_title ||
      (jobDetailAny.job_title as string) ||
      "Untitled Position"
    );
  };

  // Get location
  const getLocation = () => {
    if (!jobDetail) return "Location not specified";
    const jobDetailAny = jobDetail as Record<string, unknown>;

    // Check standard location fields
    if (jobDetail.location || jobDetail.job_location) {
      return (
        jobDetail.location || jobDetail.job_location || "Location not specified"
      );
    }

    // Check JSearch-specific fields: job_city, job_state, job_country
    const jobCity = (jobDetailAny.job_city as string) || jobDetail.city;
    const jobState = (jobDetailAny.job_state as string) || jobDetail.state;
    const jobCountry =
      (jobDetailAny.job_country as string) || jobDetail.country;

    if (jobCity || jobState || jobCountry) {
      const locationParts = [jobCity, jobState, jobCountry].filter(Boolean);
      return locationParts.join(", ") || "Location not specified";
    }

    // Fallback to combined city, state, country
    const combined = `${jobDetail.city || ""} ${jobDetail.state || ""} ${
      jobDetail.country || ""
    }`.trim();

    return combined || "Location not specified";
  };

  // Get company logo - check all possible logo fields
  const getCompanyLogo = () => {
    if (!jobDetail) return undefined;
    const jobDetailAny = jobDetail as Record<string, unknown>;

    // Check JSearch-specific employer_logo field first
    if (
      jobDetailAny.employer_logo &&
      typeof jobDetailAny.employer_logo === "string"
    ) {
      return jobDetailAny.employer_logo;
    }

    // Check root level fields first
    if (jobDetail.company_logo) return jobDetail.company_logo;
    if (jobDetail.employer_logo) return jobDetail.employer_logo;
    if (jobDetail.logo_url) return jobDetail.logo_url;

    // Check company_info object
    if (jobDetail.company_info) {
      const companyInfo = jobDetail.company_info as CompanyInfo;
      if (companyInfo.logo) return companyInfo.logo;
      if (companyInfo.company_logo) return companyInfo.company_logo;
      if (companyInfo.employer_logo) return companyInfo.employer_logo;
      if (companyInfo.logo_url) return companyInfo.logo_url;
    }

    // Check nested company object
    if (jobDetail.company && typeof jobDetail.company === "object") {
      const companyObj = jobDetail.company as CompanyInfo;
      if (companyObj.logo) return companyObj.logo;
      if (companyObj.company_logo) return companyObj.company_logo;
      if (companyObj.employer_logo) return companyObj.employer_logo;
      if (companyObj.logo_url) return companyObj.logo_url;
    }

    // Check employer object
    if (jobDetail.employer && typeof jobDetail.employer === "object") {
      const employerObj = jobDetail.employer as CompanyInfo;
      if (employerObj.logo) return employerObj.logo;
      if (employerObj.company_logo) return employerObj.company_logo;
      if (employerObj.employer_logo) return employerObj.employer_logo;
      if (employerObj.logo_url) return employerObj.logo_url;
    }

    return undefined;
  };

  // Get company website
  const getCompanyWebsite = (): string | undefined => {
    if (!jobDetail) return undefined;
    const website =
      (jobDetail.company_info as CompanyInfo)?.website ||
      (jobDetail.company_info as CompanyInfo)?.company_url ||
      (jobDetail.company_info as CompanyInfo)?.website_url ||
      jobDetail.company_url;
    return typeof website === "string" ? website : undefined;
  };

  // Get company description
  const getCompanyDescription = () => {
    if (!jobDetail) return undefined;
    return (
      (jobDetail.company_info as CompanyInfo)?.description ||
      (jobDetail.company_info as CompanyInfo)?.company_description ||
      undefined
    );
  };

  // Get company size
  const getCompanySize = () => {
    if (!jobDetail) return undefined;
    return (
      (jobDetail.company_info as CompanyInfo)?.size ||
      (jobDetail.company_info as CompanyInfo)?.company_size ||
      undefined
    );
  };

  // Get company industry
  const getCompanyIndustry = () => {
    if (!jobDetail) return undefined;
    return (
      (jobDetail.company_info as CompanyInfo)?.industry ||
      (jobDetail.company_info as CompanyInfo)?.company_industry ||
      undefined
    );
  };

  // Get company founded year
  const getCompanyFounded = () => {
    if (!jobDetail) return undefined;
    return (
      (jobDetail.company_info as CompanyInfo)?.founded ||
      (jobDetail.company_info as CompanyInfo)?.company_founded ||
      undefined
    );
  };

  // Get company headquarters
  const getCompanyHeadquarters = () => {
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

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </Button>

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
          <div className="space-y-6">
            {/* Job Header Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  {/* Company Logo */}
                  <div className="flex-shrink-0">
                    {getCompanyLogo() ? (
                      <img
                        src={getCompanyLogo()}
                        alt={`${getCompanyName()} logo`}
                        className="w-20 h-20 rounded-full object-cover border border-gray-200"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.style.display = "none";
                          // Try Clearbit logo API as fallback
                          const companyName = getCompanyName();
                          if (companyName) {
                            const clearbitLogo =
                              target.nextElementSibling as HTMLImageElement;
                            if (
                              clearbitLogo &&
                              clearbitLogo.tagName === "IMG"
                            ) {
                              clearbitLogo.style.display = "block";
                            } else {
                              const iconFallback =
                                target.parentElement?.querySelector(
                                  ".logo-fallback"
                                ) as HTMLElement;
                              if (iconFallback) {
                                iconFallback.style.display = "flex";
                              }
                            }
                          }
                        }}
                      />
                    ) : null}
                    {/* Fallback: Try Clearbit logo API if no logo from job API */}
                    {!getCompanyLogo() && getCompanyName() && (
                      <img
                        src={`https://logo.clearbit.com/${encodeURIComponent(
                          getCompanyName()
                        )}`}
                        alt={`${getCompanyName()} logo`}
                        className="w-20 h-20 rounded-full object-cover border border-gray-200"
                        loading="lazy"
                        style={{ display: getCompanyLogo() ? "none" : "block" }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.style.display = "none";
                          // Show default icon fallback
                          const iconFallback =
                            target.parentElement?.querySelector(
                              ".logo-fallback"
                            ) as HTMLElement;
                          if (iconFallback) {
                            iconFallback.style.display = "flex";
                          }
                        }}
                      />
                    )}
                    {/* Default icon fallback */}
                    <div
                      className="w-20 h-20 rounded-full bg-breneo-accent flex items-center justify-center logo-fallback"
                      style={{ display: getCompanyLogo() ? "none" : "flex" }}
                    >
                      <Briefcase className="h-10 w-10 text-white" />
                    </div>
                  </div>

                  {/* Job Info */}
                  <div className="flex-1 min-w-0">
                    <h1 className="text-3xl font-bold mb-2">{getJobTitle()}</h1>
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                      {getCompanyName() && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Building2 className="h-4 w-4" />
                          <span>{getCompanyName()}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <MapPin className="h-4 w-4" />
                        <span>{getLocation()}</span>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        <DollarSign className="h-3 w-3" />
                        {formatSalary()}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        <Clock className="h-3 w-3" />
                        {getEmploymentType()}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        <Briefcase className="h-3 w-3" />
                        {getWorkArrangement()}
                      </Badge>
                      {jobDetail.date_posted || jobDetail.posted_date ? (
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          <Calendar className="h-3 w-3" />
                          Posted:{" "}
                          {formatDate(
                            jobDetail.date_posted || jobDetail.posted_date
                          ) ||
                            jobDetail.date_posted ||
                            jobDetail.posted_date}
                        </Badge>
                      ) : null}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                      {getApplyUrl() ? (
                        <Button
                          onClick={() => window.open(getApplyUrl(), "_blank")}
                          className="flex items-center gap-2 bg-breneo-accent hover:bg-breneo-accent/90 text-white"
                          size="lg"
                        >
                          Apply Now
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          disabled
                          variant="outline"
                          className="flex items-center gap-2"
                          size="lg"
                        >
                          Apply Link Not Available
                        </Button>
                      )}
                      {user && (
                        <Button
                          variant="outline"
                          onClick={() => saveJobMutation.mutate()}
                          disabled={saveJobMutation.isPending}
                          className="flex items-center gap-2"
                          size="lg"
                        >
                          <Bookmark
                            className={`h-4 w-4 ${
                              isSaved ? "fill-current" : ""
                            }`}
                          />
                          {isSaved ? "Saved" : "Save Job"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Company Information Card */}
            {(getCompanyName() ||
              getCompanyWebsite() ||
              getCompanyDescription() ||
              getCompanySize() ||
              getCompanyIndustry() ||
              getCompanyFounded() ||
              getCompanyHeadquarters()) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {getCompanyName()
                      ? `About ${getCompanyName()}`
                      : "Company Information"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {getCompanyDescription() && (
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {getCompanyDescription()}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    {getCompanyWebsite() && (
                      <div className="flex items-start gap-3">
                        <Globe className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Website
                          </p>
                          <a
                            href={getCompanyWebsite() || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-breneo-accent hover:underline flex items-center gap-1"
                          >
                            {getCompanyWebsite() || ""}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    )}

                    {getCompanySize() && (
                      <div className="flex items-start gap-3">
                        <Users className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Company Size
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {getCompanySize()}
                          </p>
                        </div>
                      </div>
                    )}

                    {getCompanyIndustry() && (
                      <div className="flex items-start gap-3">
                        <Factory className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Industry
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {getCompanyIndustry()}
                          </p>
                        </div>
                      </div>
                    )}

                    {getCompanyFounded() && (
                      <div className="flex items-start gap-3">
                        <CalendarIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Founded
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {getCompanyFounded()}
                          </p>
                        </div>
                      </div>
                    )}

                    {getCompanyHeadquarters() && (
                      <div className="flex items-start gap-3">
                        <Home className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Headquarters
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {getCompanyHeadquarters()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Job Description Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Job Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{
                    __html: getDescription()
                      .toString()
                      .replace(/\n/g, "<br />"),
                  }}
                />
              </CardContent>
            </Card>

            {/* Requirements & Qualifications */}
            {getRequirements() && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Requirements & Qualifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{
                      __html: (getRequirements() || "")
                        .toString()
                        .replace(/\n/g, "<br />"),
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Job Details Grid */}
            {(getRequiredExperience() ||
              getEducationRequired() ||
              getRequiredSkills().length > 0 ||
              getJobCategory() ||
              getApplicationDeadline()) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Job Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                    <div className="mt-6 pt-6 border-t">
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
                </CardContent>
              </Card>
            )}

            {/* Benefits & Perks */}
            {getBenefitsList().length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Benefits & Perks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {getBenefitsList().map((benefit, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
                </CardContent>
              </Card>
            )}
          </div>
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
    </DashboardLayout>
  );
};

export default JobDetailPage;
