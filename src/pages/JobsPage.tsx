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
  Bookmark,
  AlertCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { JobFilterModal } from "@/components/jobs/JobFilterModal";

// Updated Job interface for the new API
interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  company_logo?: string;
  is_saved: boolean;
}

// Filter state shape
interface JobFilters {
  country: string;
  jobTypes: string[];
  isRemote: boolean;
}

const JSEARCH_API_KEY = import.meta.env.VITE_JSEARCH_API_KEY;

// Updated fetchJobs to include filters and pagination
const fetchJobs = async (
  searchTerm: string,
  filters: JobFilters,
  page: number
) => {
  if (!JSEARCH_API_KEY) {
    throw new Error(
      "JSearch API key is missing. Please add VITE_JSEARCH_API_KEY to your .env file."
    );
  }

  // Use page parameter for fetching
  const params = new URLSearchParams({
    query: `${searchTerm} in ${filters.country}`,
    num_pages: String(page), // Dynamically set the page number
    employment_types: filters.jobTypes.join(","),
    work_from_home: String(filters.isRemote),
  });

  const API_ENDPOINT = `https://jsearch.p.rapidapi.com/search?${params.toString()}`;
  const API_HOST = "jsearch.p.rapidapi.com";

  const response = await fetch(API_ENDPOINT, {
    method: "GET",
    headers: {
      "x-rapidapi-key": JSEARCH_API_KEY,
      "x-rapidapi-host": API_HOST,
    },
  });

  if (response.status === 429) {
    throw new Error(
      "You have exceeded your API request limit. Please try again later."
    );
  }

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(
      `Failed to fetch jobs: ${errorBody.message || response.statusText}`
    );
  }

  const result = await response.json();
  return result.data || [];
};

const JobsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("Software Developer");
  const [isFilterModalOpen, setFilterModalOpen] = useState(false);
  const [page, setPage] = useState(1); // New state for current page

  // Filters are now managed in a single state object
  const [activeFilters, setActiveFilters] = useState<JobFilters>({
    country: "United States",
    jobTypes: ["FULLTIME"],
    isRemote: false,
  });

  const [tempFilters, setTempFilters] = useState<JobFilters>(activeFilters);

  // Effect to detect user's location on page load
  useEffect(() => {
    handleDetectLocation();
  }, []);

  const handleDetectLocation = () => {
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
            toast({
              title: "Location Detected",
              description: `Showing jobs in ${data.countryName}.`,
            });
          }
        } catch (error) {
          toast({
            title: "Could not determine your location.",
            variant: "destructive",
          });
        }
      },
      () => {
        toast({
          title: "Location permission denied.",
          description: "Defaulting to United States.",
        });
      }
    );
  };

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
    return (jobs || []).map(
      (job: any): Job => ({
        id: job.job_id,
        title: job.job_title,
        company: job.employer_name,
        location: [job.job_city, job.job_state, job.job_country]
          .filter(Boolean)
          .join(", "),
        url: job.job_apply_link,
        company_logo: job.employer_logo,
        is_saved: savedJobs.includes(job.job_id),
      })
    );
  }, [jobs, savedJobs]);

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
        <div className="flex gap-4 mb-8">
          <Input
            placeholder="Search by job title or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-grow"
          />
          <Button onClick={handleSearch}>Search</Button>{" "}
          {/* Added a Search button */}
          <Button variant="outline" onClick={() => setFilterModalOpen(true)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-16">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-16">
          {transformedJobs.map((job) => (
            <Card
              key={job.id}
              className="flex flex-col hover:shadow-lg transition-shadow duration-200"
            >
              <CardContent className="p-5 flex flex-col flex-grow">
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={job.company_logo || "/placeholder.svg"}
                    alt={`${job.company} logo`}
                    className="w-12 h-12 rounded-lg object-contain border p-1 bg-white"
                    onError={(e) => {
                      // Fallback on image load error
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src =
                        "https://placehold.co/48x48/f3f4f6/333333?text=Logo";
                    }}
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-md leading-tight">
                      {job.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {job.company}
                    </p>
                  </div>
                </div>
                <div className="flex-grow" />
                <div className="flex justify-between items-center mt-4">
                  <p className="text-xs text-muted-foreground truncate pr-2">
                    {job.location}
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => window.open(job.url, "_blank")}
                      disabled={!job.url}
                    >
                      Apply
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => saveJobMutation.mutate(job)}
                      aria-label={job.is_saved ? "Unsave job" : "Save job"}
                    >
                      <Bookmark
                        className={`h-4 w-4 transition-colors ${
                          job.is_saved
                            ? "fill-primary text-primary"
                            : "text-muted-foreground hover:text-primary"
                        }`}
                      />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination Controls */}
        {!isLoading && transformedJobs.length > 0 && (
          <div className="flex justify-center items-center gap-6 mt-8">
            <Button
              variant="outline"
              onClick={handlePrevPage}
              disabled={!isPrevPagePossible}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous Page
            </Button>
            <span className="text-sm font-medium text-gray-600">
              Page {page}
            </span>
            <Button
              variant="outline"
              onClick={handleNextPage}
              disabled={!isNextPagePossible}
            >
              Next Page
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
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
