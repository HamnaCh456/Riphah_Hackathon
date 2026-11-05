import { describe, expect, it } from 'vitest';
import { filterApplicants, rankApplicants, type ApplicantRow } from './filters';

const row = (o: Partial<ApplicantRow>): ApplicantRow => ({
  applicationId: 'x', name: 'x', status: 'assessed', appliedAt: '2026-11-05T10:00:00Z',
  pinned: false, score: 50, ceiling: 60, assessmentState: 'complete',
  backedSkills: [], requiredGaps: 0, needsReview: false, ...o,
});

describe('rankApplicants', () => {
  it('orders pinned, then score, then ceiling, then earliest, with unscored last', () => {
    const out = rankApplicants([
      row({ applicationId: 'none', score: null, ceiling: null, assessmentState: 'failed' }),
      row({ applicationId: 'low', score: 40 }),
      row({ applicationId: 'high', score: 90 }),
      row({ applicationId: 'pin', score: 10, pinned: true }),
      row({ applicationId: 'tie', score: 40, ceiling: 95 }),
    ]);
    expect(out.map((r) => r.applicationId)).toEqual(['pin', 'high', 'tie', 'low', 'none']);
  });

  it('puts the applicant with fewer required gaps first when scores tie', () => {
    const out = rankApplicants([
      row({ applicationId: 'gap', score: 88, ceiling: 100, requiredGaps: 1 }),
      row({ applicationId: 'clean', score: 88, ceiling: 89, requiredGaps: 0 }),
    ]);
    expect(out.map((r) => r.applicationId)).toEqual(['clean', 'gap']);
  });
});

describe('filterApplicants', () => {
  const rows = [
    row({ applicationId: 'a', score: 80, backedSkills: ['Docker'], status: 'assessed' }),
    row({ applicationId: 'b', score: 40, requiredGaps: 2, needsReview: true, status: 'rejected' }),
    row({ applicationId: 'c', score: null, assessmentState: 'failed', status: 'parsed' }),
  ];
  it('keeps everything with no filters', () => {
    expect(filterApplicants(rows, {})).toHaveLength(3);
  });
  it('filters by each control', () => {
    expect(filterApplicants(rows, { minScore: 50 }).map((r) => r.applicationId)).toEqual(['a']);
    expect(filterApplicants(rows, { skill: 'Docker' }).map((r) => r.applicationId)).toEqual(['a']);
    expect(filterApplicants(rows, { status: 'rejected' }).map((r) => r.applicationId)).toEqual(['b']);
    expect(filterApplicants(rows, { needsReview: true }).map((r) => r.applicationId)).toEqual(['b']);
    expect(filterApplicants(rows, { noRequiredGaps: true }).map((r) => r.applicationId)).toEqual(['a']);
  });
});
