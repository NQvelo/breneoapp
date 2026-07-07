export type AtomPathStatus = "locked" | "available" | "completed";

export interface AtomPathItem {
  id: number;
  title: string;
  sequence_order: number;
  status: AtomPathStatus;
}

export interface ProfessionAtomPath {
  profession_id: number;
  profession_title: string;
  atoms: AtomPathItem[];
  current_atom_id: number | null;
  completed_count: number;
  total_count: number;
}
