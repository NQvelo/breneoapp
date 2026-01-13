/**
 * Job API Service
 *
 * Service for fetching active jobs from Breneo Job Aggregator API
 * Filters are only applied when user explicitly changes them in the frontend
 */

import { ApiJob, JobSearchParams, JobApiResponse, JobDetail } from "./types";
import { countries } from "@/data/countries";

// API Configuration
const JOB_API_BASE =
  "https://breneo-job-aggregator-k7ti.onrender.com/api/search";

// Rate limiter: ensures only 1 request per second
let lastRequestTime = 0;
const RATE_LIMIT_MS = 1000; // 1 second

/**
 * Rate-limited fetch wrapper
 */
const rateLimitedFetch = async (
  url: string,
  options: RequestInit
): Promise<Response> => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    const waitTime = RATE_LIMIT_MS - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
  return fetch(url, options);
};

/**
 * Interface for Breneo Job Aggregator API response
 */
interface BreneoJobApiResponse {
  id: number;
  title: string;
  company_name: string;
  company_logo?: string;
  location: string;
  description: string;
  apply_url: string;
  platform: string;
  external_job_id: string;
  posted_at: string | null;
  fetched_at: string;
  is_active: boolean;
  raw?: {
    absolute_url?: string;
    location?: {
      name?: string;
    };
    id?: number;
    updated_at?: string;
    requisition_id?: string;
    title?: string;
    company_name?: string;
    first_published?: string;
    language?: string;
    [key: string]: unknown;
  };
}

/**
 * Map Breneo API job to ApiJob interface
 */
const mapBreneoJobToApiJob = (job: BreneoJobApiResponse): ApiJob => {
  const baseJob: ApiJob = {
    id: String(job.id),
    job_id: String(job.id), // Use only id field, not external_job_id
    title: job.title,
    job_title: job.title,
    company: job.company_name,
    company_logo: job.company_logo,
    companyLogo: job.company_logo,
    company_name: job.company_name,
    employer_name: job.company_name,
    location: job.location,
    job_location: job.location,
    description: job.description,
    job_description: job.description,
    apply_url: job.apply_url,
    job_apply_link: job.apply_url,
    url: job.apply_url,
    date_posted: job.posted_at || job.fetched_at,
    posted_date: job.posted_at || job.fetched_at,
    posted_at: job.posted_at || job.fetched_at,
    fetched_at: job.fetched_at,
    status: job.is_active ? "active" : "inactive",
  };

  // Include raw data from the original API if it's an object
  if (job.raw && typeof job.raw === "object" && !Array.isArray(job.raw)) {
    return { ...baseJob, ...(job.raw as Record<string, unknown>) };
  }

  return baseJob;
};

/**
 * Response from Breneo API with pagination info
 */
interface BreneoApiResponse {
  jobs: ApiJob[];
  pagination?: {
    page?: number;
    num_pages?: number;
    total_pages?: number;
    total_results?: number;
    has_next?: boolean;
    has_previous?: boolean;
  };
}

/**
 * Fetch jobs from Breneo Job Aggregator API
 * The API returns filtered jobs based on query parameters
 * Returns jobs and pagination info from the API
 */
