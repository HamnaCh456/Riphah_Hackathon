import type { AssessedRequirement, EvidenceRow, LlmResult, Requirement, RetrievedChunk } from './types';

export function normalizeForMatch(text: string): string {
  return text.normalize('NFKC').toLowerCase()
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ').trim();
}

const MAX_QUOTE = 200;

/**
 * The AI often quotes only the skills list, even when a job or project line shows the skill in use.
 * Finds that line in the resume text, so the applicant isn't marked down as "listed only".
 */
function findUse(label: string, chunks: RetrievedChunk[]): EvidenceRow | null {
  const term = normalizeForMatch(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const whole = new RegExp(`(^|[^a-z0-9+#])${term}($|[^a-z0-9+#])`);
  for (const chunk of chunks) {
    if (chunk.section !== 'experience' && chunk.section !== 'project') continue;
    for (const line of chunk.content.split('\n')) {
      for (const sentence of line.replace(/^\s*[-•*]\s*/, '').split(/(?<=[.!?])\s+/)) {
        if (whole.test(normalizeForMatch(sentence))) {
          return { chunkId: chunk.id, quote: sentence.trim().slice(0, MAX_QUOTE), section: chunk.section,
            verified: true, similarity: chunk.similarity };
        }
      }
    }
  }
  return null;
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

  const check = (rawQuote: string, chunkId: string): EvidenceRow => {
    const chunk = chunks.find((c) => c.id === chunkId);
    // The prompt escapes "<" in resume text, so a faithful quote can come back escaped.
    const quote = normalizeForMatch(rawQuote.replace(/&lt;/g, '<'));
    const verified = !!chunk && quote.length >= 2 && normalizeForMatch(chunk.content).includes(quote);
    return { chunkId: chunk?.id ?? null, quote: rawQuote, section: chunk?.section ?? null,
      verified, similarity: chunk?.similarity ?? null };
  };
  const evidence: EvidenceRow[] = llm.evidence.flatMap((e) => {
    const whole = check(e.quote, e.chunk_id);
    const lines = e.quote.split('\n').map((line) => line.trim()).filter(Boolean);
    // The AI sometimes joins separate lines into one quote, so each line is checked by itself.
    return whole.verified || lines.length < 2 ? [whole] : lines.map((line) => check(line, e.chunk_id));
  });
  const real = evidence.filter((e) => e.verified);

  if (real.length === 0) {
    return { ...base, status: 'no_evidence', depth: null, needsReview: true, evidence,
      explanation: 'The AI made a claim here but its quote is not in the resume, so it is treated as not mentioned.' };
  }

  const listedOnly = real.every((e) => e.section === 'skills');
  const use = llm.status === 'matched' && listedOnly ? findUse(req.label, chunks) : null;
  const depth = llm.status === 'confirmed_absent' ? null
    : listedOnly && !use ? 'listed' : 'demonstrated';
  return { ...base, status: llm.status, depth, needsReview: real.length < evidence.length,
    evidence: use ? [...evidence, use] : evidence, explanation: llm.explanation };
}
