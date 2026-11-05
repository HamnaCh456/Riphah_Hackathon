# Module 11: Comparison & Duplicates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let recruiters compare selected applicants side by side, and flag likely duplicate candidates that merge only after a recruiter approves.

**Architecture:** Comparison is a read-only view built from saved assessments, with no new AI text or scores. Duplicate detection stores suggestions based on normalised contact details and resume similarity. One database function performs the merge inside a transaction, moves records rather than deleting them, and logs what it did.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Postgres with pgvector, Zod, Vitest.

**Depends on:** Modules 1-9, Module 12 (`lib/db.ts`, `lib/http.ts`, `RequirementResult`) and Module 10 (`candidates.merged_into`, `lib/auth/current-candidate.ts`, `tests/helpers/fixtures.ts`, `lib/talent/index-resume.ts`).

**Done when:** Nothing merges without a recruiter's approval (`REQUIREMENTS.md` section 6).

**Priority:** This is the first module to cut if time runs short. Check the deadline before starting.

---

## Rules for whoever executes this

1. **Wrong-database danger.** The `mcp__supabase__*` tools in this environment point at `indxzhcrykhinhefhhop`, a different project holding real client data. **Never use them here.** Apply migrations only with `mcp__supabase-riphah__apply_migration` (project `lbxozdqgboubbyvzgquz`). That server must be signed in first through `/mcp`. If it is not available, paste the SQL into the Supabase SQL editor for `lbxozdqgboubbyvzgquz`.
2. **Do not commit plans.** Everything under `docs/superpowers/` stays local. Stage named paths only and never run `git add -A` or `git add .`.
3. **Commits** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push from this folder's repo to `https://github.com/HamnaCh456/Riphah_Hackathon.git`.
4. **UI work:** load the `frontend-design` skill first, follow `DESIGN.md`, and run the skill's pre-handover checklist on every screen touched.

---

## Task 1: Candidate comparison logic

**Files:**
- Create: `lib/compare/build-comparison.ts`
- Test: `tests/unit/build-comparison.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/build-comparison.test.ts
import { expect, it } from 'vitest';
import { buildComparison, type ComparisonInput } from '@/lib/compare/build-comparison';
import type { RequirementResult } from '@/lib/trust/types';

function result(
  requirementId: string,
  skill: string,
  evidenceStatus: RequirementResult['evidenceStatus'],
  excerpt: string | null = null,
  claimId: string | null = null,
): RequirementResult {
  return {
    requirementId, skill, category: 'skills', weight: 1,
    evidenceStatus, claim: excerpt ? `Has ${skill}` : null, excerpt, claimId,
  };
}

const requirements = [
  { id: 'r1', skill: 'Python', kind: 'required' as const },
  { id: 'r2', skill: 'Docker', kind: 'preferred' as const },
];

const applicants: ComparisonInput[] = [
  {
    applicationId: 'a1', fullName: 'Noor', score: 82,
    breakdown: { skills: 90, experience: 70, projects: 80, qualifications: 60 },
    explanation: 'Strong on Python.',
    results: [
      result('r1', 'Python', 'evidence_found', 'Built Python tools', 'c1'),
      result('r2', 'Docker', 'no_evidence_found'),
    ],
    flaggedClaimIds: ['c1'],
  },
  {
    applicationId: 'a2', fullName: 'Bilal', score: 60,
    breakdown: { skills: 60, experience: 60, projects: 60, qualifications: 60 },
    explanation: 'Some gaps.',
    results: [result('r1', 'Python', 'confirmed_absent')],
    flaggedClaimIds: [],
  },
];

it('makes one row per job requirement with one cell per applicant', () => {
  const output = buildComparison(requirements, applicants);
  expect(output.rows.map((row) => row.skill)).toEqual(['Python', 'Docker']);
  expect(output.rows[0].cells).toHaveLength(2);
});

it('keeps missing evidence and confirmed absence as different results', () => {
  const output = buildComparison(requirements, applicants);
  expect(output.rows[1].cells[0].evidenceStatus).toBe('no_evidence_found');
  expect(output.rows[0].cells[1].evidenceStatus).toBe('confirmed_absent');
});

it('treats a requirement with no saved result as missing evidence, not absent', () => {
  const output = buildComparison(requirements, applicants);
  expect(output.rows[1].cells[1].evidenceStatus).toBe('no_evidence_found');
});

it('carries the excerpt and shows a flagged claim is flagged', () => {
  const cell = buildComparison(requirements, applicants).rows[0].cells[0];
  expect(cell.excerpt).toBe('Built Python tools');
  expect(cell.flagged).toBe(true);
});

it('lists each applicant’s missing information', () => {
  const output = buildComparison(requirements, applicants);
  expect(output.applicants[0].missing).toEqual(['Docker']);
  expect(output.applicants[1].missing).toEqual(['Docker']);
});

it('keeps the order the recruiter selected and picks no winner', () => {
  const output = buildComparison(requirements, [applicants[1], applicants[0]]);
  expect(output.applicants.map((a) => a.applicationId)).toEqual(['a2', 'a1']);
  expect(JSON.stringify(output)).not.toMatch(/winner|recommended|best/i);
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npm test -- tests/unit/build-comparison.test.ts`
Expected: FAIL, cannot resolve `@/lib/compare/build-comparison`.

- [ ] **Step 3: Write the logic**

```ts
// lib/compare/build-comparison.ts
import type { EvidenceStatus, RequirementResult, ScoreCategory } from '@/lib/trust/types';

export type ComparisonRequirement = {
  id: string;
  skill: string;
  kind: 'required' | 'preferred';
};

export type ComparisonInput = {
  applicationId: string;
  fullName: string | null;
  score: number;
  breakdown: Record<ScoreCategory, number>;
  explanation: string;
  results: RequirementResult[];
  flaggedClaimIds: string[];
};

export type ComparisonCell = {
  evidenceStatus: EvidenceStatus;
  excerpt: string | null;
  flagged: boolean;
};

export function buildComparison(
  requirements: ComparisonRequirement[],
  applicants: ComparisonInput[],
) {
  const cellFor = (applicant: ComparisonInput, requirementId: string): ComparisonCell => {
    const result = applicant.results.find((r) => r.requirementId === requirementId);
    return {
      evidenceStatus: result?.evidenceStatus ?? 'no_evidence_found',
      excerpt: result?.excerpt ?? null,
      flagged: Boolean(result?.claimId && applicant.flaggedClaimIds.includes(result.claimId)),
    };
  };

  return {
    applicants: applicants.map((applicant) => ({
      applicationId: applicant.applicationId,
      fullName: applicant.fullName,
      score: applicant.score,
      breakdown: applicant.breakdown,
      explanation: applicant.explanation,
      missing: requirements
        .filter((r) => cellFor(applicant, r.id).evidenceStatus === 'no_evidence_found')
        .map((r) => r.skill),
    })),
    rows: requirements.map((requirement) => ({
      requirementId: requirement.id,
      skill: requirement.skill,
      kind: requirement.kind,
      cells: applicants.map((applicant) => cellFor(applicant, requirement.id)),
    })),
  };
}
```

- [ ] **Step 4: Run them and confirm they pass**

Run: `npm test -- tests/unit/build-comparison.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/compare/build-comparison.ts tests/unit/build-comparison.test.ts
git commit -m "feat: build side-by-side candidate comparison from saved assessments"
```

---

## Task 2: Comparison route

