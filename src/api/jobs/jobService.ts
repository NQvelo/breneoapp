/**
 * Job API Service
 *
 * Service for fetching active jobs from Breneo Job Aggregator API
 * Filters are only applied when user explicitly changes them in the frontend
 */

import { ApiJob, JobSearchParams, JobApiResponse, JobDetail } from "./types";
import { countries } from "@/data/countries";

// API Configuration
const JOB_API_BASE = "https://breneo-job-aggregator.onrender.com/api/";

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
  company: string;
  location: string;
  description: string;
  apply_url: string;
  platform: string;
  external_job_id: string;
  posted_at: string | null;
  fetched_at: string;
  is_active: boolean;
  raw: unknown;
}

/**
 * Map Breneo API job to ApiJob interface
 */
const mapBreneoJobToApiJob = (job: BreneoJobApiResponse): ApiJob => {
  const baseJob: ApiJob = {
    id: String(job.id),
    job_id: job.external_job_id || String(job.id),
    title: job.title,
    job_title: job.title,
    company: job.company,
    company_name: job.company,
    employer_name: job.company,
    location: job.location,
    job_location: job.location,
    description: job.description,
    job_description: job.description,
    apply_url: job.apply_url,
    job_apply_link: job.apply_url,
    url: job.apply_url,
    date_posted: job.posted_at || job.fetched_at,
    posted_date: job.posted_at || job.fetched_at,
    status: job.is_active ? "active" : "inactive",
  };

  // Include raw data from the original API if it's an object
  if (job.raw && typeof job.raw === "object" && !Array.isArray(job.raw)) {
    return { ...baseJob, ...(job.raw as Record<string, unknown>) };
  }

  return baseJob;
};

/**
 * Fetch jobs from Breneo Job Aggregator API
 * The API returns all jobs, we'll filter them on the frontend
 */
const fetchJobsFromBreneoAPI = async (
  params: JobSearchParams
): Promise<ApiJob[]> => {
  const { query, filters, page = 1 } = params;

  // Build the API endpoint - try with and without trailing slash
  const API_ENDPOINT = JOB_API_BASE;

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

    const result: unknown = await response.json();
    console.log(
      "📦 API Response received, type:",
      Array.isArray(result) ? "Array" : typeof result
    );

    // Breneo API returns an array of jobs directly
    let jobsArray: ApiJob[] = [];

    if (Array.isArray(result)) {
      const breneoJobs = result as BreneoJobApiResponse[];
      console.log(`📊 Received ${breneoJobs.length} total jobs from API`);

      // Filter only active jobs
      const activeJobs = breneoJobs.filter((job) => job.is_active);
      console.log(`✅ ${activeJobs.length} active jobs after filtering`);

      // Map to ApiJob format
      jobsArray = activeJobs.map(mapBreneoJobToApiJob);
      console.log(`🎯 Mapped ${jobsArray.length} jobs to ApiJob format`);
    } else {
      console.error("❌ Unexpected API response format:", result);
      throw new Error(
        "Invalid response format from API - expected array of jobs"
      );
    }

    if (jobsArray.length === 0) {
      console.warn("⚠️ No jobs returned from API");
      return [];
    }

    console.log(`🔧 Starting frontend filtering for ${jobsArray.length} jobs`);

    // Apply frontend filters
    let filteredJobs = jobsArray;

    // Filter by search query (title, company, description, location)
    if (query && query.trim()) {
      const searchTerms = query.toLowerCase().trim().split(" ");
      filteredJobs = filteredJobs.filter((job) => {
        const searchableText = [
          job.title || job.job_title || "",
          job.company || job.company_name || job.employer_name || "",
          job.description || job.job_description || "",
          job.location || job.job_location || "",
        ]
          .join(" ")
          .toLowerCase();

        return searchTerms.every((term) => searchableText.includes(term));
      });
    }

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

    return filteredJobs;
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

  // Fetch all jobs and find the specific one
  const API_ENDPOINT = JOB_API_BASE;

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

  if (!Array.isArray(result)) {
    console.error("Unexpected API response format:", result);
    throw new Error("Invalid response format from API");
  }

  const breneoJobs = result as BreneoJobApiResponse[];

  // Find the job by ID or external_job_id
  const job = breneoJobs.find(
    (j) => String(j.id) === jobId || j.external_job_id === jobId
  );

  if (!job) {
    throw new Error(`No job found with ID: ${jobId}`);
  }

  // Map to JobDetail format
  let jobDetail: JobDetail = {
    id: String(job.id),
    job_id: job.external_job_id || String(job.id),
    title: job.title,
    job_title: job.title,
    company: job.company,
    company_name: job.company,
    employer_name: job.company,
    location: job.location,
    job_location: job.location,
    description: job.description,
    job_description: job.description,
    apply_url: job.apply_url,
    job_apply_link: job.apply_url,
    url: job.apply_url,
    date_posted: job.posted_at || job.fetched_at,
    posted_date: job.posted_at || job.fetched_at,
  };

  // Include raw data from the original API if it's an object
  if (job.raw && typeof job.raw === "object" && !Array.isArray(job.raw)) {
    jobDetail = { ...jobDetail, ...(job.raw as Record<string, unknown>) };
  }

  console.log("Processed job detail:", jobDetail);
  return jobDetail;
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
      queryParts.push(...params.filters.skills);
    }

    // If no query parts, use empty string to get all jobs
    const query = queryParts.length > 0 ? queryParts.join(" ") : "";

    // Fetch jobs from Breneo API (filtering is done in fetchJobsFromBreneoAPI)
    const allJobs = await fetchJobsFromBreneoAPI({
      ...params,
      query,
      filters: params.filters,
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

    // Paginate results
    const pageSize = params.pageSize || 12;
    const page = params.page || 1;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedJobs = uniqueJobs.slice(startIndex, endIndex);

    console.log(
      `Fetched ${uniqueJobs.length} unique jobs, showing ${paginatedJobs.length} on page ${page}`
    );
    if (paginatedJobs.length > 0) {
      console.log("Sample job structure:", paginatedJobs[0]);
    }

    // Determine if there are more pages available
    const hasMore = endIndex < uniqueJobs.length;

    return {
      jobs: paginatedJobs,
      page: page,
      pageSize: pageSize,
      hasMore: hasMore,
      total: uniqueJobs.length,
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
  return fetchJobsFromBreneoAPI(params);
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

// Default export
const jobService = {
  fetchActiveJobs,
  fetchJobDetail,
  fetchJobsFromBreneoAPI,
  fetchJobsFromJSearch,
  fetchJobsFromMultipleSources,
};

export default jobService;
