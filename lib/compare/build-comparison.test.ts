import { expect, it } from "vitest";

import {
  buildComparison,
  type ComparisonApplicant,
  type ComparisonRequirement,
} from "./build-comparison";

function req(
  key: string,
  label: string,
  status: ComparisonRequirement["effectiveStatus"],
  extra: Partial<ComparisonRequirement> = {},
): ComparisonRequirement {
  return {
    requirement_key: key,
    label,
    is_required: true,
    effectiveStatus: status,
    effectiveDepth: null,
    overrideReason: null,
    needs_review: false,
    assessment_evidence: [],
    ...extra,
  };
}

const noor: ComparisonApplicant = {
  applicationId: "a1",
  name: "Noor",
  score: 82,
  ceiling: 90,
  summary: "Strong on Python.",
  requirements: [
    req("r1", "Python", "matched", {
      needs_review: true,
      assessment_evidence: [
        { quote: "Built Python tools", verified: true },
        { quote: "invented text", verified: false },
      ],
    }),
    req("r2", "Docker", "no_evidence"),
  ],
};
const bilal: ComparisonApplicant = {
  applicationId: "a2",
  name: "Bilal",
  score: 60,
  ceiling: 60,
  summary: "Some gaps.",
  requirements: [req("r1", "Python", "confirmed_absent")],
};

it("makes one row per requirement and one cell per applicant", () => {
  const output = buildComparison([noor, bilal]);
  expect(output.rows.map((r) => r.label)).toEqual(["Python", "Docker"]);
  expect(output.rows[0].cells).toHaveLength(2);
});

it("keeps missing evidence and confirmed absence as different results", () => {
  const output = buildComparison([noor, bilal]);
  expect(output.rows[1].cells[0].status).toBe("no_evidence");
  expect(output.rows[0].cells[1].status).toBe("confirmed_absent");
});

it("treats a requirement with no saved result as not mentioned, not absent", () => {
  expect(buildComparison([noor, bilal]).rows[1].cells[1].status).toBe("no_evidence");
});

it("shows only verified quotes and carries the review flag", () => {
  const cell = buildComparison([noor, bilal]).rows[0].cells[0];
  expect(cell.quotes).toEqual(["Built Python tools"]);
  expect(cell.needsReview).toBe(true);
});

it("clears the review flag once a recruiter has overridden the result", () => {
  const reviewed = {
    ...noor,
    requirements: [req("r1", "Python", "matched", { needs_review: true, overrideReason: "Checked." })],
  };
  expect(buildComparison([reviewed]).rows[0].cells[0].needsReview).toBe(false);
});

it("lists each applicant's missing information", () => {
  const output = buildComparison([noor, bilal]);
  expect(output.applicants[0].missing).toEqual(["Docker"]);
  expect(output.applicants[1].missing).toEqual(["Docker"]);
});

it("keeps the selected order and names no winner", () => {
  const output = buildComparison([bilal, noor]);
  expect(output.applicants.map((a) => a.applicationId)).toEqual(["a2", "a1"]);
  expect(JSON.stringify(output)).not.toMatch(/winner|best/i);
});
