import { excerptAppearsIn } from "@/lib/ai/verify-excerpt";
import { redact } from "@/lib/matching/redact";
import { cosineSimilarity } from "@/lib/trust/cosine";

import { careerYears, datedLines } from "./experience-years";
import type { RankedCandidate } from "./rank";
import type { SearchableChunk } from "./search-hits";

/** One thing the recruiter asked for. A year limit of 0 means no limit. */
export type SearchNeed = {
  need: string;
  minYears: number;
  maxYears: number;
  /** The years are about the whole career, not one skill, so code can check them. */
  overall: boolean;
  optional: boolean;
};

export type Applicant = {
  candidateId: string;
  fullName: string | null;
  applicationId: string;
  jobId: string;
  careerYears: number | null;
  /** What the AI reads for this person. */
  chunks: SearchableChunk[];
  /** chunkId to similarity, one map per need. */
  similarity: Map<string, number>[];
  retrievalScore: number;
};

export type NeedVerdict = { need: number; met: boolean; excerpt: string; quote: string };

const CHUNKS_PER_NEED = 2;
const MAX_CHUNKS = 8;
const WORK_HISTORY = new Set(["experience", "summary"]);

const isKnownOutOfRange = (need: SearchNeed, years: number | null) =>
  need.overall &&
  years !== null &&
  ((need.minYears > 0 && years < need.minYears) ||
    (need.maxYears > 0 && years > need.maxYears));

/**
 * Finds who is worth checking. Similarity only narrows the list, because it can't tell right work
 * from nearby work. Dates are checked here too, so someone with 2 years never passes a 5 year need.
 */
export function gatherApplicants(
  needs: SearchNeed[],
  vectors: number[][],
  chunks: SearchableChunk[],
  minSimilarity: number,
  now: Date,
): Applicant[] {
  const byPerson = new Map<string, SearchableChunk[]>();
  for (const chunk of chunks) {
    byPerson.set(chunk.candidateId, [...(byPerson.get(chunk.candidateId) ?? []), chunk]);
  }
  const topics = needs.flatMap((need, i) => (need.overall ? [] : [i]));

  const applicants: Applicant[] = [];
  for (const own of byPerson.values()) {
    const years = careerYears(
      own.filter((c) => c.section === "experience").map((c) => c.content),
      now,
    );
    if (needs.some((need) => isKnownOutOfRange(need, years))) continue;

    const similarity = needs.map(
      (_, i) => new Map(own.map((c) => [c.chunkId, cosineSimilarity(vectors[i], c.embedding)])),
    );
    const best = topics.map((i) => Math.max(...similarity[i].values()));
    if (topics.length > 0 && !best.some((value) => value >= minSimilarity)) continue;

    const closest = topics.flatMap((i) =>
      [...own]
        .sort((a, b) => similarity[i].get(b.chunkId)! - similarity[i].get(a.chunkId)!)
        .slice(0, CHUNKS_PER_NEED),
    );
    const history = own.filter((c) => WORK_HISTORY.has(c.section));
    const picked = [...new Set([...closest, ...history])].slice(0, MAX_CHUNKS);

    applicants.push({
      candidateId: own[0].candidateId,
      fullName: own[0].fullName,
      applicationId: own[0].applicationId,
      jobId: own[0].jobId,
      careerYears: years,
      chunks: picked,
      similarity,
      retrievalScore: best.length
        ? best.reduce((sum, value) => sum + value, 0) / best.length
        : (years ?? 0),
    });
  }
  return applicants.sort((a, b) => b.retrievalScore - a.retrievalScore);
}

/** Names and personal lines are removed first, so they can't sway the AI. Rule 7. */
export function judgePrompt(needs: SearchNeed[], applicants: Applicant[], now: Date): string {
  return JSON.stringify(
    {
      today: now.toISOString().slice(0, 10),
      needs: needs.map((need, i) => ({
        index: i,
        need: need.need,
        minYears: need.minYears,
        maxYears: need.maxYears,
      })),
      applicants: applicants.map((person, a) => ({
        id: `A${a}`,
        listedWorkYears: person.careerYears,
        excerpts: person.chunks.map((chunk, c) => ({
          id: `c${c}`,
          section: chunk.section,
          text: redact(chunk.content, person.fullName),
        })),
      })),
    },
    null,
    2,
  );
}

