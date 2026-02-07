import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RadialProgress } from "@/components/ui/radial-progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { useMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import {
  Heart,
  MoreVertical,
  ChevronRight,
  Clock,
  ChevronLeft,
  GraduationCap,
  Award,
  Play,
  ClipboardCheck,
  Target,
  DollarSign,
  Briefcase,
  Tag,
  MapPin,
} from "lucide-react";
import {
  getUserTestAnswers,
  calculateSkillScores,
  getTopSkills,
} from "@/utils/skillTestUtils";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { jobService, JobFilters, ApiJob } from "@/api/jobs";
// Removed filterATSJobs import - displaying all jobs without filtering
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BetaVersionModal } from "@/components/common/BetaVersionModal";
import {
  calculateMatchPercentage,
  getMatchQualityLabel,
  extractJobSkills,
} from "@/utils/jobMatchUtils";
import { getCompanyLogo } from "@/utils/companyLogoFetcher";

// extractJobSkills is now imported from @/utils/jobMatchUtils

// Function to calculate job relevance score based on user's hard skills
const calculateJobRelevanceScore = (
  job: ApiJob,
  userHardSkills: string[],
): number => {
  // If no user hard skills, return base score
  if (!userHardSkills || userHardSkills.length === 0) {
    return 1;
  }

  // Extract skills from the job
  const jobSkills = extractJobSkills(job);

  // If no skills found in job, return low score (but don't filter out completely)
  if (jobSkills.length === 0) {
    return 0.1;
  }

  // Normalize skills for comparison
  const normalizeSkill = (skill: string) =>
    skill.toLowerCase().trim().replace(/\s+/g, " ");

  const normalizedUserSkills = userHardSkills.map(normalizeSkill);
  const normalizedJobSkills = jobSkills.map(normalizeSkill);

  // Count matching skills
  let matchCount = 0;
  normalizedJobSkills.forEach((jobSkill) => {
    normalizedUserSkills.forEach((userSkill) => {
      // Exact match - highest score
      if (userSkill === jobSkill) {
        matchCount += 2;
      }
      // Partial match - medium score
      else if (jobSkill.includes(userSkill) || userSkill.includes(jobSkill)) {
        matchCount += 1;
      }
    });
  });

  // Calculate relevance score: (matches / total job skills) * (matches / total user skills)
  // This gives higher scores to jobs that match more of the user's skills
  const score =
    matchCount > 0
      ? (matchCount / normalizedJobSkills.length) *
        (matchCount / normalizedUserSkills.length) *
        10
      : 0.1;

  return score;
};

// calculateMatchPercentage is now imported from @/utils/jobMatchUtils

// Function to calculate course match score based on user skills
const calculateCourseMatchScore = (
  course: Course,
  userSkills: string[],
): number => {
  // If no user skills, return base score
  if (!userSkills || userSkills.length === 0) {
    return 0.5; // Neutral score when no skills available
  }

  // If course has no required skills, return low score
  if (!course.required_skills || course.required_skills.length === 0) {
    return 0.3; // Lower score for courses without skill requirements
  }

  // Normalize skills for comparison
  const normalizeSkill = (skill: string) =>
    skill.toLowerCase().trim().replace(/\s+/g, " ");

  const normalizedUserSkills = userSkills.map(normalizeSkill);
  const normalizedCourseSkills = course.required_skills.map(normalizeSkill);

  // Count matching skills
  let matchCount = 0;
  normalizedCourseSkills.forEach((courseSkill) => {
    normalizedUserSkills.forEach((userSkill) => {
      // Exact match - highest score
      if (userSkill === courseSkill) {
        matchCount += 2;
      }
      // Partial match - medium score
      else if (
        courseSkill.includes(userSkill) ||
        userSkill.includes(courseSkill)
      ) {
        matchCount += 1;
      }
    });
  });

  // Calculate match score: (matches / total course skills) * (matches / total user skills)
  // This gives higher scores to courses that match more of the user's skills
  const score =
    matchCount > 0
      ? (matchCount / normalizedCourseSkills.length) *
        (matchCount / normalizedUserSkills.length) *
        10
      : 0.1;

  return score;
};

// Function to check if a job is tech-related (for broader filtering)
const isTechJob = (job: ApiJob): boolean => {
  const textToSearch = [
    job.title || job.job_title || "",
    job.description || job.job_description || "",
    job.job_required_experience || job.required_experience || "",
  ]
    .join(" ")
    .toLowerCase();

  // Tech keywords to identify tech jobs
  const techKeywords = [
    "developer",
    "programmer",
    "engineer",
    "software",
    "coding",
    "programming",
    "javascript",
    "python",
    "java",
    "react",
    "node",
    "sql",
    "database",
    "frontend",
    "backend",
    "full stack",
    "web developer",
    "mobile developer",
    "devops",
    "cloud",
    "aws",
    "azure",
    "docker",
    "kubernetes",
    "api",
    "machine learning",
    "ai",
    "data science",
    "analytics",
    "cybersecurity",
  ];

  return techKeywords.some((keyword) => textToSearch.includes(keyword));
};

