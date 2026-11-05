# Module 9: Recruitment Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A dashboard that shows a recruiter their active jobs, applications, shortlisted candidates, pending reviews and interviews, with charts by job and stage, the shortlist rate, average processing time and the most common skill gaps. Every number opens the applicants behind it.

**Done when (REQUIREMENTS.md section 6):** The dashboard updates after a shortlist.

**Architecture:** One tested function turns raw rows into every number on the screen, including the applicant list behind each number, so a count and its list can't disagree. Numbers are calculated by code, not AI. The page reads fresh data on each visit and only ever covers the signed-in recruiter's own jobs.

**Tech Stack:** Next.js server components, Supabase Postgres, vitest, Playwright. Charts are plain server-rendered HTML with no chart library, as DESIGN.md §6 asks.

**Depends on:** [2026-11-05-modules-7-9-prerequisites.md](2026-11-05-modules-7-9-prerequisites.md) and module 8's `interviews` table. Before writing any UI, load the `frontend-design` and `dataviz` skills.

**Commits:** Stage explicit paths only. Never stage `docs/superpowers/plans/`, because plans stay uncommitted.

---

## Definitions

These choices decide whether the numbers are right, so they are stated plainly on purpose.

| Metric | Definition | Why |
|---|---|---|
| Active jobs | Jobs with status `open` | |
| Applications | All applications to the recruiter's jobs | |
| Shortlisted | Applications that were **ever** shortlisted, taken from the audit trail | Otherwise the count drops when someone moves on to Interview |
| Pending reviews | Current status is `submitted`, `parsed`, `ai_assessment_available` or `recruiter_review` | Still waiting for a recruiter's decision |
| Upcoming interviews | Status `scheduled`, not yet ended | Past interviews aren't actionable |
| Shortlist rate | Ever shortlisted ÷ applications. Shows "–" when there are no applications | Never a fake 0% |
| Average processing time | From application to its **first** recruiter decision (shortlist or reject), across decided applications only, showing how many | Undecided applications have no end time. Shows "–" when none are decided. |
| Skill gap | A job skill whose result is `missing_evidence` or `confirmed_absent`. Each is counted separately, out of applications that were actually assessed | Rule 4: "no evidence found" is not "doesn't have it" |

## Files

| File | Job |
|---|---|
| `lib/analytics/compute.ts` | All the calculations |
| `lib/analytics/format.ts` | Number and duration display |
| `lib/analytics/load.ts` | Reads this recruiter's rows |
| `app/recruiter/analytics/page.tsx` | The dashboard |
| `app/recruiter/analytics/applicants/page.tsx` | The applicants behind a number |
| `app/recruiter/analytics/BarList.tsx` | Bar chart |
| `app/recruiter/analytics/JobFilter.tsx` | Job filter |
| `app/recruiter/analytics/RefreshOnShow.tsx` | Refreshes data when returning to the tab or page |
| `app/recruiter/analytics/analytics.module.css` | Styles |
| `tests/analytics/*.test.ts`, `e2e/analytics.spec.ts` | Tests |

---

### Task 0: Check the prerequisites

- [ ] **Step 1: Confirm the database target.** Read `.env` and confirm `SUPABASE-URL` contains `lbxozdqgboubbyvzgquz`. Stop if it doesn't.
- [ ] **Step 2: Compare the prerequisites file with the code.** Confirm these exist: `db`, `requireRecruiter`, the `Select` UI piece, the `jobs`, `job_skills`, `applications`, `application_status_events` and `skill_assessments` tables, module 8's `interviews` table, and that module 6's shortlist action writes a row to `application_status_events` with `to_status = 'shortlisted'`. If a name differs, update this plan's code to the real name. If something is missing, name it as a blocker in one line and stop.

This module adds no tables.

### Task 1: Calculations

