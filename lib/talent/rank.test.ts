import { expect, it } from "vitest";

import { rankCandidates, type ChunkHit, type FacetHits } from "./rank";

function hit(candidate: string, content: string, similarity: number): ChunkHit {
  return {
    chunk_id: `${candidate}-${content}`,
    candidate_id: candidate,
    full_name: candidate,
    application_id: `app-${candidate}`,
    job_id: "job",
    content,
    similarity,
  };
}
const MIN = 0.6;

it("ranks someone covering every need above a stronger single-need match", () => {
  const hits: FacetHits[] = [
    { facet: "Python", hits: [hit("both", "a", 0.7), hit("one", "b", 0.95)] },
    { facet: "REST API", hits: [hit("both", "c", 0.7)] },
  ];
  expect(rankCandidates(hits, MIN).map((c) => c.candidateId)).toEqual([
    "both",
    "one",
  ]);
});

it("reports an unmatched need as missing evidence", () => {
  const [result] = rankCandidates(
    [
      { facet: "Python", hits: [hit("a", "x", 0.8)] },
      { facet: "Docker", hits: [] },
    ],
    MIN,
  );
  expect(result.missingFacets).toEqual(["Docker"]);
});

it("leaves out candidates with nothing above the bar", () => {
  expect(
    rankCandidates([{ facet: "Python", hits: [hit("a", "x", 0.3)] }], MIN),
  ).toEqual([]);
});

it("uses the strongest chunk as the evidence", () => {
  const [result] = rankCandidates(
    [
      {
        facet: "Python",
        hits: [hit("a", "weak", 0.65), hit("a", "strong", 0.9)],
      },
    ],
    MIN,
  );
  expect(result.evidence[0].excerpt).toBe("strong");
});

it("keeps a link to the application so a recruiter can open it", () => {
  const [result] = rankCandidates(
    [{ facet: "Python", hits: [hit("a", "x", 0.8)] }],
    MIN,
  );
  expect(result).toMatchObject({ applicationId: "app-a", jobId: "job" });
});