const roundYears = (years: number) => (Number.isInteger(years) ? years : Math.round(years * 2) / 2);

/**
 * Turns verdicts into a result. The evidence is always stored resume text: the AI points at an
 * excerpt, and its quote is used only if it really is in that excerpt.
 */
function toRanked(needs: SearchNeed[], person: Applicant, verdicts: NeedVerdict[]): RankedCandidate {
  const evidence: RankedCandidate["evidence"] = [];
  const missingFacets: string[] = [];

  needs.forEach((need, i) => {
    if (need.overall && person.careerYears !== null) {
      const dated = datedLines(
        person.chunks.filter((c) => c.section === "experience").map((c) => c.content),
      );
      if (dated.length > 0) {
        evidence.push({
          facet: need.need,
          excerpt: dated.join("\n"),
          similarity: 1,
          note: `About ${roundYears(person.careerYears)} years of work listed`,
        });
        return;
      }
    }
    const verdict = verdicts.find((v) => v.need === i);
    const chunk = verdict?.met ? person.chunks[Number(verdict.excerpt.slice(1))] : undefined;
    if (!verdict || !chunk) {
      missingFacets.push(need.need);
      return;
    }
    evidence.push({
      facet: need.need,
      excerpt: excerptAppearsIn(verdict.quote, chunk.content) ? verdict.quote : chunk.content,
      similarity: person.similarity[i].get(chunk.chunkId) ?? 0,
    });
  });

  return {
    candidateId: person.candidateId,
    fullName: person.fullName,
    applicationId: person.applicationId,
    jobId: person.jobId,
    evidence,
    missingFacets,
  };
}

/** Used when the AI check fails: nothing it would have read for meaning or dates can pass. */
export function strictVerdicts(
  needs: SearchNeed[],
  person: Applicant,
  strictSimilarity: number,
): NeedVerdict[] {
  return needs.flatMap((need, i) => {
    if (need.overall || need.minYears > 0 || need.maxYears > 0) return [];
    const ranked = person.chunks
      .map((chunk, c) => ({ c, value: person.similarity[i].get(chunk.chunkId) ?? 0 }))
      .sort((a, b) => b.value - a.value);
    const top = ranked[0];
    return top && top.value >= strictSimilarity
      ? [{ need: i, met: true, excerpt: `c${top.c}`, quote: "" }]
      : [];
  });
}

const mean = (c: RankedCandidate) =>
  c.evidence.reduce((sum, e) => sum + e.similarity, 0) / (c.evidence.length || 1);

/**
 * Only people who show every required need count as matches. Someone showing part of it is kept
 * apart, because missing evidence doesn't prove they lack it, and the recruiter opens them by choice.
 */
export function splitResults(
  needs: SearchNeed[],
  people: { person: Applicant; verdicts: NeedVerdict[] }[],
): { matches: RankedCandidate[]; partial: RankedCandidate[] } {
  const required = needs.filter((need) => !need.optional).map((need) => need.need);
  const matches: RankedCandidate[] = [];
  const partial: RankedCandidate[] = [];

  for (const { person, verdicts } of people) {
    const ranked = toRanked(needs, person, verdicts);
    if (ranked.evidence.length === 0) continue;
    const shownRequired = required.filter((need) => !ranked.missingFacets.includes(need));
    if (shownRequired.length === required.length) matches.push(ranked);
    else if (shownRequired.length * 2 >= required.length) partial.push(ranked);
  }

  const order = (a: RankedCandidate, b: RankedCandidate) =>
    b.evidence.length - a.evidence.length || mean(b) - mean(a);
  return { matches: matches.sort(order), partial: partial.sort(order) };
}