**Files:**
- Create: `lib/analytics/compute.ts`
- Test: `tests/analytics/compute.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/analytics/compute.test.ts
import { describe, expect, it } from 'vitest';
import { computeDashboard, type DashboardInput } from '@/lib/analytics/compute';

const NOW = '2026-11-10T12:00:00Z';

const input = (over: Partial<DashboardInput> = {}): DashboardInput => ({
  now: NOW,
  jobs: [
    { id: 'j1', title: 'Backend Developer', status: 'open' },
    { id: 'j2', title: 'Designer', status: 'closed' },
  ],
  applications: [
    { id: 'a1', jobId: 'j1', status: 'interview', createdAt: '2026-11-10T08:00:00Z' },
    { id: 'a2', jobId: 'j1', status: 'recruiter_review', createdAt: '2026-11-10T09:00:00Z' },
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
  skills: [
    { id: 's1', jobId: 'j1', skill: 'Docker', importance: 'required' },
    { id: 's2', jobId: 'j1', skill: 'Django', importance: 'required' },
  ],
  assessments: [
    { applicationId: 'a1', jobSkillId: 's1', result: 'missing_evidence' },
    { applicationId: 'a2', jobSkillId: 's1', result: 'missing_evidence' },
    { applicationId: 'a3', jobSkillId: 's1', result: 'confirmed_absent' },
    { applicationId: 'a1', jobSkillId: 's2', result: 'matched' },
    { applicationId: 'a2', jobSkillId: 's2', result: 'matched' },
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
    const d = computeDashboard(input({ applications: [], events: [], assessments: [] }));
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
    expect(d.byStage.map((s) => s.status)).toEqual(['submitted', 'parsed', 'ai_assessment_available',
      'recruiter_review', 'shortlisted', 'interview', 'selected', 'rejected']);
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

  it('leaves out a skill with no gaps', () => {
    expect(d.skillGaps.find((g) => g.skill === 'Django')).toBeUndefined();
  });

  it('combines the same skill across jobs, ignoring case', () => {
    const merged = computeDashboard(input({
      skills: [
        { id: 's1', jobId: 'j1', skill: 'Docker', importance: 'required' },
        { id: 's9', jobId: 'j2', skill: 'docker', importance: 'preferred' },
      ],
      assessments: [
        { applicationId: 'a1', jobSkillId: 's1', result: 'missing_evidence' },
        { applicationId: 'a4', jobSkillId: 's9', result: 'missing_evidence' },
      ],
    }));
    expect(merged.skillGaps).toHaveLength(1);
    expect(merged.skillGaps[0].missingEvidence).toEqual(['a1', 'a4']);
  });

  it('sorts by most gaps and keeps the top 8', () => {
    const skills = Array.from({ length: 10 }, (_, i) => ({
      id: `x${i}`, jobId: 'j1', skill: `Skill${i}`, importance: 'required' as const,
    }));
    const assessments = skills.flatMap((s, i) => ['a1', 'a2', 'a3'].slice(0, i < 2 ? 3 : 1).map((applicationId) => ({
      applicationId, jobSkillId: s.id, result: 'missing_evidence' as const,
    })));
    const many = computeDashboard(input({ skills, assessments }));
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
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run tests/analytics/compute.test.ts`
Expected: FAIL, because `compute` can't be found.

- [ ] **Step 3: Write the code**

