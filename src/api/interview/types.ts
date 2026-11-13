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
    role: string | null;
    job_id: number | null;
    job_position: string;
    created_at: string;
  };
  welcome_text: string;
  welcome_audio_url: string | null;
  playback: InterviewPlaybackItem[];
  question: InterviewQuestion;
  /** This session only, in order. Length 1–5. Later items have no audio yet. */
  questions: InterviewQuestion[];
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

export type InterviewMode = "spoken" | "text";

export type StartInterviewParams =
  | { role: string; mode?: InterviewMode }
  | { job_id: number; mode?: InterviewMode }
  | { job_position: string; mode?: InterviewMode };
