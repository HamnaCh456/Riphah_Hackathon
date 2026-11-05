import type { RankedCandidate } from "./rank";

export type EvidencePair = { need: string; excerpt: string };

export function evidencePairs(results: RankedCandidate[]): EvidencePair[] {
  return results.flatMap((person) =>
    person.evidence.map((item) => ({ need: item.facet, excerpt: item.excerpt })),
  );
}

/**
 * Removes evidence the check rejected. A need with no evidence left is reported as missing, and
 * someone with no evidence left is dropped. Order is kept, then re-sorted by needs covered.
 */
export function applyVerdicts(
  results: RankedCandidate[],
  verdicts: boolean[],
): RankedCandidate[] {
  let index = 0;
  return results
    .map((person) => {
      const kept = person.evidence.filter(() => verdicts[index++]);
      const dropped = person.evidence
        .filter((item) => !kept.includes(item))
        .map((item) => item.facet);
      return {
        ...person,
        evidence: kept,
        missingFacets: [...person.missingFacets, ...dropped],
      };
    })
    .filter((person) => person.evidence.length > 0)
    .sort((a, b) => b.evidence.length - a.evidence.length);
}

/** Used when the AI check fails: only evidence above the stricter bar stays. */
export function applyStrictBar(
  results: RankedCandidate[],
  strictSimilarity: number,
): RankedCandidate[] {
  return applyVerdicts(
    results,
    results.flatMap((person) =>
      person.evidence.map((item) => item.similarity >= strictSimilarity),
    ),
  );
}