```ts
// lib/analytics/compute.ts
import { APPLICATION_STATUSES, type ApplicationStatus } from '@/lib/pipeline/statuses';

export type DashboardInput = {
  now: string;
  jobFilter?: string;
  jobs: { id: string; title: string; status: 'open' | 'closed' }[];
  applications: { id: string; jobId: string; status: ApplicationStatus; createdAt: string }[];
  events: { applicationId: string; toStatus: string; createdAt: string }[];
  interviews: { applicationId: string; status: string; endsAt: string }[];
  skills: { id: string; jobId: string; skill: string; importance: 'required' | 'preferred' }[];
  assessments: {
    applicationId: string; jobSkillId: string;
    result: 'matched' | 'missing_evidence' | 'confirmed_absent';
  }[];
};

export type SkillGap = {
  skill: string; missingEvidence: string[]; confirmedAbsent: string[]; assessed: number;
};

const PENDING: ApplicationStatus[] = ['submitted', 'parsed', 'ai_assessment_available', 'recruiter_review'];
const DECISIONS = new Set(['shortlisted', 'rejected']);
const MAX_SKILL_GAPS = 8;

export function computeDashboard(input: DashboardInput) {
  const jobs = input.jobFilter ? input.jobs.filter((j) => j.id === input.jobFilter) : input.jobs;
  const jobIds = new Set(jobs.map((j) => j.id));
  const applications = input.applications.filter((a) => jobIds.has(a.jobId));
  const appIds = new Set(applications.map((a) => a.id));
  const events = input.events.filter((e) => appIds.has(e.applicationId));
  const now = Date.parse(input.now);

  const shortlisted = [...new Set(events.filter((e) => e.toStatus === 'shortlisted').map((e) => e.applicationId))];

  const firstDecision = new Map<string, number>();
  for (const event of events) {
    if (!DECISIONS.has(event.toStatus)) continue;
    const at = Date.parse(event.createdAt);
    const current = firstDecision.get(event.applicationId);
    if (current === undefined || at < current) firstDecision.set(event.applicationId, at);
  }
  const durations = applications.flatMap((a) => {
    const at = firstDecision.get(a.id);
    const ms = at === undefined ? -1 : at - Date.parse(a.createdAt);
    return ms >= 0 ? [{ id: a.id, ms }] : [];
  });

  const gapsBySkill = new Map<string, SkillGap>();
  for (const assessment of input.assessments) {
    if (!appIds.has(assessment.applicationId)) continue;
    const skill = input.skills.find((s) => s.id === assessment.jobSkillId);
    if (!skill || !jobIds.has(skill.jobId)) continue;
    const key = skill.skill.trim().toLowerCase();
    const gap = gapsBySkill.get(key)
      ?? { skill: skill.skill, missingEvidence: [], confirmedAbsent: [], assessed: 0 };
    gap.assessed += 1;
    if (assessment.result === 'missing_evidence') gap.missingEvidence.push(assessment.applicationId);
    if (assessment.result === 'confirmed_absent') gap.confirmedAbsent.push(assessment.applicationId);
    gapsBySkill.set(key, gap);
  }
  const gapSize = (g: SkillGap) => g.missingEvidence.length + g.confirmedAbsent.length;

  return {
    activeJobs: jobs.filter((j) => j.status === 'open').length,
    applications: applications.map((a) => a.id),
    shortlisted,
    pending: applications.filter((a) => PENDING.includes(a.status)).map((a) => a.id),
    upcomingInterviews: input.interviews.filter((i) =>
      appIds.has(i.applicationId) && i.status === 'scheduled' && Date.parse(i.endsAt) >= now).length,
    shortlistRate: {
      numerator: shortlisted.length,
      denominator: applications.length,
      percent: applications.length ? Math.round((shortlisted.length / applications.length) * 100) : null,
    },
    avgProcessing: {
      ms: durations.length ? durations.reduce((sum, d) => sum + d.ms, 0) / durations.length : null,
      decided: durations.map((d) => d.id),
    },
    byJob: jobs
      .map((j) => ({
        id: j.id, label: j.title,
        ids: applications.filter((a) => a.jobId === j.id).map((a) => a.id),
      }))
      .sort((a, b) => b.ids.length - a.ids.length),
    byStage: APPLICATION_STATUSES.map((status) => ({
      status, ids: applications.filter((a) => a.status === status).map((a) => a.id),
    })),
    skillGaps: [...gapsBySkill.values()]
      .filter((g) => gapSize(g) > 0)
      .sort((a, b) => gapSize(b) - gapSize(a) || a.skill.localeCompare(b.skill))
      .slice(0, MAX_SKILL_GAPS),
  };
}

export type Dashboard = ReturnType<typeof computeDashboard>;

const STAGE_LABELS: Record<ApplicationStatus, string> = {
  submitted: 'Submitted', parsed: 'Parsed', ai_assessment_available: 'AI assessment ready',
  recruiter_review: 'Recruiter review', shortlisted: 'Shortlisted', interview: 'Interview',
  selected: 'Selected', rejected: 'Rejected',
};
export const stageLabel = (status: ApplicationStatus) => STAGE_LABELS[status];

/** The applicants behind a number, and the heading for that list. Null if the key is unknown. */
export function drillDown(dashboard: Dashboard, metric: string): { title: string; ids: string[] } | null {
  if (metric === 'applications') return { title: 'Applications', ids: dashboard.applications };
  if (metric === 'shortlisted') return { title: 'Shortlisted', ids: dashboard.shortlisted };
  if (metric === 'pending') return { title: 'Pending reviews', ids: dashboard.pending };
  if (metric === 'decided') return { title: 'Applications with a decision', ids: dashboard.avgProcessing.decided };

  const [kind, value] = [metric.slice(0, metric.indexOf(':')), metric.slice(metric.indexOf(':') + 1)];
  if (kind === 'stage') {
    const stage = dashboard.byStage.find((s) => s.status === value);
    return stage ? { title: `Stage: ${stageLabel(stage.status)}`, ids: stage.ids } : null;
  }
  if (kind === 'job') {
    const job = dashboard.byJob.find((j) => j.id === value);
    return job ? { title: `Job: ${job.label}`, ids: job.ids } : null;
  }
  if (kind === 'gap') {
    const gap = dashboard.skillGaps.find((g) => g.skill === value);
    return gap ? { title: `Skill gap: ${gap.skill}`, ids: [...gap.missingEvidence, ...gap.confirmedAbsent] } : null;
  }
  return null;
}
```

- [ ] **Step 4: Add drill-down tests.** Append to `tests/analytics/compute.test.ts`:

