import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bookmark,
  AlertCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Users,
  MapPin,
  Search,
  PiggyBank,
  TrendingUp,
  UtensilsCrossed,
  Truck,
  Clock,
  DollarSign,
  Tag,
  Sun,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { JobFilterModal } from "@/components/jobs/JobFilterModal";
import { countries } from "@/data/countries";

// Updated Job interface for the new API
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

// API response job structure - supports multiple API formats
interface ApiJob {
  // JSearch format
  job_id?: string;
  job_title?: string;
  employer_name?: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_apply_link?: string;
  employer_logo?: string;
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_currency?: string;
  job_salary_period?: string;
  job_employment_type?: string;
  job_is_remote?: boolean;
  job_required_experience?: string;
  // Alternative formats (for different APIs)
  id?: string;
  title?: string;
  company?: string;
  company_name?: string;
  city?: string;
  state?: string;
  country?: string;
  location?: string;
  apply_link?: string;
  url?: string;
  apply_url?: string;
  logo?: string;
  company_logo?: string;
  min_salary?: number;
  max_salary?: number;
  salary?: string;
  salary_currency?: string;
  salary_period?: string;
  employment_type?: string;
  type?: string;
  is_remote?: boolean;
  remote?: boolean;
  experience?: string;
  required_experience?: string;
  [key: string]: unknown; // Allow any other fields
}

// Filter state shape
interface JobFilters {
  country: string;
  jobTypes: string[];
  isRemote: boolean;
  datePosted?: string; // Add date_posted filter
}

const JSEARCH_API_KEY = "f438e914d7msh480f4890d34c417p1f564ajsnce17947c5ab2";

const jobTypes = ["FULLTIME", "PARTTIME", "CONTRACTOR", "INTERN"];

const jobTypeLabels: Record<string, string> = {
  FULLTIME: "Full Time",
  PARTTIME: "Part Time",
  CONTRACTOR: "Contractor",
  INTERN: "Intern",
};

// Job categories with icons and colors
interface JobCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  vacancyCount: number;
}

const jobCategories: JobCategory[] = [
  {
    id: "banking",
    name: "Banking Sector",
    icon: PiggyBank,
    color: "text-blue-500",
    vacancyCount: 411,
  },
  {
    id: "sales",
    name: "Sales / Trade",
    icon: TrendingUp,
    color: "text-breneo-accent",
    vacancyCount: 111,
  },
  {
    id: "service",
    name: "Service Staff",
    icon: Users,
    color: "text-orange-500",
    vacancyCount: 39,
  },
  {
    id: "horeca",
    name: "HoReCa",
    icon: UtensilsCrossed,
    color: "text-teal-500",
    vacancyCount: 30,
  },
  {
    id: "logistics",
    name: "Logistics",
    icon: Truck,
    color: "text-blue-400",
    vacancyCount: 27,
  },
];

// Updated fetchJobs to include filters and pagination
const fetchJobs = async (
  searchTerm: string,
  filters: JobFilters,
  page: number
) => {
  const API_ENDPOINT = `https://internships-api.p.rapidapi.com/active-jb-7d`;
  const API_HOST = "internships-api.p.rapidapi.com";

  try {
    const response = await fetch(API_ENDPOINT, {
      method: "GET",
      headers: {
        "X-Rapidapi-Key": JSEARCH_API_KEY,
        "X-Rapidapi-Host": API_HOST,
      },
    });

    if (response.status === 429) {
      throw new Error(
        "You have exceeded your API request limit. Please try again later."
      );
    }

    if (!response.ok) {
      let errorMessage = `Failed to fetch jobs: ${response.status} ${response.statusText}`;
      try {
        const errorBody = await response.text();
        if (errorBody) {
          try {
            const errorJson = JSON.parse(errorBody);
            errorMessage = errorJson.message || errorJson.error || errorMessage;
          } catch (parseError) {
            // If not JSON, use the text as error message
            errorMessage = `${errorMessage} - ${errorBody}`;
          }
        }
      } catch (e) {
        // If we can't read the body, just use the status
        console.error("Could not read error response body:", e);
      }
      throw new Error(errorMessage);
    }

    const result: unknown = await response.json();
    console.log("API Response:", result);

    // Handle different possible response structures
    // The API might return data directly as an array, or in a data property, or in a results property
    let jobsArray: ApiJob[] = [];

    if (Array.isArray(result)) {
      jobsArray = result as ApiJob[];
    } else if (result && typeof result === "object") {
      const resultObj = result as Record<string, unknown>;
      if (Array.isArray(resultObj.data)) {
        jobsArray = resultObj.data as ApiJob[];
      } else if (Array.isArray(resultObj.results)) {
        jobsArray = resultObj.results as ApiJob[];
      } else if (Array.isArray(resultObj.jobs)) {
        jobsArray = resultObj.jobs as ApiJob[];
      } else if (Array.isArray(resultObj.items)) {
        jobsArray = resultObj.items as ApiJob[];
      } else {
        console.warn("Unexpected API response structure:", result);
        console.warn("Response keys:", Object.keys(resultObj));
        return [];
      }
    } else {
      console.warn("Unexpected API response type:", typeof result);
      return [];
    }

    console.log(`Fetched ${jobsArray.length} jobs`);
    if (jobsArray.length > 0) {
      console.log("Sample job structure:", jobsArray[0]);
    }

    return jobsArray;
  } catch (error) {
    console.error("Error fetching jobs:", error);
    throw error;
  }
};

const JobsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterModalOpen, setFilterModalOpen] = useState(false);
  const [page, setPage] = useState(1); // New state for current page

  // Filters are now managed in a single state object
  const [activeFilters, setActiveFilters] = useState<JobFilters>({
    country: "United States",
    jobTypes: ["FULLTIME"],
    isRemote: false,
    datePosted: "all",
  });

  const [tempFilters, setTempFilters] = useState<JobFilters>(activeFilters);

  // Local state for search bar dropdowns
  const [selectedJobType, setSelectedJobType] = useState<string>(
    activeFilters.jobTypes.length > 0 ? activeFilters.jobTypes[0] : "all"
  );
  const [selectedLocation, setSelectedLocation] = useState<string>(
    activeFilters.country
  );

  const handleDetectLocation = React.useCallback(() => {
    // Check if location toast has already been shown in this session
    const locationToastShown = sessionStorage.getItem("locationToastShown");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Note: This API call is kept as is for Geo-detection
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const data = await response.json();
          if (data.countryName) {
            setActiveFilters((prev) => ({
              ...prev,
              country: data.countryName,
            }));
            setTempFilters((prev) => ({ ...prev, country: data.countryName }));

            // Only show toast if not shown in this session
            if (!locationToastShown) {
              toast({
                title: "Location Detected",
                description: `Showing jobs in ${data.countryName}.`,
                duration: 2000,
              });
              sessionStorage.setItem("locationToastShown", "true");
            }
          }
        } catch (error) {
          // Only show error toast if not shown in this session
          if (!locationToastShown) {
            toast({
              title: "Could not determine your location.",
              variant: "destructive",
              duration: 2000,
            });
            sessionStorage.setItem("locationToastShown", "true");
          }
        }
      },
      () => {
        // Only show permission denied toast if not shown in this session
        if (!locationToastShown) {
          toast({
            title: "Location permission denied.",
            description: "Defaulting to United States.",
            duration: 2000,
          });
          sessionStorage.setItem("locationToastShown", "true");
        }
      }
    );
  }, [toast]);

  // Effect to detect user's location on page load
  useEffect(() => {
    handleDetectLocation();
  }, [handleDetectLocation]);

  const { data: savedJobs = [] } = useQuery<string[]>({
    queryKey: ["savedJobs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("saved_jobs")
        .select("job_id")
        .eq("user_id", user.id);
      return data?.map((item) => item.job_id) || [];
    },
    enabled: !!user,
  });

  const {
    data: jobs = [],
    isLoading,
    error,
  } = useQuery({
    // Add page to the query key so React Query refetches when page changes
    queryKey: ["jobs", searchTerm, activeFilters, page],
    // Pass the current page to the fetching function
    queryFn: () => fetchJobs(searchTerm, activeFilters, page),
    // Add these options to prevent excessive refetching
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // Keep data fresh for 5 minutes
  });

  // Refetch when search term changes (user presses Enter or clicks a Search button)
  const handleSearch = () => {
    setPage(1); // Reset to first page on new search
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
  };

  // Handle key press for search (Enter)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const saveJobMutation = useMutation({
    mutationFn: async (job: Job) => {
      if (!user) throw new Error("User not logged in");
      if (job.is_saved) {
        await supabase
          .from("saved_jobs")
          .delete()
          .eq("user_id", user.id)
          .eq("job_id", job.id);
      } else {
        await supabase
          .from("saved_jobs")
          .insert({ user_id: user.id, job_id: job.id, job_data: job });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["savedJobs", user?.id] });
      toast({
        title: variables.is_saved ? "Job Unsaved" : "Job Saved",
      });
    },
  });

  const transformedJobs = React.useMemo(() => {
    return (jobs || []).map((job: ApiJob): Job => {
      // Extract fields with fallbacks for different API formats
      const jobId = job.job_id || job.id || "";
      const jobTitle = job.job_title || job.title || "Untitled Position";
      const companyName =
        job.employer_name ||
        job.company_name ||
        job.company ||
        "Unknown Company";
      const jobCity = job.job_city || job.city || "";
      const jobState = job.job_state || job.state || "";
      const jobCountry = job.job_country || job.country || "";
      const locationString =
        job.location ||
        [jobCity, jobState, jobCountry].filter(Boolean).join(", ") ||
        "Location not specified";
      const applyLink =
        job.job_apply_link || job.apply_link || job.url || job.apply_url || "";
      const companyLogo = job.employer_logo || job.company_logo || job.logo;

      // Format salary - handle both numeric and string formats
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

      return {
        id: jobId,
        title: jobTitle,
        company: companyName,
        location: locationString,
        url: applyLink,
        company_logo: companyLogo,
        is_saved: savedJobs.includes(jobId),
        salary,
        employment_type: employmentType,
        work_arrangement: workArrangement,
      };
    });
  }, [jobs, savedJobs]);

  // Handle work type change
  const handleWorkTypeChange = (value: string) => {
    setSelectedJobType(value);
    setActiveFilters((prev) => ({
      ...prev,
      jobTypes: value === "all" || !value ? ["FULLTIME"] : [value],
    }));
    setPage(1);
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
  };

  // Handle location change
  const handleLocationChange = (value: string) => {
    setSelectedLocation(value);
    setActiveFilters((prev) => ({
      ...prev,
      country: value,
    }));
    setPage(1);
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
  };

  // Update selected values when filters change externally (e.g., from filter modal)
  useEffect(() => {
    if (activeFilters.jobTypes.length > 0) {
      setSelectedJobType(activeFilters.jobTypes[0]);
    } else {
      setSelectedJobType("all");
    }
    setSelectedLocation(activeFilters.country);
  }, [activeFilters]);

  const handleApplyFilters = () => {
    setActiveFilters(tempFilters);
    setPage(1); // Reset to first page when applying new filters
    setFilterModalOpen(false);
  };

  const handleNextPage = () => {
    setPage((prev) => prev + 1);
    // Automatically scroll to the top of the job list on page change
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrevPage = () => {
    setPage((prev) => Math.max(1, prev - 1));
    // Automatically scroll to the top of the job list on page change
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Determine if there are enough jobs to assume a next page might exist
  // JSearch API returns a max of 20 results per page, so if we get exactly 20, we assume there's a next page.
  const isNextPagePossible =
    transformedJobs.length > 0 && transformedJobs.length === 20;
  const isPrevPagePossible = page > 1;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 px-2 sm:px-6 lg:px-8">
        {/* Modern Search Bar */}
        <div className="mb-8">
          <div className="relative flex flex-col md:flex-row items-stretch md:items-center bg-white border-2 border-breneo-accent rounded-full px-3 md:px-4 py-2 shadow-sm gap-2 md:gap-0">
            {/* Search Field */}
            <div className="flex items-center flex-1 min-w-0 order-1">
              <Briefcase className="h-5 w-5 text-breneo-accent flex-shrink-0 mr-2 md:mr-3" />
              <Input
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 placeholder:text-gray-400 text-sm text-gray-900 flex-1 min-w-0 bg-transparent"
              />
            </div>

            {/* Separator - Hidden on mobile */}
            <div className="hidden md:block h-8 w-px bg-gray-300 mx-2 flex-shrink-0" />

            {/* Work Types Field */}
            <div className="flex items-center flex-1 min-w-0 order-2 md:order-3">
              <Users className="h-5 w-5 text-breneo-accent flex-shrink-0 mr-2 md:mr-3" />
              <Select
                value={selectedJobType || "all"}
                onValueChange={(value) =>
                  handleWorkTypeChange(value === "all" ? "" : value)
                }
              >
                <SelectTrigger className="border-0 focus:ring-0 focus:ring-offset-0 px-0 h-auto py-0 shadow-none text-gray-400 data-[placeholder]:text-gray-400 text-sm flex-1 min-w-0 [&>span]:text-left bg-transparent hover:bg-transparent">
                  <SelectValue placeholder="Work types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {jobTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {jobTypeLabels[type] || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Separator - Hidden on mobile */}
            <div className="hidden md:block h-8 w-px bg-gray-300 mx-2 flex-shrink-0" />

            {/* Location Field */}
            <div className="flex items-center flex-1 min-w-0 order-3 md:order-5">
              <MapPin className="h-5 w-5 text-breneo-accent flex-shrink-0 mr-2 md:mr-3" />
              <Select
                value={selectedLocation}
                onValueChange={handleLocationChange}
              >
                <SelectTrigger className="border-0 focus:ring-0 focus:ring-offset-0 px-0 h-auto py-0 shadow-none text-gray-400 data-[placeholder]:text-gray-400 text-sm flex-1 min-w-0 [&>span]:text-left bg-transparent hover:bg-transparent">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.name}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 md:ml-4 flex-shrink-0 order-4 md:order-6">
              {/* Filter Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-200 text-breneo-accent border-0"
                onClick={() => setFilterModalOpen(true)}
                aria-label="Filter jobs"
              >
                <Filter className="h-5 w-5" />
              </Button>

              {/* Search Button */}
              <Button
                size="icon"
                className="h-10 w-10 rounded-full bg-breneo-accent hover:bg-breneo-accent/90 text-white md:-mr-2 shadow-md"
                onClick={handleSearch}
                aria-label="Search jobs"
              >
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Job Categories Section */}
        <div className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {jobCategories.map((category) => {
              const IconComponent = category.icon;
              return (
                <Card
                  key={category.id}
                  className="cursor-pointer hover:shadow-md transition-shadow duration-200 border border-gray-200"
                >
                  <CardContent className="p-4 flex flex-col items-start">
                    <IconComponent
                      className={`h-8 w-8 ${category.color} mb-3`}
                    />
                    <h3 className="font-semibold text-sm mb-1">
                      {category.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {category.vacancyCount} Vacancy
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Latest Vacancies Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Sun className="h-6 w-6 text-yellow-500" />
            <h2 className="text-2xl font-bold">Latest Vacancies</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">All vacancies</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={handlePrevPage}
                disabled={!isPrevPagePossible || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={handleNextPage}
                disabled={!isNextPagePossible || isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-center gap-3 mb-6">
            <AlertCircle className="h-5 w-5" />
            <p>
              <strong>Error:</strong> {(error as Error).message}
            </p>
          </div>
        )}

        {isLoading && (
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

        {!isLoading && transformedJobs.length === 0 && (
          <div className="text-center p-10 border border-dashed rounded-lg bg-gray-50 text-muted-foreground">
            <AlertCircle className="mx-auto h-12 w-12 mb-4 text-gray-400" />
            <h4 className="text-lg font-semibold">No Jobs Found</h4>
            <p className="text-sm">
              Try adjusting your search terms or filters.
            </p>
          </div>
        )}

        {/* Job Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-32 md:pb-16">
          {transformedJobs.map((job) => (
            <Card
              key={job.id}
              className="flex flex-col hover:shadow-lg transition-shadow duration-200 border border-gray-200"
            >
              <CardContent className="p-5 flex flex-col flex-grow">
                {/* Company Logo and Info */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0">
                    {job.company_logo ? (
                      <img
                        src={job.company_logo}
                        alt={`${job.company} logo`}
                        className="w-12 h-12 rounded-full object-cover border border-gray-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
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
                      <div className="w-12 h-12 rounded-full bg-breneo-accent flex items-center justify-center">
                        <Briefcase className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base mb-1 truncate">
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
                <div className="space-y-2 mb-4 flex-grow">
                  {/* Salary */}
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700">{job.salary}</span>
                  </div>

                  {/* Employment Type */}
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700">{job.employment_type}</span>
                  </div>

                  {/* Work Arrangement */}
                  {job.work_arrangement && (
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-700">
                        {job.work_arrangement}
                      </span>
                    </div>
                  )}

                  {/* Benefits */}
                  {job.benefits && (
                    <div className="flex items-center gap-2 text-sm">
                      <Tag className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-700">{job.benefits}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-auto pt-4 border-t border-gray-100">
                  <Button
                    onClick={() => window.open(job.url, "_blank")}
                    disabled={!job.url}
                    className="flex-1 bg-black text-white hover:bg-gray-800 rounded-lg"
                  >
                    Send
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 rounded-lg border-gray-300"
                    onClick={() => saveJobMutation.mutate(job)}
                    aria-label={job.is_saved ? "Unsave job" : "Save job"}
                  >
                    <Bookmark
                      className={`h-5 w-5 transition-colors ${
                        job.is_saved
                          ? "fill-black text-black"
                          : "text-gray-400 hover:text-black"
                      }`}
                    />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <JobFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        filters={tempFilters}
        onFiltersChange={setTempFilters}
        onApply={handleApplyFilters} // Use the new handler
      />
    </DashboardLayout>
  );
};

export default JobsPage;
