import { cosineSimilarity } from "@/lib/trust/cosine";

import type { ChunkHit, FacetHits } from "./rank";

export type SearchableChunk = {
  chunkId: string;
  candidateId: string;
  fullName: string | null;
  applicationId: string;
  jobId: string;
  section: string;
  content: string;
  embedding: number[];
};

const PERSONAL_TERM =
  /\b(female|male|wom[ae]n|men|gender|aged?|years old|married|unmarried|marital|muslims?|christians?|hindus?|sikhs?|religio(n|us)|nationality|ethnicity|race(?! condition)|disabled|disability)\b/i;

/** Rule 7: a search can't target personal characteristics, whatever the AI returned. */
export function dropPersonalFacets(facets: string[]): string[] {
  return facets.filter((facet) => !PERSONAL_TERM.test(facet));
}

const REVIEWED = ["in_review", "shortlisted", "interview", "selected", "rejected"];

/** The talent pool: reviewed people who agreed to it and haven't applied to this job yet. */
export function isPastApplicant(
  status: string,
  candidateId: string,
  personId: string,
  alreadyApplied: Set<string>,
  consented: Set<string>,
): boolean {
  return (
    REVIEWED.includes(status) &&
    consented.has(candidateId) &&
    !alreadyApplied.has(personId)
  );
}

/** Scores every chunk against every need. The evidence is always the stored resume text. */
export function buildFacetHits(
  facets: string[],
  vectors: number[][],
  chunks: SearchableChunk[],
): FacetHits[] {
  return facets.map((facet, i) => ({
    facet,
    hits: chunks.map(
      (chunk): ChunkHit => ({
        chunk_id: chunk.chunkId,
        candidate_id: chunk.candidateId,
        full_name: chunk.fullName,
        application_id: chunk.applicationId,
        job_id: chunk.jobId,
        content: chunk.content,
        similarity: cosineSimilarity(vectors[i], chunk.embedding),
      }),
    ),
  }));
}