const fetchJobsFromBreneoAPI = async (
  params: JobSearchParams
): Promise<BreneoApiResponse> => {
  const { query, filters, page = 1, pageSize = 12 } = params;

  // Build query parameters
  const queryParams = new URLSearchParams();

  // Add query/search term
  // Check if we have any filters applied
  const hasFilters =
    filters.countries.length > 0 ||
    filters.jobTypes.length > 0 ||
    filters.isRemote ||
    filters.datePosted ||
    filters.skills.length > 0;

  const searchQuery = query && query.trim() ? query.trim() : "";

  if (searchQuery) {
    // User provided a query - use it
    queryParams.set("query", searchQuery);
  } else if (hasFilters) {
    // No query but has filters - use a broad default to get jobs that match filters
    queryParams.set("query", "developer");
  } else {
    // No query and no filters - try empty string to get ALL jobs from API
    // If API doesn't accept empty, it will return an error and we can handle it
    queryParams.set("query", "");
  }

  // Add page
  queryParams.set("page", String(page));

  // Add num_pages (how many pages to fetch per request)
  // When no filters/query, fetch MANY pages to get all jobs
  // When filters are applied, fetch enough to cover pageSize
  let pagesToFetch: number;
  if (!searchQuery && !hasFilters) {
    // No query and no filters - fetch maximum pages to get all jobs
    pagesToFetch = 100; // Fetch up to 100 pages to get all available jobs
  } else {
    // Has query or filters - calculate based on pageSize
    pagesToFetch = Math.max(
      1,
      Math.min(100, Math.ceil((pageSize || 200) / 20))
    );
  }

  queryParams.set("num_pages", String(pagesToFetch));

  console.log(
    `📄 Fetching ${pagesToFetch} pages of jobs (pageSize: ${
      pageSize || 200
    }, query: "${
      searchQuery || "(empty - all jobs)"
    }", hasFilters: ${hasFilters})`
  );

  // Add country filter (use first country if multiple, or default to 'us')
  if (filters.countries.length > 0) {
    queryParams.set("country", filters.countries[0].toLowerCase());
  } else {
    queryParams.set("country", "us"); // Default to US
  }

  // Add date_posted filter
  queryParams.set("date_posted", filters.datePosted || "all");

  // Build the API endpoint with query parameters
  const API_ENDPOINT = `${JOB_API_BASE}?${queryParams.toString()}`;

  // Debug: Log the full API endpoint URL for troubleshooting
  console.log("🔗 Full API Endpoint URL:", API_ENDPOINT);
  console.log(
    "🔗 Query Parameters:",
    Object.fromEntries(queryParams.entries())
  );

  console.log("🔍 Breneo Job API Request:", {
    url: API_ENDPOINT,
    filters: {
      countries: filters.countries,
      jobTypes: filters.jobTypes,
      isRemote: filters.isRemote,
      datePosted: filters.datePosted || "all",
      skills: filters.skills,
    },
    query: query,
    page: page,
  });

  try {
    console.log("🌐 Making API request to:", API_ENDPOINT);

    const response = await rateLimitedFetch(API_ENDPOINT, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    console.log(
      "✅ API Response Status:",
      response.status,
      response.statusText
    );
    console.log("✅ API Response Headers:", {
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
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
        console.error("❌ API Error Response:", errorBody);
        if (errorBody) {
          try {
            const errorJson = JSON.parse(errorBody);
            if (errorJson.message) {
              errorMessage = errorJson.message;
            } else if (errorJson.error) {
              errorMessage = errorJson.error;
            }
            console.error("❌ API Error Details:", errorJson);
          } catch (parseError) {
            errorMessage = `${errorMessage} - ${errorBody}`;
          }
        }
      } catch (e) {
        console.error("❌ Could not read error response body:", e);
      }
      throw new Error(errorMessage);
    }

    // Get response text first to see what we're actually getting
    const responseText = await response.text();
    console.log("📦 API Response text length:", responseText.length);
    console.log(
      "📦 API Response text preview (first 500 chars):",
      responseText.substring(0, 500)
    );

    let result: unknown;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("❌ Failed to parse API response as JSON:", parseError);
      console.error("❌ Full response text:", responseText);
      throw new Error(
        `Invalid JSON response from API: ${responseText.substring(0, 200)}`
      );
    }

    console.log(
      "📦 API Response parsed, type:",
      Array.isArray(result) ? "Array" : typeof result
    );
    console.log("📦 API Response preview:", {
      isArray: Array.isArray(result),
      hasResults: result && typeof result === "object" && "results" in result,
      keys: result && typeof result === "object" ? Object.keys(result) : [],
      arrayLength: Array.isArray(result) ? result.length : null,
      firstItem: Array.isArray(result) && result.length > 0 ? result[0] : null,
    });

    // Breneo API returns an array of jobs directly OR { results: [...], pagination: {...} }
    let jobsArray: ApiJob[] = [];
    let paginationInfo: BreneoApiResponse["pagination"] = undefined;

    if (Array.isArray(result)) {
      // Legacy format: direct array
      const breneoJobs = result as BreneoJobApiResponse[];
      console.log(
        `📊 Received ${breneoJobs.length} total jobs from API (legacy array format)`
      );

      if (breneoJobs.length === 0) {
        console.warn("⚠️ API returned empty array");
        console.log("🔍 Full API response:", JSON.stringify(result, null, 2));
        return { jobs: [], pagination: undefined };
      }

      // Filter only active jobs
      const activeJobs = breneoJobs.filter((job) => job.is_active !== false);
      console.log(`✅ ${activeJobs.length} active jobs after filtering`);

      // Map to ApiJob format
      jobsArray = activeJobs.map(mapBreneoJobToApiJob);
      console.log(`🎯 Mapped ${jobsArray.length} jobs to ApiJob format`);
    } else if (result && typeof result === "object" && "results" in result) {
      // Handle new API response format: { results: [...], pagination: {...}, filters: {...} }
      const paginatedResult = result as {
        results: BreneoJobApiResponse[];
        pagination?: {
          page?: number;
          num_pages?: number;
          total_pages?: number;
          total_results?: number;
          has_next?: boolean;
          has_previous?: boolean;
        };
        filters?: {
          query?: string;
          country?: string;
          date_posted?: string;
        };
      };
      const breneoJobs = paginatedResult.results || [];
      console.log(
        `📊 Received ${breneoJobs.length} jobs from paginated API response`
      );
      console.log("📊 Pagination info:", paginatedResult.pagination);
      console.log("📊 Applied filters:", paginatedResult.filters);

      if (breneoJobs.length === 0) {
        console.warn("⚠️ API returned empty results array");
        console.log("🔍 Full API response:", JSON.stringify(result, null, 2));
        return {
          jobs: [],
          pagination: paginatedResult.pagination,
        };
      }

      // Extract pagination info
      paginationInfo = paginatedResult.pagination;

      // Filter only active jobs
      const activeJobs = breneoJobs.filter((job) => job.is_active !== false);
      console.log(`✅ ${activeJobs.length} active jobs after filtering`);

      // Map to ApiJob format
      jobsArray = activeJobs.map(mapBreneoJobToApiJob);
      console.log(`🎯 Mapped ${jobsArray.length} jobs to ApiJob format`);
    } else {
      console.error("❌ Unexpected API response format:", result);
      console.error("❌ Full response:", JSON.stringify(result, null, 2));
      throw new Error(
        "Invalid response format from API - expected array of jobs or object with results array"
      );
    }

    if (jobsArray.length === 0) {
      console.warn("⚠️ No jobs returned from API after processing");
      console.warn("⚠️ This could mean:");
      console.warn("  1. API returned empty array");
      console.warn("  2. All jobs were filtered out (is_active = false)");
      console.warn("  3. Response format doesn't match expected structure");
      console.log("🔍 Full API response:", JSON.stringify(result, null, 2));
      return { jobs: [], pagination: paginationInfo };
    }

    console.log(`🔧 Starting frontend filtering for ${jobsArray.length} jobs`);

    // Check if any filters are actually applied
    const hasAnyFilters =
      filters.countries.length > 0 ||
      filters.jobTypes.length > 0 ||
      filters.isRemote ||
      (filters.datePosted && filters.datePosted !== "all") ||
      filters.skills.length > 0;

    // Apply frontend filters
    let filteredJobs = jobsArray;

    // Client-side search filtering: match search query against job title and company name
    // This ensures partial word matching works for every word in the search term
    if (searchQuery && searchQuery.trim()) {
      const searchTerms = searchQuery
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter((term) => term.length > 0);

      if (searchTerms.length > 0) {
        filteredJobs = filteredJobs.filter((job) => {
          // Get job title and company name
          const jobTitle = String(
            job.title || job.job_title || job.position || ""
          ).toLowerCase();
          const companyName = String(
            job.company_name ||
              job.employer_name ||
              (typeof job.company === "string" ? job.company : "") ||
              ""
          ).toLowerCase();

          // Check if ALL search terms match in either job title or company name
          // This allows partial word matching - each word in the search can match anywhere
          return searchTerms.every((term) => {
            return (
              jobTitle.includes(term) ||
              companyName.includes(term) ||
              // Also check if any word in title/company contains the search term
              jobTitle.split(/\s+/).some((word) => word.includes(term)) ||
              companyName.split(/\s+/).some((word) => word.includes(term))
            );
          });
        });
        console.log(
          `🔍 Client-side search filtering: ${filteredJobs.length} jobs match "${searchQuery}"`
        );
      }
    }

    // If no filters are applied and no search query, skip additional client-side filtering
    if (!hasAnyFilters && (!searchQuery || !searchQuery.trim())) {
      console.log(
        "✅ No filters or search query - returning all jobs without additional client-side filtering"
      );
      return { jobs: filteredJobs, pagination: paginationInfo };
    }

    // Note: Search query is now handled by the API endpoint, but we can still filter client-side if needed
    // The API handles the main query filtering, so we only do additional filtering here if necessary

    // Filter by country/location
    if (filters.countries.length > 0) {
      filteredJobs = filteredJobs.filter((job) => {
        const location = String(
          job.location || job.job_location || ""
        ).toLowerCase();
        return filters.countries.some((countryCode) => {
          const country = countries.find(
            (c) => c.code.toLowerCase() === countryCode.toLowerCase()
          );
          if (country) {
            return (
              location.includes(country.name.toLowerCase()) ||
              location.includes(countryCode.toLowerCase())
            );
          }
          return false;
        });
      });
    }

    // Filter by remote
    if (filters.isRemote) {
      filteredJobs = filteredJobs.filter((job) => {
        const location = String(
          job.location || job.job_location || ""
        ).toLowerCase();
        return (
          location.includes("remote") ||
          job.is_remote === true ||
          job.remote === true ||
          job.job_is_remote === true
        );
      });
    }

    // Filter by employment type
    if (filters.jobTypes.length > 0) {
      filteredJobs = filteredJobs.filter((job) => {
        const empType = (
          job.employment_type ||
          job.job_employment_type ||
          job.type ||
          ""
        )
          .toUpperCase()
          .replace(/[-\s]/g, "");
        return filters.jobTypes.some((type) => {
          const normalizedType = type.toUpperCase().replace(/[-\s]/g, "");
          return empType.includes(normalizedType);
        });
      });
    }

    // Filter by date posted
    if (filters.datePosted && filters.datePosted !== "all") {
      const now = Date.now();
      const daysMap: Record<string, number> = {
        day: 1,
        week: 7,
        month: 30,
      };
      const days = daysMap[filters.datePosted] || 30;
      const cutoffDate = now - days * 24 * 60 * 60 * 1000;

      filteredJobs = filteredJobs.filter((job) => {
        const postedDate =
          job.date_posted ||
          job.posted_date ||
          job.job_posted_at_datetime_utc ||
          job.postedAt;
        if (postedDate) {
          try {
            const jobDate = new Date(postedDate as string).getTime();
            return jobDate >= cutoffDate;
          } catch (e) {
            return true; // If date parsing fails, include the job
          }
        }
        return true;
      });
    }

    // Filter by skills (if specified)
    if (filters.skills.length > 0) {
      filteredJobs = filteredJobs.filter((job) => {
        const jobText = [
          job.title || job.job_title || "",
          job.description || job.job_description || "",
          job.job_required_experience || "",
        ]
          .join(" ")
          .toLowerCase();

        return filters.skills.some((skill) =>
          jobText.includes(skill.toLowerCase())
        );
      });
    }

    // Log the final response (pagination will be handled by fetchActiveJobs)
    console.log("📊 Breneo Job API Final Response:", {
      totalJobsFromAPI: jobsArray.length,
      afterFiltering: filteredJobs.length,
      filters: {
        query: query || "(none)",
        countries: filters.countries.length,
        jobTypes: filters.jobTypes.length,
        isRemote: filters.isRemote,
        skills: filters.skills.length,
      },
      sampleJob:
        filteredJobs.length > 0
          ? {
              id: filteredJobs[0].id || filteredJobs[0].job_id,
              title: filteredJobs[0].title || filteredJobs[0].job_title,
              company: filteredJobs[0].company || filteredJobs[0].company_name,
            }
          : null,
    });

    return { jobs: filteredJobs, pagination: paginationInfo };
  } catch (error) {
    console.error("❌ Error in fetchJobsFromBreneoAPI:", error);
    // Log more details about the error
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.error(
        "❌ Network error - API might be unreachable:",
        JOB_API_BASE
      );
      throw new Error(
        "Unable to connect to job API. Please check your internet connection and try again."
      );
    }
    throw error;
  }
};

