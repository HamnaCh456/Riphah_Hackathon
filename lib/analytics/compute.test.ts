// lib/analytics/compute.test.ts
import { describe, expect, it } from 'vitest';
import { computeDashboard, drillDown, type DashboardInput } from '@/lib/analytics/compute';

const NOW = '2026-11-10T12:00:00Z';

const input = (over: Partial<DashboardInput> = {}): DashboardInput => ({
  now: NOW,
  jobs: [
    { id: 'j1', title: 'Backend Developer', status: 'open' },
    { id: 'j2', title: 'Designer', status: 'closed' },
  ],
  applications: [
    { id: 'a1', jobId: 'j1', status: 'interview', createdAt: '2026-11-10T08:00:00Z' },
    { id: 'a2', jobId: 'j1', status: 'in_review', createdAt: '2026-11-10T09:00:00Z' },
    { id: 'a3', jobId: 'j1', status: 'rejected', createdAt: '2026-11-10T09:00:00Z' },
    { id: 'a4', jobId: 'j2', status: 'submitted', createdAt: '2026-11-10T10:00:00Z' },
  ],
  events: [
    { applicationId: 'a1', toStatus: 'shortlisted', createdAt: '2026-11-10T10:00:00Z' },
    { applicationId: 'a1', toStatus: 'interview', createdAt: '2026-11-10T11:00:00Z' },
    { applicationId: 'a3', toStatus: 'rejected', createdAt: '2026-11-10T13:00:00Z' },
  ],
  interviews: [
    { applicationId: 'a1', status: 'scheduled', endsAt: '2026-11-11T06:00:00Z' },
    { applicationId: 'a1', status: 'scheduled', endsAt: '2026-11-09T06:00:00Z' },
    { applicationId: 'a2', status: 'cancelled', endsAt: '2026-11-12T06:00:00Z' },
  ],
  skillResults: [
    { applicationId: 'a1', skill: 'Docker', result: 'no_evidence' },
    { applicationId: 'a2', skill: 'Docker', result: 'no_evidence' },
    { applicationId: 'a3', skill: 'Docker', result: 'confirmed_absent' },
    { applicationId: 'a1', skill: 'Django', result: 'matched' },
    { applicationId: 'a2', skill: 'Django', result: 'partial' },
  ],
  ...over,
});

describe('computeDashboard: tiles', () => {
  const d = computeDashboard(input());

  it('counts open jobs only', () => expect(d.activeJobs).toBe(1));
  it('counts all applications', () => expect(d.applications).toEqual(['a1', 'a2', 'a3', 'a4']));
  it('counts upcoming scheduled interviews only', () => expect(d.upcomingInterviews).toBe(1));
  it('counts those waiting on a recruiter as pending', () => expect(d.pending).toEqual(['a2', 'a4']));

  it('still counts someone as shortlisted after they move on to interview', () => {
    expect(d.shortlisted).toEqual(['a1']);
  });

  it('counts a repeated shortlist event once', () => {
    const repeated = computeDashboard(input({ events: [
      { applicationId: 'a1', toStatus: 'shortlisted', createdAt: '2026-11-10T10:00:00Z' },
      { applicationId: 'a1', toStatus: 'shortlisted', createdAt: '2026-11-10T10:30:00Z' },
    ] }));
    expect(repeated.shortlisted).toEqual(['a1']);
  });
});

describe('computeDashboard: rates', () => {
  it('works out the shortlist rate', () => {
    expect(computeDashboard(input()).shortlistRate).toEqual({ numerator: 1, denominator: 4, percent: 25 });
  });

  it('gives no rate rather than 0% when there are no applications', () => {
    const d = computeDashboard(input({ applications: [], events: [], skillResults: [] }));
    expect(d.shortlistRate.percent).toBeNull();
  });

  it('averages time to first decision across decided applications', () => {
    // a1: 08:00 → 10:00 = 2h. a3: 09:00 → 13:00 = 4h. Average 3h.
    const d = computeDashboard(input());
    expect(d.avgProcessing).toEqual({ ms: 3 * 3_600_000, decided: ['a1', 'a3'] });
  });

  it('uses the first decision, ignoring later ones', () => {
    const d = computeDashboard(input({ events: [
      { applicationId: 'a1', toStatus: 'shortlisted', createdAt: '2026-11-10T09:00:00Z' },
      { applicationId: 'a1', toStatus: 'rejected', createdAt: '2026-11-10T20:00:00Z' },
    ] }));
    expect(d.avgProcessing.ms).toBe(3_600_000);
  });

  it('gives no average when nothing is decided', () => {
    expect(computeDashboard(input({ events: [] })).avgProcessing).toEqual({ ms: null, decided: [] });
  });

  it('ignores a bad event dated before the application', () => {
    const d = computeDashboard(input({ events: [
      { applicationId: 'a1', toStatus: 'shortlisted', createdAt: '2026-11-01T00:00:00Z' },
    ] }));
    expect(d.avgProcessing.ms).toBeNull();
  });
});

