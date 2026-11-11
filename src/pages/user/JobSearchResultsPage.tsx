import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadialProgress } from "@/components/ui/radial-progress";
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  Search,
  Bookmark,
  MapPin,
  Clock,
  Briefcase,
  Tag,
  Loader2,
  ChevronDown,
  SlidersHorizontal,
  ExternalLink,
  X,
} from "@/components/icons";
import { toast } from "sonner";
import { JobFilterModal } from "@/components/jobs/JobFilterModal";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { JobListingMetaBadges } from "@/components/jobs/JobListingMetaBadges";
import { CompanyNameLink } from "@/components/jobs/CompanyNameLink";
import {
  JOB_ROLE_CATEGORIES,
  JobSearchPreferenceChips,
} from "@/components/jobs/JobSearchPreferenceChips";
import { profileApi } from "@/api/profile";
import {
  matchJobDetailToUser,
  buildUserMatchProfileFromSkillTest,
  normalizeSkillName,
} from "@/services/matching";
import type { JobDetail } from "@/api/jobs/types";
import { useMobile } from "@/hooks/use-mobile";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { georgianCityLabelById } from "@/data/georgian-cities";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import {
  getUserTestAnswers,
  calculateSkillScores,
  getTopSkills,
  filterHardSkills,
} from "@/utils/skillTestUtils";
import { jobService, JobFilters, ApiJob, JobSearchSort } from "@/api/jobs";

function filtersFromSearchParams(searchParams: URLSearchParams): JobFilters {
  const countriesParam = searchParams.get("countries");
  const skillsParam = searchParams.get("skills");
  const jobTypesParam = searchParams.get("jobTypes");
  const isRemoteParam = searchParams.get("isRemote");
  const datePostedParam = searchParams.get("datePosted");
  const salaryMinParam = searchParams.get("salaryMin");
  const salaryMaxParam = searchParams.get("salaryMax");
  const salaryByAgreementParam = searchParams.get("salaryByAgreement");
  const roleCategoryParam = searchParams.get("roleCategory");
  const seniorityParam = searchParams.get("seniority");

  return {
    country: "Georgia",
    countries: countriesParam ? countriesParam.split(",").filter(Boolean) : [],
    jobTypes: jobTypesParam ? jobTypesParam.split(",").filter(Boolean) : [],
    isRemote: isRemoteParam === "true",
    datePosted: datePostedParam || undefined,
    skills: skillsParam ? skillsParam.split(",").filter(Boolean) : [],
    salaryMin: salaryMinParam ? parseInt(salaryMinParam, 10) : undefined,
    salaryMax: salaryMaxParam ? parseInt(salaryMaxParam, 10) : undefined,
    salaryByAgreement: salaryByAgreementParam === "true",
    roleCategory: roleCategoryParam
      ? roleCategoryParam.split(",").filter(Boolean)
      : [],
    seniority: seniorityParam ? seniorityParam.split(",").filter(Boolean) : [],
  };
}
import { useLanguage, useTranslation } from "@/contexts/LanguageContext";
// Removed filterTechJobs and filterATSJobs imports - displaying all jobs without filtering
import { cn } from "@/lib/utils";
import { PLATFORM_FILTER_CHIP_CLASS } from "@/lib/chipStyles";
import {
  getMatchQualityLabel,
  extractJobSkills,
  jobDataMatchesSelectedCountries,
} from "@/utils/jobMatchUtils";
import {
  extractJobSalaryMidpoint,
  formatJobSalaryDisplay,
  formatSalaryFilterLabel,
} from "@/utils/jobSalaryFormat";
import {
  resolveJobEmploymentType,
  resolveJobWorkArrangement,
} from "@/utils/jobEmploymentDisplay";

interface Job {
  id: string;
  title: string;
  company: string;
  company_name?: string;
  location: string;
  url: string;
  company_logo?: string;
  is_saved: boolean;
  salary?: string;
  employment_type?: string;
  work_arrangement?: string;
  benefits?: string;
  matchPercentage?: number;
  datePosted?: string;
  salaryAmount?: number | null;
  jobSkills?: string[];
}

type ResultSort = "relevance" | "date" | "salary_high" | "salary_low";

const RESULT_SORTS: ResultSort[] = [
  "relevance",
  "date",
  "salary_high",
  "salary_low",
];

const POSTED_WITHIN = ["all", "month", "week", "3days", "day"] as const;
type PostedWithin = (typeof POSTED_WITHIN)[number];

function postedWithinMs(value: string | undefined): number | null {
  if (!value || value === "all") return null;
  if (value === "month") return 30 * 24 * 60 * 60 * 1000;
  if (value === "week") return 7 * 24 * 60 * 60 * 1000;
  if (value === "3days") return 3 * 24 * 60 * 60 * 1000;
  if (value === "day" || value === "today") return 24 * 60 * 60 * 1000;
  return null;
}

