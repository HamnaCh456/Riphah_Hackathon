export interface ApplicantRow {
  applicationId: string;
  name: string;
  status: string;
  appliedAt: string;
  pinned: boolean;
  score: number | null;
  ceiling: number | null;
  assessmentState: 'complete' | 'running' | 'failed' | 'none';
  backedSkills: string[];
  requiredGaps: number;
  needsReview: boolean;
}

export interface ApplicantFilters {
  minScore?: number;
  skill?: string;
  status?: string;
  needsReview?: boolean;
  noRequiredGaps?: boolean;
}

export function rankApplicants(rows: ApplicantRow[]): ApplicantRow[] {
  return [...rows].sort((a, b) =>
    Number(b.pinned) - Number(a.pinned)
    || (b.score ?? -1) - (a.score ?? -1)
    || a.requiredGaps - b.requiredGaps
    || (b.ceiling ?? -1) - (a.ceiling ?? -1)
    || a.appliedAt.localeCompare(b.appliedAt));
}

export function filterApplicants(rows: ApplicantRow[], f: ApplicantFilters): ApplicantRow[] {
  return rows.filter((r) =>
    (f.minScore === undefined || (r.score ?? -1) >= f.minScore)
    && (!f.skill || r.backedSkills.includes(f.skill))
    && (!f.status || r.status === f.status)
    && (!f.needsReview || r.needsReview)
    && (!f.noRequiredGaps || (r.assessmentState === 'complete' && r.requiredGaps === 0)));
}