/**
 * Fetch job details from Breneo Job Aggregator API
 */
export const fetchJobDetail = async (jobId: string): Promise<JobDetail> => {
  if (!jobId) throw new Error("Job ID is required");

  console.log("🔍 Fetching job detail for ID:", jobId);

  // Use the new job-details endpoint with the "id" field (not external_job_id)
  // In development, use relative path to go through Vite proxy
  // In production, use the full URL
  const isDevelopment = import.meta.env.DEV;
  const JOB_DETAIL_API_BASE = isDevelopment
    ? "/api/job-details" // Relative path goes through Vite proxy to http://127.0.0.1:8000
    : "https://breneo-job-aggregator-k7ti.onrender.com/api/job-details"; // Direct URL in production

  const queryParams = new URLSearchParams();
  queryParams.set("job_id", jobId); // Use the "id" field from the job

  const API_ENDPOINT = `${JOB_DETAIL_API_BASE}?${queryParams.toString()}`;

  console.log(`🔍 Fetching job details from: ${API_ENDPOINT}`);

  try {
    const response = await rateLimitedFetch(API_ENDPOINT, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 429) {
      throw new Error(
        "You have exceeded your API request limit. Please try again later."
      );
    }

    if (!response.ok) {
      let errorMessage = `Failed to fetch job details: ${response.status} ${response.statusText}`;
      try {
        const errorBody = await response.text();
        console.error("API Error Response:", errorBody);
        if (errorBody) {
          try {
            const errorJson = JSON.parse(errorBody);
            if (errorJson.message) {
              errorMessage = errorJson.message;
            } else if (errorJson.error) {
              errorMessage = errorJson.error;
            }
            console.error("API Error Details:", errorJson);
          } catch (parseError) {
            errorMessage = `${errorMessage} - ${errorBody}`;
          }
        }
      } catch (e) {
        console.error("Could not read error response body:", e);
      }
      throw new Error(errorMessage);
    }

    const result: unknown = await response.json();

    // Handle different response formats
    let jobData: BreneoJobApiResponse | null = null;

    if (Array.isArray(result) && result.length > 0) {
      // If response is an array, take the first item
      jobData = result[0] as BreneoJobApiResponse;
    } else if (result && typeof result === "object") {
      // If response is an object, check for common wrapper fields
      if (
        "results" in result &&
        Array.isArray((result as { results: unknown[] }).results)
      ) {
        const results = (result as { results: BreneoJobApiResponse[] }).results;
        if (results.length > 0) {
          jobData = results[0];
        }
      } else if ("data" in result) {
        // Check for "data" wrapper
        const data = (result as { data: unknown }).data;
        if (data && typeof data === "object") {
          jobData = data as BreneoJobApiResponse;
        }
      } else {
        // Assume the object itself is the job data
        jobData = result as BreneoJobApiResponse;
      }
    }

    if (!jobData) {
      console.error("❌ Job not found or invalid response format:", result);
      throw new Error(`No job found with ID: ${jobId}`);
    }

    console.log("✅ Found job:", {
      id: jobData.id,
      title: jobData.title,
      company: jobData.company_name,
    });

    // Map to JobDetail format using new API structure
    let jobDetail: JobDetail = {
      id: String(jobData.id),
      job_id: String(jobData.id), // Use only id field, not external_job_id
      title: jobData.title,
      job_title: jobData.title,
      company: jobData.company_name,
      company_logo: jobData.company_logo,
      companyLogo: jobData.company_logo,
      company_name: jobData.company_name,
      employer_name: jobData.company_name,
      location: jobData.location,
      job_location: jobData.location,
      description: jobData.description || "",
      job_description: jobData.description || "",
      apply_url: jobData.apply_url,
      job_apply_link: jobData.apply_url,
      url: jobData.apply_url,
      date_posted: jobData.posted_at || jobData.fetched_at,
      posted_date: jobData.posted_at || jobData.fetched_at,
      posted_at: jobData.posted_at || jobData.fetched_at,
      fetched_at: jobData.fetched_at,
    };

    // Include raw data from the original API if it's an object
    if (
      jobData.raw &&
      typeof jobData.raw === "object" &&
      !Array.isArray(jobData.raw)
    ) {
      jobDetail = { ...jobDetail, ...(jobData.raw as Record<string, unknown>) };
    }

    // Include all other fields from the API response
    Object.keys(jobData).forEach((key) => {
      if (!(key in jobDetail)) {
        (jobDetail as Record<string, unknown>)[key] = (
          jobData as Record<string, unknown>
        )[key];
      }
    });

    console.log("✅ Processed job detail:", jobDetail);
    return jobDetail;
  } catch (error) {
    console.error("❌ Error fetching job details:", error);

    // Provide more helpful error messages
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      const isDevelopment = import.meta.env.DEV;
      if (isDevelopment) {
        throw new Error(
          "Failed to connect to job details API. Please ensure the backend server is running at http://127.0.0.1:8000"
        );
      } else {
        throw new Error(
          "Failed to connect to job details API. Please check your network connection."
        );
      }
    }

    // Re-throw the original error if it's already an Error instance
    if (error instanceof Error) {
      throw error;
    }

    // Wrap unknown errors
    throw new Error(`Failed to fetch job details: ${String(error)}`);
  }
};

