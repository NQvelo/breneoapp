/**
 * Job API Service
 *
 * Service for fetching active jobs from Breneo Job Aggregator API.
 * Uses /api/search for full multi-value filtering (comma-separated params).
 * Falls back to /api/v1/jobs/ when search endpoint is unavailable.
 */

import { ApiJob, JobSearchParams, JobApiResponse, JobDetail } from "./types";
import { countries } from "@/data/countries";

const API_BASE = "https://breneo-job-aggregator.up.railway.app";

// Primary: multi-value filters (comma-separated), recommended for full filtering
const JOB_SEARCH_API = `${API_BASE}/api/search`;

// Fallback: single-value filters only
const JOB_API_BASE = `${API_BASE}/api/v1/jobs/`;

/**
 * Map country code (e.g. "DE", "US") to lowercase for /api/search country param.
 * API expects: us, uk, de, fr, ca, au, in, nl, etc.
 */
const getCountryCodeForApi = (code: string): string =>
  code.trim().toLowerCase();

/**
 * Map country code to country name (for v1/jobs location param fallback).
 */
const getCountryNameFromCode = (code: string): string => {
  const normalized = code.trim().toUpperCase();
  const country = countries.find((c) => c.code.toUpperCase() === normalized);
  return country?.name ?? code;
};

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
 * Map /api/search job response to ApiJob (company is nested object).
 */
const mapSearchJobToApiJob = (job: Record<string, unknown>): ApiJob => {
  const company = job.company as Record<string, unknown> | undefined;
  const companyName =
    (company?.name as string) ||
    (job.company_name as string) ||
    "Unknown Company";
  const companyLogo =
    (company?.logo as string) || (job.company_logo as string) || undefined;

  return {
    id: String(job.id ?? ""),
    job_id: String(job.id ?? ""),
    title: (job.title as string) || "",
    job_title: (job.title as string) || "",
    company: companyName,
    company_name: companyName,
    employer_name: companyName,
    company_logo: companyLogo,
    companyLogo: companyLogo,
    location: (job.location as string) || "",
    job_location: (job.location as string) || "",
    description: (job.description as string) || (job.description_short as string) || "",
    job_description: (job.description as string) || (job.description_short as string) || "",
    apply_url: (job.apply_url as string) || "",
    job_apply_link: (job.apply_url as string) || "",
    url: (job.apply_url as string) || "",
    date_posted: (job.posted_at as string) || (job.fetched_at as string) || "",
    posted_date: (job.posted_at as string) || (job.fetched_at as string) || "",
    posted_at: (job.posted_at as string) || (job.fetched_at as string) || "",
    fetched_at: (job.fetched_at as string) || "",
    status: "active",
    industry_tags: (job.industry_tags as string) || undefined,
    ...job,
  } as ApiJob;
};

/**
 * Response from Breneo API with pagination info
 */
interface BreneoApiResponse {
  jobs: ApiJob[];
  pagination?: {
    page?: number;
    current?: number;
    num_pages?: number;
    total_pages?: number;
    total_results?: number;
    total_items?: number;
    has_next?: boolean;
    has_previous?: boolean;
  };
}

/**
 * Fetch jobs from /api/search (multi-value filters, comma-separated).
 * Per spec: country=us,uk, work_mode=remote,hybrid, etc.
 */
