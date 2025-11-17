/**
 * Job API Service
 * 
 * Service for fetching active jobs from multiple job APIs
 * Supports Bing Jobs API, JSearch API, and other job data sources
 */

import { ApiJob, JobSearchParams, JobApiResponse, JobDetail } from './types';
import { countries } from '@/data/countries';

// API Configuration
const JSEARCH_API_KEY = "329754c88fmsh45bf2cd651b0e37p1ad384jsnab7fd582cddb";
const BING_JOBS_API_BASE = "https://jobs-api14.p.rapidapi.com/v2/bing";
const API_HOST = "jobs-api14.p.rapidapi.com";

// Logo API fallback - using Clearbit Logo API (free tier available)
// Note: Clearbit Logo API will be discontinued Dec 2025, but works for now
const getCompanyLogoFromAPI = async (companyName: string): Promise<string | null> => {
  try {
    // Clean company name for URL
    const cleanName = encodeURIComponent(companyName.trim());
    const logoUrl = `https://logo.clearbit.com/${cleanName}`;
    
    // Test if logo exists by trying to fetch it
    const response = await fetch(logoUrl, { method: "HEAD" });
    if (response.ok) {
      return logoUrl;
    }
  } catch (error) {
    console.log(`Logo API fallback failed for ${companyName}:`, error);
  }
  return null;
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
 * Fetch jobs from Bing Jobs API via RapidAPI
 */
const fetchJobsFromBingAPI = async (
  params: JobSearchParams
): Promise<ApiJob[]> => {
  const { query, filters, page = 1 } = params;
  
  // Build URL parameters for Bing Jobs API
  const urlParams = new URLSearchParams();

  // Add query/search term (required)
  if (query && query.trim()) {
    urlParams.append("query", query.trim());
  } else {
    urlParams.append("query", "developer"); // Default query
  }

  // Remote filter - Bing API uses remoteOnly as lowercase boolean string
  urlParams.append("remoteOnly", filters.isRemote ? "true" : "false");

  // Location - API requires either 'location' or 'token' parameter
  // Try to get location from selected countries first
  let locationSet = false;
  if (filters.countries.length > 0) {
    // Try to get country name from code
    const country = countries.find((c) =>
      filters.countries.includes(c.code.toLowerCase())
    );
    if (country && country.name) {
      urlParams.append("location", country.name);
      locationSet = true;
    }
  }
  
  // If no location was set from countries, use the default country from filters
  if (!locationSet && filters.country) {
    urlParams.append("location", filters.country);
    locationSet = true;
  }
  
  // If still no location, use a default (United States as fallback)
  if (!locationSet) {
    urlParams.append("location", "United States");
  }

  // Date posted filter - default to "week" to ensure only active/recent jobs
  // API only accepts "day", "week", or empty (not "month")
  const datePosted = filters.datePosted || "week";
  if (datePosted !== "all") {
    if (datePosted === "day" || datePosted === "week") {
      urlParams.append("datePosted", datePosted);
    }
    // Note: "month" is not supported by API, so we use "week" as default
    // If user selects "month", we'll use "week" instead
  }
  // If "all" or "month" is selected, don't add datePosted parameter (empty = all jobs)

  // Map employment types to Bing API format
  const employmentTypes: string[] = [];
  if (filters.jobTypes.length > 0) {
    filters.jobTypes.forEach((type) => {
      const bingType = type.toLowerCase();
      if (bingType === "fulltime") {
        employmentTypes.push("fulltime");
      } else if (bingType === "parttime") {
        employmentTypes.push("parttime");
      } else if (bingType === "contractor") {
        employmentTypes.push("contractor");
      } else if (bingType === "intern") {
        employmentTypes.push("temporary"); // Bing uses "temporary" for intern
      }
    });
  }

  // Only add employmentTypes if we have specific types selected
  if (employmentTypes.length > 0) {
    urlParams.append("employmentTypes", employmentTypes.join(";"));
  }

  // Build the API endpoint
  const queryString = urlParams.toString();
  const API_ENDPOINT = `${BING_JOBS_API_BASE}/search?${queryString}`;

  console.log("Bing Jobs API Request URL:", API_ENDPOINT);

  const response = await rateLimitedFetch(API_ENDPOINT, {
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
      console.error("API Error Response:", errorBody);
      if (errorBody) {
        try {
          const errorJson = JSON.parse(errorBody);
          // Handle structured error response from Bing API
          if (errorJson.errors && Array.isArray(errorJson.errors) && errorJson.errors.length > 0) {
            const apiError = errorJson.errors[0];
            errorMessage = apiError.message || apiError.error || errorMessage;
            console.error("API Error Details:", apiError);
          } else {
            errorMessage = errorJson.message || errorJson.error || errorMessage;
            if (errorJson.details) {
              console.error("API Error Details:", errorJson.details);
            }
          }
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

  // Handle Bing Jobs API response structure
  let jobsArray: ApiJob[] = [];

  if (Array.isArray(result)) {
    jobsArray = result as ApiJob[];
  } else if (result && typeof result === "object") {
    const resultObj = result as Record<string, unknown>;
    // Bing API typically returns data in a 'data' or 'jobs' array
    if (Array.isArray(resultObj.data)) {
      jobsArray = resultObj.data as ApiJob[];
    } else if (Array.isArray(resultObj.jobs)) {
      jobsArray = resultObj.jobs as ApiJob[];
    } else if (Array.isArray(resultObj.results)) {
      jobsArray = resultObj.results as ApiJob[];
    } else if (Array.isArray(resultObj.items)) {
      jobsArray = resultObj.items as ApiJob[];
    } else if (Array.isArray(resultObj.job_listings)) {
      jobsArray = resultObj.job_listings as ApiJob[];
    }
  }

  // Log the raw response structure for debugging
  console.log("Bing Jobs API Response structure:", {
    isArray: Array.isArray(result),
    keys:
      result && typeof result === "object"
        ? Object.keys(result as Record<string, unknown>)
        : [],
    firstJob: jobsArray.length > 0 ? jobsArray[0] : null,
  });

  // Log logo fields from first job for debugging
  if (jobsArray.length > 0) {
    const firstJob = jobsArray[0];
    console.log("🔍 Logo fields in API response:", {
      employer_logo: firstJob.employer_logo,
      company_logo: firstJob.company_logo,
      logo: firstJob.logo,
      logo_url: firstJob.logo_url,
      companyLogo: firstJob.companyLogo,
      company: firstJob.company,
      employer: firstJob.employer,
      allKeys: Object.keys(firstJob),
    });
    
    // Check nested company/employer objects
    if (firstJob.company && typeof firstJob.company === "object") {
      console.log("🔍 Company object logo fields:", {
        logo: (firstJob.company as Record<string, unknown>).logo,
        company_logo: (firstJob.company as Record<string, unknown>).company_logo,
        employer_logo: (firstJob.company as Record<string, unknown>).employer_logo,
        logo_url: (firstJob.company as Record<string, unknown>).logo_url,
        allKeys: Object.keys(firstJob.company as Record<string, unknown>),
      });
    }
    if (firstJob.employer && typeof firstJob.employer === "object") {
      console.log("🔍 Employer object logo fields:", {
        logo: (firstJob.employer as Record<string, unknown>).logo,
        company_logo: (firstJob.employer as Record<string, unknown>).company_logo,
        employer_logo: (firstJob.employer as Record<string, unknown>).employer_logo,
        logo_url: (firstJob.employer as Record<string, unknown>).logo_url,
        allKeys: Object.keys(firstJob.employer as Record<string, unknown>),
      });
    }
  }

  return jobsArray;
};

/**
 * Fetch job details from Bing Jobs API
 */
export const fetchJobDetail = async (jobId: string): Promise<JobDetail> => {
  if (!jobId) throw new Error("Job ID is required");

  const API_ENDPOINT = `${BING_JOBS_API_BASE}/get?id=${encodeURIComponent(jobId)}`;

  const response = await rateLimitedFetch(API_ENDPOINT, {
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
    let errorMessage = `Failed to fetch job details: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.text();
      console.error("API Error Response:", errorBody);
      if (errorBody) {
        try {
          const errorJson = JSON.parse(errorBody);
          // Handle structured error response from Bing API
          if (errorJson.errors && Array.isArray(errorJson.errors) && errorJson.errors.length > 0) {
            const apiError = errorJson.errors[0];
            errorMessage = apiError.message || apiError.error || errorMessage;
            console.error("API Error Details:", apiError);
          } else {
            errorMessage = errorJson.message || errorJson.error || errorMessage;
          }
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

  // Log the raw response for debugging
  console.log("Raw API Response:", result);

  // Handle different response structures
  let jobData: JobDetail | null = null;
  if (result && typeof result === "object") {
    const resultObj = result as Record<string, unknown>;
    // Check if data is nested
    if (resultObj.data && typeof resultObj.data === "object") {
      jobData = resultObj.data as JobDetail;
    } else if (resultObj.job && typeof resultObj.job === "object") {
      jobData = resultObj.job as JobDetail;
    } else {
      // If result itself is the job object
      jobData = result as JobDetail;
    }
  }

  if (!jobData) {
    throw new Error("Invalid response format from API");
  }

  // Extract company information from nested company object if it exists
  if (jobData.company && typeof jobData.company === "object") {
    const companyObj = jobData.company as Record<string, unknown>;
    // Merge company object properties into main job data for easier access
    if (
      companyObj.name &&
      !jobData.company_name &&
      !jobData.employer_name
    ) {
      jobData.company_name = companyObj.name as string;
    }
    if (companyObj.company_name && !jobData.company_name) {
      jobData.company_name = companyObj.company_name as string;
    }
    if (
      companyObj.employer_name &&
      !jobData.employer_name &&
      !jobData.company_name
    ) {
      jobData.employer_name = companyObj.employer_name as string;
    }
    // Extract logo from company object - check all possible logo fields
    if (!jobData.company_logo && !jobData.employer_logo && !jobData.logo_url) {
      if (companyObj.logo) {
        jobData.company_logo = companyObj.logo as string;
      } else if (companyObj.company_logo) {
        jobData.company_logo = companyObj.company_logo as string;
      } else if (companyObj.employer_logo) {
        jobData.employer_logo = companyObj.employer_logo as string;
      } else if (companyObj.logo_url) {
        jobData.logo_url = companyObj.logo_url as string;
      }
    }
    if (companyObj.website && !jobData.company_url) {
      jobData.company_url = companyObj.website as string;
    }
    // Store full company info
    jobData.company_info = companyObj as unknown as import('./types').CompanyInfo;
  }

  // Also check for employer object
  if (jobData.employer && typeof jobData.employer === "object") {
    const employerObj = jobData.employer as Record<string, unknown>;
    // Extract company name from employer object
    if (
      employerObj.name &&
      !jobData.company_name &&
      !jobData.employer_name
    ) {
      jobData.company_name = employerObj.name as string;
    }
    if (employerObj.company_name && !jobData.company_name) {
      jobData.company_name = employerObj.company_name as string;
    }
    if (
      employerObj.employer_name &&
      !jobData.employer_name &&
      !jobData.company_name
    ) {
      jobData.employer_name = employerObj.employer_name as string;
    }
    
    // Extract logo from employer object if not already set
    if (!jobData.company_logo && !jobData.employer_logo && !jobData.logo_url) {
      if (employerObj.logo) {
        jobData.company_logo = employerObj.logo as string;
      } else if (employerObj.company_logo) {
        jobData.company_logo = employerObj.company_logo as string;
      } else if (employerObj.employer_logo) {
        jobData.employer_logo = employerObj.employer_logo as string;
      } else if (employerObj.logo_url) {
        jobData.logo_url = employerObj.logo_url as string;
      }
    }
    
    if (!jobData.company_info) {
      jobData.company_info = employerObj as unknown as import('./types').CompanyInfo;
    } else {
      // Merge employer info into company_info
      jobData.company_info = { ...jobData.company_info, ...employerObj } as import('./types').CompanyInfo;
    }
  }

  console.log("Processed job detail:", jobData);
  return jobData;
};

/**
 * Check if a job is still active based on posted date
 * Jobs older than 90 days are considered inactive
 */
const isJobActive = (job: ApiJob): boolean => {
  // Check for expiration date
  if (job.expiration_date || job.expires_at || job.expires) {
    const expirationDate = new Date(
      (job.expiration_date || job.expires_at || job.expires) as string
    );
    if (expirationDate < new Date()) {
      return false; // Job has expired
    }
  }

  // Check for posted date - filter out jobs older than 90 days
  const postedDateStr =
    job.date_posted ||
    job.posted_date ||
    job.job_posted_at_datetime_utc ||
    job.postedAt;
  
  if (postedDateStr) {
    try {
      const postedDate = new Date(postedDateStr as string);
      const daysSincePosted = Math.floor(
        (Date.now() - postedDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Consider jobs older than 90 days as inactive
      if (daysSincePosted > 90) {
        return false;
      }
    } catch (e) {
      // If date parsing fails, assume job is active (let API filtering handle it)
      console.warn("Could not parse job posted date:", postedDateStr);
    }
  }

  // Check for status field
  if (job.status && typeof job.status === "string") {
    const status = (job.status as string).toLowerCase();
    if (status === "closed" || status === "expired" || status === "inactive" || status === "filled") {
      return false;
    }
  }

  // If no expiration indicators found, assume job is active
  return true;
};

/**
 * Main function to fetch active jobs
 * Combines search term with skills and fetches from Bing Jobs API
 * Only returns jobs that are currently active
 */
export const fetchActiveJobs = async (
  params: JobSearchParams
): Promise<JobApiResponse> => {
  try {
    // Build query parameter combining search term and skills
    const queryParts: string[] = [];

    if (params.query.trim()) {
      queryParts.push(params.query.trim());
    }

    // Add skills to query
    if (params.filters.skills.length > 0) {
      queryParts.push(...params.filters.skills);
    }

    // Combine all query parts
    const query = queryParts.length > 0 ? queryParts.join(" ") : "";

    // Ensure we're filtering for recent jobs (active jobs)
    // Map "month" to "week" since API doesn't support "month"
    let datePostedFilter = params.filters.datePosted || "week";
    if (datePostedFilter === "month") {
      datePostedFilter = "week"; // Use week instead of month
    }
    
    const filtersWithActiveJobs = {
      ...params.filters,
      datePosted: datePostedFilter, // Default to last week for active jobs
    };

    // Fetch jobs from Bing Jobs API
    const allJobs = await fetchJobsFromBingAPI({
      ...params,
      query,
      filters: filtersWithActiveJobs,
    });

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

    // Filter to only include active jobs
    const activeJobs = uniqueJobs.filter(isJobActive);

    console.log(`Fetched ${uniqueJobs.length} jobs, ${activeJobs.length} are active`);
    if (activeJobs.length > 0) {
      console.log("Sample active job structure:", activeJobs[0]);
    }

    return {
      jobs: activeJobs,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
      hasMore: activeJobs.length === (params.pageSize || 20),
    };
  } catch (error) {
    console.error("Error fetching jobs:", error);
    throw error;
  }
};

/**
 * Fetch jobs from JSearch API (alternative API)
 * This can be used as a fallback or additional source
 */
export const fetchJobsFromJSearch = async (
  params: JobSearchParams
): Promise<ApiJob[]> => {
  // JSearch API implementation can be added here
  // For now, we'll use Bing Jobs API as the primary source
  throw new Error("JSearch API not yet implemented");
};

/**
 * Fetch jobs from Adzuna API (alternative API)
 * This can be used as a fallback or additional source
 */
export const fetchJobsFromAdzuna = async (
  params: JobSearchParams
): Promise<ApiJob[]> => {
  // Adzuna API implementation can be added here
  // Requires Adzuna API key and endpoint configuration
  throw new Error("Adzuna API not yet implemented");
};

/**
 * Fetch jobs from multiple sources and merge results
 */
export const fetchJobsFromMultipleSources = async (
  params: JobSearchParams
): Promise<JobApiResponse> => {
  // Try primary source (Bing Jobs API)
  try {
    return await fetchActiveJobs(params);
  } catch (error) {
    console.error("Primary job source failed:", error);
    // Could add fallback logic here to try other APIs
    throw error;
  }
};

// Default export
const jobService = {
  fetchActiveJobs,
  fetchJobDetail,
  fetchJobsFromBingAPI,
  fetchJobsFromJSearch,
  fetchJobsFromAdzuna,
  fetchJobsFromMultipleSources,
};

export default jobService;