**Files:**
- Create: `lib/compare/load-comparison.ts`, `app/api/recruiter/jobs/[id]/compare/route.ts`
- Test: `tests/unit/compare-route.test.ts`, `tests/integration/compare.test.ts`

- [ ] **Step 1: Write the failing route test**

```ts
// tests/unit/compare-route.test.ts
import { beforeEach, expect, it, vi } from 'vitest';
import { HttpError } from '@/lib/http';

vi.mock('@/lib/auth/require-role', () => ({ requireRole: vi.fn() }));
vi.mock('@/lib/db', () => ({ serviceDb: vi.fn(() => 'db') }));
vi.mock('@/lib/compare/load-comparison', () => ({ loadComparison: vi.fn() }));

import { requireRole } from '@/lib/auth/require-role';
import { loadComparison } from '@/lib/compare/load-comparison';
import { GET } from '@/app/api/recruiter/jobs/[id]/compare/route';

const JOB = '11111111-1111-4111-8111-111111111111';
const A = '22222222-2222-4222-8222-222222222222';
const B = '33333333-3333-4333-8333-333333333333';
const ctx = { params: Promise.resolve({ id: JOB }) };
const get = (ids: string) => new Request(`http://test.local?applications=${ids}`);

beforeEach(() => vi.clearAllMocks());

it('blocks candidates', async () => {
  vi.mocked(requireRole).mockRejectedValue(new HttpError(403, 'Forbidden'));
  const response = await GET(get(`${A},${B}`), ctx);
  expect(response.status).toBe(403);
  expect(loadComparison).not.toHaveBeenCalled();
});

it('needs at least two applications', async () => {
  vi.mocked(requireRole).mockResolvedValue({ userId: 'u1' });
  expect((await GET(get(A), ctx)).status).toBe(400);
});

it('allows at most four applications', async () => {
  vi.mocked(requireRole).mockResolvedValue({ userId: 'u1' });
  expect((await GET(get(Array(5).fill(A).join(',')), ctx)).status).toBe(400);
});

