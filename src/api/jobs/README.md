ni# Jobs API Service

A comprehensive service for fetching active jobs from Breneo Job Aggregator API.

## Overview

This service provides a unified interface to fetch job listings from the Breneo Job Aggregator API, which aggregates jobs from multiple platforms including:

- **Breneo** - Native platform jobs
- **Greenhouse** - Jobs from companies using Greenhouse
- **Lever** - Jobs from companies using Lever
- **Spotify** - Jobs from Spotify and similar platforms

## Features

- ✅ Fetch active jobs from Breneo Job Aggregator API
- ✅ Fetch detailed job information by job ID
- ✅ Support for multiple job platforms through aggregator
- ✅ Rate limiting to prevent API quota exhaustion
- ✅ Automatic deduplication of job listings
- ✅ Client-side filtering for search queries, location, remote, job types, and date posted
- ✅ TypeScript type definitions for all job data structures

## Usage

### Basic Job Search

```typescript
import { jobService } from "@/api/jobs";
import { JobFilters } from "@/api/jobs/types";

const filters: JobFilters = {
  country: "Georgia",
  countries: ["ge"],
  jobTypes: ["FULLTIME"],
  isRemote: false,
  datePosted: "all",
  skills: ["JavaScript", "React"],
};

const response = await jobService.fetchActiveJobs({
  query: "software developer",
  filters,
  page: 1,
  pageSize: 20,
});

console.log(`Found ${response.jobs.length} jobs`);
```

### Fetch Job Details

```typescript
import { jobService } from "@/api/jobs";

const jobDetail = await jobService.fetchJobDetail("job-id-123");
console.log(jobDetail.title, jobDetail.company_name);
```

### Using with React Query

```typescript
import { useQuery } from "@tanstack/react-query";
import { jobService } from "@/api/jobs";

const { data: jobs, isLoading } = useQuery({
  queryKey: ["jobs", searchTerm, filters],
  queryFn: () =>
    jobService.fetchActiveJobs({
      query: searchTerm,
      filters,
      page: 1,
    }),
});
```

## API Reference

### `fetchActiveJobs(params: JobSearchParams): Promise<JobApiResponse>`

Fetches active jobs based on search parameters.

**Parameters:**

- `query: string` - Search query (e.g., "software developer")
- `filters: JobFilters` - Filter options
- `page?: number` - Page number (default: 1)
- `pageSize?: number` - Results per page (default: 20)

**Returns:**

```typescript
{
  jobs: ApiJob[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}
```

### `fetchJobDetail(jobId: string): Promise<JobDetail>`

Fetches detailed information about a specific job.

**Parameters:**

- `jobId: string` - Unique job identifier

**Returns:** `JobDetail` object with complete job information

## Filter Options

### JobFilters Interface

```typescript
interface JobFilters {
  country: string; // Default country name
  countries: string[]; // Array of country codes (e.g., ["ge", "us"])
  jobTypes: string[]; // Employment types: ["FULLTIME", "PARTTIME", "CONTRACTOR", "INTERN"]
  isRemote: boolean; // Filter for remote jobs
  datePosted?: string; // "all" | "day" | "week" | "month"
  skills: string[]; // Array of skills to include in search
}
```

## API Configuration

### Breneo Job Aggregator API

- **Endpoint:** `https://breneo-job-aggregator.up.railway.app/api/`
- **Status:** ✅ Active
- **Rate Limit:** 1 request per second (enforced client-side)
- **Authentication:** No API key required
- **Response Format:** JSON array of job objects

### Supported Job Platforms

The aggregator fetches jobs from multiple platforms:

- **Breneo** - Native platform jobs
- **Greenhouse** - Company career pages using Greenhouse
- **Lever** - Company career pages using Lever
- **Other Platforms** - Additional integrations as configured in the aggregator

## Rate Limiting

The service automatically enforces a rate limit of 1 request per second to prevent exceeding API quotas. This is handled transparently - requests are automatically queued and delayed if needed.

## Error Handling

The service throws descriptive errors for common issues:

- **429 (Rate Limit Exceeded):** "You have exceeded your API request limit. Please try again later."
- **Network Errors:** Original error message is preserved
- **Invalid Responses:** "Invalid response format from API"

## Type Definitions

All types are exported from `@/api/jobs/types`:

- `ApiJob` - Raw job data from APIs
- `JobDetail` - Detailed job information
- `JobFilters` - Filter options
- `JobSearchParams` - Search parameters
- `NormalizedJob` - Standardized job format
- `CompanyInfo` - Company information

## Configuration

The API endpoint is configured in `jobService.ts`:

```typescript
const JOB_API_BASE = "https://breneo-job-aggregator.up.railway.app/api/";
```

No API key is required for the Breneo Job Aggregator API. All filtering is performed client-side after fetching the full job list from the aggregator.

## Examples

### Search with Location Filter

```typescript
const jobs = await jobService.fetchActiveJobs({
  query: "developer",
  filters: {
    country: "United States",
    countries: ["us"],
    jobTypes: [],
    isRemote: false,
    skills: [],
  },
});
```

### Search Remote Jobs Only

```typescript
const remoteJobs = await jobService.fetchActiveJobs({
  query: "react developer",
  filters: {
    country: "Worldwide",
    countries: [],
    jobTypes: ["FULLTIME"],
    isRemote: true,
    skills: ["React", "TypeScript"],
  },
});
```

### Get Job Details

```typescript
const job = await jobService.fetchJobDetail("12345");
console.log(job.title); // Job title
console.log(job.company_name); // Company name
console.log(job.description); // Full description
console.log(job.apply_url); // Application URL
```

## Notes

- The service automatically handles deduplication based on job IDs
- Company information is normalized from various API formats
- All API responses are logged for debugging purposes
- The service is designed to be easily extensible for additional job APIs
