/**
 * Job API Types
 *
 * Type definitions for job-related API responses and requests
 */

export interface CompanyInfo {
  name?: string;
  company_name?: string;
  employer_name?: string;
  logo?: string;
  company_logo?: string;
  employer_logo?: string;
  logo_url?: string;
  website?: string;
  company_url?: string;
  website_url?: string;
  description?: string;
  company_description?: string;
  size?: string;
  company_size?: string;
  industry?: string;
  company_industry?: string;
  founded?: string;
  company_founded?: string;
  headquarters?: string;
  company_headquarters?: string;
  [key: string]: unknown;
}

export interface JobDetail {
  id?: string;
  job_id?: string;
  title?: string;
  job_title?: string;
  company?: string | CompanyInfo;
  company_name?: string;
  employer_name?: string;
  location?: string;
  job_location?: string;
  city?: string;
  state?: string;
  country?: string;
  description?: string;
  job_description?: string;
  salary?: string;
  min_salary?: number;
  max_salary?: number;
  salary_currency?: string;
  salary_period?: string;
  employment_type?: string;
  job_employment_type?: string;
  work_arrangement?: string;
  is_remote?: boolean;
  remote?: boolean;
  apply_url?: string;
  job_apply_link?: string;
  url?: string;
  applyUrl?: string;
  applyLink?: string;
  application_url?: string;
  application_link?: string;
  link?: string;
  company_logo?: string;
  employer_logo?: string;
  logo_url?: string;
  posted_date?: string;
  date_posted?: string;
  company_info?: CompanyInfo;
  employer?: CompanyInfo;
  // Additional job details
  requirements?: string;
  job_requirements?: string;
  qualifications?: string;
  responsibilities?: string;
  team_description?: string;
  required_experience?: string;
  job_required_experience?: string;
  experience?: string;
  required_skills?: string | string[];
  skills?: string | string[];
  job_skills?: string | string[];
  education?: string;
  education_required?: string;
  required_education?: string;
  benefits?: string;
  job_benefits?: string;
  perks?: string;
  application_deadline?: string;
  deadline?: string;
  expires_at?: string;
  expiration_date?: string;
  job_type?: string;
  job_category?: string;
  category?: string;
  industry?: string;
  job_industry?: string;
  [key: string]: unknown;
}

// API response job structure - supports multiple API formats
export interface ApiJob {
  // JSearch/Bing format
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
  logo_url?: string;
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
  // Y Combinator API specific fields
  position?: string;
  company_logo_url?: string;
  company_url?: string;
  // LinkedIn Jobs API specific fields
  companyName?: string;
  companyLogo?: string;
  jobLocation?: string;
  jobUrl?: string;
  applyUrl?: string;
  description?: string;
  // Date and status fields for active job filtering
  date_posted?: string;
  posted_date?: string;
  job_posted_at_datetime_utc?: string;
  postedAt?: string;
  expiration_date?: string;
  expires_at?: string;
  expires?: string;
  status?: string;
  [key: string]: unknown; // Allow any other fields
}

// Filter state shape
export interface JobFilters {
  country: string;
  countries: string[]; // Array of country codes
  jobTypes: string[];
  isRemote: boolean;
  datePosted?: string; // Add date_posted filter
  skills: string[]; // User interests/skills from test results
  salaryMin?: number; // Minimum salary
  salaryMax?: number; // Maximum salary
  salaryByAgreement?: boolean; // "By agreement" checkbox
}

// Job search parameters
export interface JobSearchParams {
  query: string;
  filters: JobFilters;
  page?: number;
  pageSize?: number;
}

// Normalized job structure (standardized format)
export interface NormalizedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  company_logo?: string;
  is_saved?: boolean;
  salary?: string;
  employment_type?: string;
  work_arrangement?: string;
  benefits?: string;
  description?: string;
  posted_date?: string;
  min_salary?: number;
  max_salary?: number;
  salary_currency?: string;
  salary_period?: string;
}

// API response wrapper
export interface JobApiResponse {
  jobs: ApiJob[];
  total?: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
}
