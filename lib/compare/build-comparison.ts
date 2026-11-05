import type { Depth, MatchStatus } from "@/lib/matching/types";

export type ComparisonRequirement = {
  requirement_key: string;
  label: string;
  is_required: boolean;
  effectiveStatus: MatchStatus;
  effectiveDepth: Depth;
  overrideReason: string | null;
  needs_review: boolean;
  assessment_evidence: { quote: string; verified: boolean }[];
};

export type ComparisonApplicant = {
  applicationId: string;
  name: string;
  score: number;
  ceiling: number;
  summary: string;
  requirements: ComparisonRequirement[];
};

export type ComparisonCell = {
  status: MatchStatus;
  depth: Depth;
  quotes: string[];
  overrideReason: string | null;
  needsReview: boolean;
};

/** Shows saved results side by side. It adds no AI text and never names a winner. */
export function buildComparison(applicants: ComparisonApplicant[]) {
  const seen = new Map<string, { key: string; label: string; isRequired: boolean }>();
  for (const applicant of applicants) {
    for (const r of applicant.requirements) {
      if (!seen.has(r.requirement_key)) {
        seen.set(r.requirement_key, {
          key: r.requirement_key,
          label: r.label,
          isRequired: r.is_required,
        });
      }
    }
  }
  const requirements = [...seen.values()];

  const cellFor = (applicant: ComparisonApplicant, key: string): ComparisonCell => {
    const r = applicant.requirements.find((item) => item.requirement_key === key);
    return {
      status: r?.effectiveStatus ?? "no_evidence",
      depth: r?.effectiveDepth ?? null,
      quotes: r?.assessment_evidence.filter((e) => e.verified).map((e) => e.quote) ?? [],
      overrideReason: r?.overrideReason ?? null,
      needsReview: Boolean(r?.needs_review && !r.overrideReason),
    };
  };

  return {
    applicants: applicants.map((applicant) => ({
      applicationId: applicant.applicationId,
      name: applicant.name,
      score: applicant.score,
      ceiling: applicant.ceiling,
      summary: applicant.summary,
      missing: requirements
        .filter((r) => cellFor(applicant, r.key).status === "no_evidence")
        .map((r) => r.label),
    })),
    rows: requirements.map((r) => ({
      key: r.key,
      label: r.label,
      isRequired: r.isRequired,
      cells: applicants.map((applicant) => cellFor(applicant, r.key)),
    })),
  };
}