```ts
import { drillDown } from '@/lib/analytics/compute';

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
```

- [ ] **Step 5: Run it to confirm it passes**

Run: `npx vitest run tests/analytics/compute.test.ts`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/analytics/compute.ts tests/analytics/compute.test.ts
git commit -m "feat(analytics): calculate dashboard metrics and their applicant lists" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: Number display

Demo decisions happen minutes apart, so the format can't always say days.

**Files:**
- Create: `lib/analytics/format.ts`
- Test: `tests/analytics/format.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/analytics/format.test.ts
import { describe, expect, it } from 'vitest';
import { formatDuration, formatPercent } from '@/lib/analytics/format';

const MIN = 60_000;

describe('formatDuration', () => {
  it.each([
    [null, '–'],
    [20_000, 'Under 1 min'],
    [4 * MIN, '4 min'],
    [90 * MIN, '1.5 h'],
    [47 * 60 * MIN, '47 h'],
    [72 * 60 * MIN, '3 days'],
    [84 * 60 * MIN, '3.5 days'],
  ])('%s becomes %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});

describe('formatPercent', () => {
  it('shows a dash for no data and a real 0%', () => {
    expect(formatPercent(null)).toBe('–');
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(25)).toBe('25%');
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run tests/analytics/format.test.ts`
Expected: FAIL, because `format` can't be found.

- [ ] **Step 3: Write the code**

```ts
// lib/analytics/format.ts
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const oneDecimal = (n: number) => String(Math.round(n * 10) / 10);

export function formatDuration(ms: number | null): string {
  if (ms === null) return '–';
  if (ms < MIN) return 'Under 1 min';
  if (ms < HOUR) return `${Math.round(ms / MIN)} min`;
  if (ms < 48 * HOUR) return `${oneDecimal(ms / HOUR)} h`;
  return `${oneDecimal(ms / DAY)} days`;
}

export function formatPercent(percent: number | null): string {
  return percent === null ? '–' : `${percent}%`;
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npx vitest run tests/analytics/format.test.ts`
Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/analytics/format.ts tests/analytics/format.test.ts
git commit -m "feat(analytics): format durations and percentages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: Loading the data

**Files:**
- Create: `lib/analytics/load.ts`

- [ ] **Step 1: Write the loader**

It starts from the recruiter's own jobs and reads everything else through those IDs. That's what keeps another recruiter's data out.

```ts
// lib/analytics/load.ts
import 'server-only';
import { db } from '@/lib/db';
import type { DashboardInput } from './compute';

function unwrap<T>(result: { data: T[] | null; error: unknown }): T[] {
  if (result.error) throw result.error;
  return result.data ?? [];
}

export async function loadDashboardInput(recruiterId: string, jobFilter?: string): Promise<DashboardInput> {
  const now = new Date().toISOString();
  const jobs = unwrap(await db().from('jobs').select('id, title, status').eq('recruiter_id', recruiterId).order('created_at'));
  const base = { now, jobFilter: jobs.some((j) => j.id === jobFilter) ? jobFilter : undefined, jobs };
  if (jobs.length === 0) return { ...base, applications: [], events: [], interviews: [], skills: [], assessments: [] };

  const jobIds = jobs.map((j) => j.id);
  const applications = unwrap(await db().from('applications').select('id, job_id, status, created_at').in('job_id', jobIds));
  const skills = unwrap(await db().from('job_skills').select('id, job_id, skill, importance').in('job_id', jobIds));
  const mappedApplications = applications.map((a) => ({
    id: a.id, jobId: a.job_id, status: a.status, createdAt: a.created_at,
  }));
  const mappedSkills = skills.map((s) => ({ id: s.id, jobId: s.job_id, skill: s.skill, importance: s.importance }));
  if (applications.length === 0) {
    return { ...base, applications: [], events: [], interviews: [], skills: mappedSkills, assessments: [] };
  }

  const appIds = applications.map((a) => a.id);
  const [events, interviews, assessments] = await Promise.all([
    db().from('application_status_events').select('application_id, to_status, created_at').in('application_id', appIds),
    db().from('interviews').select('application_id, status, ends_at').in('application_id', appIds),
    db().from('skill_assessments').select('application_id, job_skill_id, result').in('application_id', appIds),
  ]);

  return {
    ...base,
    applications: mappedApplications,
    skills: mappedSkills,
    events: unwrap(events).map((e) => ({ applicationId: e.application_id, toStatus: e.to_status, createdAt: e.created_at })),
    interviews: unwrap(interviews).map((i) => ({ applicationId: i.application_id, status: i.status, endsAt: i.ends_at })),
    assessments: unwrap(assessments).map((a) => ({ applicationId: a.application_id, jobSkillId: a.job_skill_id, result: a.result })),
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/analytics/load.ts
git commit -m "feat(analytics): load dashboard data for the signed-in recruiter" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 4: The dashboard

**Files:**
- Create in `app/recruiter/analytics/`: `BarList.tsx`, `JobFilter.tsx`, `RefreshOnShow.tsx`, `page.tsx`, `analytics.module.css`
- Modify: `app/recruiter/page.tsx`

- [ ] **Step 1: Load the `frontend-design` and `dataviz` skills.** Single-series bars need no legend. Bars are a single hue, the `--viz-cited` token. Text stays in text colours. Run the dataviz anti-patterns check when the page renders.

- [ ] **Step 2: Write the bar chart**

Each row is a link, so the row is its own hover target and its own drill-down. The value sits beside each bar, so the chart needs no separate table.

```tsx
// app/recruiter/analytics/BarList.tsx
import Link from 'next/link';
import styles from './analytics.module.css';