const fetchJobsFromSearchAPI = async (
  params: JobSearchParams
): Promise<BreneoApiResponse> => {
  const { query, filters, page = 1, pageSize = 20 } = params;

  const searchParams = new URLSearchParams();

  // Single-value / text
  if (query && query.trim()) {
    searchParams.set("query", query.trim());
  }

  // Multi-value: comma-separated, no spaces
  if (filters.countries.length > 0) {
    searchParams.set(
      "country",
      filters.countries.map(getCountryCodeForApi).join(",")
    );
  }
  if (filters.skills.length > 0) {
    searchParams.set("title", filters.skills.join(","));
  }
  if (filters.workMode && filters.workMode.length > 0) {
    searchParams.set(
      "work_mode",
      filters.workMode.map((m) => m.toLowerCase()).join(",")
    );
  } else if (filters.isRemote) {
    searchParams.set("work_mode", "remote");
  }
  if (filters.seniority && filters.seniority.length > 0) {
    searchParams.set(
      "seniority",
      filters.seniority.map((s) => s.toLowerCase()).join(",")
    );
  }
  if (filters.company && filters.company.length > 0) {
    searchParams.set("company", filters.company.join(","));
  }

  // date_posted
  if (filters.datePosted && filters.datePosted !== "all") {
    searchParams.set("date_posted", filters.datePosted);
  }

  // Pagination: page & num_pages (num_pages = page size)
  searchParams.set("page", String(page));
  searchParams.set("num_pages", String(pageSize));

  // Sort
  searchParams.set("sort", "newest");

  const url = `${JOB_SEARCH_API}?${searchParams.toString()}`;
  console.log("🔍 /api/search request:", url);

  const response = await rateLimitedFetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Search API ${response.status}: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    results?: Record<string, unknown>[];
    pagination?: {
      page?: number;
      num_pages?: number;
      total_pages?: number;
      total_results?: number;
      has_next?: boolean;
      has_previous?: boolean;
    };
  };

  const rawJobs = data.results || [];
  const pagination = data.pagination;

  const jobsArray = rawJobs.map(mapSearchJobToApiJob);

  return {
    jobs: jobsArray,
    pagination: pagination
      ? {
          page: pagination.page,
          current: pagination.page,
          num_pages: pagination.num_pages,
          total_pages: pagination.total_pages,
          total_results: pagination.total_results,
          total_items: pagination.total_results,
          has_next: pagination.has_next,
          has_previous: pagination.has_previous,
        }
      : undefined,
  };
};

/**
 * Fetch jobs from Breneo Job Aggregator API (v1/jobs, single-value filters)
 * The API returns filtered jobs based on query parameters
 * Returns jobs and pagination info from the API
 */