it('loads a valid selection', async () => {
  vi.mocked(requireRole).mockResolvedValue({ userId: 'u1' });
  vi.mocked(loadComparison).mockResolvedValue({ applicants: [], rows: [] });
  expect((await GET(get(`${A},${B}`), ctx)).status).toBe(200);
  expect(loadComparison).toHaveBeenCalledWith('db', JOB, [A, B]);
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -- tests/unit/compare-route.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Write the loader and route**

```ts
// lib/compare/load-comparison.ts
import 'server-only';
import { must, type Db } from '@/lib/db';
import { HttpError } from '@/lib/http';
import type { RequirementResult, ScoreCategory } from '@/lib/trust/types';
import { buildComparison, type ComparisonRequirement } from './build-comparison';

type ApplicationRow = {
  id: string;
  candidates: { full_name: string | null };
  match_assessments: {
    score: number;
    breakdown: Record<ScoreCategory, number>;
    explanation: string;
    requirement_results: RequirementResult[];
  } | null;
};

const FLAGGED_STATUSES = ['needs_review', 'unsupported'];

export async function loadComparison(db: Db, jobId: string, applicationIds: string[]) {
  // Filtering on job_id stops a crafted URL pulling in another job's applicants.
  const rows = must(await db.from('applications')
    .select('id, candidates(full_name), match_assessments(score, breakdown, explanation, requirement_results)')
    .eq('job_id', jobId)
    .in('id', applicationIds)) as unknown as ApplicationRow[];
  if (rows.length !== applicationIds.length) {
    throw new HttpError(404, 'One of these applications was not found for this job.');
  }
  if (rows.some((row) => !row.match_assessments)) {
    throw new HttpError(409, 'One of these applicants has no AI assessment yet.');
  }

  const requirements = must(await db.from('job_requirements')
    .select('id, skill, kind').eq('job_id', jobId)) as ComparisonRequirement[];
  const flagged = must(await db.from('ai_claims')
    .select('id, subject_id')
    .eq('subject_type', 'assessment')
    .in('subject_id', applicationIds)
    .in('status', FLAGGED_STATUSES)) as { id: string; subject_id: string }[];

  const byId = new Map(rows.map((row) => [row.id, row]));
  return buildComparison(requirements, applicationIds.map((id) => {
    const row = byId.get(id) as ApplicationRow;
    const assessment = row.match_assessments!;
    return {
      applicationId: id,
      fullName: row.candidates.full_name,
      score: Number(assessment.score),
      breakdown: assessment.breakdown,
      explanation: assessment.explanation,
      results: assessment.requirement_results,
      flaggedClaimIds: flagged.filter((claim) => claim.subject_id === id).map((claim) => claim.id),
    };
  }));
}
```

```ts
// app/api/recruiter/jobs/[id]/compare/route.ts
import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-role';
import { loadComparison } from '@/lib/compare/load-comparison';
import { serviceDb } from '@/lib/db';
import { route } from '@/lib/http';

const idsSchema = z.array(z.string().uuid()).min(2).max(4);

export const GET = route<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  await requireRole('recruiter');
  const { id } = await ctx.params;
  const jobId = z.string().uuid().parse(id);
  const raw = new URL(req.url).searchParams.get('applications') ?? '';
  const applicationIds = idsSchema.parse(raw.split(',').filter(Boolean));
  return loadComparison(serviceDb(), jobId, [...new Set(applicationIds)]);
});
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `npm test -- tests/unit/compare-route.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the database test**

```ts
// tests/integration/compare.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadComparison } from '@/lib/compare/load-comparison';
import { must } from '@/lib/db';
import { cleanTestData, createApplication, createCandidate, createJob, db } from '../helpers/fixtures';

async function addAssessment(applicationId: string, resumeId: string, score: number) {
  must(await db.from('match_assessments').insert({
    application_id: applicationId, resume_id: resumeId, score,
    breakdown: { skills: score, experience: score, projects: score, qualifications: score },
    explanation: 'test', requirement_results: [],
  }).select('id'));
}

describe.runIf(process.env.RUN_DB_TESTS)('loadComparison', () => {
  let job: string, otherJob: string, a: string, b: string, foreign: string, unassessed: string;

  beforeAll(async () => {
    await cleanTestData();
    job = await createJob('Compare role', 'Backend', ['Python']);
    otherJob = await createJob('Other role', 'Backend', ['Go']);
    const add = async (key: string, target: string, score: number | null) => {
      const { candidateId, resumeId } = await createCandidate({
        fullName: key, emailLocal: `${key}.compare`, rawText: 'Built Python tools.',
      });
      const application = await createApplication(target, candidateId, 'recruiter_review');
      if (score !== null) await addAssessment(application, resumeId, score);
      return application;
    };
    a = await add('a', job, 80);
    b = await add('b', job, 60);
    foreign = await add('foreign', otherJob, 90);
    unassessed = await add('unassessed', job, null);
  });
  afterAll(cleanTestData);

  it('returns the selected applicants in the selected order', async () => {
    const output = await loadComparison(db, job, [b, a]);
    expect(output.applicants.map((x) => x.score)).toEqual([60, 80]);
    expect(output.rows.map((row) => row.skill)).toEqual(['Python']);
  });

  it("refuses an applicant from another job", async () => {
    await expect(loadComparison(db, job, [a, foreign])).rejects.toMatchObject({ status: 404 });
  });

  it('gives a clear error when an applicant has no assessment yet', async () => {
    await expect(loadComparison(db, job, [a, unassessed])).rejects.toMatchObject({ status: 409 });
  });
});
```

Run: `npm run test:db -- tests/integration/compare.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/compare/load-comparison.ts app/api/recruiter/jobs/[id]/compare tests/unit/compare-route.test.ts tests/integration/compare.test.ts
git commit -m "feat: add recruiter-only candidate comparison route"
```

---

## Task 3: Comparison screen

Load the `frontend-design` skill first. This screen is a table (`DESIGN.md` 9.4). It shows evidence and numbers but no winner or "best match" label, because the recruiter decides.

**Files:**
- Create: `app/recruiter/jobs/[id]/compare/page.tsx`, `components/compare/compare.module.css`
- Modify: Module 5's ranked applicant list

- [ ] **Step 1: Write the page**

```tsx
// app/recruiter/jobs/[id]/compare/page.tsx
'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from '@/components/compare/compare.module.css';

type Cell = {
  evidenceStatus: 'evidence_found' | 'no_evidence_found' | 'confirmed_absent';
  excerpt: string | null;
  flagged: boolean;
};
type Comparison = {
  applicants: {
    applicationId: string;
    fullName: string | null;
    score: number;
    breakdown: Record<'skills' | 'experience' | 'projects' | 'qualifications', number>;
    explanation: string;
    missing: string[];
  }[];
  rows: { requirementId: string; skill: string; kind: 'required' | 'preferred'; cells: Cell[] }[];
};

const CATEGORY_LABELS = {
  skills: 'Skills', experience: 'Experience', projects: 'Projects', qualifications: 'Qualifications',
} as const;

function EvidenceCell({ cell }: { cell: Cell }) {
  if (cell.evidenceStatus === 'confirmed_absent') return <span className={styles.flag}>Confirmed absent</span>;
  if (cell.evidenceStatus === 'no_evidence_found') return <span className={styles.meta}>No evidence found</span>;
  return (
    <>
      <blockquote className={styles.excerpt}>{cell.excerpt}</blockquote>
      {cell.flagged && <p className={styles.flag}>Needs your review</p>}
    </>
  );
}

export default function ComparePage() {
  const { id: jobId } = useParams<{ id: string }>();
  const applications = useSearchParams().get('applications') ?? '';
  const [data, setData] = useState<Comparison | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);
    fetch(`/api/recruiter/jobs/${jobId}/compare?applications=${encodeURIComponent(applications)}`)
      .then(async (response) => {
        const body = await response.json();
        if (!active) return;
        if (response.status === 400) setError('Choose 2 to 4 applicants to compare.');
        else if (!response.ok) setError(body.error ?? 'This comparison could not load.');
        else setData(body);
      })
      .catch(() => active && setError('This comparison could not load. Reload to try again.'));
    return () => { active = false; };
  }, [jobId, applications]);

  return (
    <main>
      <Link href={`/recruiter/jobs/${jobId}`}>Back to applicants</Link>
      <h1>Compare applicants</h1>
      {error && <p role="alert" className={styles.flag}>{error}</p>}
      {!data && !error && <p className={styles.meta}>Loading comparison…</p>}
      {data && (
        <div className={styles.scroll} tabIndex={0} role="region" aria-label="Applicant comparison">
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col" className={styles.firstColumn}>Requirement</th>
                {data.applicants.map((a) => (
                  <th scope="col" key={a.applicationId}>{a.fullName ?? 'Name not found in resume'}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" className={styles.firstColumn}>Job-relevance score</th>
                {data.applicants.map((a) => <td key={a.applicationId} className={styles.figure}>{a.score}</td>)}
              </tr>
              {(Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((category) => (
                <tr key={category}>
                  <th scope="row" className={styles.firstColumn}>{CATEGORY_LABELS[category]}</th>
                  {data.applicants.map((a) => <td key={a.applicationId}>{a.breakdown[category]}</td>)}
                </tr>
              ))}
              <tr>
                <th scope="row" className={styles.firstColumn}>Why this score</th>
                {data.applicants.map((a) => <td key={a.applicationId}>{a.explanation}</td>)}
              </tr>
              {data.rows.map((row) => (
                <tr key={row.requirementId}>
                  <th scope="row" className={styles.firstColumn}>
                    {row.skill}
                    <span className={styles.meta}> ({row.kind})</span>
                  </th>
                  {row.cells.map((cell, i) => (
                    <td key={data.applicants[i].applicationId}><EvidenceCell cell={cell} /></td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row" className={styles.firstColumn}>No evidence found for</th>
                {data.applicants.map((a) => (
                  <td key={a.applicationId}>{a.missing.length ? a.missing.join(', ') : 'Nothing missing'}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
```

```css
/* components/compare/compare.module.css */
.scroll { overflow-x: auto; margin-top: 16px; }
.table { min-width: 720px; width: 100%; border-collapse: collapse; }
.table th, .table td {
  padding: 12px 16px 12px 0;
  border-top: 1px solid var(--hairline);
  text-align: left;
  vertical-align: top;
  font-weight: 400;
}
.table thead th { color: var(--color-platinum); }
.firstColumn { position: sticky; left: 0; min-width: 150px; background: var(--color-liquid-abyss); }
.figure { color: var(--color-lavender-phosphor); }
.meta { color: var(--color-silver-mist); font-size: 14px; }
.flag { margin: 4px 0; color: var(--color-coral); font-size: 14px; }
.excerpt {
  margin: 0;
  padding: 2px 6px;
  width: fit-content;
  overflow-wrap: anywhere;
  color: var(--color-liquid-abyss);
  background: var(--color-citrine);
}
```

Next.js requires `useSearchParams` to be inside a `<Suspense>` boundary at build time. If `npm run build` reports this, move the component to `components/compare/ComparePageClient.tsx` and render it from the page inside `<Suspense>`.

- [ ] **Step 2: Add selection to the ranked applicant list**

In Module 5's applicant list, add a checkbox to each row and a compare link. This is the state and link to add:

```tsx
const [selected, setSelected] = useState<string[]>([]);
const canCompare = selected.length >= 2 && selected.length <= 4;

function toggle(applicationId: string) {
  setSelected((current) => current.includes(applicationId)
    ? current.filter((id) => id !== applicationId)
    : [...current, applicationId]);
}

// In each row:
<label>
  <input
    type="checkbox"
    checked={selected.includes(application.id)}
    disabled={!selected.includes(application.id) && selected.length >= 4}
    onChange={() => toggle(application.id)}
  />{' '}
  Compare {application.fullName}
</label>

// Above the list:
{canCompare
  ? <Link href={`/recruiter/jobs/${job.id}/compare?applications=${selected.join(',')}`}>Compare {selected.length} applicants</Link>
  : <span>Select 2 to 4 applicants to compare</span>}
```

- [ ] **Step 3: Check it in a real browser**

Run `npm run dev` and sign in as a recruiter with the three demo applicants:
- Select two, then three, and compare each set. All requirements and scores show correctly.
- A skill with no evidence reads "No evidence found". The word "absent" appears only for a confirmed absence.
- A flagged claim reads "Needs your review".
- Back returns to the applicants, and reloading the compare page keeps the same selection.
- Change `applications` in the URL to include another job's application. A clear error shows.
- A candidate session gets 403 from the API and cannot open the page.
- At 375px, the table scrolls within its own area, the first column stays visible, and the page has no sideways scroll.

- [ ] **Step 4: Commit**

```bash
git add app/recruiter/jobs/[id]/compare components/compare
git add <Module 5 applicant list path>
git commit -m "feat: add side-by-side applicant comparison screen"
```

---

## Task 4: Normalise contact details

**Files:**
- Create: `lib/duplicates/normalize.ts`
- Test: `tests/unit/normalize.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/normalize.test.ts
import { describe, expect, it } from 'vitest';
import { normalizeEmail, normalizePhone } from '@/lib/duplicates/normalize';

describe('normalizeEmail', () => {
  it.each([
    [' Noor.Ahmed@Gmail.com ', 'noorahmed@gmail.com'],
    ['noor.ahmed+jobs@googlemail.com', 'noorahmed@gmail.com'],
    ['Noor.Ahmed+x@company.com', 'noor.ahmed+x@company.com'],
  ])('%s becomes %s', (input, expected) => {
    expect(normalizeEmail(input)).toBe(expected);
  });

  it.each([[null], [''], ['not-an-email']])('returns null for %s', (input) => {
    expect(normalizeEmail(input)).toBeNull();
  });
});

describe('normalizePhone', () => {
  it.each([
    ['+92 300 1234567'], ['0092-300-1234567'], ['0300 1234567'], ['(0300) 123-4567'],
  ])('%s becomes one form', (input) => {
    expect(normalizePhone(input)).toBe('3001234567');
  });

  it.each([[null], [''], ['12345']])('returns null for %s', (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npm test -- tests/unit/normalize.test.ts`
Expected: FAIL, cannot resolve `@/lib/duplicates/normalize`.

- [ ] **Step 3: Write it**

```ts
// lib/duplicates/normalize.ts
const GMAIL_DOMAINS = ['gmail.com', 'googlemail.com'];
const MIN_PHONE_DIGITS = 10;

export function normalizeEmail(email: string | null | undefined): string | null {
  const clean = email?.trim().toLowerCase();
  if (!clean) return null;
  const parts = clean.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  if (GMAIL_DOMAINS.includes(parts[1])) {
    return `${parts[0].split('+')[0].replace(/\./g, '')}@gmail.com`;
  }
  return clean;
}

/** Compares on the last 10 digits, so +92, 0092 and 0 prefixes all match. */
export function normalizePhone(phone: string | null | undefined): string | null {
  const digits = phone?.replace(/\D/g, '') ?? '';
  return digits.length >= MIN_PHONE_DIGITS ? digits.slice(-MIN_PHONE_DIGITS) : null;
}
```

- [ ] **Step 4: Run them and confirm they pass**

Run: `npm test -- tests/unit/normalize.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/duplicates/normalize.ts tests/unit/normalize.test.ts
git commit -m "feat: normalise emails and phone numbers for duplicate checks"
```

---

## Task 5: Duplicate tables and merge function

**Files:**
- Create: `supabase/migrations/20261105140000_duplicates.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20261105140000_duplicates.sql
alter table resumes add column document_embedding extensions.vector(768);
alter table candidates
  add column email_normalized text,
  add column phone_normalized text;
create index candidates_email_normalized_idx on candidates (email_normalized);
create index candidates_phone_normalized_idx on candidates (phone_normalized);

create table duplicate_suggestions (
  id uuid primary key default gen_random_uuid(),
  candidate_a uuid not null references candidates on delete cascade,
  candidate_b uuid not null references candidates on delete cascade,
  signals jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'merged', 'dismissed')),
  decided_by uuid references profiles,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check (candidate_a < candidate_b),
  unique (candidate_a, candidate_b)
);

-- Everything a merge changed, so it can be checked and reversed by hand.
create table candidate_merge_log (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references duplicate_suggestions,
  kept_candidate uuid not null references candidates,
  merged_candidate uuid not null references candidates,
  moved_application_ids uuid[] not null,
  conflicting_application_ids uuid[] not null,
  moved_resume_ids uuid[] not null,
  merged_by uuid not null references profiles,
  created_at timestamptz not null default now()
);

alter table duplicate_suggestions enable row level security;
alter table candidate_merge_log enable row level security;

create function find_similar_resumes(for_resume uuid, min_similarity double precision)
returns table (candidate_id uuid, similarity double precision)
language sql stable
set search_path = public, extensions
as $$
  select other.candidate_id, 1 - (other.document_embedding <=> mine.document_embedding)
  from resumes mine
  join resumes other on other.candidate_id <> mine.candidate_id
  join candidates person on person.id = other.candidate_id
  where mine.id = for_resume
    and mine.document_embedding is not null
    and other.document_embedding is not null
    and person.merged_into is null
    and 1 - (other.document_embedding <=> mine.document_embedding) >= min_similarity
$$;

-- The only code that merges. It needs a named recruiter and a pending suggestion.
create function merge_candidates(p_suggestion uuid, p_keep uuid, p_recruiter uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  suggestion duplicate_suggestions%rowtype;
  v_merge uuid;
  v_moved uuid[];
  v_conflicts uuid[];
  v_resumes uuid[];
  v_log uuid;
begin
  if not exists (select 1 from profiles where id = p_recruiter and role = 'recruiter') then
    raise exception 'Only a recruiter can merge candidates';
  end if;

  select * into suggestion from duplicate_suggestions where id = p_suggestion for update;
  if not found then raise exception 'Suggestion not found'; end if;
  if suggestion.status <> 'pending' then raise exception 'Suggestion was already decided'; end if;
  if p_keep not in (suggestion.candidate_a, suggestion.candidate_b) then
    raise exception 'The kept candidate must be part of this suggestion';
  end if;
  v_merge := case when p_keep = suggestion.candidate_a then suggestion.candidate_b else suggestion.candidate_a end;

  -- If both applied to one job, both applications stay as they are and the log lists them.
  select coalesce(array_agg(mine.id), '{}') into v_conflicts
  from applications mine
  where mine.candidate_id = v_merge
    and exists (select 1 from applications kept
                where kept.candidate_id = p_keep and kept.job_id = mine.job_id);

  select coalesce(array_agg(id), '{}') into v_moved
  from applications where candidate_id = v_merge and not (id = any(v_conflicts));
  update applications set candidate_id = p_keep where id = any(v_moved);

  select coalesce(array_agg(id), '{}') into v_resumes from resumes where candidate_id = v_merge;
  update resumes set candidate_id = p_keep where id = any(v_resumes);
  update resume_chunks set candidate_id = p_keep where candidate_id = v_merge;
  update candidate_skills set candidate_id = p_keep where candidate_id = v_merge;

  update candidates set merged_into = p_keep where id = v_merge;
  -- Anything that already pointed at the merged record must follow it to the kept one.
  update candidates set merged_into = p_keep where merged_into = v_merge;

  update duplicate_suggestions
  set status = 'merged', decided_by = p_recruiter, decided_at = now()
  where id = p_suggestion;
  -- Other open suggestions naming the merged record no longer make sense.
  update duplicate_suggestions
  set status = 'dismissed', decided_by = p_recruiter, decided_at = now()
  where status = 'pending' and id <> p_suggestion
    and (candidate_a = v_merge or candidate_b = v_merge);

  insert into candidate_merge_log (
    suggestion_id, kept_candidate, merged_candidate, moved_application_ids,
    conflicting_application_ids, moved_resume_ids, merged_by
  ) values (p_suggestion, p_keep, v_merge, v_moved, v_conflicts, v_resumes, p_recruiter)
  returning id into v_log;
  return v_log;
end;
$$;

revoke execute on function find_similar_resumes(uuid, double precision) from public, anon, authenticated;
revoke execute on function merge_candidates(uuid, uuid, uuid) from public, anon, authenticated;
```

- [ ] **Step 2: Apply it to the right project**

Use `mcp__supabase-riphah__apply_migration` with the name `duplicates`. Do not use `mcp__supabase__apply_migration`.

- [ ] **Step 3: Confirm the browser-facing roles cannot merge**

```sql
select has_function_privilege('anon', 'merge_candidates(uuid, uuid, uuid)', 'execute') as anon_can_merge,
       has_function_privilege('authenticated', 'merge_candidates(uuid, uuid, uuid)', 'execute') as user_can_merge;
```

Expected: `false`, `false`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261105140000_duplicates.sql
git commit -m "feat: add duplicate suggestions and recruiter-only merge function"
```

---

## Task 6: Detect duplicates

**Files:**
- Create: `lib/duplicates/detect.ts`
- Modify: Module 4's resume save step
- Test: `tests/unit/classify-signals.test.ts`, `tests/integration/duplicates.test.ts`

- [ ] **Step 1: Write the failing unit test**

```ts
// tests/unit/classify-signals.test.ts
import { expect, it } from 'vitest';
import { collectSignals, orderedPair, DOCUMENT_SIMILARITY_THRESHOLD } from '@/lib/duplicates/detect';

it('reports matching contact details', () => {
  expect(collectSignals({ sameEmail: true, samePhone: false, documentSimilarity: null })).toEqual([
    { type: 'same_email', label: 'Same email address' },
  ]);
});

it('reports a very similar resume, with the similarity shown as a percentage', () => {
  expect(collectSignals({ sameEmail: false, samePhone: false, documentSimilarity: 0.971 })).toEqual([
    { type: 'similar_resume', label: 'Resumes are 97% similar' },
  ]);
});

it('ignores a resume similarity below the threshold', () => {
  const below = DOCUMENT_SIMILARITY_THRESHOLD - 0.01;
  expect(collectSignals({ sameEmail: false, samePhone: false, documentSimilarity: below })).toEqual([]);
});

it('orders a pair the same way whichever came first', () => {
  expect(orderedPair('b', 'a')).toEqual(['a', 'b']);
  expect(orderedPair('a', 'b')).toEqual(['a', 'b']);
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -- tests/unit/classify-signals.test.ts`
Expected: FAIL, cannot resolve `@/lib/duplicates/detect`.

- [ ] **Step 3: Write the detector**

Names are not a signal: two different people can share a name, and it would be a personal detail driving the result.

```ts
// lib/duplicates/detect.ts
import { embedDocuments } from '@/lib/ai/gemini';
import { must, type Db } from '@/lib/db';
import { redactPersonalDetails } from '@/lib/trust/scoring-input';
import { normalizeEmail, normalizePhone } from './normalize';

// Calibrated against the fixtures in Task 6, Step 6.
export const DOCUMENT_SIMILARITY_THRESHOLD = 0.95;

export type Signal = { type: 'same_email' | 'same_phone' | 'similar_resume'; label: string };

export function collectSignals(facts: {
  sameEmail: boolean;
  samePhone: boolean;
  documentSimilarity: number | null;
}): Signal[] {
  const signals: Signal[] = [];
  if (facts.sameEmail) signals.push({ type: 'same_email', label: 'Same email address' });
  if (facts.samePhone) signals.push({ type: 'same_phone', label: 'Same phone number' });
  if (facts.documentSimilarity !== null && facts.documentSimilarity >= DOCUMENT_SIMILARITY_THRESHOLD) {
    signals.push({
      type: 'similar_resume',
      label: `Resumes are ${Math.round(facts.documentSimilarity * 100)}% similar`,
    });
  }
  return signals;
}

export function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/**
 * Records suggestions only. This must never write merged_into or move a record:
 * merging happens only through a recruiter's decision in decideSuggestion.
 */
export async function detectDuplicates(db: Db, resumeId: string): Promise<number> {
  const resume = must(await db.from('resumes')
    .select('raw_text, candidate_id, candidates(full_name, email, phone)')
    .eq('id', resumeId).single()) as unknown as {
      raw_text: string;
      candidate_id: string;
      candidates: { full_name: string | null; email: string | null; phone: string | null };
    };
  const person = resume.candidates;
  const emailNormalized = normalizeEmail(person.email);
  const phoneNormalized = normalizePhone(person.phone);
  must(await db.from('candidates').update({
    email_normalized: emailNormalized,
    phone_normalized: phoneNormalized,
  }).eq('id', resume.candidate_id).select('id'));

  const redacted = redactPersonalDetails(resume.raw_text, {
    fullName: person.full_name, email: person.email, phone: person.phone,
  });
  if (redacted) {
    const [vector] = await embedDocuments([redacted]);
    must(await db.from('resumes').update({
      document_embedding: JSON.stringify(vector),
    }).eq('id', resumeId).select('id'));
  }

  const facts = new Map<string, { sameEmail: boolean; samePhone: boolean; documentSimilarity: number | null }>();
  const factsFor = (id: string) => {
    const entry = facts.get(id) ?? { sameEmail: false, samePhone: false, documentSimilarity: null };
    facts.set(id, entry);
    return entry;
  };

  const contactFilters = [
    emailNormalized ? `email_normalized.eq.${emailNormalized}` : null,
    phoneNormalized ? `phone_normalized.eq.${phoneNormalized}` : null,
  ].filter(Boolean).join(',');
  if (contactFilters) {
    const matches = must(await db.from('candidates')
      .select('id, email_normalized, phone_normalized')
      .neq('id', resume.candidate_id)
      .is('merged_into', null)
      .or(contactFilters)) as { id: string; email_normalized: string | null; phone_normalized: string | null }[];
    for (const match of matches) {
      const entry = factsFor(match.id);
      entry.sameEmail = Boolean(emailNormalized) && match.email_normalized === emailNormalized;
      entry.samePhone = Boolean(phoneNormalized) && match.phone_normalized === phoneNormalized;
    }
  }

  const similar = must(await db.rpc('find_similar_resumes', {
    for_resume: resumeId, min_similarity: DOCUMENT_SIMILARITY_THRESHOLD,
  })) as { candidate_id: string; similarity: number }[];
  for (const match of similar) {
    const entry = factsFor(match.candidate_id);
    entry.documentSimilarity = Math.max(entry.documentSimilarity ?? 0, match.similarity);
  }

  const rows = [...facts.entries()].map(([otherId, fact]) => {
    const [candidate_a, candidate_b] = orderedPair(resume.candidate_id, otherId);
    return { candidate_a, candidate_b, signals: collectSignals(fact) };
  }).filter((row) => row.signals.length > 0);
  if (rows.length === 0) return 0;

  // ignoreDuplicates keeps a recruiter's earlier "not a duplicate" decision.
  must(await db.from('duplicate_suggestions')
    .upsert(rows, { onConflict: 'candidate_a,candidate_b', ignoreDuplicates: true })
    .select('id'));
  return rows.length;
}
```

Email values go into a PostgREST `.or()` filter. Email characters such as commas could break it, but `normalizeEmail` keeps raw input, so **also** reject anything unsafe by adding this line at the start of the `contactFilters` block:

```ts
const isFilterSafe = (value: string) => /^[\w.+@-]+$/.test(value);
```

and use it in the filter:

```ts
const contactFilters = [
  emailNormalized && isFilterSafe(emailNormalized) ? `email_normalized.eq.${emailNormalized}` : null,
  phoneNormalized ? `phone_normalized.eq.${phoneNormalized}` : null,
].filter(Boolean).join(',');
```

- [ ] **Step 4: Run the unit test and confirm it passes**

Run: `npm test -- tests/unit/classify-signals.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the failing integration test**

```ts
// tests/integration/duplicates.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { must } from '@/lib/db';
import { detectDuplicates, orderedPair } from '@/lib/duplicates/detect';
import { decideSuggestion } from '@/lib/duplicates/decide';
import {
  cleanTestData, createApplication, createCandidate, createJob, db, fixtureResume, testRecruiterId,
} from '../helpers/fixtures';

async function suggestionFor(a: string, b: string) {
  const [candidate_a, candidate_b] = orderedPair(a, b);
  return must(await db.from('duplicate_suggestions').select('*')
    .eq('candidate_a', candidate_a).eq('candidate_b', candidate_b).maybeSingle()) as
    { id: string; status: string; signals: { type: string }[] } | null;
}
const mergedInto = async (id: string) => (must(await db.from('candidates')
  .select('merged_into').eq('id', id).single()) as { merged_into: string | null }).merged_into;

describe.runIf(process.env.RUN_DB_TESTS)('duplicate detection and merging', () => {
  let recruiter: string;
  beforeAll(async () => {
    await cleanTestData();
    recruiter = await testRecruiterId();
  });
  afterAll(cleanTestData);

  it('suggests a match on a differently written phone number, and merges nothing', async () => {
    const a = await createCandidate({ fullName: 'A One', emailLocal: 'a.dup', phone: '+92 300 1112233', rawText: 'Sold shoes.' });
    const b = await createCandidate({ fullName: 'A Two', emailLocal: 'b.dup', phone: '0300-1112233', rawText: 'Wrote compilers.' });
    await detectDuplicates(db, a.resumeId);
    await detectDuplicates(db, b.resumeId);
    const suggestion = await suggestionFor(a.candidateId, b.candidateId);
    expect(suggestion?.status).toBe('pending');
    expect(suggestion?.signals.map((s) => s.type)).toContain('same_phone');
    expect(await mergedInto(a.candidateId)).toBeNull();
    expect(await mergedInto(b.candidateId)).toBeNull();
  });

  it('suggests a match on the same resume under different contact details', async () => {
    const rawText = fixtureResume('exact-wording');
    const a = await createCandidate({ fullName: 'Bilal Sheikh', emailLocal: 'c.dup', rawText });
    const b = await createCandidate({ fullName: 'B Sheikh', emailLocal: 'd.dup', rawText });
    await detectDuplicates(db, a.resumeId);
    await detectDuplicates(db, b.resumeId);
    const suggestion = await suggestionFor(a.candidateId, b.candidateId);
    expect(suggestion?.signals.map((s) => s.type)).toContain('similar_resume');
  });

  it('does not suggest different people with different resumes', async () => {
    const a = await createCandidate({ fullName: 'E', emailLocal: 'e.dup', rawText: fixtureResume('unrelated') });
    const b = await createCandidate({ fullName: 'F', emailLocal: 'f.dup', rawText: fixtureResume('different-wording') });
    await detectDuplicates(db, a.resumeId);
    await detectDuplicates(db, b.resumeId);
    expect(await suggestionFor(a.candidateId, b.candidateId)).toBeNull();
  });

  async function pendingPair(key: string) {
    const phone = `+92 301 ${String(Math.floor(1000000 + Math.random() * 8999999))}`;
    const a = await createCandidate({ fullName: `${key}1`, emailLocal: `${key}1.dup`, phone, rawText: `${key} first` });
    const b = await createCandidate({ fullName: `${key}2`, emailLocal: `${key}2.dup`, phone, rawText: `${key} second` });
    await detectDuplicates(db, a.resumeId);
    await detectDuplicates(db, b.resumeId);
    const suggestion = await suggestionFor(a.candidateId, b.candidateId);
    return { a, b, suggestionId: suggestion!.id };
  }

  it('a dismissed suggestion stays dismissed and merges nothing', async () => {
    const { a, b, suggestionId } = await pendingPair('dismiss');
    await decideSuggestion(db, suggestionId, { action: 'dismiss' }, recruiter);
    await detectDuplicates(db, b.resumeId);
    expect((await suggestionFor(a.candidateId, b.candidateId))?.status).toBe('dismissed');
    expect(await mergedInto(b.candidateId)).toBeNull();
  });

  it('merges on approval, moves records, and logs everything', async () => {
    const { a, b, suggestionId } = await pendingPair('merge');
    const shared = await createJob('Shared', 'x', []);
    const only = await createJob('Only', 'x', []);
    const keptShared = await createApplication(shared, a.candidateId, 'submitted');
    const conflict = await createApplication(shared, b.candidateId, 'submitted');
    const moved = await createApplication(only, b.candidateId, 'shortlisted');

    await decideSuggestion(db, suggestionId, { action: 'merge', keepCandidateId: a.candidateId }, recruiter);

    expect(await mergedInto(b.candidateId)).toBe(a.candidateId);
    const apps = must(await db.from('applications').select('id, candidate_id, status')
      .in('id', [keptShared, conflict, moved])) as { id: string; candidate_id: string; status: string }[];
    const byId = Object.fromEntries(apps.map((row) => [row.id, row]));
    expect(byId[moved].candidate_id).toBe(a.candidateId);
    expect(byId[moved].status).toBe('shortlisted');
    expect(byId[conflict].candidate_id).toBe(b.candidateId);
    const resumes = must(await db.from('resumes').select('id').eq('candidate_id', a.candidateId)) as unknown[];
    expect(resumes).toHaveLength(2);
    const [log] = must(await db.from('candidate_merge_log').select('*')
      .eq('suggestion_id', suggestionId)) as {
        merged_by: string; moved_application_ids: string[]; conflicting_application_ids: string[];
      }[];
    expect(log.merged_by).toBe(recruiter);
    expect(log.moved_application_ids).toEqual([moved]);
    expect(log.conflicting_application_ids).toEqual([conflict]);
  });

  it('cannot decide the same suggestion twice', async () => {
    const { a, suggestionId } = await pendingPair('twice');
    await decideSuggestion(db, suggestionId, { action: 'merge', keepCandidateId: a.candidateId }, recruiter);
    await expect(decideSuggestion(db, suggestionId, { action: 'merge', keepCandidateId: a.candidateId }, recruiter))
      .rejects.toMatchObject({ status: 409 });
  });

  it('refuses a merge request from someone who is not a recruiter', async () => {
    const { a, suggestionId } = await pendingPair('notrec');
    const { error } = await db.rpc('merge_candidates', {
      p_suggestion: suggestionId, p_keep: a.candidateId,
      p_recruiter: '00000000-0000-4000-8000-000000000000',
    });
    expect(error?.message).toMatch(/Only a recruiter/);
    expect(await mergedInto(a.candidateId)).toBeNull();
  });

  it('merging keeps both candidates out of nothing: search skips the merged record', async () => {
    const { a, b, suggestionId } = await pendingPair('search');
    await decideSuggestion(db, suggestionId, { action: 'merge', keepCandidateId: a.candidateId }, recruiter);
    const row = must(await db.from('candidates').select('merged_into').eq('id', b.candidateId).single()) as { merged_into: string };
    expect(row.merged_into).toBe(a.candidateId);
  });
});
```

- [ ] **Step 6: Write the decision logic and run the tests**

```ts
// lib/duplicates/decide.ts
import 'server-only';
import { must, type Db } from '@/lib/db';
import { HttpError } from '@/lib/http';

export type Decision =
  | { action: 'merge'; keepCandidateId: string }
  | { action: 'dismiss' };

/** The only caller of merge_candidates. A recruiter's request is the only way a merge starts. */
export async function decideSuggestion(
  db: Db,
  suggestionId: string,
  decision: Decision,
  recruiterId: string,
) {
  if (decision.action === 'dismiss') {
    const rows = must(await db.from('duplicate_suggestions').update({
      status: 'dismissed', decided_by: recruiterId, decided_at: new Date().toISOString(),
    }).eq('id', suggestionId).eq('status', 'pending').select('id')) as { id: string }[];
    if (rows.length === 0) throw new HttpError(409, 'This suggestion was already decided.');
    return { status: 'dismissed' };
  }

  const { error } = await db.rpc('merge_candidates', {
    p_suggestion: suggestionId,
    p_keep: decision.keepCandidateId,
    p_recruiter: recruiterId,
  });
  if (error) {
    if (/already decided/.test(error.message)) throw new HttpError(409, 'This suggestion was already decided.');
    if (/not found|must be part/.test(error.message)) throw new HttpError(400, 'This merge request is not valid.');
    throw new Error(error.message);
  }
  return { status: 'merged' };
}
```

Run: `npm run test:db -- tests/integration/duplicates.test.ts`
Expected: PASS, 8 tests.

If the "same resume" or "different people" test fails, print the similarities, set `DOCUMENT_SIMILARITY_THRESHOLD` between the two, and report the values. Identical resume text can score just below 1 after redaction because the names differ.

- [ ] **Step 7: Call detection after resume saves**

In Module 4, after `indexResume`:

```ts
import { detectDuplicates } from '@/lib/duplicates/detect';

await detectDuplicates(db, resume.id).catch((error) => {
  console.error('Duplicate detection failed', { resumeId: resume.id, error });
});
```

- [ ] **Step 8: Confirm nothing else merges**

```bash
git grep -nE "merge_candidates|merged_into" -- lib app
```

Expected: a write or merge call appears only in `lib/duplicates/decide.ts`. `lib/auth/current-candidate.ts` and `lib/duplicates/detect.ts` may only **read** `merged_into`.

- [ ] **Step 9: Commit**

```bash
git add lib/duplicates/detect.ts lib/duplicates/decide.ts tests/unit/classify-signals.test.ts tests/integration/duplicates.test.ts
git add <Module 4 save-step path>
git commit -m "feat: detect likely duplicate candidates and merge only on approval"
```

---

## Task 7: Duplicate review route and screen

Load the `frontend-design` skill first.

**Files:**
- Create: `app/api/recruiter/duplicates/route.ts`, `app/api/recruiter/duplicates/[id]/route.ts`
- Create: `app/recruiter/duplicates/page.tsx`, `components/compare/duplicates.module.css`
- Modify: the recruiter navigation
- Test: `tests/unit/duplicates-route.test.ts`

- [ ] **Step 1: Write the failing route tests**

```ts
// tests/unit/duplicates-route.test.ts
import { beforeEach, expect, it, vi } from 'vitest';
import { HttpError } from '@/lib/http';

vi.mock('@/lib/auth/require-role', () => ({ requireRole: vi.fn() }));
vi.mock('@/lib/db', () => ({ serviceDb: vi.fn(() => 'db'), must: vi.fn() }));
vi.mock('@/lib/duplicates/decide', () => ({ decideSuggestion: vi.fn() }));

import { requireRole } from '@/lib/auth/require-role';
import { decideSuggestion } from '@/lib/duplicates/decide';
import { POST } from '@/app/api/recruiter/duplicates/[id]/route';

const ID = '11111111-1111-4111-8111-111111111111';
const KEEP = '22222222-2222-4222-8222-222222222222';
const ctx = { params: Promise.resolve({ id: ID }) };
const post = (body: unknown) =>
  new Request('http://test.local', { method: 'POST', body: JSON.stringify(body) });

beforeEach(() => vi.clearAllMocks());

it('blocks candidates before anything can merge', async () => {
  vi.mocked(requireRole).mockRejectedValue(new HttpError(403, 'Forbidden'));
  const response = await POST(post({ action: 'merge', keepCandidateId: KEEP }), ctx);
  expect(response.status).toBe(403);
  expect(decideSuggestion).not.toHaveBeenCalled();
});

it('refuses a merge that does not name who to keep', async () => {
  vi.mocked(requireRole).mockResolvedValue({ userId: 'u1' });
  const response = await POST(post({ action: 'merge' }), ctx);
  expect(response.status).toBe(400);
  expect(decideSuggestion).not.toHaveBeenCalled();
});

it('passes the signed-in recruiter, not one from the request', async () => {
  vi.mocked(requireRole).mockResolvedValue({ userId: 'real-recruiter' });
  await POST(post({ action: 'merge', keepCandidateId: KEEP, recruiterId: 'spoofed' }), ctx);
  expect(decideSuggestion).toHaveBeenCalledWith(
    'db', ID, { action: 'merge', keepCandidateId: KEEP }, 'real-recruiter',
  );
});

it('allows a dismissal', async () => {
  vi.mocked(requireRole).mockResolvedValue({ userId: 'u1' });
  const response = await POST(post({ action: 'dismiss' }), ctx);
  expect(response.status).toBe(200);
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npm test -- tests/unit/duplicates-route.test.ts`
Expected: FAIL, cannot resolve the route.

- [ ] **Step 3: Write the routes**

```ts
// app/api/recruiter/duplicates/[id]/route.ts
import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-role';
import { serviceDb } from '@/lib/db';
import { decideSuggestion } from '@/lib/duplicates/decide';
import { route } from '@/lib/http';

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('merge'), keepCandidateId: z.string().uuid() }),
  z.object({ action: z.literal('dismiss') }),
]);

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  const { userId } = await requireRole('recruiter');
  const { id } = await ctx.params;
  const suggestionId = z.string().uuid().parse(id);
  return decideSuggestion(serviceDb(), suggestionId, bodySchema.parse(await req.json()), userId);
});
```

```ts
// app/api/recruiter/duplicates/route.ts
import { requireRole } from '@/lib/auth/require-role';
import { must, serviceDb } from '@/lib/db';
import { route } from '@/lib/http';

const PERSON = 'id, full_name, email, phone, applications(id, status, jobs(title))';

export const GET = route(async () => {
  await requireRole('recruiter');
  const suggestions = must(await serviceDb().from('duplicate_suggestions')
    .select(`id, signals, created_at,
      a:candidates!duplicate_suggestions_candidate_a_fkey(${PERSON}),
      b:candidates!duplicate_suggestions_candidate_b_fkey(${PERSON})`)
    .eq('status', 'pending')
    .order('created_at', { ascending: false }));
  return { suggestions };
});
```

- [ ] **Step 4: Run them and confirm they pass**

Run: `npm test -- tests/unit/duplicates-route.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the page**

The recruiter must look at both records and choose which to keep. There is no one-click merge and no default choice.

```tsx
// app/recruiter/duplicates/page.tsx
'use client';

import { useEffect, useState } from 'react';
import styles from '@/components/compare/duplicates.module.css';

type Person = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  applications: { id: string; status: string; jobs: { title: string } }[];
};
type Suggestion = { id: string; signals: { type: string; label: string }[]; a: Person; b: Person };

function PersonColumn({ person, name, keep, onKeep }: {
  person: Person;
  name: string;
  keep: string | null;
  onKeep: (id: string) => void;
}) {
  return (
    <div className={styles.person}>
      <p className={styles.name}>{person.full_name ?? 'Name not found in resume'}</p>
      <p className={styles.meta}>{person.email ?? 'No email on file'}</p>
      <p className={styles.meta}>{person.phone ?? 'No phone on file'}</p>
      <ul className={styles.apps}>
        {person.applications.length === 0 && <li className={styles.meta}>No applications</li>}
        {person.applications.map((application) => (
          <li key={application.id} className={styles.meta}>
            {application.jobs.title}: {application.status.replace(/_/g, ' ')}
          </li>
        ))}
      </ul>
      <label className={styles.keep}>
        <input type="radio" name={name} checked={keep === person.id} onChange={() => onKeep(person.id)} />{' '}
        Keep this record
      </label>
    </div>
  );
}

function SuggestionRow({ suggestion, onDecided }: { suggestion: Suggestion; onDecided: () => void }) {
  const [keep, setKeep] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(body: object) {
    setWorking(true);
    setError(null);
    const response = await fetch(`/api/recruiter/duplicates/${suggestion.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setWorking(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? 'That was not saved. Please try again.');
      return;
    }
    onDecided();
  }

  const merged = keep === suggestion.a.id ? suggestion.b : suggestion.a;

  return (
    <li className={styles.row}>
      <p className={styles.signals}>Why flagged: {suggestion.signals.map((s) => s.label).join(' · ')}</p>
      <div className={styles.people}>
        <PersonColumn person={suggestion.a} name={suggestion.id} keep={keep} onKeep={setKeep} />
        <PersonColumn person={suggestion.b} name={suggestion.id} keep={keep} onKeep={setKeep} />
      </div>
      {error && <p role="alert" className={styles.alert}>{error}</p>}
      {confirming && keep ? (
        <div className={styles.actions}>
          <p className={styles.meta}>
            {merged.full_name ?? 'The other record'}&apos;s resumes and applications will move to the kept record.
            If both applied to the same job, both applications stay and are listed in the merge log.
          </p>
          <button type="button" disabled={working} onClick={() => decide({ action: 'merge', keepCandidateId: keep })}>
            {working ? 'Merging…' : 'Confirm merge'}
          </button>
          <button type="button" disabled={working} onClick={() => setConfirming(false)}>Go back</button>
        </div>
      ) : (
        <div className={styles.actions}>
          <button type="button" disabled={!keep || working} onClick={() => setConfirming(true)}>Merge records</button>
          <button type="button" disabled={working} onClick={() => decide({ action: 'dismiss' })}>Not a duplicate</button>
          {!keep && <span className={styles.meta}>Choose which record to keep before merging.</span>}
        </div>
      )}
    </li>
  );
}

export default function DuplicatesPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const response = await fetch('/api/recruiter/duplicates');
      if (!response.ok) throw new Error();
      setSuggestions((await response.json()).suggestions);
    } catch {
      setError('Possible duplicates could not load. Reload to try again.');
    }
  }
  useEffect(() => { load(); }, []);

  return (
    <main>
      <h1>Possible duplicates</h1>
      <p className={styles.meta}>Nothing merges unless you approve it here.</p>
      {error && <p role="alert" className={styles.alert}>{error}</p>}
      {!suggestions && !error && <p className={styles.meta}>Loading…</p>}
      {suggestions?.length === 0 && <p className={styles.meta}>No possible duplicates to review.</p>}
      <ul className={styles.list}>
        {suggestions?.map((suggestion) => (
          <SuggestionRow key={suggestion.id} suggestion={suggestion} onDecided={load} />
        ))}
      </ul>
    </main>
  );
}
```

```css
/* components/compare/duplicates.module.css */
.list { list-style: none; margin: 0; padding: 0; }
.row { padding: 20px 0; border-top: 1px solid var(--hairline); }
.signals { margin: 0 0 12px; color: var(--color-liquid-mist); }
.people { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; }
.person { min-width: 0; overflow-wrap: anywhere; }
.name { margin: 0 0 4px; color: var(--color-platinum); }
.meta { margin: 4px 0; color: var(--color-silver-mist); font-size: 14px; }
.apps { list-style: none; margin: 8px 0; padding: 0; }
.keep { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; }
.alert { color: var(--color-coral); }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; }
.actions p { flex-basis: 100%; }
.actions button { min-height: 44px; padding: 0 14px; }
```

- [ ] **Step 6: Add it to the recruiter navigation**

Add `Possible duplicates` → `/recruiter/duplicates` to the recruiter navigation only.

- [ ] **Step 7: Check it in a real browser**

Create two test candidates with the same phone number written differently, and one job application each. As a recruiter:
- Open **Possible duplicates**. The pair shows, with "Same phone number" as the reason. Both candidates are still separate in the database: `merged_into` is empty.
- **Merge records** stays disabled until a record is chosen.
- Click **Merge records** and then **Go back**. Nothing changed.
- Click **Not a duplicate** on one pair. It leaves the list and stays gone after reload. Upload the same resume again. It does not come back.
- Merge another pair. Check the database for moved applications, `merged_into` and a `candidate_merge_log` row with your recruiter id.
- The kept candidate shows both applications, and the merged record no longer appears in talent search.
- Sign in as the merged candidate. Their applications still show, because `lib/auth/current-candidate.ts` follows the merge. Check Module 6's candidate routes use `currentCandidateId`, and update any that look up the candidate directly:

```bash
git grep -n "from('candidates')" -- app/api/candidate lib
```

- A candidate session gets 403 from both duplicate routes.
- It reads properly at 375px, with no sideways page scroll.

- [ ] **Step 8: Commit**

```bash
git add app/api/recruiter/duplicates app/recruiter/duplicates components/compare/duplicates.module.css tests/unit/duplicates-route.test.ts
git add <recruiter navigation path and any updated candidate routes>
git commit -m "feat: add recruiter review screen for possible duplicates"
```

---

## Task 8: Final checks and push

- [ ] **Step 1: Run everything**

Run: `npm test`, `npx tsc --noEmit` and `npm run test:db`
Expected: all PASS.

- [ ] **Step 2: Confirm test rows were cleaned up**

```sql
select count(*) from candidates where email like '%@test.invalid';
select count(*) from jobs where title like '[test]%';
```

Expected: `0` and `0`, using the `supabase-riphah` server.

- [ ] **Step 3: Push and wait for the deploy**

```bash
git push origin main
```

Wait until the live site serves this commit.

- [ ] **Step 4: Repeat the checks on the live URL, then rerun the demo**

Repeat Task 3, Step 3 and Task 7, Step 7 on the live URL. Then rerun the full `REQUIREMENTS.md` section 2 demo.

- [ ] **Step 5: Report**

State the commit and branch pushed, anything still local, the live URL, the test accounts and the clicks to see each feature, and who can see it: recruiters only.

---

## Decisions to confirm at handoff

- **A merge has no undo button.** `candidate_merge_log` records everything needed to reverse one by hand. An undo screen is left out to keep this module small.
- **If both records applied to the same job, both applications stay.** The merged record's application stays attached to it and is listed in the log, so no recruiter's work is lost.
- **Names are not a duplicate signal**, because two different people can share one.
