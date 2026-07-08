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
    job_position: string;
    created_at: string;
  };
  question: InterviewQuestion;
}

export interface InterviewEvaluation {
  overall_score: number;
  status: "PASSED" | "FAILED";
  requires_retake: boolean;
  user_transcript: string;
  metrics: Record<string, { score: number; label: string; feedback: string }>;
  strengths: string[];
  improvements: string[];
  missing_concepts: string[];
  recommended_answer: string;
}

export interface SubmitInterviewResponse extends InterviewEvaluation {
  question_number: number;
  total_questions: number;
  interview_complete: boolean;
  next_question: InterviewQuestion | null;
}