const fetchJobsFromBreneoAPI = async (
  params: JobSearchParams
): Promise<BreneoApiResponse> => {
  const { query, filters, page = 1, pageSize = 20 } = params;

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
    queryParams.set("search", searchQuery);
  } else if (hasFilters) {
    // No query but has filters - use a broad default to get jobs that match filters
    // queryParams.set("search", "developer"); // Optional: let backend handle empty search
  } else {
    // No query and no filters - try empty string to get ALL jobs from API
    queryParams.set("search", "");
  }

  // Add pagination parameters
  queryParams.set("page", String(page));
  queryParams.set("limit", String(pageSize));

  // Always filter for active jobs only - ensures users see only currently available listings
  queryParams.set("is_active", "true");

  console.log(
    `📄 Fetching page ${page} with limit ${pageSize}, query: "${
      searchQuery || "(empty - all jobs)"
    }", hasFilters: ${hasFilters})`
  );

  // Apply filters - all active filters are combined with AND logic by the backend
  // For example: location=London AND work_mode=remote AND seniority=senior
  // This means jobs must match ALL specified filters to be returned

  // Add location filter - API expects country/city names, not ISO codes
  if (filters.countries.length > 0) {
    const locationValue = getCountryNameFromCode(filters.countries[0]);
    queryParams.set("location", locationValue);
  }

  // Add work_mode filter
  if (filters.isRemote) {
    queryParams.set("work_mode", "remote");
  } else if (filters.workMode && filters.workMode.length > 0) {
    // Support explicit workMode filter if added to UI later
    queryParams.set("work_mode", filters.workMode[0]);
  }

  // Add seniority filter
  if (filters.seniority && filters.seniority.length > 0) {
    queryParams.set("seniority", filters.seniority[0]);
  }

  // Add company filter
  if (filters.company && filters.company.length > 0) {
    queryParams.set("company", filters.company[0]);
  }

  // Add date_posted filter
  if (filters.datePosted && filters.datePosted !== "all") {
    queryParams.set("date_posted", filters.datePosted);
  }

  // Build the API endpoint with query parameters
  const API_ENDPOINT = `${JOB_API_BASE}?${queryParams.toString()}`;

  // Debug: Log the full API endpoint URL for troubleshooting
  console.log("🔗 Full API Endpoint URL:", API_ENDPOINT);
  console.log(
    "🔗 Query Parameters:",
    Object.fromEntries(queryParams.entries())
  );

  console.log("🔍 Breneo Job API Request:", {
    filters: {
      countries: filters.countries,
      jobTypes: filters.jobTypes,
      isRemote: filters.isRemote,
      datePosted: filters.datePosted || "all",
      skills: filters.skills,
      seniority: filters.seniority,
      workMode: filters.workMode,
      company: filters.company,
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
          current?: number;
          num_pages?: number;
          total_pages?: number;
          total_results?: number;
          total_items?: number;
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

    // Client-side search filtering removed as backend handles it now with 'search' parameter

    // Filter by country/location removed as backend handles it now with 'location' parameter
    // Only keeping client-side logic for array support if we decide to implement multi-location selecting
    // For now, backend takes the first one, which covers the main use case

    // Filter by remote removed as backend handles it now with 'work_mode=remote'

    // employment type filtering maintained as backend doesn't support it yet
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

    // Filter by date posted removed as backend handles it now with 'date_posted' parameter

    // Filter by skills removed as backend handles it now with 'search' parameter

    // Log the final response
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
    : "https://breneo-job-aggregator.up.railway.app/api/job-details"; // Direct URL in production

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
 * Tries /api/search first (multi-value filters, comma-separated).
 * Falls back to /api/v1/jobs/ if search returns 404 or fails.
 */
export const fetchActiveJobs = async (
  params: JobSearchParams
): Promise<JobApiResponse> => {
  try {
    const queryParts: string[] = [];
    if (params.query && params.query.trim()) {
      queryParts.push(params.query.trim());
    }
    if (params.filters.skills.length > 0) {
      queryParts.push(...params.filters.skills);
    }
    const query = queryParts.length > 0 ? queryParts.join(" ") : "";

    let apiResponse: BreneoApiResponse;

    try {
      apiResponse = await fetchJobsFromSearchAPI({
        ...params,
        query,
        filters: params.filters,
      });
      console.log("✅ Using /api/search");
    } catch (searchErr) {
      console.warn("⚠️ /api/search unavailable, falling back to /api/v1/jobs/", searchErr);
      apiResponse = await fetchJobsFromBreneoAPI({
        ...params,
        query,
        filters: params.filters,
      });
    }

    let allJobs = apiResponse.jobs;

    // Client-side jobTypes filter (employment type - not in search API)
    if (params.filters.jobTypes.length > 0) {
      allJobs = allJobs.filter((job) => {
        const empType = (
          (job.employment_type || job.job_employment_type || job.type || "") as string
        )
          .toUpperCase()
          .replace(/[-\s]/g, "");
        return params.filters.jobTypes.some((type) => {
          const normalizedType = type.toUpperCase().replace(/[-\s]/g, "");
          return empType.includes(normalizedType);
        });
      });
    }

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
      total =
        apiPagination.total_results ??
        apiPagination.total_items ??
        uniqueJobs.length;
      // API may use current/total_pages instead of has_next
      const currentPage =
        apiPagination.current ?? apiPagination.page ?? params.page ?? 1;
      const totalPages =
        apiPagination.total_pages ?? apiPagination.num_pages ?? 1;
      hasMore =
        apiPagination.has_next ??
        (currentPage < totalPages && totalPages > 1);
      console.log(
        `Using API pagination: page ${currentPage}/${totalPages}, ${uniqueJobs.length} jobs, hasMore: ${hasMore}, total: ${total}`
      );
    } else {
      // Fallback to client-side pagination
      const pageSize = params.pageSize || 20;
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
      pageSize: params.pageSize || 20,
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
