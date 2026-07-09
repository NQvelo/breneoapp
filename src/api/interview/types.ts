export interface InterviewPlaybackItem {
  type: "welcome" | "question";
  text: string;
  audio_url: string | null;
}

export interface InterviewQuestion {
  id: string;
  interview_id: string;
  job_position: string;
  question_text: string;
  question_number: number;
  total_questions: number;
  question_audio_url: string | null;
}

export interface StartInterviewResponse {
  interview: {
    id: string;
    job_id: number | null;
    job_position: string;
    created_at: string;
  };
  welcome_text: string;
  welcome_audio_url: string | null;
  playback: InterviewPlaybackItem[];
  question: InterviewQuestion;
}

export interface SubmitInterviewResponse {
  overall_score: number;
  status: "PASSED" | "FAILED";
  requires_retake: boolean;
  user_transcript: string;
  metrics: Record<string, { score: number; label: string; feedback: string }>;
  strengths: string[];
  improvements: string[];
  missing_concepts: string[];
  recommended_answer: string;
  question_number: number;
  total_questions: number;
  interview_complete: boolean;
  next_question: InterviewQuestion | null;
}

export type InterviewEvaluation = Omit<
  SubmitInterviewResponse,
  "question_number" | "total_questions" | "interview_complete" | "next_question"
>;

export type StartInterviewParams =
  | { job_id: number; job_position?: never }
  | { job_position: string; job_id?: never };
