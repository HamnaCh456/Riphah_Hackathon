import { describe, expect, it, vi } from "vitest";

import type { AssessedRequirement } from "@/lib/matching/types";

import { checkSupport } from "./support-check";

function item(
  key: string,
  status: AssessedRequirement["status"],
  quote: string | null,
  verified = true,
): AssessedRequirement {
  return {
    key,
    component: "skill",
    label: `Skill ${key}`,
    importance: 3,
    isRequired: true,
    status,
    depth: status === "matched" ? "demonstrated" : null,
    explanation: "e",
    learningSuggestion: null,
    needsReview: false,
    topSimilarity: 0.8,
    evidence: quote
      ? [{ chunkId: "c", quote, section: "experience", verified, similarity: 0.8 }]
      : [],
  };
}

describe("checkSupport", () => {
  it("leaves supported claims unflagged", async () => {
    const judge = vi.fn().mockResolvedValue([{ supported: true, reason: "Stated." }]);
    const [out] = await checkSupport([item("a", "matched", "Built Django APIs")], judge);
    expect(out.needsReview).toBe(false);
    expect(out.reviewReason).toBeNull();
  });

  it("flags a real quote that does not support the claim, without changing the result", async () => {
    const judge = vi
      .fn()
      .mockResolvedValue([{ supported: false, reason: "A chess club does not show leadership." }]);
    const [out] = await checkSupport([item("a", "matched", "Member of the chess club")], judge);
    expect(out.needsReview).toBe(true);
    expect(out.reviewReason).toBe("A chess club does not show leadership.");
    expect(out.status).toBe("matched");
  });

  it("skips the AI when nothing is being claimed", async () => {
    const judge = vi.fn();
    const out = await checkSupport([item("a", "no_evidence", null)], judge);
    expect(judge).not.toHaveBeenCalled();
    expect(out[0].needsReview).toBe(false);
  });

  it("never sends a quote that failed verification", async () => {
    const judge = vi.fn();
    await checkSupport([item("a", "matched", "invented text", false)], judge);
    expect(judge).not.toHaveBeenCalled();
  });

  it("flags every checked claim when the AI check fails", async () => {
    const judge = vi.fn().mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const [out] = await checkSupport([item("a", "matched", "Built Django APIs")], judge);
    expect(out.needsReview).toBe(true);
    expect(out.reviewReason).toMatch(/could not be double-checked/i);
  });

  it("flags every checked claim when the verdict count is wrong", async () => {
    const judge = vi.fn().mockResolvedValue([]);
    const [out] = await checkSupport([item("a", "matched", "Built Django APIs")], judge);
    expect(out.needsReview).toBe(true);
  });

  it("keeps an existing flag from a partly unverified result", async () => {
    const flagged = { ...item("a", "matched", "Built Django APIs"), needsReview: true };
    const judge = vi.fn().mockResolvedValue([{ supported: true, reason: "Stated." }]);
    const [out] = await checkSupport([flagged], judge);
    expect(out.needsReview).toBe(true);
  });
});