export type Bar = { key: string; label: string; value: number; href: string; detail?: string };

export function BarList({ bars, ariaLabel }: { bars: Bar[]; ariaLabel: string }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <ul className={styles.bars} aria-label={ariaLabel}>
      {bars.map((bar) => (
        <li key={bar.key}>
          <Link href={bar.href} className={styles.bar} title={`${bar.label}: ${bar.detail ?? bar.value}. Open applicants.`}>
            <span className={styles.barLabel}>{bar.label}</span>
            <span className={styles.barTrack} aria-hidden="true">
              {bar.value > 0 && <span className={styles.barFill} style={{ width: `${(bar.value / max) * 100}%` }} />}
            </span>
            <span className={styles.barValue}>{bar.detail ?? bar.value}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Write the filter and refresher**

```tsx
// app/recruiter/analytics/JobFilter.tsx
'use client';
import { useRouter } from 'next/navigation';
import { Select } from '@/components/ui/Select';

const ALL = 'all';

export function JobFilter({ jobs, value }: { jobs: { id: string; title: string }[]; value?: string }) {
  const router = useRouter();
  return (
    <Select label="Job" value={value ?? ALL}
      options={[{ value: ALL, label: 'All jobs' }, ...jobs.map((j) => ({ value: j.id, label: j.title }))]}
      onChange={(next) => router.push(next === ALL ? '/recruiter/analytics' : `/recruiter/analytics?job=${next}`)} />
  );
}
```

```tsx
// app/recruiter/analytics/RefreshOnShow.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// The browser may restore this page from memory on Back. Refreshing here keeps the
// numbers current after a recruiter shortlists someone and returns.
export function RefreshOnShow() {
  const router = useRouter();
  useEffect(() => {
    router.refresh();
    const onVisible = () => { if (document.visibilityState === 'visible') router.refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [router]);
  return null;
}
```

- [ ] **Step 4: Write the page**

```tsx
// app/recruiter/analytics/page.tsx
import Link from 'next/link';
import { computeDashboard, stageLabel } from '@/lib/analytics/compute';
import { formatDuration, formatPercent } from '@/lib/analytics/format';
import { loadDashboardInput } from '@/lib/analytics/load';
import { requireRecruiter } from '@/lib/auth/guards';
import { BarList } from './BarList';
import { JobFilter } from './JobFilter';
import { RefreshOnShow } from './RefreshOnShow';
import styles from './analytics.module.css';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const recruiter = await requireRecruiter();
  const { job } = await searchParams;
  const input = await loadDashboardInput(recruiter.id, job);
  const d = computeDashboard(input);

  const drill = (metric: string) => {
    const query = new URLSearchParams({ metric });
    if (input.jobFilter) query.set('job', input.jobFilter);
    return `/recruiter/analytics/applicants?${query}`;
  };

  if (input.jobs.length === 0) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Analytics</h1>
        <p>No jobs yet. <Link href="/recruiter/jobs">Post your first job</Link> to see analytics.</p>
      </main>
    );
  }

  const tiles = [
    { label: 'Active jobs', value: String(d.activeJobs), href: '/recruiter/jobs' },
    { label: 'Applications', value: String(d.applications.length), href: drill('applications') },
    { label: 'Shortlisted', value: String(d.shortlisted.length), href: drill('shortlisted') },
    { label: 'Pending reviews', value: String(d.pending.length), href: drill('pending') },
    { label: 'Upcoming interviews', value: String(d.upcomingInterviews), href: '/recruiter/interviews' },
    {
      label: 'Shortlist rate', value: formatPercent(d.shortlistRate.percent), href: drill('shortlisted'),
      note: d.shortlistRate.denominator ? `${d.shortlistRate.numerator} of ${d.shortlistRate.denominator}` : undefined,
    },
    {
      label: 'Avg. processing time', value: formatDuration(d.avgProcessing.ms), href: drill('decided'),
      note: d.avgProcessing.decided.length ? `Application to first decision, ${d.avgProcessing.decided.length} decided` : 'Application to first decision',
    },
  ];

  return (
    <main className={styles.page}>
      <RefreshOnShow />
      <header className={styles.header}>
        <h1 className={styles.title}>Analytics</h1>
        <div className={styles.filter}><JobFilter jobs={input.jobs} value={input.jobFilter} /></div>
      </header>

      <ul className={styles.tiles}>
        {tiles.map((tile) => (
          <li key={tile.label}>
            <Link href={tile.href} className={styles.tile}>
              <span className={styles.figure} data-testid={`tile-${tile.label}`}>{tile.value}</span>
              <span className={styles.tileLabel}>{tile.label}</span>
              {tile.note && <span className={styles.tileNote}>{tile.note}</span>}
            </Link>
          </li>
        ))}
      </ul>

      <div className={styles.charts}>
        <section>
          <h2 className={styles.section}>Applications by stage</h2>
          <BarList ariaLabel="Applications by stage" bars={d.byStage.map((s) => ({
            key: s.status, label: stageLabel(s.status), value: s.ids.length, href: drill(`stage:${s.status}`),
          }))} />
        </section>

        <section>
          <h2 className={styles.section}>Applications by job</h2>
          <BarList ariaLabel="Applications by job" bars={d.byJob.map((j) => ({
            key: j.id, label: j.label, value: j.ids.length, href: drill(`job:${j.id}`),
          }))} />
        </section>

        <section>
          <h2 className={styles.section}>Common skill gaps</h2>
          {d.skillGaps.length === 0
            ? <p>No skill gaps found in assessed applications.</p>
            : <BarList ariaLabel="Common skill gaps" bars={d.skillGaps.map((g) => {
                const parts = [
                  g.missingEvidence.length ? `${g.missingEvidence.length} no evidence` : '',
                  g.confirmedAbsent.length ? `${g.confirmedAbsent.length} confirmed absent` : '',
                ].filter(Boolean).join(', ');
                return {
                  key: g.skill, label: g.skill, value: g.missingEvidence.length + g.confirmedAbsent.length,
                  href: drill(`gap:${g.skill}`), detail: `${parts} of ${g.assessed}`,
                };
              })} />}
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Write the styles**

White on `--viz-cited` measures 2.95:1 and fails (DESIGN.md §3.3), so nothing sits on the bar: labels and values are beside it, on the page background.

```css
/* app/recruiter/analytics/analytics.module.css */
.page { padding: var(--spacing-32) var(--shell-pad); font-size: 14px; color: var(--color-silver-mist); }
.header { display: flex; justify-content: space-between; align-items: flex-end; gap: var(--spacing-16); flex-wrap: wrap; margin-bottom: var(--spacing-16); }
.title { margin: 0; font: 500 24px/1.3 var(--font-matter); letter-spacing: -.02em; color: var(--color-platinum); }
.filter { min-width: 240px; }
.section { margin: 0 0 var(--spacing-12); font: 500 12px var(--font-matter); letter-spacing: .12em; text-transform: uppercase; color: var(--color-silver-mist); }

/* The 1px gap is the rule: the container paints through it (DESIGN.md §5.6). */
.tiles { list-style: none; margin: 0 0 var(--spacing-32); padding: 0; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 1px; background: var(--hairline); border-block: 1px solid var(--hairline); }
.tiles li { background: var(--color-liquid-abyss); }
.tile { display: flex; flex-direction: column; gap: 4px; height: 100%; padding: var(--spacing-16); color: inherit; text-decoration: none; }
.tile:hover { background: var(--wash); }
.tile:hover .tileLabel { color: var(--color-platinum); }
.figure { font: 500 28px/1.1 var(--font-matter); letter-spacing: -.02em; font-variant-numeric: tabular-nums; color: var(--color-lavender-phosphor); }
.tileLabel { font-size: 13px; color: var(--color-liquid-mist); }
.tileNote { font-size: 12px; color: var(--color-silver-mist); }

.charts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--spacing-32); align-items: start; }
.bars { list-style: none; margin: 0; padding: 0; }
.bar { display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: 'label value' 'track track'; gap: 4px var(--spacing-12); padding: 8px; border-top: 1px solid var(--hairline-soft); color: inherit; text-decoration: none; }
.bar:hover { background: var(--wash); }
.bar:hover .barLabel { color: var(--color-platinum); }
.barLabel { grid-area: label; overflow-wrap: anywhere; color: var(--color-liquid-mist); }
.barValue { grid-area: value; font: 400 13px var(--font-mono); font-variant-numeric: tabular-nums; color: var(--color-liquid-mist); text-align: right; }
.barTrack { grid-area: track; display: block; height: 8px; }
.barFill { display: block; height: 100%; border-radius: 0 4px 4px 0; background: var(--viz-cited); }

.list { list-style: none; margin: 0; padding: 0; border-bottom: 1px solid var(--hairline-soft); }
.row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 180px; gap: var(--spacing-16); padding: var(--spacing-12); border-top: 1px solid var(--hairline-soft); color: inherit; text-decoration: none; }
.row:hover { background: var(--wash); }
.who { color: var(--color-platinum); }
.breadcrumb { margin: 0 0 4px; font: 400 14px var(--font-arial); }
.breadcrumb a { color: var(--color-silver-mist); }
.breadcrumb a:hover { color: var(--color-platinum); }

@media (max-width: 1240px) {
  .tiles { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .charts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 680px) {
  .tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .charts { grid-template-columns: minmax(0, 1fr); }
  .row { grid-template-columns: minmax(0, 1fr); gap: 2px; }
}
```

- [ ] **Step 6: Make it the recruiter's home.** Replace the contents of `app/recruiter/page.tsx`. First check it holds nothing other than what module 2 described as a placeholder dashboard. If it holds real content, move that content rather than losing it, and add a nav link to `/recruiter/analytics` instead.

```tsx
// app/recruiter/page.tsx
import { redirect } from 'next/navigation';

export default function RecruiterHome() {
  redirect('/recruiter/analytics');
}
```

- [ ] **Step 7: Commit**

```bash
git add app/recruiter/analytics/BarList.tsx app/recruiter/analytics/JobFilter.tsx app/recruiter/analytics/RefreshOnShow.tsx app/recruiter/analytics/page.tsx app/recruiter/analytics/analytics.module.css app/recruiter/page.tsx
git commit -m "feat(analytics): add recruiter analytics dashboard" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5: The applicants behind a number

**Files:**
- Create: `app/recruiter/analytics/applicants/page.tsx`

- [ ] **Step 1: Write the page**

It runs the same calculation as the dashboard, so the list always matches the count. The IDs come from the recruiter's own data, so changing the URL can't reveal someone else's applicants.

```tsx
// app/recruiter/analytics/applicants/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { computeDashboard, drillDown, stageLabel } from '@/lib/analytics/compute';
import { loadDashboardInput } from '@/lib/analytics/load';
import { requireRecruiter } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import type { ApplicationStatus } from '@/lib/pipeline/statuses';
import styles from '../analytics.module.css';

export const dynamic = 'force-dynamic';

type Row = {
  id: string; status: ApplicationStatus;
  jobs: { title: string };
  candidate: { full_name: string };
};

export default async function AnalyticsApplicantsPage({ searchParams }: {
  searchParams: Promise<{ metric?: string; job?: string }>;
}) {
  const recruiter = await requireRecruiter();
  const { metric, job } = await searchParams;
  const input = await loadDashboardInput(recruiter.id, job);
  const result = metric ? drillDown(computeDashboard(input), metric) : null;
  if (!result) notFound();

  let rows: Row[] = [];
  if (result.ids.length) {
    const { data, error } = await db().from('applications')
      .select('id, status, jobs(title), candidate:profiles!applications_candidate_id_fkey(full_name)')
      .in('id', [...new Set(result.ids)]);
    if (error) throw error;
    rows = (data ?? []) as unknown as Row[];
  }

  const back = input.jobFilter ? `/recruiter/analytics?job=${input.jobFilter}` : '/recruiter/analytics';
  return (
    <main className={styles.page}>
      <p className={styles.breadcrumb}><Link href={back}>Analytics</Link></p>
      <h1 className={styles.title}>{result.title}</h1>
      <p>{rows.length} {rows.length === 1 ? 'applicant' : 'applicants'}</p>
      {rows.length > 0 && (
        <ul className={styles.list}>
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/recruiter/applications/${row.id}`} className={styles.row}>
                <span className={styles.who}>{row.candidate.full_name}</span>
                <span>{row.jobs.title}</span>
                <span>{stageLabel(row.status)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add app/recruiter/analytics/applicants/page.tsx
git commit -m "feat(analytics): open the applicants behind each number" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6: Browser test and handover

**Files:**
- Create: `e2e/analytics.spec.ts`

- [ ] **Step 1: Write the browser test**

The first test is the module's "done when" line. It reads the number before and after a real shortlist. The shortlist button's name comes from module 6, so adjust it there if it differs.

```ts
// e2e/analytics.spec.ts
import { expect, test, type Page } from '@playwright/test';
import { loginAs, seedApplication } from './helpers';

const tile = async (page: Page, label: string) =>
  Number(await page.getByTestId(`tile-${label}`).innerText());

test('dashboard updates after a shortlist', async ({ page }) => {
  const app = await seedApplication({ status: 'recruiter_review' });
  await loginAs(page, 'recruiter');

  await page.goto('/recruiter/analytics');
  const shortlistedBefore = await tile(page, 'Shortlisted');
  const pendingBefore = await tile(page, 'Pending reviews');

  await page.goto(`/recruiter/applications/${app.applicationId}`);
  await page.getByRole('button', { name: 'Shortlist' }).click();
  await expect(page.getByText('Shortlisted').first()).toBeVisible();

  await page.goto('/recruiter/analytics');
  expect(await tile(page, 'Shortlisted')).toBe(shortlistedBefore + 1);
  expect(await tile(page, 'Pending reviews')).toBe(pendingBefore - 1);

  // Going Back also shows fresh numbers.
  await page.goto(`/recruiter/applications/${app.applicationId}`);
  await page.goBack();
  await expect(page.getByTestId('tile-Shortlisted')).toHaveText(String(shortlistedBefore + 1));
});

test('job filter narrows the numbers, and a number opens its applicants', async ({ page }) => {
  const app = await seedApplication({ status: 'recruiter_review' });
  await loginAs(page, 'recruiter');
  await page.goto(`/recruiter/analytics?job=${app.jobId}`);

  expect(await tile(page, 'Applications')).toBe(1);
  expect(await tile(page, 'Pending reviews')).toBe(1);

  await page.getByRole('link', { name: /Pending reviews/ }).click();
  await expect(page.getByRole('heading', { name: 'Pending reviews' })).toBeVisible();
  await expect(page.getByText(app.candidateName)).toBeVisible();
});

test('skill gaps say no evidence, not that the skill is missing', async ({ page }) => {
  const app = await seedApplication({ status: 'recruiter_review' });
  await loginAs(page, 'recruiter');
  await page.goto(`/recruiter/analytics?job=${app.jobId}`);
  await expect(page.getByRole('list', { name: 'Common skill gaps' })).toContainText('no evidence');
});

test('a candidate cannot open analytics', async ({ page }) => {
  await loginAs(page, 'candidate');
  await page.goto('/recruiter/analytics');
  await expect(page.getByTestId('tile-Applications')).toHaveCount(0);
});

test("changing the URL does not reveal another recruiter's job", async ({ page }) => {
  await loginAs(page, 'recruiter');
  await page.goto('/recruiter/analytics?job=00000000-0000-0000-0000-000000000000');
  // An unknown job falls back to the recruiter's own "All jobs" view.
  await expect(page.getByRole('combobox', { name: 'Job' })).toContainText('All jobs');
});
```

- [ ] **Step 2: Run all tests**

Run: `npm run test && npx playwright test e2e/analytics.spec.ts && npx tsc --noEmit`
Expected: everything passes with no type errors.

- [ ] **Step 3: Run the design checks.** Run the `frontend-design` pre-handover checklist and the `dataviz` anti-patterns check. Screenshot at 1280, 1440 and 390 wide, in these states: no jobs, a job with no applicants, one application, many applications, a very long job title, a job filter set. At 1440×900 the tiles and charts should fit without a long scroll. Hover a sample of tiles and bars to confirm they react.

- [ ] **Step 4: Commit and push**

```bash
git add e2e/analytics.spec.ts
git commit -m "test(analytics): prove the dashboard updates after a shortlist" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin main
```

Push from this project's own repo. Never from `C:\Users\LENOVO`.

- [ ] **Step 5: Check it live.** Once the deploy shows the new commit, on the live URL: note the Shortlisted number, shortlist someone, return, and confirm it went up by one. Click three different numbers and confirm each list's length matches the number. Log in as a candidate and confirm analytics is blocked.

- [ ] **Step 6: Run the full demo scenario.** Run all six steps in REQUIREMENTS.md section 2 on the live URL, in order, as this is the last core module. Report any step that doesn't work.

- [ ] **Step 7: Hand over.** Report what's live, the route, a test account, the clicks to see it, who can and can't see it, the commit and branch, and anything still local.
