import { expect, it } from "vitest";

import { applyStrictBar, applyVerdicts, evidencePairs } from "./confirm-evidence";
import type { RankedCandidate } from "./rank";

function person(id: string, needs: [string, number][]): RankedCandidate {
  return {
    candidateId: id,
    fullName: id,
    applicationId: `app-${id}`,
    jobId: "job",
    evidence: needs.map(([facet, similarity]) => ({
      facet,
      excerpt: `${id} ${facet}`,
      similarity,
    })),
    missingFacets: [],
  };
}

const results = [
  person("dev", [
    ["Python", 0.62],
    ["REST", 0.64],
  ]),
  person("marketer", [["REST", 0.6]]),
];

it("lists one pair per piece of evidence, in order", () => {
  expect(evidencePairs(results)).toEqual([
    { need: "Python", excerpt: "dev Python" },
    { need: "REST", excerpt: "dev REST" },
    { need: "REST", excerpt: "marketer REST" },
  ]);
});

it("drops someone whose only evidence was rejected", () => {
  const output = applyVerdicts(results, [true, true, false]);
  expect(output.map((p) => p.candidateId)).toEqual(["dev"]);
});

it("reports rejected evidence as a missing need, not a failure", () => {
  const [dev] = applyVerdicts(results, [true, false, false]);
  expect(dev.evidence.map((e) => e.facet)).toEqual(["Python"]);
  expect(dev.missingFacets).toEqual(["REST"]);
});

it("falls back to a stricter similarity bar", () => {
  const output = applyStrictBar(results, 0.61);
  expect(output.map((p) => p.candidateId)).toEqual(["dev"]);
  expect(output[0].evidence).toHaveLength(2);
});
