/** Resume and match payloads from /api/ats/parse/, /api/me/resume/, and /api/ats/match/. */

export interface BilingualText {
  en: string;
  ka: string;
}

export interface ResumeSkill {
  name_en: string;
  name_ka: string;
}

export interface ResumeWorkExperience {
  title: BilingualText;
  company: BilingualText;
  location: BilingualText;
  start_date: string;
  end_date: string;
  is_current: boolean;
  description: BilingualText;
}

export interface ResumeEducation {
  school: BilingualText;
  degree: BilingualText;
  field_of_study: BilingualText;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface Resume {
  full_name: BilingualText;
  headline: BilingualText;
  email: string;
  phone: string;
  location: BilingualText;
  summary: BilingualText;
  skills: ResumeSkill[];
  languages: ResumeSkill[];
  work_experience: ResumeWorkExperience[];
  education: ResumeEducation[];
  certifications: BilingualText[];
  language: string;
  extraction_method: string;
  parser_method: string;
  source_filename: string;
  warnings: string[];
}

export interface SavedResumeResponse {
  resume: Resume | null;
  source_filename: string;
  updated_at: string | null;
}

export interface MatchScores {
  overall: number;
  keyword_overlap: number;
  experience: number;
  semantic_similarity: number;
}

export interface MatchWeights {
  keyword_overlap: number;
  experience: number;
  semantic_similarity: number;
}

export interface ResumeMatch {
  scores: MatchScores;
  weights: MatchWeights;
  matched_keywords: string[];
  missing_keywords: string[];
  candidate_years_experience: number;
  required_years_experience: number;
  resume_language: string;
  job_language: string;
  recommendations: string[];
  method: string;
}

export interface MatchResponse {
  resume: Resume;
  match: ResumeMatch;
}

export interface MatchRequest {
  resume: Resume;
  job_id?: string;
  job_description?: string;
  job_title?: string;
}