/**
 * Main function to fetch active jobs
 * Combines search term with skills and fetches from Breneo Job Aggregator API
 * Filters are applied on the frontend after fetching all jobs
 * Only returns jobs that are currently active
 */
export const fetchActiveJobs = async (
  params: JobSearchParams
): Promise<JobApiResponse> => {
  try {
    // Build query parameter combining search term and skills
    const queryParts: string[] = [];

    // Add search term if provided
    if (params.query && params.query.trim()) {
      queryParts.push(params.query.trim());
    }

    // Add skills to query ONLY if skills are provided and not empty
    // Note: The caller should handle the "all interests selected" case by passing empty skills array
    if (params.filters.skills.length > 0) {
      // Combine skills into query - API will search for jobs matching these skills
      queryParts.push(...params.filters.skills);
    }

    // If no query parts, use empty string to get all jobs (or use a default search term)
    const query = queryParts.length > 0 ? queryParts.join(" ") : "";

    // Fetch jobs from Breneo API (filtering is done in fetchJobsFromBreneoAPI)
    const apiResponse = await fetchJobsFromBreneoAPI({
      ...params,
      query,
      filters: params.filters,
    });

    const allJobs = apiResponse.jobs;
    const apiPagination = apiResponse.pagination;

    // Remove duplicates based on job_id
    const seenJobIds = new Set<string>();
    const uniqueJobs: ApiJob[] = [];

    for (const job of allJobs) {
      const jobId = job.job_id || job.id || "";
      if (jobId && !seenJobIds.has(jobId)) {
        seenJobIds.add(jobId);
        uniqueJobs.push(job);
      } else if (!jobId) {
        // If no ID, use title + company as unique identifier
        const uniqueKey = `${job.job_title || job.title || ""}_${
          job.employer_name || job.company_name || job.company || ""
        }`;
        if (!seenJobIds.has(uniqueKey)) {
          seenJobIds.add(uniqueKey);
          uniqueJobs.push(job);
        }
      }
    }

    // Use API pagination info if available, otherwise use client-side pagination
    let paginatedJobs: ApiJob[];
    let hasMore: boolean;
    let total: number;

    if (apiPagination) {
      // Use API pagination info - API already paginated, use all unique jobs from this page
      paginatedJobs = uniqueJobs; // API already paginated, use all unique jobs
      hasMore = apiPagination.has_next ?? false;
      total = apiPagination.total_results ?? uniqueJobs.length;
      console.log(
        `Using API pagination: ${uniqueJobs.length} unique jobs, hasMore: ${hasMore}, total: ${total}`
      );
    } else {
      // Fallback to client-side pagination
      const pageSize = params.pageSize || 12;
      const page = params.page || 1;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      paginatedJobs = uniqueJobs.slice(startIndex, endIndex);
      hasMore = endIndex < uniqueJobs.length;
      total = uniqueJobs.length;
      console.log(
        `Client-side pagination: Fetched ${uniqueJobs.length} unique jobs, showing ${paginatedJobs.length} on page ${page}`
      );
    }

    if (paginatedJobs.length > 0) {
      console.log("Sample job structure:", paginatedJobs[0]);
    }

    return {
      jobs: paginatedJobs,
      page: apiPagination?.page ?? params.page ?? 1,
      pageSize: params.pageSize || 12,
      hasMore: hasMore,
      total: total,
    };
  } catch (error) {
    console.error("Error fetching jobs:", error);
    throw error;
  }
};