describe('computeDashboard: charts', () => {
  const d = computeDashboard(input());

  it('lists jobs by applicant count, keeping jobs with none', () => {
    const empty = computeDashboard(input({ jobs: [...input().jobs, { id: 'j3', title: 'QA', status: 'open' }] }));
    expect(empty.byJob.map((j) => [j.label, j.ids.length]))
      .toEqual([['Backend Developer', 3], ['Designer', 1], ['QA', 0]]);
  });

  it('lists every stage in pipeline order with current counts', () => {
    expect(d.byStage.map((s) => s.status)).toEqual(['submitted', 'parsed', 'assessed',
      'in_review', 'shortlisted', 'interview', 'selected', 'rejected']);
    expect(d.byStage.find((s) => s.status === 'interview')?.ids).toEqual(['a1']);
    expect(d.byStage.find((s) => s.status === 'parsed')?.ids).toEqual([]);
  });
});

describe('computeDashboard: skill gaps', () => {
  const d = computeDashboard(input());

  it('separates missing evidence from confirmed absence', () => {
    expect(d.skillGaps[0]).toMatchObject({
      skill: 'Docker', missingEvidence: ['a1', 'a2'], confirmedAbsent: ['a3'], assessed: 3,
    });
  });

  it('leaves out a skill with only matched or partial results', () => {
    expect(d.skillGaps.find((g) => g.skill === 'Django')).toBeUndefined();
  });

  it('combines the same skill across jobs, ignoring case', () => {
    const merged = computeDashboard(input({ skillResults: [
      { applicationId: 'a1', skill: 'Docker', result: 'no_evidence' },
      { applicationId: 'a4', skill: 'docker', result: 'no_evidence' },
    ] }));
    expect(merged.skillGaps).toHaveLength(1);
    expect(merged.skillGaps[0].missingEvidence).toEqual(['a1', 'a4']);
  });

  it('sorts by most gaps and keeps the top 8', () => {
    const skillResults = Array.from({ length: 10 }, (_, i) => `Skill${i}`).flatMap((skill, i) =>
      ['a1', 'a2', 'a3'].slice(0, i < 2 ? 3 : 1).map((applicationId) => ({
        applicationId, skill, result: 'no_evidence' as const,
      })));
    const many = computeDashboard(input({ skillResults }));
    expect(many.skillGaps).toHaveLength(8);
    expect(many.skillGaps[0].missingEvidence).toHaveLength(3);
  });
});

describe('computeDashboard: job filter', () => {
  const d = computeDashboard(input({ jobFilter: 'j2' }));

  it('limits everything to the chosen job', () => {
    expect(d.applications).toEqual(['a4']);
    expect(d.shortlisted).toEqual([]);
    expect(d.upcomingInterviews).toBe(0);
    expect(d.skillGaps).toEqual([]);
  });

  it('counts the chosen job as active only if it is open', () => {
    expect(d.activeJobs).toBe(0);
  });
});


describe('drillDown', () => {
  const d = computeDashboard(input());

  it('returns the same applicants the number counted', () => {
    expect(drillDown(d, 'pending')?.ids).toEqual(d.pending);
    expect(drillDown(d, 'shortlisted')?.ids).toEqual(d.shortlisted);
    expect(drillDown(d, 'stage:interview')?.ids).toEqual(['a1']);
    expect(drillDown(d, 'job:j1')?.ids).toHaveLength(3);
    expect(drillDown(d, 'gap:Docker')?.ids).toEqual(['a1', 'a2', 'a3']);
  });

  it('returns null for an unknown key', () => {
    expect(drillDown(d, 'nonsense')).toBeNull();
    expect(drillDown(d, 'stage:nonsense')).toBeNull();
  });
});
