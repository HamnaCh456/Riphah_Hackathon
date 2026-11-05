import { describe, expect, it } from "vitest";

import {
  gatherApplicants,
  judgePrompt,
  splitResults,
  strictVerdicts,
  type SearchNeed,
} from "./judge";
import type { SearchableChunk } from "./search-hits";

const NOW = new Date("2026-11-05T00:00:00Z");
const MIN = 0.5;

const need = (text: string, extra: Partial<SearchNeed> = {}): SearchNeed => ({
  need: text,
  minYears: 0,
  maxYears: 0,
  overall: false,
  optional: false,
  ...extra,
});

const chunk = (
  person: string,
  id: string,
  section: string,
  content: string,
  embedding: number[],
): SearchableChunk => ({
  chunkId: id,
  candidateId: person,
  fullName: person,
  applicationId: `app-${person}`,
  jobId: "job",
  section,
  content,
  embedding,
});

const senior = chunk("Senior", "s1", "experience", "Backend Engineer, 2018 - 2025\nBuilt Django APIs", [1, 0]);
const junior = chunk("Junior", "j1", "experience", "Developer, 2024 - 2025\nBuilt Django APIs", [1, 0]);
const undated = chunk("Undated", "u1", "experience", "Built Django APIs at a bank", [1, 0]);
const marketer = chunk("Marketer", "m1", "experience", "Marketing Manager, 2015 - 2025", [0, 1]);

describe("gatherApplicants", () => {
  it("removes people whose dates are below the years asked for", () => {
    const needs = [need("5+ years of work", { minYears: 5, overall: true })];
    const found = gatherApplicants(needs, [[1, 0]], [senior, junior], MIN, NOW);
    expect(found.map((a) => a.candidateId)).toEqual(["Senior"]);
  });

  it("removes people above an upper limit, such as for a fresh graduate role", () => {
    const needs = [need("up to 2 years of work", { maxYears: 2, overall: true })];
    const found = gatherApplicants(needs, [[1, 0]], [senior, junior], MIN, NOW);
    expect(found.map((a) => a.candidateId)).toEqual(["Junior"]);
  });

  it("keeps people with no dates for the AI to read, because unknown isn't absent", () => {
    const needs = [need("5+ years of work", { minYears: 5, overall: true })];
    const found = gatherApplicants(needs, [[1, 0]], [junior, undated], MIN, NOW);
    expect(found.map((a) => a.candidateId)).toEqual(["Undated"]);
  });

  it("doesn't use similarity for a pure experience search", () => {
    const needs = [need("5+ years of work", { minYears: 5, overall: true })];
    const found = gatherApplicants(needs, [[0, 0]], [senior, marketer], MIN, NOW);
    expect(found).toHaveLength(2);
    expect(found[0].candidateId).toBe("Marketer");
  });

  it("drops people with nothing close to any topic", () => {
    const found = gatherApplicants([need("Django")], [[1, 0]], [senior, marketer], MIN, NOW);
    expect(found.map((a) => a.candidateId)).toEqual(["Senior"]);
  });
});

describe("judgePrompt", () => {
  it("doesn't send names or personal lines to the AI", () => {
    const person = chunk(
      "Noor",
      "n1",
      "summary",
      "Noor built Django APIs\nGender: Female\nMarital status: single",
      [1, 0],
    );
    const [applicant] = gatherApplicants([need("Django")], [[1, 0]], [person], MIN, NOW);
    const prompt = judgePrompt([need("Django")], [applicant], NOW);
    expect(prompt).not.toMatch(/Noor|Female|single/);
    expect(prompt).toContain("built Django APIs");
  });
});

describe("splitResults", () => {
  const needs = [need("Django"), need("Docker")];
  const [person] = gatherApplicants(needs, [[1, 0], [1, 0]], [senior], MIN, NOW);
  const met = (i: number, quote = "") => ({ need: i, met: true, excerpt: "c0", quote });
  const notMet = (i: number) => ({ need: i, met: false, excerpt: "", quote: "" });

  it("lists someone only when every required need is shown", () => {
    const { matches, partial } = splitResults(needs, [{ person, verdicts: [met(0), met(1)] }]);
    expect(matches).toHaveLength(1);
    expect(partial).toHaveLength(0);
  });

  it("keeps someone showing half of it apart, and names what has no evidence", () => {
    const { matches, partial } = splitResults(needs, [{ person, verdicts: [met(0), notMet(1)] }]);
    expect(matches).toHaveLength(0);
    expect(partial[0].missingFacets).toEqual(["Docker"]);
  });

  it("drops someone the AI found nothing for", () => {
    const { matches, partial } = splitResults(needs, [{ person, verdicts: [notMet(0), notMet(1)] }]);
    expect([...matches, ...partial]).toEqual([]);
  });

  it("doesn't let an optional need keep someone out", () => {
    const withOptional = [need("Django"), need("Docker", { optional: true })];
    const { matches } = splitResults(withOptional, [{ person, verdicts: [met(0), notMet(1)] }]);
    expect(matches[0].missingFacets).toEqual(["Docker"]);
  });

  it("uses a quote only if it really is in the resume", () => {
    const real = splitResults(needs, [{ person, verdicts: [met(0, "Built Django APIs"), met(1)] }]);
    expect(real.matches[0].evidence[0].excerpt).toBe("Built Django APIs");
    const invented = splitResults(needs, [{ person, verdicts: [met(0, "Led 50 engineers"), met(1)] }]);
    expect(invented.matches[0].evidence[0].excerpt).toBe(senior.content);
  });

  it("rejects a verdict pointing at an excerpt that doesn't exist", () => {
    const { matches } = splitResults(needs, [
      { person, verdicts: [{ need: 0, met: true, excerpt: "c9", quote: "" }, met(1)] },
    ]);
    expect(matches).toHaveLength(0);
  });

  it("shows the worked-out years as the evidence for a career need", () => {
    const years = [need("5+ years of work", { minYears: 5, overall: true })];
    const [applicant] = gatherApplicants(years, [[1, 0]], [senior], MIN, NOW);
    const { matches } = splitResults(years, [{ person: applicant, verdicts: [] }]);
    expect(matches[0].evidence[0]).toMatchObject({
      note: "About 7 years of work listed",
      excerpt: senior.content,
    });
  });
});

describe("strictVerdicts", () => {
  const [person] = gatherApplicants([need("Django")], [[1, 0]], [senior], MIN, NOW);

  it("accepts only strong similarity when the AI check is unavailable", () => {
    expect(strictVerdicts([need("Django")], person, 0.9)).toHaveLength(1);
    expect(strictVerdicts([need("Django")], { ...person, similarity: [new Map([["s1", 0.7]])] }, 0.9)).toEqual([]);
  });

  it("never passes a years need on similarity alone", () => {
    expect(strictVerdicts([need("5 years of Django", { minYears: 5 })], person, 0.1)).toEqual([]);
  });
});