/**
 * Fetch jobs from Breneo API (legacy function name - kept for backward compatibility)
 */
export const fetchJobsFromJSearch = async (
  params: JobSearchParams
): Promise<ApiJob[]> => {
  const response = await fetchJobsFromBreneoAPI(params);
  return response.jobs;
};

/**
 * Fetch jobs from multiple sources and merge results
 */
export const fetchJobsFromMultipleSources = async (
  params: JobSearchParams
): Promise<JobApiResponse> => {
  // Use Breneo Job Aggregator API as primary source
  try {
    return await fetchActiveJobs(params);
  } catch (error) {
    console.error("Primary job source failed:", error);
    // Could add fallback logic here to try other APIs
    throw error;
  }
};

// Test function for console debugging
export const testFetchJobs = async (
  query: string = "developer",
  page: number = 1
) => {
  console.log("🧪 Testing job fetch with:", { query, page });

  try {
    const params: JobSearchParams = {
      query,
      filters: {
        country: undefined,
        countries: [],
        jobTypes: [],
        isRemote: false,
        datePosted: undefined,
        skills: [],
        salaryMin: undefined,
        salaryMax: undefined,
        salaryByAgreement: undefined,
      },
      page,
      pageSize: 50,
    };

    const result = await fetchActiveJobs(params);
    console.log("✅ Test fetch successful:", {
      jobsCount: result.jobs.length,
      hasMore: result.hasMore,
      total: result.total,
      firstJob: result.jobs[0] || null,
    });

    return result;
  } catch (error) {
    console.error("❌ Test fetch failed:", error);
    throw error;
  }
};

