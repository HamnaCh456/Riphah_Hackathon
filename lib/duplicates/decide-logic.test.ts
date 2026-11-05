import { expect, it } from "vitest";

import { orderedPair, parseDecision } from "./decide-logic";

const PAIR: [string, string] = ["a", "b"];

it("orders a pair the same way whichever came first", () => {
  expect(orderedPair("b", "a")).toEqual(["a", "b"]);
  expect(orderedPair("a", "b")).toEqual(["a", "b"]);
});

it("never merges without a chosen record", () => {
  const result = parseDecision({ action: "merge", keep: null, confirmed: "on" }, PAIR);
  expect(result.ok).toBe(false);
});

it("never merges without the recruiter's confirmation", () => {
  const result = parseDecision({ action: "merge", keep: "a", confirmed: null }, PAIR);
  expect(result).toEqual({
    ok: false,
    error: "Tick the box to confirm these are the same person.",
  });
});

it("refuses to keep a record outside the pair", () => {
  const result = parseDecision({ action: "merge", keep: "stranger", confirmed: "on" }, PAIR);
  expect(result.ok).toBe(false);
});

it("works out which record gets linked", () => {
  expect(parseDecision({ action: "merge", keep: "b", confirmed: "on" }, PAIR)).toEqual({
    ok: true,
    decision: { action: "merge", keep: "b", other: "a" },
  });
});

it("allows a dismissal with nothing else filled in", () => {
  expect(parseDecision({ action: "dismiss", keep: null, confirmed: null }, PAIR)).toEqual({
    ok: true,
    decision: { action: "dismiss" },
  });
});

it("refuses an unknown action", () => {
  expect(parseDecision({ action: "delete", keep: "a", confirmed: "on" }, PAIR).ok).toBe(false);
});