// Transformed Job for UI
interface Job {
  id: string;
  title: string;
  company: string | { name?: string } | null;
  company_name?: string;
  location: string;
  date: string;
  logo?: string;
  company_logo?: string;
  salary?: string;
  employment_type?: string;
  work_arrangement?: string;
  is_saved: boolean;
  matchPercentage?: number;
}

interface Course {
  id: string;
  title: string;
  provider: string;
  category: string;
  level: string;
  duration: string;
  image: string;
  is_saved?: boolean;
  required_skills?: string[];
  match?: number;
}

// Fetch jobs from job service API - no filtering
const fetchJobs = async () => {
  try {
    // No filters - fetch all jobs
    const filters: JobFilters = {
      country: "",
      countries: [], // No country filter
      jobTypes: [], // No job type filter
      isRemote: false, // No remote filter
      datePosted: undefined, // No date filter
      skills: [], // No skills filter
    };

    // Fetch jobs using the job service - no filtering
    const response = await jobService.fetchActiveJobs({
      query: "", // No query filter
      filters,
      page: 1,
      pageSize: 50, // Fetch more jobs to have enough for careful filtering and sorting
    });

    return response.jobs || [];
  } catch (error) {
    console.error("Error fetching jobs:", error);
    throw error;
  }
};

const UserHome = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useMobile();
  const t = useTranslation();
  const [userTopSkills, setUserTopSkills] = useState<string[]>([]);
  const [userHardSkills, setUserHardSkills] = useState<string[]>([]); // Only tech/hard skills
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [hasCompletedTest, setHasCompletedTest] = useState(false);
  const jobsScrollRef = useRef<HTMLDivElement>(null);
  const coursesScrollRef = useRef<HTMLDivElement>(null);
  const [isSkillTestPressed, setIsSkillTestPressed] = useState(false);
  const [isSkillPathPressed, setIsSkillPathPressed] = useState(false);
  const [isBetaModalOpen, setIsBetaModalOpen] = useState(false);

  // Fetch user's top skills from skill test results
  useEffect(() => {
    const fetchUserSkills = async () => {
      if (!user) {
        setLoadingSkills(false);
        setHasCompletedTest(false);
        return;
      }

      try {
        setLoadingSkills(true);

        // Method 1: Try Django backend skill test results API (same as ProfilePage)
        try {
          const response = await apiClient.get(
            `/api/skilltest/results/?user=${user.id}`,
          );
          // console.log(
          //   // "🔍 Checking Django API skill test results:",
          //   response.data
          // );

          let skillTestData = null;
          if (Array.isArray(response.data) && response.data.length > 0) {
            skillTestData = response.data[0];
          } else if (response.data && typeof response.data === "object") {
            skillTestData = response.data;
          }

          if (
            skillTestData &&
            (skillTestData.final_role || skillTestData.skills_json)
          ) {
            // console.log("✅ Found skill test results from Django API");
            setHasCompletedTest(true);

            // Extract skills from skills_json
            const skillsJson = skillTestData.skills_json || {};
            const techSkills = Object.keys(skillsJson.tech || {});
            const softSkills = Object.keys(skillsJson.soft || {});
            const allSkills = [...techSkills, ...softSkills];
            setUserTopSkills(allSkills);
            setUserHardSkills(techSkills); // Store only hard/tech skills
            setLoadingSkills(false);
            return;
          }
        } catch (apiError) {
          // console.log(
          //   "Django API endpoint not available, trying other methods..."
          // );
        }

        // Method 2: Try user skills API endpoint
        try {
          const response = await apiClient.get(`/api/user/${user.id}/skills`);
          if (response.data && response.data.skills) {
            const topSkills = response.data.skills.slice(0, 5);
            setUserTopSkills(topSkills);
            // Assume all skills from this endpoint are tech skills
            setUserHardSkills(topSkills);
            setHasCompletedTest(topSkills.length > 0);
            setLoadingSkills(false);
            return;
          }
        } catch (apiError) {
          // console.log(
          //   "User skills API endpoint not available, trying Supabase..."
          // );
        }

        // Method 3: Fallback to Supabase: fetch from usertestanswers
        const answers = await getUserTestAnswers(String(user.id));
        // console.log("🔍 Checking test completion:", {
        //   userId: user.id,
        //   answersCount: answers?.length || 0,
        //   hasAnswers: answers && answers.length > 0,
        // });

        if (answers && answers.length > 0) {
          // console.log("✅ User has completed skill test (from Supabase)");
          setHasCompletedTest(true);
          const skillScores = calculateSkillScores(answers);
          const topSkillsData = getTopSkills(skillScores, 20); // Increase limit for better matching
          const topSkills = topSkillsData.map((s) => s.skill);
          setUserTopSkills(topSkills);
          // For Supabase, we'll filter to tech skills by checking against known tech skill keywords
          // This is a fallback - ideally we'd have tech/soft separation in the data
          const techSkillKeywords = [
            "javascript",
            "python",
            "java",
            "c++",
            "c#",
            "go",
            "rust",
            "php",
            "ruby",
            "swift",
            "kotlin",
            "typescript",
            "html",
            "css",
            "sql",
            "react",
            "vue",
            "angular",
            "node.js",
            "express",
            "django",
            "flask",
            "spring",
            "laravel",
            "rails",
            "git",
            "docker",
            "kubernetes",
            "aws",
            "azure",
            "gcp",
            "linux",
            "machine learning",
            "data science",
            "ai",
            "blockchain",
            "devops",
            "testing",
          ];
          const hardSkills = topSkills.filter((skill) =>
            techSkillKeywords.some(
              (keyword) =>
                skill.toLowerCase().includes(keyword.toLowerCase()) ||
                keyword.toLowerCase().includes(skill.toLowerCase()),
            ),
          );
          setUserHardSkills(hardSkills.length > 0 ? hardSkills : topSkills); // Fallback to all if no match
        } else {
          // console.log("❌ User has not completed skill test");
          setHasCompletedTest(false);
        }
      } catch (error) {
        console.error("Error fetching user skills:", error);
        setHasCompletedTest(false);
      } finally {
        setLoadingSkills(false);
      }
    };

    fetchUserSkills();
  }, [user]);

  // Open beta modal when component mounts
  useEffect(() => {
    setIsBetaModalOpen(true);
  }, []);

  // Fetch saved jobs
  const { data: savedJobs = [] } = useQuery<string[]>({
    queryKey: ["savedJobs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const profileResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
        const savedJobsArray = profileResponse.data?.saved_jobs || [];

        // Handle both array of IDs and array of objects
        if (!Array.isArray(savedJobsArray)) return [];

        return savedJobsArray
          .map((item: unknown) => {
            // If it's already a string or number, convert to string
            if (typeof item === "string" || typeof item === "number") {
              return String(item);
            }
            // If it's an object, try to extract the ID
            if (item && typeof item === "object") {
              const obj = item as Record<string, unknown>;
              // Try common ID field names
              if (obj.id) return String(obj.id);
              if (obj.job_id) return String(obj.job_id);
              if (obj.jobId) return String(obj.jobId);
            }
            return null;
          })
          .filter((id): id is string => id !== null);
      } catch (error) {
        console.error("Error fetching saved jobs:", error);
        return [];
      }
    },
    enabled: !!user,
  });

  // Fetch saved course IDs (for checking if courses are saved in the regular courses section)
  const { data: savedCourseIds = [] } = useQuery<string[]>({
    queryKey: ["savedCourseIds", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const profileResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
        const savedCoursesArray = profileResponse.data?.saved_courses || [];

        if (!Array.isArray(savedCoursesArray)) return [];

        return savedCoursesArray
          .map((item: unknown) => {
            if (typeof item === "string" || typeof item === "number") {
              return String(item);
            }
            if (item && typeof item === "object") {
              const obj = item as Record<string, unknown>;
              if (obj.id) return String(obj.id);
              if (obj.course_id) return String(obj.course_id);
              if (obj.courseId) return String(obj.courseId);
            }
            return null;
          })
          .filter((id): id is string => id !== null);
      } catch (error) {
        console.error("Error fetching saved course IDs:", error);
        return [];
      }
    },
    enabled: !!user,
  });

  // Fetch jobs - no filtering
  const {
    data: jobs = [],
    isLoading: jobsLoading,
    error: jobsError,
  } = useQuery({
    queryKey: ["home-jobs"],
    queryFn: () => fetchJobs(),
    enabled: !!user, // Fetch when user is available
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Handle jobs error
  useEffect(() => {
    if (jobsError) {
      console.error("Error fetching jobs:", jobsError);
    }
  }, [jobsError]);

  // Save/unsave job mutation (uses backend save-job endpoint)
  const saveJobMutation = useMutation({
    mutationFn: async (job: Job) => {
      if (!user) throw new Error("User not logged in");
      if (!job.id) throw new Error("Job ID is required");

      const jobId = String(job.id);
      const isSaved = job.is_saved;

      try {
        const endpoint = `${API_ENDPOINTS.JOBS.SAVE_JOB}${jobId}/`;

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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["savedJobs", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success(variables.is_saved ? "Job Unsaved" : "Job Saved");
    },
    onError: (error: Error) => {
      console.error("Error saving job:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save job";
      toast.error(errorMessage);
    },
  });

  // Fetch courses
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["home-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching courses:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!user && !loadingSkills, // Wait for skills to load
  });

  // Filter and sort courses based on user skills
  const filteredCourses: Course[] = useMemo(() => {
    if (!courses || courses.length === 0) {
      return [];
    }

    // If user has no skills, show all courses (sorted by created_at)
    if (!userTopSkills || userTopSkills.length === 0) {
      return courses.map((course) => ({
        ...course,
        match: 0.5, // Neutral match score
      }));
    }

    // Calculate match scores for each course
    const coursesWithScores = courses.map((course) => ({
      ...course,
      match: calculateCourseMatchScore(course, userTopSkills),
    }));

    // Sort by match score (highest first), then by created_at (newest first)
    coursesWithScores.sort((a, b) => {
      // First sort by match score
      if (Math.abs((a.match || 0) - (b.match || 0)) > 0.1) {
        return (b.match || 0) - (a.match || 0);
      }
      // If scores are similar, prioritize courses with required_skills
      const aHasSkills = a.required_skills && a.required_skills.length > 0;
      const bHasSkills = b.required_skills && b.required_skills.length > 0;
      if (aHasSkills && !bHasSkills) return -1;
      if (!aHasSkills && bHasSkills) return 1;
      // Finally, sort by created_at (newest first)
      return 0;
    });

    // Return top courses (prioritize those with matches, but show some variety)
    // Show courses with match score > 0.1 first, then fill with others
    const matchedCourses = coursesWithScores.filter(
      (c) => (c.match || 0) > 0.1,
    );
    const otherCourses = coursesWithScores.filter((c) => (c.match || 0) <= 0.1);

    // Combine: matched courses first, then others (up to 20 total)
    return [...matchedCourses, ...otherCourses].slice(0, 20);
  }, [courses, userTopSkills]);

  // Save/unsave course mutation
  const saveCourseMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) {
        throw new Error("Please log in to save courses.");
      }

      await apiClient.post(`/api/save-course/${id}/`);
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({
        queryKey: ["savedCourseIds", user?.id],
      });

      const previousSavedCourseIds = queryClient.getQueryData<string[]>([
        "savedCourseIds",
        user?.id,
      ]);

      let wasSaved = false;
      queryClient.setQueryData<string[]>(
        ["savedCourseIds", user?.id],
        (prev) => {
          if (!prev) return prev;
          const idString = String(id);
          wasSaved = prev.includes(idString);
          return wasSaved
            ? prev.filter((c) => c !== idString)
            : [...prev, idString];
        },
      );

      return { previousSavedCourseIds, wasSaved };
    },
    onError: (error, id, context) => {
      if (context?.previousSavedCourseIds && user?.id) {
        queryClient.setQueryData(
          ["savedCourseIds", user.id],
          context.previousSavedCourseIds,
        );
      }

      console.error("Error updating saved courses:", error);
      toast.error("Failed to update saved courses. Please try again.");
    },
    onSuccess: (_, id, context) => {
      queryClient.invalidateQueries({ queryKey: ["savedCourseIds", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["home-courses"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });

      const wasSaved = context?.wasSaved ?? false;
      toast.success(
        wasSaved
          ? "Removed from saved courses."
          : "Course saved to your profile.",
      );
    },
  });

  // Transform jobs - handle empty or undefined arrays
  // Sort by match percentage (highest first), then take top 9
  const transformedJobs: Job[] = useMemo(() => {
    // No filtering - display all jobs
    const filteredJobs = jobs || [];

    // Transform all jobs first to calculate match percentages
    const jobsWithMatchPercentage = filteredJobs.map((job: ApiJob) => {
      const jobSkills = extractJobSkills(job);
      const jobTitle = job.title || job.job_title || job.position || "";
      const matchPercentage = calculateMatchPercentage(
        userTopSkills,
        jobSkills,
        jobTitle,
      );
      return { job, matchPercentage };
    });

    // Sort by match percentage (highest first), then by date as tiebreaker
    jobsWithMatchPercentage.sort((a, b) => {
      // First, sort by match percentage (highest first)
      if (a.matchPercentage !== b.matchPercentage) {
        return b.matchPercentage - a.matchPercentage;
      }

      // If match percentages are equal, sort by date (newest first)
      const dateA =
        a.job.posted_at || a.job.fetched_at || a.job.date_posted || "";
      const dateB =
        b.job.posted_at || b.job.fetched_at || b.job.date_posted || "";

      if (dateA && dateB) {
        try {
          const timeA = new Date(dateA as string).getTime();
          const timeB = new Date(dateB as string).getTime();
          return timeB - timeA; // Newest first
        } catch (e) {
          return 0;
        }
      }

      return 0;
    });

    // Step 3: Take top 9 jobs with highest match percentage
    const topJobs = jobsWithMatchPercentage.slice(0, 9).map((item) => item.job);

    return topJobs
      .map((job: ApiJob) => {
        // Extract job ID - use only id field (not job_id or external_job_id)
        const jobId = job.id || "";
        if (!jobId) {
          console.warn("Skipping job without valid ID:", job);
          return null;
        }

        // Extract job title - check all possible fields
        const jobTitle =
          job.title || job.job_title || job.position || "Untitled Position";

        // Extract company name - check all possible fields
        const companyName =
          job.company_name ||
          job.employer_name ||
          (typeof job.company === "string" ? job.company : null) ||
          "Unknown Company";

        // Extract location - check all possible fields
        const jobCity = job.job_city || job.city || "";
        const jobState = job.job_state || job.state || "";
        const jobCountry = job.job_country || job.country || "";
        const location =
          job.job_location ||
          job.location ||
          [jobCity, jobState, jobCountry].filter(Boolean).join(", ") ||
          "Location not specified";

        // Extract logo - check all possible fields
        const logo =
          job.employer_logo ||
          job.company_logo ||
          job.logo_url ||
          (typeof job.company === "object" && job.company
            ? (job.company as { logo?: string; company_logo?: string }).logo ||
              (job.company as { company_logo?: string }).company_logo
            : undefined);

        // Extract date posted - new API uses posted_at or fetched_at
        const postedDate =
          job.posted_at ||
          job.fetched_at ||
          job.date_posted ||
          job.posted_date ||
          job.job_posted_at_datetime_utc ||
          undefined;

        // Format salary
        let salary = "By agreement";
        const minSalary = job.job_min_salary || job.min_salary;
        const maxSalary = job.job_max_salary || job.max_salary;
        const salaryCurrency =
          job.job_salary_currency || job.salary_currency || "$";
        const salaryPeriod =
          job.job_salary_period || job.salary_period || "yearly";

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
        } else if (job.salary && typeof job.salary === "string") {
          salary = job.salary;
        }

        // Format employment type
        const employmentTypeRaw =
          job.job_employment_type ||
          job.employment_type ||
          job.type ||
          "FULLTIME";
        const jobTypeLabels: Record<string, string> = {
          FULLTIME: "Full time",
          PARTTIME: "Part time",
          CONTRACTOR: "Contract",
          INTERN: "Internship",
        };
        const employmentType =
          jobTypeLabels[employmentTypeRaw] || employmentTypeRaw || "Full time";

        // Determine work arrangement
        let workArrangement = "On-site";
        const isRemote =
          job.job_is_remote || job.is_remote || job.remote === true;
        if (isRemote) {
          workArrangement = "Remote";
        } else if (jobTitle?.toLowerCase().includes("hybrid")) {
          workArrangement = "Hybrid";
        }

        // Calculate skill-based match percentage using all user top skills
        const jobSkills = extractJobSkills(job);
        const matchPercentage = calculateMatchPercentage(
          userTopSkills,
          jobSkills,
          jobTitle,
        );

        const transformedJob: Job = {
          id: jobId,
          title: jobTitle,
          company: companyName,
          company_name: companyName,
          location:
            typeof location === "string" ? location : "Location not specified",
          logo,
          company_logo: logo,
          salary,
          employment_type: employmentType,
          work_arrangement: workArrangement,
          is_saved: savedJobs?.includes(String(jobId)),
          matchPercentage,
          date: postedDate
            ? new Date(String(postedDate)).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : new Date().toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }),
        };
        return transformedJob;
      })
      .filter((job): job is Job => job !== null); // Filter out null jobs (already limited to 9 above)
  }, [jobs, savedJobs, userTopSkills]);

  // State to store fetched logos
  const [jobLogos, setJobLogos] = useState<Record<string, string>>({});

  // Fetch missing company logos from API
  useEffect(() => {
    const fetchMissingLogos = async () => {
      const jobsNeedingLogos = transformedJobs.filter(
        (job) => !job.company_logo && job.company_name,
      );

      if (jobsNeedingLogos.length === 0) return;

      // Fetch logos for jobs without them
      const logoPromises = jobsNeedingLogos.map(async (job) => {
        const logo = await getCompanyLogo(job.company_name || "", undefined);
        return { jobId: job.id, logo };
      });

      const logoResults = await Promise.all(logoPromises);
      const newLogos: Record<string, string> = {};

      logoResults.forEach(({ jobId, logo }) => {
        if (logo) {
          newLogos[jobId] = logo;
        }
      });

      if (Object.keys(newLogos).length > 0) {
        setJobLogos((prev) => ({ ...prev, ...newLogos }));
      }
    };

    fetchMissingLogos();
  }, [transformedJobs]);

  // Display up to 9 jobs (already sorted by match percentage)
  // Merge fetched logos into jobs
  const displayJobs = transformedJobs.map((job) => ({
    ...job,
    company_logo: job.company_logo || jobLogos[job.id] || undefined,
  }));

  // Scroll functions for jobs
  const scrollJobs = (direction: "left" | "right") => {
    if (jobsScrollRef.current) {
      const scrollAmount = 400; // Scroll by approximately one card width + gap
      const scrollPosition =
        direction === "left"
          ? jobsScrollRef.current.scrollLeft - scrollAmount
          : jobsScrollRef.current.scrollLeft + scrollAmount;

      jobsScrollRef.current.scrollTo({
        left: scrollPosition,
        behavior: "smooth",
      });
    }
  };

  // Scroll functions for courses
  const scrollCourses = (direction: "left" | "right") => {
    if (coursesScrollRef.current) {
      const scrollAmount = 400;
      const scrollPosition =
        direction === "left"
          ? coursesScrollRef.current.scrollLeft - scrollAmount
          : coursesScrollRef.current.scrollLeft + scrollAmount;

      coursesScrollRef.current.scrollTo({
        left: scrollPosition,
        behavior: "smooth",
      });
    }
  };

  // Debug logging
  // console.log("🏠 UserHome render:", {
  //   user: !!user,
  //   userId: user?.id,
  //   loadingSkills,
  //   hasCompletedTest,
  //   jobsCount: displayJobs.length,
  //   coursesCount: courses.length,
  // });

  // Show loading state if auth is still loading
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto pt-2 pb-20 md:pb-6 px-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-breneo-blue mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // If user is not available, show a message (shouldn't happen due to ProtectedRoute, but safety check)
  if (!user) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto pt-2 pb-20 md:pb-6 px-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-gray-600">
                Please wait while we load your dashboard...
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <BetaVersionModal />
      {/* Mobile Welcome Message */}
      {isMobile && (
        <div className="mb-4 px-4 md:hidden">
          <h1 className="text-xl font-semibold text-foreground">
            {t.auth.welcome},{" "}
            <span className="font-bold">
              {user?.first_name || user?.email?.split("@")[0] || "User"}
            </span>
            ! 👋🏻
          </h1>
        </div>
      )}
      <div className="max-w-7xl mx-auto pt-2 pb-20 md:pb-6 px-2 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Top Section - Widgets */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Skill Test CTA Widget - Only show if user hasn't completed the test */}
            {!hasCompletedTest && !loadingSkills && (
              <Card
                className="bg-white transition-all w-auto flex-shrink-0 max-w-sm md:max-w-md rounded-3xl border-0 animate-shrink-in hover:shadow-soft transition-shadow cursor-pointer"
                style={{
                  boxShadow: "0 6px 20px 0 rgba(0, 0, 0, 0.04)",
                  transform: isSkillTestPressed ? "scale(0.95)" : "scale(1)",
                  transition: "transform 0.1s ease-in-out",
                }}
                onMouseDown={() => setIsSkillTestPressed(true)}
                onMouseUp={() => setIsSkillTestPressed(false)}
                onMouseLeave={() => setIsSkillTestPressed(false)}
                onTouchStart={() => setIsSkillTestPressed(true)}
                onTouchEnd={() => setIsSkillTestPressed(false)}
              >
                <CardContent className="p-4 md:p-4">
                  <Link to="/skill-test" className="block cursor-pointer group">
                    <div className="flex items-center gap-3 md:gap-4">
                      {/* Left side - Content */}
                      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                        <h3 className="font-bold text-lg md:text-xl text-gray-900 group-hover:text-breneo-blue transition-colors leading-tight line-clamp-2 min-h-[3rem]">
                          {t.home.skillTestTitle}
                        </h3>
                        <p className="text-sm md:text-sm text-gray-900">
                          {t.home.skillTestSubtitle}
                        </p>
                      </div>

                      {/* Right side - Illustration / Icon */}
                      <div className="flex-shrink-0 w-28 h-28 md:w-32 md:h-32 flex items-center justify-center">
                        <img
                          src="/lovable-uploads/3dicons-target-front-color.png"
                          alt="Skill test target"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Skill Path CTA Widget - Only show if user has completed the test */}
            {hasCompletedTest && !loadingSkills && (
              <Card
                className="bg-white transition-all w-auto flex-shrink-0 max-w-sm md:max-w-md rounded-3xl border-0 animate-shrink-in hover:shadow-soft transition-shadow cursor-pointer"
                style={{
                  boxShadow: "0 6px 20px 0 rgba(0, 0, 0, 0.04)",
                  transform: isSkillPathPressed ? "scale(0.95)" : "scale(1)",
                  transition: "transform 0.1s ease-in-out",
                }}
                onMouseDown={() => setIsSkillPathPressed(true)}
                onMouseUp={() => setIsSkillPathPressed(false)}
                onMouseLeave={() => setIsSkillPathPressed(false)}
                onTouchStart={() => setIsSkillPathPressed(true)}
                onTouchEnd={() => setIsSkillPathPressed(false)}
              >
                <CardContent className="p-4 md:p-4 flex items-center justify-center md:block">
                  <Link to="/skill-path" className="block cursor-pointer group">
                    <div className="flex items-center gap-3 md:gap-4">
                      {/* Left side - Content */}
                      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                        <h3 className="font-bold text-lg md:text-xl text-gray-900 group-hover:text-breneo-blue transition-colors leading-tight line-clamp-2 min-h-[3rem]">
                          {t.home.skillPathTitle}
                        </h3>
                        <p className="text-sm md:text-sm text-gray-900">
                          {t.home.skillPathSubtitle}
                        </p>
                      </div>

                      {/* Right side - Illustration */}
                      <div className="flex-shrink-0 w-28 h-28 md:w-32 md:h-32 flex items-center justify-center">
                        <img
                          src="/lovable-uploads/3dicons-explorer-front-color.png"
                          alt="Coding A Website"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content - Top Jobs and Courses */}
          <div className="space-y-6 pt-6 md:pt-8">
            {/* Top Job Picks Section */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 mb-1">
                  Top job picks for you
                </h2>
                {!jobsLoading && !jobsError && displayJobs.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => scrollJobs("left")}
                      aria-label="Scroll left"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => scrollJobs("right")}
                      aria-label="Scroll right"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {jobsLoading ? (
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                  {[...Array(3)].map((_, i) => (
                    <Card
                      key={i}
                      className="relative flex-shrink-0 snap-start w-[calc((100%-2rem)/3)] min-w-[280px]"
                    >
                      <CardContent className="p-4">
                        <Skeleton className="h-4 w-20 mb-2" />
                        <Skeleton className="h-6 w-3/4 mb-4" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : jobsError ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-500 mb-2">
                      Unable to load jobs at the moment.
                    </p>
                    <p className="text-sm text-gray-400">
                      Please try again later.
                    </p>
                  </CardContent>
                </Card>
              ) : displayJobs.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-500">
                      No jobs found. Try adjusting your search criteria.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div
                  ref={jobsScrollRef}
                  className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-2 px-2"
                >
                  {displayJobs.map((job) => (
                    <Card
                      key={job.id}
                      className="group flex flex-col transition-all duration-200 overflow-hidden rounded-3xl flex-shrink-0 snap-start cursor-pointer w-[calc((100%-2rem)/3)] min-w-[280px] hover:shadow-soft"
                      onClick={() => {
                        if (!job.id || String(job.id).trim() === "") return;
                        const encodedId = encodeURIComponent(String(job.id));
                        navigate(`/jobs/${encodedId}`);
                      }}
                    >
                      <CardContent className="px-5 pt-5 pb-4 flex flex-col flex-grow">
                        {/* Company Logo and Info – copied from JobsPage */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-shrink-0 relative w-10 h-10">
                            {job.company_logo ? (
                              <img
                                src={job.company_logo}
                                alt={`${
                                  job.company_name ||
                                  (typeof job.company === "string"
                                    ? job.company
                                    : job.company?.name || "Company")
                                } logo`}
                                className="w-10 h-10 rounded-md object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-md bg-breneo-accent flex items-center justify-center">
                                <Briefcase className="h-5 w-5 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">
                              {job.company_name ||
                                (typeof job.company === "string"
                                  ? job.company
                                  : job.company?.name || "Company")}
                            </h3>
                            <p className="mt-0.5 text-xs text-gray-500 truncate">
                              {job.location}
                            </p>
                          </div>
                        </div>

                        {/* Job Title */}
                        <h4 className="font-bold text-base mb-2 line-clamp-2 min-h-[2.5rem]">
                          {job.title}
                        </h4>

                        {/* Job Details as chips (without salary) – same style as JobsPage */}
                        <div className="mt-1 flex flex-wrap gap-2">
                          {job.employment_type && (
                            <Badge className="rounded-[10px] px-3 py-1 text-[13px] font-medium bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100">
                              {job.employment_type}
                            </Badge>
                          )}
                          {job.work_arrangement && (
                            <Badge className="rounded-[10px] px-3 py-1 text-[13px] font-medium bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100">
                              {job.work_arrangement}
                            </Badge>
                          )}
                        </div>

                        {/* Match percentage & Save button – exactly like JobsPage remote jobs */}
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
                            <span className="text-xs font-semibold text-gray-700">
                              {job.matchPercentage !== undefined
                                ? job.matchPercentage >= 85
                                  ? "Best match"
                                  : job.matchPercentage >= 70
                                    ? "Good match"
                                    : job.matchPercentage >= 50
                                      ? "Fair match"
                                      : "Poor match"
                                : ""}
                            </span>
                          </div>
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveJobMutation.mutate(job);
                            }}
                            aria-label={
                              job.is_saved ? "Unsave job" : "Save job"
                            }
                            className={cn(
                              "bg-[#E6E7EB] hover:bg-[#E6E7EB]/90 dark:bg-[#3A3A3A] dark:hover:bg-[#4A4A4A] h-10 w-10",
                              job.is_saved
                                ? "text-red-500 bg-red-50 hover:bg-red-50/90 dark:bg-red-900/40 dark:hover:bg-red-900/60"
                                : "text-black dark:text-white",
                            )}
                          >
                            <Heart
                              className={cn(
                                "h-4 w-4 transition-colors",
                                job.is_saved
                                  ? "text-red-500 fill-red-500 animate-heart-pop"
                                  : "text-black dark:text-white",
                              )}
                            />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Top Courses Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {/* <GraduationCap className="h-6 w-6 text-breneo-blue" /> */}
                  <h2 className="text-lg font-bold text-gray-900">
                    Top courses picked for you
                  </h2>
                </div>
                {!coursesLoading && filteredCourses.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => scrollCourses("left")}
                      aria-label="Scroll courses left"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => scrollCourses("right")}
                      aria-label="Scroll courses right"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {coursesLoading ? (
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-2 px-2">
                  {[...Array(3)].map((_, i) => (
                    <Card
                      key={i}
                      className="relative flex-shrink-0 snap-start w-[calc((100%-2rem)/3)] min-w-[280px]"
                    >
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
              ) : filteredCourses.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">
                      No courses available at the moment.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div
                  ref={coursesScrollRef}
                  className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-2 px-2"
                >
                  {filteredCourses.map((course) => {
                    const isCourseSaved = savedCourseIds.includes(
                      String(course.id),
                    );
                    return (
                      <Link
                        key={course.id}
                        to={`/course/${course.id}`}
                        className="flex-shrink-0 snap-start w-[calc((100%-2rem)/3)] min-w-[280px] block"
                      >
                        <Card className="relative transition-all duration-200 cursor-pointer group rounded-3xl w-full flex flex-col hover:shadow-soft">
                          <CardContent className="p-0 overflow-hidden rounded-3xl flex flex-col flex-grow relative">
                            <div className="relative w-full h-40 overflow-hidden rounded-t-3xl isolate">
                              <img
                                src={course.image || "/placeholder.svg"}
                                alt={course.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 origin-center"
                                style={{ transformOrigin: "center center" }}
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

                              <div className="flex items-center justify-between gap-3 mt-auto flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {course.duration && (
                                    <Badge className="rounded-[10px] px-3 py-1 text-[13px] font-medium bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100">
                                      {course.duration}
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
                                  aria-label={
                                    isCourseSaved
                                      ? "Unsave course"
                                      : "Save course"
                                  }
                                  className={cn(
                                    "bg-[#E6E7EB] hover:bg-[#E6E7EB]/90 dark:bg-[#3A3A3A] dark:hover:bg-[#4A4A4A] h-10 w-10 flex-shrink-0",
                                    isCourseSaved
                                      ? "text-red-500 bg-red-50 hover:bg-red-50/90 dark:bg-red-900/40 dark:hover:bg-red-900/60"
                                      : "text-black dark:text-white",
                                  )}
                                >
                                  <Heart
                                    className={cn(
                                      "h-4 w-4 transition-colors",
                                      isCourseSaved
                                        ? "text-red-500 fill-red-500 animate-heart-pop"
                                        : "text-black dark:text-white",
                                    )}
                                  />
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
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserHome;