function ResultOptionMenu({
  label,
  options,
  value,
  active,
  modal,
  onChange,
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  active: boolean;
  modal: boolean;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || modal) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, modal]);

  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  const optionsList = (
    <div className={modal ? "space-y-2 px-4 pb-6" : undefined}>
      {options.map((option) => (
        <div
          key={option.id}
          role="button"
          tabIndex={0}
          onClick={() => choose(option.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              choose(option.id);
            }
          }}
          className={
            modal
              ? "flex min-h-[52px] cursor-pointer items-center gap-3 rounded-[14px] px-3 py-3.5 text-gray-900 hover:bg-[#e4e4e4] dark:text-gray-100 dark:hover:bg-[#3a3a3a]"
              : "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-gray-900 hover:bg-[#e4e4e4] dark:text-gray-100 dark:hover:bg-[#3a3a3a]"
          }
        >
          <Checkbox
            checked={value === option.id}
            className={
              modal
                ? "pointer-events-none h-6 w-6 shrink-0 rounded-[8px] border-[#e4e4e4] bg-white dark:border-[#3a3a3a] dark:bg-[#2c2c2c] data-[state=checked]:border-breneo-blue data-[state=checked]:bg-breneo-blue"
                : "pointer-events-none h-5 w-5 shrink-0 rounded-[4px] border-[#e4e4e4] bg-white dark:border-[#3a3a3a] dark:bg-[#2c2c2c] data-[state=checked]:border-breneo-blue data-[state=checked]:bg-breneo-blue"
            }
          />
          <span className="min-w-0 flex-1 truncate text-sm">{option.label}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex max-w-[220px] items-center gap-1.5 rounded-[14px] px-4 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-breneo-blue/10 text-breneo-blue"
            : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-[#3A3A3A] dark:text-gray-200 dark:hover:bg-[#444]",
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {modal ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="bg-background">
            <DrawerHeader>
              <DrawerTitle>{label}</DrawerTitle>
            </DrawerHeader>
            {optionsList}
          </DrawerContent>
        </Drawer>
      ) : (
        open && (
          <div className="absolute right-0 top-full z-50 mt-2 w-[min(280px,calc(100vw-2rem))] rounded-[24px] border border-[#e4e4e4] bg-white p-2 shadow-xl dark:border-[#3a3a3a] dark:bg-[#242424]">
            {optionsList}
          </div>
        )
      )}
    </div>
  );
}

const jobTypeLabels: Record<string, string> = {
  FULLTIME: "Full Time",
  PARTTIME: "Part Time",
  CONTRACTOR: "Contractor",
  INTERN: "Intern",
};

// extractJobSkills is now imported from @/utils/jobMatchUtils

// calculateMatchPercentage and getMatchQualityLabel are now imported from @/utils/jobMatchUtils

// Generate AI text explaining why user is a good match
const generateMatchExplanation = (
  matchPercentage: number,
  userSkills: string[],
  jobTitle: string,
  jobSkills: string[],
): string => {
  const matchingSkills = userSkills.filter((userSkill) =>
    jobSkills.some((jobSkill) => {
      const normalizedUser = userSkill.toLowerCase().trim();
      const normalizedJob = jobSkill.toLowerCase().trim();
      return (
        normalizedUser === normalizedJob ||
        normalizedUser.includes(normalizedJob) ||
        normalizedJob.includes(normalizedUser)
      );
    }),
  );

  if (matchPercentage >= 80) {
    if (matchingSkills.length > 0) {
      return `Your strong expertise in ${matchingSkills
        .slice(0, 3)
        .join(
          ", ",
        )} aligns perfectly with this ${jobTitle} role. You have the technical foundation to excel in this position.`;
    }
    return `Your skillset demonstrates excellent alignment with this ${jobTitle} position. You're well-positioned to make an immediate impact.`;
  } else if (matchPercentage >= 60) {
    if (matchingSkills.length > 0) {
      return `Your experience with ${matchingSkills[0]} and related technologies provides a solid foundation for this ${jobTitle} role. With your current skills, you can quickly adapt to the requirements.`;
    }
    return `Your background shows good potential for this ${jobTitle} position. Your existing skills provide a strong base for growth in this role.`;
  } else if (matchPercentage >= 40) {
    return `While there's room to expand your skillset, your current experience offers a starting point for this ${jobTitle} role. Consider building on your existing foundation.`;
  } else {
    return `This ${jobTitle} position may require additional skill development, but your willingness to learn and adapt can help bridge the gap.`;
  }
};

const JobSearchResultsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useMobile();
  const [isFilterModalOpen, setFilterModalOpen] = useState(false);
  const [userTopSkills, setUserTopSkills] = useState<string[]>([]);
  const t = useTranslation();
  const { language } = useLanguage();

  const { data: profileSkills = [] } = useQuery({
    queryKey: ["profileSkills", user?.id],
    queryFn: () => profileApi.getMySkills(),
    enabled: !!user,
  });
  const userSkillsForMatch = useMemo(() => {
    const fromProfile = (profileSkills || []).map((s) =>
      normalizeSkillName(s.skill_name),
    );
    const fromTest = (userTopSkills || []).map((s) => normalizeSkillName(s));
    return [...new Set([...fromProfile, ...fromTest])];
  }, [profileSkills, userTopSkills]);

  // Get search term and filters from URL
  const searchTerm = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [activeFilters, setActiveFilters] = useState<JobFilters>(() =>
    filtersFromSearchParams(searchParams),
  );

  // Debug log
  useEffect(() => {
    console.log("🔍 JobSearchResultsPage loaded:", {
      searchTerm,
      page,
      searchParams: searchParams.toString(),
      activeFilters,
      userTopSkills,
    });
    console.log(
      "🌐 Job search API: GET …/api/search (via jobService.fetchActiveJobs)",
    );
  }, [searchTerm, page, searchParams, activeFilters, userTopSkills]);

  const [draftSearch, setDraftSearch] = useState(searchTerm);
  const [pendingFilters, setPendingFilters] = useState<JobFilters>(() =>
    filtersFromSearchParams(searchParams),
  );
  const [tempFilters, setTempFilters] = useState<JobFilters>(activeFilters);

  // Sync applied and pending filters when the URL changes
  useEffect(() => {
    const next = filtersFromSearchParams(searchParams);
    setActiveFilters(next);
    setPendingFilters(next);
    setTempFilters(next);
    setDraftSearch(searchParams.get("search") || "");
  }, [searchParams]);

  // Fetch saved jobs
  const { data: savedJobs = [] } = useQuery<string[]>({
    queryKey: ["savedJobs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const profileResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
        const savedJobsArray = profileResponse.data?.saved_jobs || [];
        return savedJobsArray.map((id: string | number) => String(id));
      } catch (error) {
        console.error("Error fetching saved jobs:", error);
        return [];
      }
    },
    enabled: !!user,
  });

  // Fetch user skills
  useEffect(() => {
    const fetchUserSkills = async () => {
      if (!user) return;
      try {
        try {
          const response = await apiClient.get(
            `/api/skilltest/results/?user=${user.id}`,
          );
          if (
            response.data &&
            Array.isArray(response.data) &&
            response.data.length > 0
          ) {
            const result = response.data[0];
            const skillsJson = result.skills_json;

            // Extract only tech skills for the Interests/Skills filter (not soft skills)
            const techSkills = Object.keys(skillsJson.tech || {});

            setUserTopSkills(techSkills);
            return;
          }
        } catch (apiError) {
          console.log("API endpoint not available, trying Supabase...");
        }

        // Fallback to Supabase: fetch from usertestanswers
        const answers = await getUserTestAnswers(String(user.id));
        if (answers && answers.length > 0) {
          const skillScores = calculateSkillScores(answers);
          const topSkillsData = getTopSkills(skillScores, 20); // Increase limit for better matching
          const topSkills = topSkillsData.map((s) => s.skill);
          const techSkillsOnly = filterHardSkills(topSkills);
          setUserTopSkills(techSkillsOnly);
        }
      } catch (error) {
        console.error("Error fetching user skills:", error);
      }
    };
    fetchUserSkills();
  }, [user]);

  // Fetch jobs (GET /api/search via jobService.fetchActiveJobs)
  const fetchJobs = async (
    searchTerm: string,
    filters: JobFilters,
    page: number,
    userTopSkills: string[],
    sort: JobSearchSort,
  ): Promise<{ jobs: ApiJob[]; hasMore: boolean; total: number }> => {
    try {
      // If all interests are selected, treat as no filter (load all jobs)
      const allInterestsSelected =
        userTopSkills.length > 0 &&
        filters.skills.length > 0 &&
        userTopSkills.every((skill) => filters.skills.includes(skill)) &&
        filters.skills.length === userTopSkills.length;

      // Prepare filters for API call
      const filtersForAPI: JobFilters = {
        ...filters,
        // If all interests selected, clear skills filter to get all jobs
        skills: allInterestsSelected ? [] : filters.skills,
      };

      // Use 20 jobs per page to match API pagination
      const pageSize = 20;

      const response = await jobService.fetchActiveJobs({
        query: searchTerm || "",
        filters: filtersForAPI,
        page,
        pageSize,
        sort,
      });

      if (!response || !Array.isArray(response.jobs)) {
        return { jobs: [], hasMore: false, total: 0 };
      }

      let validJobs = response.jobs.filter((job) => {
        const jobId = String(job.id || "");
        return jobId && jobId.trim() !== "";
      });

      // Apply client-side salary filtering
      if (
        filters.salaryMin !== undefined ||
        filters.salaryMax !== undefined ||
        filters.salaryByAgreement
      ) {
        validJobs = validJobs.filter((job) => {
          const minSalary = job.job_min_salary || job.min_salary;
          const maxSalary = job.job_max_salary || job.max_salary;

          // If "by agreement" is checked, include jobs without salary info
          if (filters.salaryByAgreement && !minSalary && !maxSalary) {
            return true;
          }

          // If no salary info and "by agreement" is not checked, exclude if salary filters are set
          if (!minSalary && !maxSalary && !filters.salaryByAgreement) {
            // If salary filters are set, exclude jobs without salary
            if (
              filters.salaryMin !== undefined ||
              filters.salaryMax !== undefined
            ) {
              return false;
            }
            return true;
          }

          // Check if job salary matches the range
          if (
            filters.salaryMin !== undefined &&
            maxSalary &&
            maxSalary < filters.salaryMin
          ) {
            return false;
          }
          if (
            filters.salaryMax !== undefined &&
            minSalary &&
            minSalary > filters.salaryMax
          ) {
            return false;
          }

          return true;
        });
      }

      if (filters.countries.length > 0) {
        validJobs = validJobs.filter((job) =>
          jobDataMatchesSelectedCountries(filters.countries, { apiJob: job }),
        );
      }

      // Note: Removed redundant client-side remote filtering
      // Backend already handles this via work_mode parameter

      return {
        jobs: validJobs,
        hasMore: response.hasMore ?? false,
        total: response.total ?? validJobs.length,
      };
    } catch (error) {
      console.error("Error fetching jobs:", error);
      throw error;
    }
  };

  const filtersKey = useMemo(() => {
    return JSON.stringify({
      countries: activeFilters.countries.sort(),
      skills: activeFilters.skills.sort(),
      jobTypes: activeFilters.jobTypes.sort(),
      isRemote: activeFilters.isRemote,
      datePosted: activeFilters.datePosted,
      salaryMin: activeFilters.salaryMin,
      salaryMax: activeFilters.salaryMax,
      salaryByAgreement: activeFilters.salaryByAgreement,
      roleCategory: [...(activeFilters.roleCategory ?? [])].sort(),
      seniority: [...(activeFilters.seniority ?? [])].sort(),
    });
  }, [activeFilters]);

  const {
    data: jobsPages,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["job-search", searchTerm, filtersKey, userTopSkills.join(",")],
    queryFn: ({ pageParam }) =>
      fetchJobs(searchTerm, activeFilters, pageParam, userTopSkills, "newest"),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length + 1 : undefined,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const jobs = useMemo(() => {
    const seen = new Set<string>();
    const merged: ApiJob[] = [];
    for (const pageData of jobsPages?.pages ?? []) {
      for (const job of pageData.jobs) {
        const id = String(job.id || "");
        if (!id || seen.has(id)) continue;
        seen.add(id);
        merged.push(job);
      }
    }
    return merged;
  }, [jobsPages]);
  const totalJobs = jobsPages?.pages[0]?.total || jobs.length;

  const loadMoreRef = useInfiniteScroll({
    hasMore: !!hasNextPage,
    isLoading: isFetchingNextPage,
    onLoadMore: () => {
      void fetchNextPage();
    },
  });

  // Transform jobs
  const transformedJobs: Job[] = useMemo(() => {
    if (!jobs || jobs.length === 0) return [];

    return jobs
      .map((job: ApiJob): Job | null => {
        // Ensure jobId is always a string - use only id field (not job_id or external_job_id)
        const jobId = String(job.id || "");
        if (!jobId || jobId.trim() === "") return null;

        const jobTitle =
          job.title || job.job_title || job.position || "Untitled Position";
        const companyName =
          job.company_name ||
          job.employer_name ||
          (typeof job.company === "string" ? job.company : null) ||
          "Unknown Company";

        const jobCity = job.job_city || job.city || "";
        const jobState = job.job_state || job.state || "";
        const jobCountry = job.job_country || job.country || "";
        const location: string =
          (job.job_location as string | undefined) ||
          (job.location as string | undefined) ||
          [jobCity, jobState, jobCountry].filter(Boolean).join(", ") ||
          "Location not specified";

        const applyLink =
          job.apply_url ||
          job.job_apply_link ||
          job.apply_link ||
          job.url ||
          "";

        // Extract company logo - check all possible fields (same as JobsPage)
        let companyLogo: string | undefined = undefined;

        // Helper function to validate and set logo URL
        const setLogoIfValid = (logoValue: unknown): boolean => {
          if (!logoValue) return false;
          const logoUrl = String(logoValue).trim();
          if (!logoUrl) return false;
          try {
            const url = new URL(logoUrl);
            // Only allow http/https protocols
            if (url.protocol.startsWith("http")) {
              companyLogo = logoUrl;
              // Debug logging in development
              if (process.env.NODE_ENV === "development") {
                console.log("✅ Found valid logo URL:", logoUrl);
              }
              return true;
            }
          } catch (error) {
            // Invalid URL
            if (process.env.NODE_ENV === "development") {
              console.warn("⚠️ Invalid logo URL:", logoUrl, error);
            }
          }
          return false;
        };

        // Check root level fields first - prioritize company_logo field
        // Use Record type to access fields that might not be in the type definition
        const jobAny = job as Record<string, unknown>;

        // Check company_logo first (most common field name)
        if (!companyLogo && jobAny.company_logo) {
          setLogoIfValid(jobAny.company_logo);
        }
        if (!companyLogo && job.company_logo) {
          setLogoIfValid(job.company_logo);
        }
        if (!companyLogo && jobAny.companyLogo) {
          setLogoIfValid(jobAny.companyLogo);
        }
        if (!companyLogo && job.companyLogo) {
          setLogoIfValid(job.companyLogo);
        }
        if (!companyLogo && jobAny.employer_logo) {
          setLogoIfValid(jobAny.employer_logo);
        }
        if (!companyLogo && job.employer_logo) {
          setLogoIfValid(job.employer_logo);
        }
        if (!companyLogo && jobAny.logo) {
          setLogoIfValid(jobAny.logo);
        }
        if (!companyLogo && job.logo) {
          setLogoIfValid(job.logo);
        }
        if (!companyLogo && jobAny.logo_url) {
          setLogoIfValid(jobAny.logo_url);
        }
        if (!companyLogo && job.logo_url) {
          setLogoIfValid(job.logo_url);
        }
        // Check additional possible field variations
        if (!companyLogo && jobAny.employerLogo) {
          setLogoIfValid(jobAny.employerLogo);
        }
        if (!companyLogo && jobAny.companyLogoUrl) {
          setLogoIfValid(jobAny.companyLogoUrl);
        }
        if (!companyLogo && jobAny.logoUrl) {
          setLogoIfValid(jobAny.logoUrl);
        }

        // Check nested company object if it exists
        if (!companyLogo && job.company && typeof job.company === "object") {
          const companyObj = job.company as Record<string, unknown>;
          if (companyObj.logo) setLogoIfValid(companyObj.logo);
          if (!companyLogo && companyObj.logo_url)
            setLogoIfValid(companyObj.logo_url);
          if (!companyLogo && companyObj.company_logo)
            setLogoIfValid(companyObj.company_logo);
          if (!companyLogo && companyObj.employer_logo)
            setLogoIfValid(companyObj.employer_logo);
        }

        // Check employer object if it exists separately
        if (!companyLogo && job.employer && typeof job.employer === "object") {
          const employerObj = job.employer as Record<string, unknown>;
          if (employerObj.logo) setLogoIfValid(employerObj.logo);
          if (!companyLogo && employerObj.logo_url)
            setLogoIfValid(employerObj.logo_url);
          if (!companyLogo && employerObj.company_logo)
            setLogoIfValid(employerObj.company_logo);
          if (!companyLogo && employerObj.employer_logo)
            setLogoIfValid(employerObj.employer_logo);
        }

        const salary = formatJobSalaryDisplay(job);
        const salaryAmount = extractJobSalaryMidpoint(job);

        const employmentType = resolveJobEmploymentType(job);
        const workArrangement = resolveJobWorkArrangement(job);

        const jobSkills = extractJobSkills(job);
        const matchPercentage =
          user && userSkillsForMatch.length >= 0
            ? matchJobDetailToUser(
                job as unknown as JobDetail,
                buildUserMatchProfileFromSkillTest(userSkillsForMatch),
              ).overallPercent
            : undefined;

        // Extract date posted - new API uses posted_at or fetched_at
        const jobRecord = job as Record<string, unknown>;
        const datePosted =
          (job.posted_at as string | undefined) ||
          (job.fetched_at as string | undefined) ||
          (job.date_posted as string | undefined) ||
          (job.posted_date as string | undefined) ||
          (job.job_posted_at_datetime_utc as string | undefined) ||
          (job.postedAt as string | undefined) ||
          (job.job_posted_at as string | undefined) ||
          (jobRecord.job_publish_timestamp as string | undefined) ||
          (jobRecord.publish_time as string | undefined) ||
          (job.created_at as string | undefined) ||
          (job.published_at as string | undefined) ||
          undefined;

        // Debug: Log if we found a date (only in development)
        if (process.env.NODE_ENV === "development" && datePosted) {
          console.log("Job date found:", {
            jobId: jobId,
            datePosted,
            title: jobTitle,
          });
        }

        return {
          id: jobId,
          title: jobTitle,
          company: companyName,
          // Prefer the raw API `company_name` when available so UI shows exact field
          company_name:
            job.company_name ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (job as Record<string, any>).employer_name ||
            (typeof job.company === "string" ? job.company : undefined),
          location: String(location),
          url: applyLink,
          company_logo: companyLogo,
          is_saved: savedJobs?.includes(String(jobId)),
          salary,
          salaryAmount,
          employment_type: employmentType,
          work_arrangement: workArrangement,
          matchPercentage,
          datePosted,
          jobSkills,
        };
      })
      .filter((job): job is Job => job !== null);
  }, [jobs, savedJobs, user, userSkillsForMatch]);

  const sortBy: ResultSort = RESULT_SORTS.includes(
    searchParams.get("sortBy") as ResultSort,
  )
    ? (searchParams.get("sortBy") as ResultSort)
    : "relevance";

  const postedWithin: PostedWithin =
    activeFilters.datePosted === "today"
      ? "day"
      : POSTED_WITHIN.includes(activeFilters.datePosted as PostedWithin)
        ? (activeFilters.datePosted as PostedWithin)
        : "all";

  // Match % is computed client-side, so order the loaded results here.
  const regularJobs = useMemo(() => {
    const windowMs = postedWithinMs(activeFilters.datePosted);
    const now = Date.now();
    const visible =
      windowMs == null
        ? transformedJobs
        : transformedJobs.filter((job) => {
            const postedAt = Date.parse(job.datePosted || "");
            if (!Number.isFinite(postedAt)) return true;
            return now - postedAt <= windowMs;
          });

    const sorted = [...visible];
    if (sortBy === "date") {
      sorted.sort(
        (a, b) =>
          (Date.parse(b.datePosted || "") || 0) -
          (Date.parse(a.datePosted || "") || 0),
      );
    } else if (sortBy === "salary_high" || sortBy === "salary_low") {
      const direction = sortBy === "salary_high" ? -1 : 1;
      sorted.sort((a, b) => {
        if (a.salaryAmount == null && b.salaryAmount == null) return 0;
        if (a.salaryAmount == null) return 1;
        if (b.salaryAmount == null) return -1;
        return (a.salaryAmount - b.salaryAmount) * direction;
      });
    } else {
      sorted.sort(
        (a, b) => (b.matchPercentage ?? -1) - (a.matchPercentage ?? -1),
      );
    }
    return sorted;
  }, [transformedJobs, sortBy, activeFilters.datePosted]);

  // Save job mutation
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

  const updateUrlWithFilters = useCallback(
    (filters: JobFilters, search: string, pageNum: number) => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(pageNum)); // Always include page (1-based, matches API)
      if (filters.countries.length > 0) {
        params.set("countries", filters.countries.join(","));
      }
      if (filters.skills.length > 0) {
        params.set("skills", filters.skills.join(","));
      }
      if (filters.jobTypes.length > 0) {
        params.set("jobTypes", filters.jobTypes.join(","));
      }
      if (filters.isRemote) {
        params.set("isRemote", "true");
      }
      if (filters.datePosted) {
        params.set("datePosted", filters.datePosted);
      }
      if (filters.salaryMin !== undefined) {
        params.set("salaryMin", String(filters.salaryMin));
      }
      if (filters.salaryMax !== undefined) {
        params.set("salaryMax", String(filters.salaryMax));
      }
      if (filters.salaryByAgreement) {
        params.set("salaryByAgreement", "true");
      }
      if (filters.roleCategory && filters.roleCategory.length > 0) {
        params.set("roleCategory", filters.roleCategory.join(","));
      }
      if (filters.seniority && filters.seniority.length > 0) {
        params.set("seniority", filters.seniority.join(","));
      }
      const sortByParam = searchParams.get("sortBy");
      if (sortByParam && sortByParam !== "relevance") {
        params.set("sortBy", sortByParam);
      }
      setSearchParams(params, { replace: true });
    },
    [setSearchParams, searchParams],
  );

  const setSortBy = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next === "relevance") params.delete("sortBy");
    else params.set("sortBy", next);
    params.set("page", "1");
    setSearchParams(params, { replace: true });
  };

  const setPostedWithin = (next: string) => {
    updateUrlWithFilters(
      {
        ...activeFilters,
        datePosted: next === "all" ? undefined : next,
      },
      searchTerm,
      1,
    );
  };

  const sortOptions = [
    { id: "relevance", label: t.jobs.sortByRelevance },
    { id: "date", label: t.jobs.sortByDate },
    { id: "salary_high", label: t.jobs.sortHighestSalary },
    { id: "salary_low", label: t.jobs.sortLowestSalary },
  ];
  const postedOptions = [
    { id: "all", label: t.jobs.postedAllTime },
    { id: "month", label: t.jobs.postedPastMonth },
    { id: "week", label: t.jobs.postedPastWeek },
    { id: "3days", label: t.jobs.postedPast3Days },
    { id: "day", label: t.jobs.postedPast24Hours },
  ];

  const submitSearch = (filters: JobFilters, search: string) => {
    setPendingFilters(filters);
    updateUrlWithFilters(filters, search, 1);
  };

  const handleSearch = () => {
    submitSearch(pendingFilters, draftSearch);
  };

  const patchPendingFilters = (patch: Partial<JobFilters>) => {
    setPendingFilters((current) => ({ ...current, ...patch }));
  };

  const openFilters = () => {
    setTempFilters(pendingFilters);
    setFilterModalOpen(true);
  };

  const handleApplyFilters = () => {
    setFilterModalOpen(false);
    submitSearch(tempFilters, draftSearch);
  };

  const handleClearFilters = () => {
    const clearedFilters: JobFilters = {
      country: "Georgia",
      countries: [],
      jobTypes: [],
      isRemote: false,
      datePosted: undefined,
      skills: [],
      salaryMin: undefined,
      salaryMax: undefined,
      salaryByAgreement: false,
      roleCategory: [],
      seniority: [],
    };
    setTempFilters(clearedFilters);
    setPendingFilters(clearedFilters);
    updateUrlWithFilters(clearedFilters, draftSearch, 1);
    setFilterModalOpen(false);
  };

  // Handle removing a skill filter
  const handleRemoveSkill = useCallback(
    (skillToRemove: string) => {
      const newFilters = {
        ...activeFilters,
        skills: activeFilters.skills.filter((skill) => skill !== skillToRemove),
      };
      setActiveFilters(newFilters);
      setTempFilters(newFilters);
      updateUrlWithFilters(newFilters, searchTerm, 1);
    },
    [activeFilters, searchTerm, updateUrlWithFilters],
  );

  // Handle removing a country filter
  const handleRemoveCountry = useCallback(
    (countryCodeToRemove: string) => {
      const newFilters = {
        ...activeFilters,
        countries: activeFilters.countries.filter(
          (code) => code !== countryCodeToRemove,
        ),
      };
      setActiveFilters(newFilters);
      setTempFilters(newFilters);
      updateUrlWithFilters(newFilters, searchTerm, 1);
    },
    [activeFilters, searchTerm, updateUrlWithFilters],
  );

  // Handle removing job type filter
  const handleRemoveJobType = useCallback(
    (jobTypeToRemove: string) => {
      const newJobTypes = activeFilters.jobTypes.filter(
        (type) => type !== jobTypeToRemove,
      );
      const newFilters = {
        ...activeFilters,
        jobTypes: newJobTypes,
      };
      setActiveFilters(newFilters);
      setTempFilters(newFilters);
      updateUrlWithFilters(newFilters, searchTerm, 1);
    },
    [activeFilters, searchTerm, updateUrlWithFilters],
  );

  // Handle removing remote filter
  const handleRemoveRemote = useCallback(() => {
    const newFilters = {
      ...activeFilters,
      isRemote: false,
    };
    setActiveFilters(newFilters);
    setTempFilters(newFilters);
    updateUrlWithFilters(newFilters, searchTerm, 1);
  }, [activeFilters, searchTerm, updateUrlWithFilters]);

  // Build array of all filter items for active filters display
  const allFilters = useMemo(() => {
    const filters: Array<{
      id: string;
      label: string;
      onRemove: () => void;
      ariaLabel: string;
    }> = [];

    // Skills
    activeFilters.skills.forEach((skill) => {
      filters.push({
        id: `skill-${skill}`,
        label: skill,
        onRemove: () => handleRemoveSkill(skill),
        ariaLabel: `Remove ${skill} filter`,
      });
    });

    (activeFilters.roleCategory ?? []).forEach((categoryId) => {
      const match = JOB_ROLE_CATEGORIES.find((item) => item.value === categoryId);
      const label = match
        ? t.onboarding.roleCategories[match.labelId]
        : categoryId;
      filters.push({
        id: `category-${categoryId}`,
        label,
        onRemove: () => {
          const newFilters = {
            ...activeFilters,
            roleCategory: (activeFilters.roleCategory ?? []).filter(
              (id) => id !== categoryId,
            ),
          };
          setActiveFilters(newFilters);
          setTempFilters(newFilters);
          updateUrlWithFilters(newFilters, searchTerm, 1);
        },
        ariaLabel: `Remove ${label} filter`,
      });
    });

    (activeFilters.seniority ?? []).forEach((levelId) => {
      const label =
        t.jobs.levels[levelId as keyof typeof t.jobs.levels] ?? levelId;
      filters.push({
        id: `level-${levelId}`,
        label,
        onRemove: () => {
          const newFilters = {
            ...activeFilters,
            seniority: (activeFilters.seniority ?? []).filter(
              (id) => id !== levelId,
            ),
          };
          setActiveFilters(newFilters);
          setTempFilters(newFilters);
          updateUrlWithFilters(newFilters, searchTerm, 1);
        },
        ariaLabel: `Remove ${label} filter`,
      });
    });

    // Cities (Georgian city ids stored in countries filter field)
    activeFilters.countries.forEach((cityId) => {
      const cityName = georgianCityLabelById(cityId, language);
      filters.push({
        id: `country-${cityId}`,
        label: cityName,
        onRemove: () => handleRemoveCountry(cityId),
        ariaLabel: `Remove ${cityName} filter`,
      });
    });

    // Job Types
    activeFilters.jobTypes.forEach((jobType) => {
      filters.push({
        id: `jobType-${jobType}`,
        label: jobTypeLabels[jobType] || jobType,
        onRemove: () => handleRemoveJobType(jobType),
        ariaLabel: `Remove ${jobTypeLabels[jobType] || jobType} filter`,
      });
    });

    // Remote
    if (activeFilters.isRemote) {
      filters.push({
        id: "remote",
        label: "Remote",
        onRemove: handleRemoveRemote,
        ariaLabel: "Remove Remote filter",
      });
    }

    // Salary Range
    if (
      activeFilters.salaryMin !== undefined ||
      activeFilters.salaryMax !== undefined
    ) {
      const salaryLabel = formatSalaryFilterLabel(
        activeFilters.salaryMin,
        activeFilters.salaryMax,
      );
      filters.push({
        id: "salaryRange",
        label: salaryLabel,
        onRemove: () => {
          const newFilters = {
            ...activeFilters,
            salaryMin: undefined,
            salaryMax: undefined,
          };
          setActiveFilters(newFilters);
          setTempFilters(newFilters);
          updateUrlWithFilters(newFilters, searchTerm, 1);
        },
        ariaLabel: "Remove Salary filter",
      });
    }

    // Salary By Agreement
    if (activeFilters.salaryByAgreement) {
      filters.push({
        id: "salaryByAgreement",
        label: "Salary By Agreement",
        onRemove: () => {
          const newFilters = {
            ...activeFilters,
            salaryByAgreement: false,
          };
          setActiveFilters(newFilters);
          setTempFilters(newFilters);
          updateUrlWithFilters(newFilters, searchTerm, 1);
        },
        ariaLabel: "Remove Salary By Agreement filter",
      });
    }

    return filters;
  }, [
    activeFilters,
    searchTerm,
    language,
    handleRemoveSkill,
    handleRemoveCountry,
    handleRemoveJobType,
    handleRemoveRemote,
    updateUrlWithFilters,
    t,
  ]);

  const filtersContainerRef = useRef<HTMLDivElement>(null);
  const [visibleFilterCount, setVisibleFilterCount] = useState(
    allFilters.length,
  );
  const [shouldShowCount, setShouldShowCount] = useState(false);

  useEffect(() => {
    if (allFilters.length === 0) {
      setVisibleFilterCount(0);
      setShouldShowCount(false);
      return;
    }

    // First render all filters to measure height
    setVisibleFilterCount(allFilters.length);

    const checkHeight = () => {
      if (!filtersContainerRef.current) return;

      const container = filtersContainerRef.current;
      const height = container.scrollHeight;
      // Two lines threshold: approximately 100px
      // py-2.5 = 20px total (10px top + 10px bottom)
      // gap-2 = 8px
      // So one line is ~42px (20px badge + 8px gap), two lines ~84px
      // Using 100px as threshold for safety
      const twoLineHeightThreshold = 100;

      if (height > twoLineHeightThreshold) {
        // Binary search to find how many filters fit in 2 lines
        let low = 1;
        let high = allFilters.length;
        let maxVisible = allFilters.length;

        // Create a test container to measure
        const testContainer = document.createElement("div");
        testContainer.className = "flex flex-wrap gap-2";
        testContainer.style.position = "absolute";
        testContainer.style.visibility = "hidden";
        testContainer.style.width = container.offsetWidth + "px";
        testContainer.style.top = "-9999px";
        document.body.appendChild(testContainer);

        // Binary search
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          testContainer.innerHTML = allFilters
            .slice(0, mid)
            .map(
              (f) =>
                `<div class="flex items-center gap-2 px-4 py-2.5 rounded-[14px] bg-gray-100 dark:bg-[#3A3A3A]"><span class="text-sm font-medium whitespace-nowrap">${f.label}</span><button><svg class="h-4 w-4"></svg></button></div>`,
            )
            .join("");

          if (testContainer.scrollHeight <= twoLineHeightThreshold) {
            maxVisible = mid;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }

        document.body.removeChild(testContainer);

        if (maxVisible < allFilters.length) {
          setVisibleFilterCount(maxVisible);
          setShouldShowCount(true);
        } else {
          setVisibleFilterCount(allFilters.length);
          setShouldShowCount(false);
        }
      } else {
        setVisibleFilterCount(allFilters.length);
        setShouldShowCount(false);
      }
    };

    // Use requestAnimationFrame to ensure DOM is rendered
    const rafId = requestAnimationFrame(() => {
      setTimeout(checkHeight, 0);
    });

    window.addEventListener("resize", checkHeight);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", checkHeight);
    };
  }, [allFilters]);
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 px-2 sm:px-6 lg:px-8">
        {/* Search Bar */}
        <div className="mb-8 relative max-w-6xl mx-auto">
          <div className="flex items-center bg-white dark:bg-[#242424] rounded-3xl pl-3 md:pl-4 pr-2 md:pr-2.5 py-2.5 md:py-3 overflow-visible min-h-[3rem]">
            <Briefcase
              className="h-5 w-5 text-breneo-accent dark:text-breneo-blue flex-shrink-0 mr-2"
              strokeWidth={2}
            />

            <Input
              type="text"
              placeholder={t.jobs.searchPlaceholder}
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm text-gray-900 dark:text-gray-100 flex-1 min-w-0 bg-transparent h-auto py-0"
            />

            {isMobile && (
              <Button
                variant="outline"
                size="icon"
                onClick={openFilters}
                className="h-10 w-10 flex-shrink-0 bg-gray-100 dark:bg-gray-700 border-0 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md ml-2 relative"
                aria-label={t.jobs.filters}
              >
                <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
              </Button>
            )}

            <Button
              variant="default"
              size="icon"
              onClick={handleSearch}
              className="h-10 w-10 flex-shrink-0 bg-breneo-blue hover:bg-breneo-blue/90 rounded-md ml-2"
              aria-label={t.jobs.search}
            >
              <Search className="h-5 w-5 text-white" />
            </Button>
          </div>

          <div className="flex items-start gap-2">
            <JobSearchPreferenceChips
              jobTypes={pendingFilters.jobTypes}
              isRemote={pendingFilters.isRemote}
              countries={pendingFilters.countries}
              roleCategory={pendingFilters.roleCategory ?? []}
              seniority={pendingFilters.seniority ?? []}
              salaryMin={pendingFilters.salaryMin}
              salaryMax={pendingFilters.salaryMax}
              salaryByAgreement={pendingFilters.salaryByAgreement}
              onJobTypesChange={(jobTypes) => patchPendingFilters({ jobTypes })}
              onRemoteChange={(isRemote) => patchPendingFilters({ isRemote })}
              onCountriesChange={(countries) =>
                patchPendingFilters({ countries })
              }
              onRoleCategoryChange={(roleCategory) =>
                patchPendingFilters({ roleCategory })
              }
              onSeniorityChange={(seniority) =>
                patchPendingFilters({ seniority })
              }
              onSalaryChange={(salaryMin, salaryMax, salaryByAgreement) =>
                patchPendingFilters({
                  salaryMin,
                  salaryMax,
                  salaryByAgreement,
                })
              }
            />
            <div className="mt-3 flex shrink-0 flex-wrap items-center justify-start gap-2 md:ml-auto md:justify-end">
              <ResultOptionMenu
                label={
                  sortOptions.find((option) => option.id === sortBy)?.label ??
                  t.jobs.sortByRelevance
                }
                options={sortOptions}
                value={sortBy}
                active={sortBy !== "relevance"}
                modal={isMobile}
                onChange={setSortBy}
              />
              <ResultOptionMenu
                label={
                  postedOptions.find((option) => option.id === postedWithin)
                    ?.label ?? t.jobs.postedAllTime
                }
                options={postedOptions}
                value={postedWithin}
                active={postedWithin !== "all"}
                modal={isMobile}
                onChange={setPostedWithin}
              />
            </div>
          </div>
        </div>

        {/* Active Filters Section */}
        {allFilters.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4">{t.jobs.activeFilters}</h2>
            <div ref={filtersContainerRef} className="flex flex-wrap gap-2">
              {allFilters.slice(0, visibleFilterCount).map((filter) => (
                <div
                  key={filter.id}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-[14px] transition-colors",
                    PLATFORM_FILTER_CHIP_CLASS,
                  )}
                >
                  <span className="text-sm font-medium whitespace-nowrap">
                    {filter.label}
                  </span>
                  <button
                    onClick={filter.onRemove}
                    className="flex-shrink-0 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5 transition-colors"
                    aria-label={filter.ariaLabel}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            {shouldShowCount && allFilters.length > visibleFilterCount && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {allFilters.length - visibleFilterCount}+ filters
              </div>
            )}
          </div>
        )}

        {/* Results Header */}
        <div className="mb-6">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {totalJobs > 0
              ? `${totalJobs} ${t.jobs.vacancies}`
              : `${transformedJobs.length} ${t.jobs.vacancies}`}
          </span>
        </div>

        {/* Job List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="bg-red-50 dark:bg-red-950/20">
            <CardContent className="p-6 text-center">
              <p className="text-red-600">{t.jobs.errorLoading}</p>
            </CardContent>
          </Card>
        ) : transformedJobs.length === 0 ? (
          <div className="text-center p-10 rounded-3xl text-muted-foreground bg-muted/30">
            <img
              src="/lovable-uploads/3dicons-travel-front-color.png"
              alt="No data found"
              className="mx-auto h-48 w-48 mb-4 object-contain"
            />
            <h4 className="text-lg font-semibold mb-2">{t.jobs.noJobs}</h4>
            <p className="text-sm">{t.jobs.tryAdjustingFilters}</p>
          </div>
        ) : (
          <div className="rounded-3xl bg-white dark:bg-[#242424] overflow-hidden divide-y divide-gray-200 dark:divide-gray-700">
            {regularJobs.map((job) => (
              <div
                key={job.id}
                className="group cursor-pointer transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                onClick={() => navigate(`/jobs/${encodeURIComponent(job.id)}`)}
              >
                <div
                  className={
                    isMobile ? "px-5 pt-5 pb-4 flex flex-col flex-grow" : "p-0"
                  }
                >
                  {isMobile ? (
                    <>
                      <div className="flex items-start gap-3 mb-3">
                        {job.company_logo ? (
                          <div className="flex-shrink-0 relative w-10 h-10">
                            <img
                              src={job.company_logo}
                              alt={`${job.company_name || job.company} logo`}
                              className="w-10 h-10 rounded-full object-cover"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          </div>
                        ) : null}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm min-w-0">
                            <CompanyNameLink
                              name={job.company_name || job.company}
                              className="font-semibold text-sm"
                            />
                          </h3>
                          <p className="mt-0.5 text-xs text-gray-500 truncate">
                            {job.location}
                          </p>
                        </div>
                      </div>

                      <h4 className="font-bold text-base mb-2 line-clamp-2 leading-6">
                        {job.title}
                      </h4>

                      <JobListingMetaBadges
                        className="mt-1"
                        employmentType={job.employment_type}
                        workArrangement={job.work_arrangement}
                        salary={job.salary}
                      />

                      <div className="mt-5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <RadialProgress
                            value={job.matchPercentage ?? 0}
                            size={40}
                            strokeWidth={4}
                            showLabel={false}
                            percentageTextSize="sm"
                            className="text-breneo-blue flex-shrink-0"
                          />
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-100 whitespace-nowrap">
                            {getMatchQualityLabel(job.matchPercentage)}
                          </span>
                        </div>
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            saveJobMutation.mutate(job);
                          }}
                          aria-label={job.is_saved ? "Unsave job" : "Save job"}
                          className={cn(
                            "flex-shrink-0 bg-[#E6E7EB] hover:bg-[#E6E7EB]/90 dark:bg-[#3A3A3A] dark:hover:bg-[#4A4A4A] h-10 w-10",
                            job.is_saved
                              ? "text-breneo-blue bg-breneo-blue/10 hover:bg-breneo-blue/15 dark:bg-breneo-blue/20 dark:hover:bg-breneo-blue/30"
                              : "text-black dark:text-white",
                          )}
                        >
                          <Bookmark
                            className={cn(
                              "h-4 w-4 transition-colors",
                              job.is_saved
                                ? "text-breneo-blue fill-breneo-blue animate-heart-pop"
                                : "text-black dark:text-white",
                            )}
                          />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-4">
                      {/* Left Section - Job Details (desktop) */}
                      <div className="flex-1 p-4 min-w-0">
                        <div className="flex items-start gap-4">
                          {job.company_logo ? (
                            <div className="flex-shrink-0 relative w-12 h-12">
                              <img
                                src={job.company_logo}
                                alt={job.company_name || job.company}
                                className="w-12 h-12 rounded-md object-cover"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                            </div>
                          ) : null}

                          {/* Job Info */}
                          <div className="flex-1 min-w-0">
                            <div className="mb-1 md:mb-2">
                              <h3 className="font-normal text-sm text-gray-600 mb-1 min-w-0">
                                <CompanyNameLink
                                  name={job.company_name || job.company}
                                  className="font-normal text-sm text-gray-600"
                                />
                              </h3>
                              <h4 className="font-bold text-base md:text-lg mb-1 md:mb-2 line-clamp-2 md:line-clamp-3">
                                {job.title}
                              </h4>
                            </div>

                            {/* Desktop: All details in one row */}
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="h-4 w-4" />
                                  <span>{job.location}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-4 w-4" />
                                  <span>{job.employment_type}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Briefcase className="h-4 w-4" />
                                  <span>{job.work_arrangement}</span>
                                </div>
                                {job.salary ? (
                                  <div className="flex items-center gap-1.5">
                                    <span>{job.salary}</span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: default = match bar + text (stacked); hover = save button top right */}
                      <div className="flex-shrink-0 py-4 pl-4 pr-14 relative w-24 min-h-[88px] flex flex-col items-center justify-center">
                        {/* Default: matching bar with text under it, with padding, offset left from right edge */}
                        <div className="flex flex-col items-center gap-2 px-2 transition-opacity duration-200 group-hover:opacity-0 group-hover:pointer-events-none">
                          <RadialProgress
                            value={job.matchPercentage ?? 0}
                            size={48}
                            strokeWidth={4}
                            showLabel={false}
                            percentageTextSize="md"
                            className="flex-shrink-0 text-gray-400 dark:text-gray-500"
                          />
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap text-center">
                            {getMatchQualityLabel(job.matchPercentage)}
                          </span>
                        </div>
                        {/* Hover: save button in top right, same as other pages */}
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            saveJobMutation.mutate(job);
                          }}
                          aria-label={job.is_saved ? "Unsave job" : "Save job"}
                          className={cn(
                            "absolute top-4 right-4 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-10 bg-[#E6E7EB] hover:bg-[#E6E7EB]/90 dark:bg-[#3A3A3A] dark:hover:bg-[#4A4A4A] h-10 w-10",
                            job.is_saved
                              ? "text-breneo-blue bg-breneo-blue/10 hover:bg-breneo-blue/15 dark:bg-breneo-blue/20 dark:hover:bg-breneo-blue/30"
                              : "text-black dark:text-white",
                          )}
                        >
                          <Bookmark
                            className={cn(
                              "h-4 w-4 transition-colors",
                              job.is_saved
                                ? "text-breneo-blue fill-breneo-blue animate-heart-pop"
                                : "text-black dark:text-white",
                            )}
                          />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && transformedJobs.length > 0 ? (
          hasNextPage ? (
            <div
              ref={loadMoreRef}
              className="flex justify-center py-6"
              aria-live="polite"
            >
              {isFetchingNextPage ? (
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              ) : null}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-base font-semibold text-foreground">
                You're all caught up! ✨
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                You've seen everything for now. Check back soon for new
                opportunities.
              </p>
            </div>
          )
        ) : null}

        <JobFilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setFilterModalOpen(false)}
          filters={tempFilters}
          onFiltersChange={setTempFilters}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
          showSaveFilter
          userTopSkills={userTopSkills}
        />
      </div>
    </DashboardLayout>
  );
};

export default JobSearchResultsPage;