// Direct API test function - tests raw API endpoint
export const testDirectAPI = async (
  query: string = "developer",
  page: number = 1,
  numPages: number = 1
) => {
  console.log("🧪 Testing direct API call with:", { query, page, numPages });

  const queryParams = new URLSearchParams();
  queryParams.set("query", query);
  queryParams.set("page", String(page));
  queryParams.set("num_pages", String(numPages));
  queryParams.set("country", "us");
  queryParams.set("date_posted", "all");

  const url = `${JOB_API_BASE}?${queryParams.toString()}`;
  console.log("🌐 API URL:", url);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    console.log("📡 Response status:", response.status, response.statusText);
    console.log("📡 Response headers:", {
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
    });

    const text = await response.text();
    console.log("📦 Response text length:", text.length);
    console.log("📦 Response text preview:", text.substring(0, 500));

    const json = JSON.parse(text);
    console.log("✅ Parsed JSON:", {
      isArray: Array.isArray(json),
      type: typeof json,
      length: Array.isArray(json) ? json.length : null,
      keys:
        typeof json === "object" && json !== null ? Object.keys(json) : null,
      firstItem: Array.isArray(json) && json.length > 0 ? json[0] : null,
    });

    return json;
  } catch (error) {
    console.error("❌ Direct API test failed:", error);
    throw error;
  }
};

