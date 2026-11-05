export type Component = 'skill' | 'experience' | 'project' | 'qualification';
export type MatchStatus = 'matched' | 'partial' | 'no_evidence' | 'confirmed_absent';
export type Depth = 'demonstrated' | 'listed' | null;
export type Section =
  | 'contact' | 'summary' | 'skills' | 'experience' | 'project' | 'education' | 'certification' | 'other';

export interface Requirement {
  key: string;
  component: Component;
  label: string;
  importance: number;
  isRequired: boolean;
}

export interface ScorableRequirement {
  component: Component;
  importance: number;
  isRequired: boolean;
  status: MatchStatus;
  depth: Depth;
}

export interface RetrievedChunk {
  id: string;
  section: Section;
  content: string;
  similarity: number;
}

export interface LlmResult {
  key: string;
  status: MatchStatus;
  evidence: { chunk_id: string; quote: string }[];
  explanation: string;
  learning_suggestion: string | null;
}

export interface EvidenceRow {
  chunkId: string | null;
  quote: string;
  section: Section | null;
  verified: boolean;
  similarity: number | null;
}

export interface AssessedRequirement extends Requirement {
  status: MatchStatus;
  depth: Depth;
  explanation: string;
  learningSuggestion: string | null;
  needsReview: boolean;
  topSimilarity: number | null;
  evidence: EvidenceRow[];
}

export interface ScoreResult {
  score: number;
  ceiling: number;
  components: { component: Component; weight: number; credit: number }[];
  rescaled: boolean;
}
