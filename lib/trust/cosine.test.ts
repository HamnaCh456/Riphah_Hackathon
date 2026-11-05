import { expect, it } from "vitest";

import { cosineSimilarity } from "./cosine";

it("computes cosine similarity and copes with empty vectors", () => {
  expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
  expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  expect(cosineSimilarity([0, 0], [1, 0])).toBe(0);
});
