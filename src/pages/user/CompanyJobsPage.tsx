import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  Heart,
  Clock,
  Briefcase,
  DollarSign,
  Tag,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { jobService, ApiJob } from "@/api/jobs";
import { filterTechJobs, filterATSJobs } from "@/utils/jobFilterUtils";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  company_logo?: string;
  is_saved: boolean;
  salary?: string;
  employment_type?: string;
  work_arrangement?: string;
  benefits?: string;
}

const jobTypeLabels: Record<string, string> = {
  FULLTIME: "Full Time",
  PARTTIME: "Part Time",
  CONTRACTOR: "Contractor",
  INTERN: "Intern",
  INTERNSHIP: "Internship",
};

// Fetch jobs for a specific company
const fetchCompanyJobs = async (
  companyName: string,
  page: number = 1
): Promise<{
  jobs: ApiJob[];
  hasMore: boolean;
  total: number;
}> => {
  try {
    console.log(
      `🚀 fetchCompanyJobs called - fetching jobs for company: ${companyName}, page ${page}`
    );

    // Try searching with company name, but also fetch more results to filter client-side
    const response = await jobService.fetchActiveJobs({
      query: companyName, // Search by company name
      filters: {
        country: undefined,
        countries: [], // No country filtering
        jobTypes: [], // No job type filtering
        isRemote: undefined,
        datePosted: undefined,
        skills: [], // No skill filtering
        salaryMin: undefined,
        salaryMax: undefined,
        salaryByAgreement: undefined,
      },
      page: page,
      pageSize: 50, // Fetch more jobs to increase chances of finding company matches
    });

    console.log(`📊 fetchCompanyJobs response:`, {
      totalJobs: response.jobs?.length || 0,
      hasMore: response.hasMore,
      searchCompany: companyName,
    });

    if (!response || !Array.isArray(response.jobs)) {
      console.warn("Invalid response format from job service:", response);
      return { jobs: [], hasMore: false, total: 0 };
    }

    // Filter jobs to only include those from the specific company
    // Use the same extraction logic as in JobsPage
    const companyJobs = response.jobs.filter((job) => {
      const companyObj =
        job.company && typeof job.company === "object"
          ? (job.company as Record<string, unknown>)
          : null;

      const jobCompany =
        (companyObj?.name as string) ||
        (companyObj?.company_name as string) ||
        job.companyName ||
        job.employer_name ||
        job.company_name ||
        (typeof job.company === "string" ? job.company : null) ||
        "";

      if (!jobCompany || jobCompany.trim() === "") {
        return false;
      }

      const normalizedJobCompany = jobCompany.trim().toLowerCase();
      const normalizedSearchCompany = companyName.trim().toLowerCase();

      // More flexible matching: check if either contains the other, or if they're very similar
      return (
        normalizedJobCompany === normalizedSearchCompany ||
        normalizedJobCompany.includes(normalizedSearchCompany) ||
        normalizedSearchCompany.includes(normalizedJobCompany) ||
        normalizedJobCompany.replace(/\s+/g, "") === normalizedSearchCompany.replace(/\s+/g, "")
      );
    });

    console.log(`🔍 Filtered company jobs:`, {
      beforeFilter: response.jobs.length,
      afterCompanyFilter: companyJobs.length,
      searchCompany: companyName,
      sampleCompanies: companyJobs.slice(0, 3).map((j) => {
        const companyObj =
          j.company && typeof j.company === "object"
            ? (j.company as Record<string, unknown>)
            : null;
        return (
          (companyObj?.name as string) ||
          j.employer_name ||
          j.company_name ||
          (typeof j.company === "string" ? j.company : null) ||
          "Unknown"
        );
      }),
    });

    // Filter out jobs without valid IDs
    const validJobs = companyJobs.filter((job) => {
      const jobId = job.job_id || job.id;
      return jobId && jobId.trim() !== "";
    });

    console.log(`✅ Final valid jobs for ${companyName}:`, validJobs.length);

    // If no jobs found with company name search, try a broader search
    if (validJobs.length === 0 && page === 1) {
      console.log(`⚠️ No jobs found with company name search, trying broader search...`);
      try {
        const broaderResponse = await jobService.fetchActiveJobs({
          query: "", // Empty query to get all jobs
          filters: {
            country: undefined,
            countries: [],
            jobTypes: [],
            isRemote: undefined,
            datePosted: undefined,
            skills: [],
            salaryMin: undefined,
            salaryMax: undefined,
            salaryByAgreement: undefined,
          },
          page: 1,
          pageSize: 100, // Fetch more jobs for broader search
        });

        if (broaderResponse && Array.isArray(broaderResponse.jobs)) {
          // Filter by company name from all jobs
          const broaderCompanyJobs = broaderResponse.jobs.filter((job) => {
            const companyObj =
              job.company && typeof job.company === "object"
                ? (job.company as Record<string, unknown>)
                : null;

            const jobCompany =
              (companyObj?.name as string) ||
              (companyObj?.company_name as string) ||
              job.companyName ||
              job.employer_name ||
              job.company_name ||
              (typeof job.company === "string" ? job.company : null) ||
              "";

            if (!jobCompany || jobCompany.trim() === "") {
              return false;
            }

            const normalizedJobCompany = jobCompany.trim().toLowerCase();
            const normalizedSearchCompany = companyName.trim().toLowerCase();

            return (
              normalizedJobCompany === normalizedSearchCompany ||
              normalizedJobCompany.includes(normalizedSearchCompany) ||
              normalizedSearchCompany.includes(normalizedJobCompany) ||
              normalizedJobCompany.replace(/\s+/g, "") === normalizedSearchCompany.replace(/\s+/g, "")
            );
          });

          const broaderValidJobs = broaderCompanyJobs.filter((job) => {
            const jobId = job.job_id || job.id;
            return jobId && jobId.trim() !== "";
          });

          console.log(`✅ Broader search found ${broaderValidJobs.length} jobs for ${companyName}`);

          return {
            jobs: broaderValidJobs,
            hasMore: false, // Don't paginate broader search
            total: broaderValidJobs.length,
          };
        }
      } catch (broaderError) {
        console.error("Error in broader search:", broaderError);
      }
    }

    return {
      jobs: validJobs,
      hasMore: response.hasMore ?? false,
      total: validJobs.length,
    };
  } catch (error) {
    console.error("Error fetching company jobs:", error);
    return { jobs: [], hasMore: false, total: 0 };
  }
};

