export type ContentType = "markdown" | "code" | "math_formula" | "rich_text";

export interface ContentCard {
  card_index: number;
  content_type: ContentType;
  content_body: string;
}

export interface Profession {
  id: number;
  title: string;
  description: string;
  skills: string[];
  market_popularity: { year: string; value: number }[];
  relevant_courses: string[];
  created_at: string;
  updated_at: string;
}

export interface ProfessionAssignment {
  id: number;
  profession: Profession;
  match_score: number;
  created_at: string;
}

export interface Atom {
  id: number;
  profession_id: number;
  profession_title: string;
  title: string;
  sequence_order: number;
  content_cards: ContentCard[];
  quiz: { options: [string, string, string] };
  /** Total atoms in this profession path (when returned by API). */
  total_atoms?: number;
  /** Lightweight path preview (when returned by API). */
  path_atoms?: {
    id: number;
    title: string;
    sequence_order: number;
  }[];
}

export interface AtomSubmitResult {
  atom_id: number;
  profession_id: number;
  score_percentage: number;
  is_completed: boolean;
  requires_retake: boolean;
  passed: boolean;
  is_correct: boolean;
  correct_index: number;
  explanation: string;
  last_attempted_at: string;
}

export type NextAtomErrorReason =
  | "profession_not_found"
  | "no_atoms"
  | "all_completed"
  | "unknown";

export interface NextAtomResult {
  atom: Atom | null;
  errorReason?: NextAtomErrorReason;
  errorDetail?: string;
}
