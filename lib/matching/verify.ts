import type { AssessedRequirement, EvidenceRow, LlmResult, Requirement, RetrievedChunk } from './types';

export function normalizeForMatch(text: string): string {
  return text.normalize('NFKC').toLowerCase()
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ').trim();
}

export function verifyRequirement(
  req: Requirement, llm: LlmResult | undefined, chunks: RetrievedChunk[],
): AssessedRequirement {
  const topSimilarity = chunks.length ? Math.max(...chunks.map((c) => c.similarity)) : null;
  const base = { ...req, topSimilarity, learningSuggestion: llm?.learning_suggestion ?? null };

  if (!llm) {
    return { ...base, status: 'no_evidence', depth: null, needsReview: true, evidence: [],
      explanation: 'The AI returned no result for this requirement, so it needs a manual check.' };
  }
  if (llm.status === 'no_evidence') {
    return { ...base, status: 'no_evidence', depth: null, needsReview: false, evidence: [],
      explanation: llm.explanation };
  }

  const evidence: EvidenceRow[] = llm.evidence.map((e) => {
    const chunk = chunks.find((c) => c.id === e.chunk_id);
    // The prompt escapes "<" in resume text, so a faithful quote can come back escaped.
    const quote = normalizeForMatch(e.quote.replace(/&lt;/g, '<'));
    const verified = !!chunk && quote.length >= 2 && normalizeForMatch(chunk.content).includes(quote);
    return { chunkId: chunk?.id ?? null, quote: e.quote, section: chunk?.section ?? null,
      verified, similarity: chunk?.similarity ?? null };
  });
  const real = evidence.filter((e) => e.verified);

  if (real.length === 0) {
    return { ...base, status: 'no_evidence', depth: null, needsReview: true, evidence,
      explanation: 'The AI made a claim here but its quote is not in the resume, so it is treated as not mentioned.' };
  }

  const depth = llm.status === 'confirmed_absent' ? null
    : real.every((e) => e.section === 'skills') ? 'listed' : 'demonstrated';
  return { ...base, status: llm.status, depth, needsReview: real.length < evidence.length,
    evidence, explanation: llm.explanation };
}