const CompanyJobsPage = () => {
  const { companyName } = useParams<{ companyName: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [allJobs, setAllJobs] = useState<ApiJob[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const decodedCompanyName = companyName
    ? decodeURIComponent(companyName)
    : "";

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

  // Fetch company jobs
  const {
    data: jobsData = { jobs: [], hasMore: false, total: 0 },
    isLoading,
    error,
  } = useQuery({
    queryKey: ["companyJobs", decodedCompanyName, page],
    queryFn: () => fetchCompanyJobs(decodedCompanyName, page),
    enabled: !!decodedCompanyName,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  // Update all jobs when new data arrives - filter to only tech jobs from allowed ATS platforms
  useEffect(() => {
    if (jobsData.jobs && jobsData.jobs.length > 0) {
      // First filter to allowed ATS platforms, then filter to tech jobs
      const atsJobs = filterATSJobs(jobsData.jobs);
      const techJobs = filterTechJobs(atsJobs);
      if (page === 1) {
        setAllJobs(techJobs);
      } else {
        setAllJobs((prev) => {
          const existingIds = new Set(prev.map((j) => j.job_id || j.id));
          const newJobs = techJobs.filter(
            (j) => !existingIds.has(j.job_id || j.id)
          );
          return [...prev, ...newJobs];
        });
      }
      setHasMore(jobsData.hasMore);
      setIsLoadingMore(false);
    } else if (page === 1) {
      setAllJobs([]);
      setHasMore(false);
    }
  }, [jobsData, page]);

  const saveJobMutation = useMutation({
    mutationFn: async (job: Job) => {
      if (!user) throw new Error("User not logged in");
      if (!job.id) throw new Error("Job ID is required");

      const jobId = String(job.id);
      const endpoint = `${API_ENDPOINTS.JOBS.SAVE_JOB}${jobId}/`;
      await apiClient.post(endpoint);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["savedJobs", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success(variables.is_saved ? "Job Unsaved" : "Job Saved");
    },
    onError: (error: Error) => {
      console.error("Error saving job:", error);
      toast.error("Failed to save job");
    },
  });

  // Transform jobs
  const transformedJobs = useMemo(() => {
    if (!allJobs || allJobs.length === 0) {
      return [];
    }

    return allJobs
      .map((job: ApiJob): Job | null => {
        const companyObj =
          job.company && typeof job.company === "object"
            ? (job.company as Record<string, unknown>)
            : null;

        const jobId = job.job_id || job.id || "";
        if (!jobId || jobId.trim() === "") {
          return null;
        }

        const jobTitle =
          job.job_title || job.title || job.position || "Untitled Position";
        const companyName =
          (companyObj?.name as string) ||
          (companyObj?.company_name as string) ||
          job.companyName ||
          job.employer_name ||
          job.company_name ||
          (typeof job.company === "string" ? job.company : null) ||
          "Unknown Company";

        const jobCity =
          job.job_city || job.city || (companyObj?.city as string) || "";
        const jobState =
          job.job_state || job.state || (companyObj?.state as string) || "";
        const jobCountry =
          job.job_country ||
          job.country ||
          (companyObj?.country as string) ||
          "";
        const locationString =
          job.jobLocation ||
          job.location ||
          (companyObj?.location as string) ||
          [jobCity, jobState, jobCountry].filter(Boolean).join(", ") ||
          "Location not specified";

        const applyLink =
          job.applyUrl ||
          job.jobUrl ||
          job.job_apply_link ||
          job.apply_link ||
          job.url ||
          job.apply_url ||
          job.company_url ||
          (companyObj?.url as string) ||
          "";

        // Extract company logo
        let companyLogo: string | undefined = undefined;
        if (job.companyLogo) companyLogo = job.companyLogo;
        if (!companyLogo && job.employer_logo) companyLogo = job.employer_logo;
        if (!companyLogo && job.company_logo) companyLogo = job.company_logo;
        if (!companyLogo && job.logo) companyLogo = job.logo;
        if (!companyLogo && job.logo_url) companyLogo = job.logo_url;
        if (!companyLogo && companyObj) {
          if (companyObj.logo) companyLogo = companyObj.logo as string;
          if (!companyLogo && companyObj.logo_url)
            companyLogo = companyObj.logo_url as string;
          if (!companyLogo && companyObj.company_logo)
            companyLogo = companyObj.company_logo as string;
        }

        if (companyLogo) {
          try {
            const url = new URL(companyLogo);
            if (!url.protocol.startsWith("http")) {
              companyLogo = undefined;
            }
          } catch {
            companyLogo = undefined;
          }
        }

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
            salaryCurrency.includes(sym)
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
            salaryCurrency.includes(sym)
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
        const employmentTypeRawUpper = employmentTypeRaw.toUpperCase();
        const employmentType =
          jobTypeLabels[employmentTypeRawUpper] ||
          jobTypeLabels[employmentTypeRaw] ||
          employmentTypeRaw ||
          "Full time";

        // Determine work arrangement
        let workArrangement = "On-site";
        const isRemote =
          job.job_is_remote || job.is_remote || job.remote === true;
        if (isRemote) {
          workArrangement = "Remote";
        } else if (jobTitle?.toLowerCase().includes("hybrid")) {
          workArrangement = "Hybrid";
        }

        return {
          id: jobId,
          title: jobTitle,
          company: companyName,
          location: locationString,
          url: applyLink,
          company_logo: companyLogo,
          is_saved: savedJobs?.includes(String(jobId)),
          salary,
          employment_type: employmentType,
          work_arrangement: workArrangement,
        };
      })
      .filter((job): job is Job => job !== null);
  }, [allJobs, savedJobs]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setPage((prev) => prev + 1);
  };

  // Get company logo from first job if available
  const companyLogo = transformedJobs[0]?.company_logo;
  const displayCompanyName = transformedJobs[0]?.company || decodedCompanyName;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 px-2 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/jobs")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>

          <div className="flex items-center gap-4 mb-6">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={`${displayCompanyName} logo`}
                className="w-16 h-16 rounded-full object-cover border border-gray-200"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                }}
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-breneo-accent flex items-center justify-center">
                <Building2 className="h-8 w-8 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{displayCompanyName}</h1>
              <p className="text-gray-500">
                {transformedJobs.length} Job
                {transformedJobs.length !== 1 ? "s" : ""} Available
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-center gap-3 mb-6">
            <AlertCircle className="h-5 w-5" />
            <p>
              <strong>Error:</strong> {(error as Error)?.message}
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && page === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-32 md:pb-16">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && transformedJobs.length === 0 && (
          <div className="text-center p-10 border border-dashed rounded-3xl text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h4 className="text-lg font-semibold mb-2">No Jobs Found</h4>
            <p className="text-sm">
              No job openings found for {displayCompanyName} at this time.
            </p>
          </div>
        )}

        {/* Job Cards Grid */}
        {transformedJobs.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
              {transformedJobs.map((job) => (
                <Card
                  key={job.id}
                  className="group flex flex-col transition-all duration-200 border border-gray-200 hover:border-gray-400 overflow-hidden rounded-3xl"
                >
                  <CardContent className="p-5 flex flex-col flex-grow relative">
                    {/* Company Logo and Info */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex-shrink-0 relative w-12 h-12">
                        {job.company_logo ? (
                          <img
                            src={job.company_logo}
                            alt={`${job.company} logo`}
                            className="w-12 h-12 rounded-full object-cover border border-gray-200 absolute inset-0 z-10"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              target.style.display = "none";
                              const iconFallback =
                                target.parentElement?.querySelector(
                                  ".logo-fallback"
                                ) as HTMLElement;
                              if (iconFallback) {
                                iconFallback.style.display = "flex";
                                iconFallback.style.zIndex = "10";
                              }
                            }}
                          />
                        ) : null}

                        {job.company && !job.company_logo ? (
                          <img
                            src={`https://logo.clearbit.com/${encodeURIComponent(
                              job.company
                            )}`}
                            alt={`${job.company} logo`}
                            className="w-12 h-12 rounded-full object-cover border border-gray-200 absolute inset-0 clearbit-logo"
                            style={{ zIndex: 10 }}
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              target.style.display = "none";
                              const iconFallback =
                                target.parentElement?.querySelector(
                                  ".logo-fallback"
                                ) as HTMLElement;
                              if (iconFallback) {
                                iconFallback.style.display = "flex";
                                iconFallback.style.zIndex = "10";
                              }
                            }}
                          />
                        ) : null}

                        <div
                          className={`w-12 h-12 rounded-full bg-breneo-accent flex items-center justify-center logo-fallback absolute inset-0 ${
                            job.company_logo ||
                            (job.company && !job.company_logo)
                              ? "hidden"
                              : "flex"
                          }`}
                          style={{
                            zIndex:
                              job.company_logo ||
                              (job.company && !job.company_logo)
                                ? 0
                                : 10,
                          }}
                        >
                          <Briefcase className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">
                          {job.company}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">
                          {job.location}
                        </p>
                      </div>
                    </div>

                    {/* Job Title */}
                    <h4 className="font-bold text-lg mb-4 line-clamp-2">
                      {job.title}
                    </h4>

                    {/* Job Details */}
                    <div className="space-y-2 mb-4 md:mb-4 flex-grow pb-20 md:pb-0">
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700">{job.salary}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700">
                          {job.employment_type}
                        </span>
                      </div>

                      {job.work_arrangement && (
                        <div className="flex items-center gap-2 text-sm">
                          <Briefcase className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700">
                            {job.work_arrangement}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 bg-card flex items-center gap-2 transform translate-y-0 md:translate-y-full md:group-hover:translate-y-0 transition-transform duration-200 ease-in-out shadow-lg">
                      <Button
                        variant="default"
                        onClick={() => {
                          if (!job.id || job.id.trim() === "") {
                            toast.error("Cannot open job: Invalid job ID");
                            return;
                          }
                          const encodedId = encodeURIComponent(job.id);
                          navigate(`/jobs/${encodedId}`);
                        }}
                        className="flex-1"
                        disabled={!job.id || job.id.trim() === ""}
                      >
                        View
                      </Button>
                      <Button
                        variant="default"
                        size="icon"
                        onClick={() => saveJobMutation.mutate(job)}
                        aria-label={job.is_saved ? "Unsave job" : "Save job"}
                        className={job.is_saved ? "bg-primary/90" : ""}
                      >
                        <Heart
                          className={`h-5 w-5 transition-colors ${
                            job.is_saved
                              ? "text-red-500 fill-red-500 animate-heart-pop"
                              : "text-white"
                          }`}
                        />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center mt-6 mb-8">
                <Button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  variant="outline"
                  className="min-w-[200px]"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More Jobs"
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CompanyJobsPage;