// Make test function available on window for console access
if (typeof window !== "undefined") {
  interface WindowWithJobService extends Window {
    testFetchJobs?: typeof testFetchJobs;
    testDirectAPI?: typeof testDirectAPI;
    jobService?: {
      fetchActiveJobs: typeof fetchActiveJobs;
      fetchJobDetail: typeof fetchJobDetail;
      fetchJobsFromBreneoAPI: typeof fetchJobsFromBreneoAPI;
      testFetchJobs: typeof testFetchJobs;
      testDirectAPI: typeof testDirectAPI;
    };
  }

  const win = window as WindowWithJobService;
  win.testFetchJobs = testFetchJobs;
  win.testDirectAPI = testDirectAPI;
  win.jobService = {
    fetchActiveJobs,
    fetchJobDetail,
    fetchJobsFromBreneoAPI,
    testFetchJobs,
    testDirectAPI,
  };
  console.log("🔧 Job service test functions available:");
  console.log(
    "  - window.testFetchJobs(query, page) - Test through service layer"
  );
  console.log(
    "  - window.testDirectAPI(query, page, numPages) - Test raw API endpoint"
  );
  console.log("  - window.jobService.fetchActiveJobs(params)");
  console.log("  - window.jobService.fetchJobsFromBreneoAPI(params)");
}

// Default export
const jobService = {
  fetchActiveJobs,
  fetchJobDetail,
  fetchJobsFromBreneoAPI,
  fetchJobsFromJSearch,
  fetchJobsFromMultipleSources,
  testFetchJobs,
  testDirectAPI,
};

export default jobService;
