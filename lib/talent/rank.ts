export type ChunkHit = {
  chunk_id: string;
  candidate_id: string;
  full_name: string | null;
  application_id: string;
  job_id: string;
  content: string;
  similarity: number;
};

export type FacetHits = { facet: string; hits: ChunkHit[] };

export type RankedCandidate = {
  candidateId: string;
  fullName: string | null;
  applicationId: string;
  jobId: string;
  evidence: { facet: string; excerpt: string; similarity: number; note?: string }[];
  /** No evidence was found for these. That doesn't mean the person lacks them. */
  missingFacets: string[];
};

export function rankCandidates(
  facetHits: FacetHits[],
  minSimilarity: number,
): RankedCandidate[] {
  const people = new Map<string, RankedCandidate>();

  for (const { facet, hits } of facetHits) {
    const seen = new Set<string>();
    for (const hit of [...hits].sort((a, b) => b.similarity - a.similarity)) {
      if (hit.similarity < minSimilarity || seen.has(hit.candidate_id)) continue;
      seen.add(hit.candidate_id);
      const person = people.get(hit.candidate_id) ?? {
        candidateId: hit.candidate_id,
        fullName: hit.full_name,
        applicationId: hit.application_id,
        jobId: hit.job_id,
        evidence: [],
        missingFacets: [],
      };
      person.evidence.push({
        facet,
        excerpt: hit.content,
        similarity: hit.similarity,
      });
      people.set(hit.candidate_id, person);
    }
  }

  const all = facetHits.map((f) => f.facet);
  const mean = (c: RankedCandidate) =>
    c.evidence.reduce((sum, e) => sum + e.similarity, 0) / c.evidence.length;
  return [...people.values()]
    .map((c) => ({
      ...c,
      missingFacets: all.filter((f) => !c.evidence.some((e) => e.facet === f)),
    }))
    .sort((a, b) => b.evidence.length - a.evidence.length || mean(b) - mean(a));
}
