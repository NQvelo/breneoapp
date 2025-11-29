/**
 * Job API Service
 * 
 * Service for fetching active jobs from JSearch API via RapidAPI
 * Filters are only applied when user explicitly changes them in the frontend
 */

import { ApiJob, JobSearchParams, JobApiResponse, JobDetail } from './types';
import { countries } from '@/data/countries';

// API Configuration
const JSEARCH_API_KEY = "329754c88fmsh45bf2cd651b0e37p1ad384jsnab7fd582cddb";
const JSEARCH_API_BASE = "https://jsearch.p.rapidapi.com";
const JSEARCH_API_HOST = "jsearch.p.rapidapi.com";

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
 * Fetch jobs from JSearch API via RapidAPI
 * Only adds filters when user explicitly changes them (not defaults)
 */
const fetchJobsFromJSearchAPI = async (
  params: JobSearchParams
): Promise<ApiJob[]> => {
  const { query, filters, page = 1 } = params;
  
  // Build URL parameters for JSearch API
  const urlParams = new URLSearchParams();

  // Add query/search term (required)
  // Query is already built in fetchActiveJobs (includes search term + skills)
  // So we just use it here, or default to "jobs" for broad search
  if (query && query.trim()) {
    urlParams.append("query", query.trim());
  } else {
    urlParams.append("query", "jobs"); // Default query - broad search to get all jobs
  }

  // Add page and num_pages
  // num_pages controls how many pages to fetch (each page typically has ~10 results)
  // Set to 3 to fetch ~30 results per API call, then we'll show 12 items per page
  // Calculate which API pages to fetch: page 1 fetches API pages 1-3, page 2 fetches API pages 4-6, etc.
  const apiStartPage = (page - 1) * 3 + 1;
  urlParams.append("page", String(apiStartPage));
  urlParams.append("num_pages", "3");

  // Only add filters if they are explicitly set by the user (not defaults)
  // Country filter - add if countries are selected
  if (filters.countries.length > 0) {
    // Use the first country code (JSearch uses 2-letter lowercase country codes)
    const countryCode = filters.countries[0].toLowerCase();
    urlParams.append("country", countryCode);
  }

  // Date posted filter - only add if explicitly set (not undefined)
  // JSearch accepts: "all", "day", "week", "month"
  if (filters.datePosted && filters.datePosted !== "all") {
    urlParams.append("date_posted", filters.datePosted);
  } else {
    // Default to "all" to show all jobs regardless of posting date
    urlParams.append("date_posted", "all");
  }

  // Remote filter - only add if explicitly set to true
  if (filters.isRemote) {
    urlParams.append("remote_jobs_only", "true");
  }

  // Employment types - only add if explicitly selected
  if (filters.jobTypes.length > 0) {
    // Map to JSearch format: FULLTIME, PARTTIME, CONTRACTOR, INTERN
    const employmentTypes = filters.jobTypes.map((type) => {
      const upperType = type.toUpperCase();
      // JSearch uses these exact values
      if (upperType === "FULLTIME") return "FULLTIME";
      if (upperType === "PARTTIME") return "PARTTIME";
      if (upperType === "CONTRACTOR") return "CONTRACTOR";
      if (upperType === "INTERN") return "INTERN";
      return upperType;
    });
    if (employmentTypes.length > 0) {
      urlParams.append("employment_types", employmentTypes.join(","));
    }
  }

  // Build the API endpoint
  const queryString = urlParams.toString();
  const API_ENDPOINT = `${JSEARCH_API_BASE}/search?${queryString}`;

  // Debug logging for filters
  console.log("🔍 JSearch API Request:", {
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

  const response = await rateLimitedFetch(API_ENDPOINT, {
    method: "GET",
    headers: {
      "x-rapidapi-key": JSEARCH_API_KEY,
      "x-rapidapi-host": JSEARCH_API_HOST,
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
          // Handle structured error response from JSearch API
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

  // Handle JSearch API response structure
  // JSearch returns: { data: [...jobs] }
  let jobsArray: ApiJob[] = [];

  if (result && typeof result === "object") {
    const resultObj = result as Record<string, unknown>;
    // JSearch API returns data in a 'data' array
    if (Array.isArray(resultObj.data)) {
      jobsArray = resultObj.data as ApiJob[];
    } else if (Array.isArray(resultObj.jobs)) {
      jobsArray = resultObj.jobs as ApiJob[];
    } else if (Array.isArray(resultObj.results)) {
      jobsArray = resultObj.results as ApiJob[];
    }
  } else if (Array.isArray(result)) {
    jobsArray = result as ApiJob[];
  }

  // Log the raw response structure for debugging
  console.log("JSearch API Response structure:", {
    isArray: Array.isArray(result),
    keys:
      result && typeof result === "object"
        ? Object.keys(result as Record<string, unknown>)
        : [],
    firstJob: jobsArray.length > 0 ? jobsArray[0] : null,
  });

  return jobsArray;
};

/**
 * Fetch job details from JSearch API
 */
export const fetchJobDetail = async (jobId: string): Promise<JobDetail> => {
  if (!jobId) throw new Error("Job ID is required");

  // JSearch API uses job_id parameter for job details (country filter removed)
  const API_ENDPOINT = `${JSEARCH_API_BASE}/job-details?job_id=${encodeURIComponent(jobId)}`;

  const response = await rateLimitedFetch(API_ENDPOINT, {
    method: "GET",
    headers: {
      "x-rapidapi-key": JSEARCH_API_KEY,
      "x-rapidapi-host": JSEARCH_API_HOST,
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
          // Handle structured error response from JSearch API
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
  console.log("Raw API Response:", JSON.stringify(result, null, 2));

  // Handle JSearch API response structure
  // JSearch returns: { data: [{...job}] } or { data: {...job} } or { data: [] }
  let jobData: JobDetail | null = null;
  if (result && typeof result === "object") {
    const resultObj = result as Record<string, unknown>;
    // JSearch API returns job data in 'data' field - could be array or object
    if (resultObj.data) {
      if (Array.isArray(resultObj.data)) {
        if (resultObj.data.length > 0) {
          // If data is an array, take the first job
          jobData = resultObj.data[0] as JobDetail;
        } else {
          // Empty array - no job found
          console.warn("API returned empty data array for job ID:", jobId);
          throw new Error(`No job found with ID: ${jobId}`);
        }
      } else if (typeof resultObj.data === "object" && resultObj.data !== null) {
        // If data is an object, use it directly
        jobData = resultObj.data as JobDetail;
      }
    } else if (resultObj.job && typeof resultObj.job === "object") {
      jobData = resultObj.job as JobDetail;
    } else if (resultObj.results && Array.isArray(resultObj.results) && resultObj.results.length > 0) {
      // Some APIs return results array
      jobData = resultObj.results[0] as JobDetail;
    } else {
      // Check if result itself is the job object (has job-like properties)
      const hasJobProperties = 
        (resultObj.job_title || resultObj.title || resultObj.job_id || resultObj.id);
      if (hasJobProperties) {
        jobData = result as JobDetail;
      }
    }
  }

  if (!jobData) {
    console.error("Failed to extract job data from response:", JSON.stringify(result, null, 2));
    throw new Error(`Invalid response format from API. No job data found for ID: ${jobId}`);
  }
  
  // Validate that we have at least some job data
  const hasAnyJobData = 
    jobData.job_title || jobData.title || jobData.job_id || jobData.id ||
    jobData.employer_name || jobData.company_name || jobData.company;
  
  if (!hasAnyJobData) {
    console.error("Job data exists but has no recognizable fields:", jobData);
    throw new Error(`Job data received but appears to be empty for ID: ${jobId}`);
  }

  // Normalize JSearch API field names to our standard format
  // JSearch uses job_* prefix for many fields
  const normalizedData = { ...jobData } as JobDetail;
  
  // Map JSearch-specific fields to standard fields
  if (!normalizedData.title && (jobData as Record<string, unknown>).job_title) {
    normalizedData.title = (jobData as Record<string, unknown>).job_title as string;
  }
  if (!normalizedData.job_title && normalizedData.title) {
    normalizedData.job_title = normalizedData.title;
  }
  
  // Handle location fields - JSearch uses job_city, job_state, job_country
  if (!normalizedData.location && !normalizedData.job_location) {
    const jobCity = (jobData as Record<string, unknown>).job_city as string | undefined;
    const jobState = (jobData as Record<string, unknown>).job_state as string | undefined;
    const jobCountry = (jobData as Record<string, unknown>).job_country as string | undefined;
    if (jobCity || jobState || jobCountry) {
      const locationParts = [jobCity, jobState, jobCountry].filter(Boolean);
      normalizedData.location = locationParts.join(", ");
      normalizedData.job_location = normalizedData.location;
      if (jobCity) normalizedData.city = jobCity;
      if (jobState) normalizedData.state = jobState;
      if (jobCountry) normalizedData.country = jobCountry;
    }
  }
  
  // Handle description
  if (!normalizedData.description && !normalizedData.job_description) {
    const jobDesc = (jobData as Record<string, unknown>).job_description as string | undefined;
    if (jobDesc) {
      normalizedData.description = jobDesc;
      normalizedData.job_description = jobDesc;
    }
  }
  
  // Handle apply URL
  if (!normalizedData.apply_url && !normalizedData.job_apply_link && !normalizedData.url) {
    const jobApplyLink = (jobData as Record<string, unknown>).job_apply_link as string | undefined;
    if (jobApplyLink) {
      normalizedData.apply_url = jobApplyLink;
      normalizedData.job_apply_link = jobApplyLink;
      normalizedData.url = jobApplyLink;
    }
  }
  
  // Handle employment type
  if (!normalizedData.employment_type && !normalizedData.job_employment_type) {
    const jobEmpType = (jobData as Record<string, unknown>).job_employment_type as string | undefined;
    if (jobEmpType) {
      normalizedData.employment_type = jobEmpType;
      normalizedData.job_employment_type = jobEmpType;
    }
  }
  
  // Handle remote flag
  if (normalizedData.is_remote === undefined && normalizedData.remote === undefined) {
    const jobIsRemote = (jobData as Record<string, unknown>).job_is_remote as boolean | undefined;
    if (jobIsRemote !== undefined) {
      normalizedData.is_remote = jobIsRemote;
      normalizedData.remote = jobIsRemote;
    }
  }
  
  // Handle salary fields
  if (!normalizedData.min_salary && !normalizedData.max_salary) {
    const jobMinSalary = (jobData as Record<string, unknown>).job_min_salary as number | undefined;
    const jobMaxSalary = (jobData as Record<string, unknown>).job_max_salary as number | undefined;
    const jobSalaryCurrency = (jobData as Record<string, unknown>).job_salary_currency as string | undefined;
    const jobSalaryPeriod = (jobData as Record<string, unknown>).job_salary_period as string | undefined;
    if (jobMinSalary !== undefined) normalizedData.min_salary = jobMinSalary;
    if (jobMaxSalary !== undefined) normalizedData.max_salary = jobMaxSalary;
    if (jobSalaryCurrency) normalizedData.salary_currency = jobSalaryCurrency;
    if (jobSalaryPeriod) normalizedData.salary_period = jobSalaryPeriod;
  }
  
  // Handle company/employer name
  if (!normalizedData.company_name && !normalizedData.employer_name) {
    const employerName = (jobData as Record<string, unknown>).employer_name as string | undefined;
    if (employerName) {
      normalizedData.employer_name = employerName;
      normalizedData.company_name = employerName;
      if (typeof normalizedData.company === "string") {
        normalizedData.company = employerName;
      }
    }
  }
  
  // Handle logo
  if (!normalizedData.company_logo && !normalizedData.employer_logo && !normalizedData.logo_url) {
    const employerLogo = (jobData as Record<string, unknown>).employer_logo as string | undefined;
    if (employerLogo) {
      normalizedData.employer_logo = employerLogo;
      normalizedData.company_logo = employerLogo;
      normalizedData.logo_url = employerLogo;
    }
  }
  
  jobData = normalizedData;

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
 * Combines search term with skills and fetches from JSearch API
 * Filters are only applied when user explicitly changes them
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
      queryParts.push(...params.filters.skills);
    }

    // If no query parts, use a broad search term to get all jobs
    // Using "jobs" as a very broad term that will return many results
    const query = queryParts.length > 0 ? queryParts.join(" ") : "jobs";

    // Pass filters as-is - only add filters when user explicitly changes them
    // No default filters are applied here
    const filtersToUse = {
      ...params.filters,
      // Only include datePosted if it's explicitly set (not undefined/null)
      datePosted: params.filters.datePosted || undefined,
    };

    // Fetch jobs from JSearch API
    const allJobs = await fetchJobsFromJSearchAPI({
      ...params,
      query,
      filters: filtersToUse,
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

    // Return all unique jobs without filtering
    console.log(`Fetched ${uniqueJobs.length} unique jobs`);
    if (uniqueJobs.length > 0) {
      console.log("Sample job structure:", uniqueJobs[0]);
    }

    // Determine if there are more pages available
    // If we got a full page of results (12), assume there might be more
    const pageSize = params.pageSize || 12;
    const hasMore = uniqueJobs.length >= pageSize;

    return {
      jobs: uniqueJobs,
      page: params.page || 1,
      pageSize: pageSize,
      hasMore: hasMore,
    };
  } catch (error) {
    console.error("Error fetching jobs:", error);
    throw error;
  }
};

/**
 * Fetch jobs from JSearch API (legacy function - now using fetchJobsFromJSearchAPI)
 * Kept for backward compatibility
 */
export const fetchJobsFromJSearch = async (
  params: JobSearchParams
): Promise<ApiJob[]> => {
  return fetchJobsFromJSearchAPI(params);
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
  // Try primary source (JSearch API)
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
  fetchJobsFromJSearchAPI,
  fetchJobsFromJSearch,
  fetchJobsFromAdzuna,
  fetchJobsFromMultipleSources,
};

export default jobService;

