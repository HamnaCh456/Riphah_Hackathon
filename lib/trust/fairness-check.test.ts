import { expect, it, vi } from "vitest";

import { runFairnessCheck } from "./fairness-check";

const RESUME = "Experience\nBuilt order services in Django and PostgreSQL.";

it("does not re-score when redaction makes the input identical", async () => {
  const score = vi.fn().mockResolvedValue(70);
  const report = await runFairnessCheck(RESUME, score);
  const labelled = report.results.filter((r) => r.attribute !== "Inline mention");
  expect(labelled).toHaveLength(6);
  expect(labelled.every((r) => !r.inputChanged && r.scoreChange === 0)).toBe(true);
  expect(report.verdict).toBe("passed");
});

it("fails and names the detail when it moves the score", async () => {
  const score = vi
    .fn()
    .mockImplementation(async (text: string) => (text.includes("Women's") ? 40 : 70));
  const report = await runFairnessCheck(RESUME, score);
  const inline = report.results.find((r) => r.attribute === "Inline mention");
  expect(inline).toMatchObject({ inputChanged: true, scoreChange: -30 });
  expect(report.verdict).toBe("failed");
});

it("does not blame a detail for small variation between identical runs", async () => {
  const scores = [70, 73, 72];
  const score = vi.fn().mockImplementation(async () => scores.shift() ?? 72);
  const report = await runFairnessCheck(RESUME, score);
  expect(report.noise).toBe(3);
  expect(report.verdict).toBe("passed");
});

it("says inconclusive, not passed, when identical runs differ too much to tell", async () => {
  const scores = [70, 81, 81];
  const score = vi.fn().mockImplementation(async () => scores.shift() ?? 81);
  const report = await runFairnessCheck(RESUME, score);
  expect(report.noise).toBe(11);
  expect(report.verdict).toBe("inconclusive");
});
