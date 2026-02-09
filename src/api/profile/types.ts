/**
 * Types for profile page API (me profile, educations, work-experiences, skills).
 * Do not change the backend; these match the existing API.
 */

export interface ProfilePayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  country_region?: string;
  city?: string;
  about_me?: string | null;
  profile_image?: string | File | null;
  social_links?: Record<string, string>;
}

export interface EducationEntry {
  id: number;
  school_name: string;
  major?: string;
  degree_type?: string;
  gpa?: string | null;
  start_date: string;
  end_date?: string | null;
  is_current: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EducationPayload {
  school_name: string;
  major?: string;
  degree_type?: string;
  gpa?: string | null;
  start_date: string;
  end_date?: string | null;
  is_current: boolean;
}

export interface WorkExperienceEntry {
  id: number;
  job_title: string;
  company: string;
  job_type?: string | null;
  location?: string | null;
  start_date: string;
  end_date?: string | null;
  is_current: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WorkExperiencePayload {
  job_title: string;
  company: string;
  job_type?: string | null;
  location?: string | null;
  start_date: string;
  end_date?: string | null;
  is_current: boolean;
}

export interface UserSkill {
  id: number;
  skill_id: number;
  skill_name: string;
  created_at?: string;
}

export interface SkillSuggestion {
  id: number;
  name: string;
}
