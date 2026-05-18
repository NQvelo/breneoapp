export interface PublicSocialLinks {
  github: string | null;
  linkedin: string | null;
  facebook: string | null;
  instagram: string | null;
  dribbble: string | null;
  behance: string | null;
}

export interface PublicEducation {
  id: number;
  school_name: string;
  major: string;
  degree_type: string;
  gpa: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicWorkExperience {
  id: number;
  job_title: string;
  company: string;
  job_type: string;
  location: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicUserSkill {
  id: number;
  skill_id: number;
  skill_name: string;
  created_at: string;
}

export interface PublicUserProfile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  country_region: string;
  city: string;
  about_me: string;
  profile_image: string | null;
  social_links: PublicSocialLinks;
  educations: PublicEducation[];
  work_experiences: PublicWorkExperience[];
  skills: PublicUserSkill[];
  industry_profile: {
    industry_years_json: Record<string, number>;
    updated_at: string | null;
  };
  career: {
    final_role: string | null;
    total_score: string | null;
    skills_json: Record<string, unknown>;
  };
}
