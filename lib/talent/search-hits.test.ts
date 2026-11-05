import { expect, it } from "vitest";

import {
  buildFacetHits,
  dropPersonalFacets,
  isPastApplicant,
  type SearchableChunk,
} from "./search-hits";

it("includes only reviewed people who haven't applied to this job", () => {
  const applied = new Set(["already"]);
  expect(isPastApplicant("rejected", "p1", applied)).toBe(true);
  expect(isPastApplicant("shortlisted", "p1", applied)).toBe(true);
  expect(isPastApplicant("submitted", "p1", applied)).toBe(false);
  expect(isPastApplicant("assessed", "p1", applied)).toBe(false);
  expect(isPastApplicant("rejected", "already", applied)).toBe(false);
});

it("drops personal needs and keeps job-related ones", () => {
  expect(
    dropPersonalFacets([
      "female candidates",
      "Muslim developers",
      "under age 30",
      "Python development",
      "race condition debugging",
      "single page apps",
      "management experience",
    ]),
  ).toEqual([
    "Python development",
    "race condition debugging",
    "single page apps",
    "management experience",
  ]);
});

const chunk: SearchableChunk = {
  chunkId: "c1",
  candidateId: "p1",
  fullName: "Noor",
  applicationId: "a1",
  jobId: "j1",
  content: "Built Flask services",
  embedding: [1, 0],
};

it("scores each chunk against each need and keeps the stored text", () => {
  const [close, far] = buildFacetHits(
    ["web services", "marketing"],
    [
      [1, 0],
      [0, 1],
    ],
    [chunk],
  );
  expect(close.hits[0]).toMatchObject({
    candidate_id: "p1",
    application_id: "a1",
    content: "Built Flask services",
  });
  expect(close.hits[0].similarity).toBeCloseTo(1);
  expect(far.hits[0].similarity).toBeCloseTo(0);
});

it("returns no hits when there are no chunks", () => {
  expect(buildFacetHits(["x"], [[1, 0]], [])).toEqual([{ facet: "x", hits: [] }]);
});
