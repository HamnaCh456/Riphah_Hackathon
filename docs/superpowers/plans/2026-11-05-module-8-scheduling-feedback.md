# Module 8: Interview Scheduling & Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A recruiter schedules an interview, sees all interviews and any clashes on one screen, records structured feedback, and records the final hire decision. The candidate sees their interview and the decision, but never the feedback.

**Done when (REQUIREMENTS.md section 6):** A double-booked interviewer gets flagged.

**Architecture:** Conflict checking is a plain tested function, used both when saving and when showing the schedule. A clash is a warning the recruiter can knowingly override, not a block. Status changes go through module 6's `changeApplicationStatus`, so they land in the audit trail. Notifications are database rows shown in the app, clearly labelled as simulated.

**Tech Stack:** Next.js Server Actions, Supabase Postgres, zod, vitest, Playwright. No AI in this module.

**Depends on:** [2026-11-05-modules-7-9-prerequisites.md](2026-11-05-modules-7-9-prerequisites.md). Before writing any UI, load the `frontend-design` skill.

**Commits:** Stage explicit paths only. Never stage `docs/superpowers/plans/`, because plans stay uncommitted.

---

## Decisions in this plan

| Question | Decision | Why |
|---|---|---|
| Is a clash blocked? | No. It's flagged, and the recruiter must choose "Schedule anyway" | The brief says "flag", and humans decide |
| What counts as a clash? | Overlapping time for the same interviewer or the same candidate | 10:00–11:00 then 11:00–12:00 is fine |
| Who is an interviewer? | A named person in a small per-recruiter list, with no login | Free-typed names miss "Ali" vs "Ali Khan". The demo has one recruiter. |
| Who enters feedback? | The recruiter, on the interviewer's behalf | Interviewers have no login |
| Can feedback be saved before the interview time? | Yes | Otherwise the demo can't show feedback without waiting |
| Who can record a decision? | Only the recruiter who owns the job | This is the brief's "authorized recruiters" |
| Is feedback required before a decision? | No, but the recruiter must confirm if there is none | Warns without taking the decision away |
| Time zone? | All times are Pakistan time (PKT, no daylight saving) and labelled | Vercel servers run in UTC, so unlabelled times would shift by 5 hours |
| Added beyond the brief | Reschedule and cancel | Without them, a recruiter who sees a clash has no way to fix it |

## Who sees what

| Data | Owning recruiter | Candidate |
|---|---|---|
| Date, time, interview type, status | Yes | Yes |
| Interviewer name, conflict flags | Yes | No |
| Feedback, ratings | Yes | No |
| Final decision | Yes | Yes |
| Reason for decision | Yes | No |

## Files

| File | Job |
|---|---|
| `supabase/migrations/20261105080000_interviews.sql` | Interviewers, interviews, feedback, notifications |
| `lib/interviews/time.ts` | PKT parsing and display, time slot list |
| `lib/interviews/conflicts.ts` | Clash detection |
| `lib/interviews/schemas.ts` | Form validation |
| `lib/interviews/candidate-view.ts` | The only code that reads interview data for candidates |
| `app/recruiter/interviews/actions.ts` | Save, cancel, feedback, decision |
| `app/recruiter/interviews/page.tsx` | The schedule |
| `app/recruiter/applications/[id]/interview/page.tsx` | One applicant's interviews, feedback and decision |
| `app/recruiter/applications/[id]/interview/ScheduleDialog.tsx` | Schedule and reschedule |
| `app/recruiter/applications/[id]/interview/FeedbackDialog.tsx` | Feedback form |
| `app/recruiter/applications/[id]/interview/InterviewRowActions.tsx` | Row buttons |
| `app/recruiter/applications/[id]/interview/DecisionControl.tsx` | Final decision |
| `app/recruiter/interviews/interviews.module.css` | Shared styles |
| `tests/interviews/*.test.ts`, `e2e/scheduling.spec.ts` | Tests |

---

### Task 0: Check the prerequisites

- [ ] **Step 1: Confirm the database target.** Read `.env` and confirm `SUPABASE-URL` contains `lbxozdqgboubbyvzgquz`. Stop if it doesn't.
- [ ] **Step 2: Compare the prerequisites file with the code.** Confirm these exist with the listed signatures: `db`, `requireRecruiter`, `requireCandidate`, `getOwnedApplication`, `changeApplicationStatus`, and the UI pieces `Button`, `Select`, `DatePicker`, `Dialog` and `useToast`. Confirm `changeApplicationStatus` allows shortlisted→interview, interview→selected and interview→rejected. If a name differs, update this plan's code to the real name. If something is missing, name it as a blocker in one line and stop.

### Task 1: Tables

**Files:**
- Create: `supabase/migrations/20261105080000_interviews.sql`

- [ ] **Step 1: Write the migration**

```sql
create table interviewers (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references profiles(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);
create unique index interviewers_unique_name on interviewers (recruiter_id, lower(trim(name)));

create table interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  -- Copied from the application so conflict queries need no joins.
  candidate_id uuid not null references profiles(id),
  recruiter_id uuid not null references profiles(id),
  interviewer_id uuid not null references interviewers(id),
  type text not null check (type in ('phone_screen', 'technical', 'hr', 'final')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  conflict_acknowledged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index interviews_interviewer_time_idx on interviews (interviewer_id, starts_at);
create index interviews_candidate_time_idx on interviews (candidate_id, starts_at);
create index interviews_recruiter_time_idx on interviews (recruiter_id, starts_at);
create index interviews_application_idx on interviews (application_id);

create table interview_feedback (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null unique references interviews(id) on delete cascade,
  technical_skill int not null check (technical_skill between 1 and 5),
  problem_solving int not null check (problem_solving between 1 and 5),
  communication int not null check (communication between 1 and 5),
  job_knowledge int not null check (job_knowledge between 1 and 5),
  recommendation text not null check (recommendation in ('advance', 'hold', 'do_not_advance')),
  strengths text not null default '',
  concerns text not null default '',
  recorded_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, created_at desc);

-- Server-only tables: no policies, so the browser can never read them directly.
alter table interviewers enable row level security;
alter table interviews enable row level security;
alter table interview_feedback enable row level security;
alter table notifications enable row level security;
```

- [ ] **Step 2: Apply it to the right project.** Use `supabase-riphah` or the Supabase CLI linked to `lbxozdqgboubbyvzgquz`. Never the `supabase` MCP server.

- [ ] **Step 3: Confirm it exists.** Run `select count(*) from interviews;`. Expected: `0`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261105080000_interviews.sql
git commit -m "feat(interviews): add interviews, feedback and notifications tables" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: Time handling

**Files:**
- Create: `lib/interviews/time.ts`
- Test: `tests/interviews/time.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/interviews/time.test.ts
import { describe, expect, it } from 'vitest';
import { addMinutes, formatDay, formatTimeRange, parsePkt, TIME_SLOTS, toPktFields } from '@/lib/interviews/time';

describe('parsePkt', () => {
  it('reads date and time as Pakistan time', () => {
    expect(parsePkt('2026-11-10', '10:00').toISOString()).toBe('2026-11-10T05:00:00.000Z');
  });
  it('rejects a date that does not exist', () => {
    expect(() => parsePkt('2026-02-31', '10:00')).toThrow();
  });
  it('rejects a badly formed time', () => {
    expect(() => parsePkt('2026-11-10', '25:00')).toThrow();
  });
});

describe('formatting', () => {
  it('shows a UTC time as Pakistan time regardless of the server zone', () => {
    expect(formatTimeRange('2026-11-10T05:00:00Z', '2026-11-10T06:00:00Z')).toBe('10:00 – 11:00 PKT');
    expect(formatDay('2026-11-10T20:00:00Z')).toBe('Wed, 11 Nov 2026');
  });
  it('turns a stored time back into form fields', () => {
    expect(toPktFields('2026-11-10T05:15:00Z')).toEqual({ date: '2026-11-10', time: '10:15' });
  });
});

describe('addMinutes', () => {
  it('adds a duration', () => {
    expect(addMinutes(new Date('2026-11-10T05:00:00Z'), 45).toISOString()).toBe('2026-11-10T05:45:00.000Z');
  });
});

describe('TIME_SLOTS', () => {
  it('runs every 15 minutes from 08:00 to 20:00', () => {
    expect(TIME_SLOTS[0]).toBe('08:00');
    expect(TIME_SLOTS[1]).toBe('08:15');
    expect(TIME_SLOTS.at(-1)).toBe('20:00');
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run tests/interviews/time.test.ts`
Expected: FAIL, because `time` can't be found.

- [ ] **Step 3: Write the code**

```ts
// lib/interviews/time.ts
const ZONE = 'Asia/Karachi';

export function parsePkt(date: string, time: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error('Invalid date or time');
  }
  const parsed = new Date(`${date}T${time}:00+05:00`);
  // new Date rolls 31 Feb into March, so check the date survived unchanged.
  if (Number.isNaN(parsed.getTime()) || toPktFields(parsed.toISOString()).date !== date) {
    throw new Error('Invalid date or time');
  }
  return parsed;
}

export function addMinutes(start: Date, minutes: number): Date {
  return new Date(start.getTime() + minutes * 60_000);
}

export function toPktFields(iso: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

export function formatTimeRange(startIso: string, endIso: string): string {
  return `${toPktFields(startIso).time} – ${toPktFields(endIso).time} PKT`;
}

export function formatDay(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('weekday')}, ${get('day')} ${get('month')} ${get('year')}`;
}

export const TIME_SLOTS: string[] = Array.from({ length: 49 }, (_, i) => {
  const minutes = 8 * 60 + i * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npx vitest run tests/interviews/time.test.ts`
Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/interviews/time.ts tests/interviews/time.test.ts
git commit -m "feat(interviews): handle interview times in Pakistan time" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: Conflict detection

This is the module's "done when" logic.

**Files:**
- Create: `lib/interviews/conflicts.ts`
- Test: `tests/interviews/conflicts.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/interviews/conflicts.test.ts
import { describe, expect, it } from 'vitest';
import { findConflicts, flagConflicts, type Slot } from '@/lib/interviews/conflicts';

const slot = (id: string, start: string, end: string, over: Partial<Slot> = {}): Slot => ({
  id, interviewerId: 'ali', candidateId: id, status: 'scheduled',
  startsAt: `2026-11-10T${start}:00Z`, endsAt: `2026-11-10T${end}:00Z`, ...over,
});

describe('findConflicts', () => {
  const booked = slot('a', '10:00', '11:00', { candidateId: 'c1' });

  it('flags the same interviewer at an overlapping time', () => {
    expect(findConflicts(slot('b', '10:30', '11:30'), [booked]))
      .toEqual([{ type: 'interviewer', withId: 'a' }]);
  });

  it('flags an interview fully inside another', () => {
    expect(findConflicts(slot('b', '10:15', '10:45'), [booked])).toHaveLength(1);
  });

  it('flags the same candidate with a different interviewer', () => {
    expect(findConflicts(slot('b', '10:30', '11:30', { interviewerId: 'sara', candidateId: 'c1' }), [booked]))
      .toEqual([{ type: 'candidate', withId: 'a' }]);
  });

  it('reports both when interviewer and candidate both clash', () => {
    expect(findConflicts(slot('b', '10:30', '11:30', { candidateId: 'c1' }), [booked])).toHaveLength(2);
  });

  it('allows back-to-back interviews', () => {
    expect(findConflicts(slot('b', '11:00', '12:00'), [booked])).toEqual([]);
    expect(findConflicts(slot('b', '09:00', '10:00'), [booked])).toEqual([]);
  });

  it('allows different people at the same time', () => {
    expect(findConflicts(slot('b', '10:00', '11:00', { interviewerId: 'sara' }), [booked])).toEqual([]);
  });

  it('ignores cancelled interviews', () => {
    expect(findConflicts(slot('b', '10:30', '11:30'), [{ ...booked, status: 'cancelled' }])).toEqual([]);
  });

  it('does not clash with itself when rescheduling', () => {
    expect(findConflicts(slot('a', '10:30', '11:30'), [booked])).toEqual([]);
  });

  it('compares times correctly when stored in different formats', () => {
    const other = { ...booked, startsAt: '2026-11-10T15:00:00+05:00', endsAt: '2026-11-10T16:00:00+05:00' };
    expect(findConflicts(slot('b', '10:30', '11:30'), [other])).toHaveLength(1);
  });
});

describe('flagConflicts', () => {
  it('flags both interviews in a clash and leaves others alone', () => {
    const flagged = flagConflicts([
      slot('a', '10:00', '11:00'), slot('b', '10:30', '11:30'), slot('c', '14:00', '15:00'),
    ]);
    expect(flagged.get('a')).toHaveLength(1);
    expect(flagged.get('b')).toHaveLength(1);
    expect(flagged.get('c')).toBeUndefined();
  });

  it('does not flag a cancelled interview', () => {
    const flagged = flagConflicts([
      slot('a', '10:00', '11:00'), slot('b', '10:30', '11:30', { status: 'cancelled' }),
    ]);
    expect(flagged.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run tests/interviews/conflicts.test.ts`
Expected: FAIL, because `conflicts` can't be found.

- [ ] **Step 3: Write the code**

```ts
// lib/interviews/conflicts.ts
export type Slot = {
  id: string;
  interviewerId: string;
  candidateId: string;
  startsAt: string;
  endsAt: string;
  status: 'scheduled' | 'completed' | 'cancelled';
};

export type Conflict = { type: 'interviewer' | 'candidate'; withId: string };

function overlaps(a: Slot, b: Slot): boolean {
  return Date.parse(a.startsAt) < Date.parse(b.endsAt) && Date.parse(b.startsAt) < Date.parse(a.endsAt);
}

export function findConflicts(target: Slot, others: Slot[]): Conflict[] {
  if (target.status === 'cancelled') return [];
  const conflicts: Conflict[] = [];
  for (const other of others) {
    if (other.id === target.id || other.status === 'cancelled' || !overlaps(target, other)) continue;
    if (other.interviewerId === target.interviewerId) conflicts.push({ type: 'interviewer', withId: other.id });
    if (other.candidateId === target.candidateId) conflicts.push({ type: 'candidate', withId: other.id });
  }
  return conflicts;
}

export function flagConflicts(slots: Slot[]): Map<string, Conflict[]> {
  const flagged = new Map<string, Conflict[]>();
  for (const slot of slots) {
    const conflicts = findConflicts(slot, slots);
    if (conflicts.length) flagged.set(slot.id, conflicts);
  }
  return flagged;
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npx vitest run tests/interviews/conflicts.test.ts`
Expected: 11 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/interviews/conflicts.ts tests/interviews/conflicts.test.ts
git commit -m "feat(interviews): detect interviewer and candidate clashes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 4: Form validation

**Files:**
- Create: `lib/interviews/schemas.ts`
- Test: `tests/interviews/schemas.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/interviews/schemas.test.ts
import { describe, expect, it } from 'vitest';
import { decisionSchema, feedbackSchema, scheduleSchema } from '@/lib/interviews/schemas';

const schedule = {
  applicationId: '3f2b1c9e-8a4d-4f6b-9c1e-2d3a4b5c6d7e', interviewId: null,
  interviewerId: '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  type: 'technical', date: '2026-11-10', time: '10:00', durationMinutes: 60, acknowledgeConflict: false,
};

describe('scheduleSchema', () => {
  it('accepts a complete form', () => {
    expect(scheduleSchema.safeParse(schedule).success).toBe(true);
  });
  it('rejects a duration not on the list', () => {
    expect(scheduleSchema.safeParse({ ...schedule, durationMinutes: 5000 }).success).toBe(false);
  });
  it('names the missing interviewer field', () => {
    const result = scheduleSchema.safeParse({ ...schedule, interviewerId: '' });
    expect(result.error?.issues[0].message).toBe('Choose an interviewer');
  });
});

const feedback = {
  interviewId: schedule.interviewerId, technical_skill: 4, problem_solving: 3, communication: 5,
  job_knowledge: 4, recommendation: 'advance', strengths: 'Clear API design', concerns: '',
};

describe('feedbackSchema', () => {
  it('accepts a complete form with empty optional text', () => {
    expect(feedbackSchema.safeParse(feedback).success).toBe(true);
  });
  it('rejects a rating outside 1 to 5', () => {
    expect(feedbackSchema.safeParse({ ...feedback, communication: 6 }).success).toBe(false);
  });
  it('requires a recommendation', () => {
    expect(feedbackSchema.safeParse({ ...feedback, recommendation: undefined }).success).toBe(false);
  });
});

describe('decisionSchema', () => {
  const decision = { applicationId: schedule.applicationId, decision: 'selected', reason: 'Strong on system design', confirmNoFeedback: false };
  it('accepts selected and rejected', () => {
    expect(decisionSchema.safeParse(decision).success).toBe(true);
    expect(decisionSchema.safeParse({ ...decision, decision: 'rejected' }).success).toBe(true);
  });
  it('rejects any other status', () => {
    expect(decisionSchema.safeParse({ ...decision, decision: 'shortlisted' }).success).toBe(false);
  });
  it('requires a reason', () => {
    expect(decisionSchema.safeParse({ ...decision, reason: '  ' }).error?.issues[0].message).toBe('Add a reason for this decision');
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run tests/interviews/schemas.test.ts`
Expected: FAIL, because `schemas` can't be found.

- [ ] **Step 3: Write the code**

```ts
// lib/interviews/schemas.ts
import { z } from 'zod';

export const INTERVIEW_TYPES = [
  { value: 'phone_screen', label: 'Phone screen' },
  { value: 'technical', label: 'Technical' },
  { value: 'hr', label: 'HR' },
  { value: 'final', label: 'Final' },
] as const;

export const DURATIONS = [30, 45, 60, 90] as const;

export const RECOMMENDATIONS = [
  { value: 'advance', label: 'Advance' },
  { value: 'hold', label: 'Hold' },
  { value: 'do_not_advance', label: 'Do not advance' },
] as const;

// Job-related criteria only: nothing here invites comments on personal characteristics.
export const RATING_CRITERIA = [
  { key: 'technical_skill', label: 'Technical skill' },
  { key: 'problem_solving', label: 'Problem solving' },
  { key: 'communication', label: 'Communication' },
  { key: 'job_knowledge', label: 'Job knowledge' },
] as const;

export const scheduleSchema = z.object({
  applicationId: z.string().uuid(),
  interviewId: z.string().uuid().nullable(),
  interviewerId: z.string().uuid('Choose an interviewer'),
  type: z.enum(['phone_screen', 'technical', 'hr', 'final'], { message: 'Choose an interview type' }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a time'),
  durationMinutes: z.number().refine((n) => (DURATIONS as readonly number[]).includes(n), 'Choose a duration'),
  acknowledgeConflict: z.boolean(),
});
export type ScheduleInput = z.infer<typeof scheduleSchema>;

const rating = z.number({ message: 'Rate every criterion' }).int().min(1, 'Rate every criterion').max(5);

export const feedbackSchema = z.object({
  interviewId: z.string().uuid(),
  technical_skill: rating,
  problem_solving: rating,
  communication: rating,
  job_knowledge: rating,
  recommendation: z.enum(['advance', 'hold', 'do_not_advance'], { message: 'Choose a recommendation' }),
  strengths: z.string().trim().max(2000),
  concerns: z.string().trim().max(2000),
});
export type FeedbackInput = z.infer<typeof feedbackSchema>;

export const decisionSchema = z.object({
  applicationId: z.string().uuid(),
  decision: z.enum(['selected', 'rejected']),
  reason: z.string().trim().min(1, 'Add a reason for this decision').max(2000),
  confirmNoFeedback: z.boolean(),
});
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npx vitest run tests/interviews/schemas.test.ts`
Expected: 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/interviews/schemas.ts tests/interviews/schemas.test.ts
git commit -m "feat(interviews): validate schedule, feedback and decision forms" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5: Server actions

**Files:**
- Create: `app/recruiter/interviews/actions.ts`

- [ ] **Step 1: Write the actions**

Candidate-clash messages deliberately don't name the other interview, because it may belong to another recruiter's job. Notifications never include the decision reason, the interviewer or any feedback.

```ts
// app/recruiter/interviews/actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { getOwnedApplication } from '@/lib/auth/ownership';
import { requireRecruiter } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { findConflicts, type Slot } from '@/lib/interviews/conflicts';
import { decisionSchema, feedbackSchema, scheduleSchema } from '@/lib/interviews/schemas';
import { addMinutes, formatDay, formatTimeRange, parsePkt } from '@/lib/interviews/time';
import { changeApplicationStatus } from '@/lib/pipeline/change-status';

export type ActionResult = { ok: true } | { ok: false; error: string };
export type SaveResult = ActionResult | { ok: false; conflicts: string[] };
export type DecisionResult = ActionResult | { ok: false; needsNoFeedbackConfirm: true };

function refresh(applicationId: string) {
  revalidatePath('/recruiter/interviews');
  revalidatePath(`/recruiter/applications/${applicationId}/interview`);
  revalidatePath('/recruiter/analytics');
  revalidatePath('/candidate/applications');
}

async function notify(userId: string, title: string, body: string) {
  const { error } = await db().from('notifications').insert({ user_id: userId, title, body });
  // A simulated notification failing must not undo the recruiter's real action.
  if (error) console.error('notify', error);
}

function toSlot(row: {
  id: string; interviewer_id: string; candidate_id: string; starts_at: string; ends_at: string; status: Slot['status'];
}): Slot {
  return {
    id: row.id, interviewerId: row.interviewer_id, candidateId: row.candidate_id,
    startsAt: row.starts_at, endsAt: row.ends_at, status: row.status,
  };
}

const SLOT_COLUMNS = 'id, interviewer_id, candidate_id, starts_at, ends_at, status';

export async function addInterviewerAction(rawName: string):
  Promise<{ ok: true; id: string; name: string } | { ok: false; error: string }> {
  const recruiter = await requireRecruiter();
  const name = rawName.trim();
  if (!name || name.length > 120) return { ok: false, error: 'Enter the interviewer’s name' };

  const { data, error } = await db().from('interviewers')
    .insert({ recruiter_id: recruiter.id, name }).select('id, name').single();
  if (error) {
    return { ok: false, error: error.code === '23505' ? `${name} is already on your list` : 'Couldn’t add the interviewer. Try again.' };
  }
  return { ok: true, id: data.id, name: data.name };
}

export async function saveInterviewAction(raw: unknown): Promise<SaveResult> {
  const recruiter = await requireRecruiter();
  const parsed = scheduleSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const input = parsed.data;

  const app = await getOwnedApplication(input.applicationId, recruiter.id);
  if (!app) return { ok: false, error: "You can't schedule interviews for this application." };
  if (app.status !== 'shortlisted' && app.status !== 'interview') {
    return { ok: false, error: 'Shortlist this applicant before scheduling an interview.' };
  }

  // The interviewer must be on this recruiter's own list.
  const { data: interviewer } = await db().from('interviewers').select('id, name')
    .eq('id', input.interviewerId).eq('recruiter_id', recruiter.id).maybeSingle();
  if (!interviewer) return { ok: false, error: 'Choose an interviewer' };

  let start: Date;
  try {
    start = parsePkt(input.date, input.time);
  } catch {
    return { ok: false, error: 'Choose a valid date and time' };
  }
  if (start.getTime() <= Date.now()) return { ok: false, error: 'Choose a date and time in the future' };
  const end = addMinutes(start, input.durationMinutes);

  if (input.interviewId) {
    const { data: existing } = await db().from('interviews').select('id, status')
      .eq('id', input.interviewId).eq('application_id', app.id).maybeSingle();
    if (!existing || existing.status === 'cancelled') return { ok: false, error: 'This interview can’t be changed.' };
  }

  const [byInterviewer, byCandidate] = await Promise.all([
    db().from('interviews').select(SLOT_COLUMNS).eq('interviewer_id', input.interviewerId)
      .neq('status', 'cancelled').lt('starts_at', end.toISOString()).gt('ends_at', start.toISOString()),
    db().from('interviews').select(SLOT_COLUMNS).eq('candidate_id', app.candidateId)
      .neq('status', 'cancelled').lt('starts_at', end.toISOString()).gt('ends_at', start.toISOString()),
  ]);
  if (byInterviewer.error) throw byInterviewer.error;
  if (byCandidate.error) throw byCandidate.error;

  const target: Slot = {
    id: input.interviewId ?? 'new', interviewerId: input.interviewerId, candidateId: app.candidateId,
    startsAt: start.toISOString(), endsAt: end.toISOString(), status: 'scheduled',
  };
  const others = [...(byInterviewer.data ?? []), ...(byCandidate.data ?? [])].map(toSlot);
  const conflicts = findConflicts(target, others);
  const seen = new Set<string>();
  const messages = conflicts
    .map((c) => (c.type === 'interviewer'
      ? `${interviewer.name} already has an interview at this time.`
      : `${app.candidateName} already has an interview at this time.`))
    .filter((m) => (seen.has(m) ? false : (seen.add(m), true)));

  if (messages.length && !input.acknowledgeConflict) return { ok: false, conflicts: messages };

  const fields = {
    interviewer_id: input.interviewerId, type: input.type,
    starts_at: start.toISOString(), ends_at: end.toISOString(),
    conflict_acknowledged: messages.length > 0, updated_at: new Date().toISOString(),
  };

  const saved = input.interviewId
    ? await db().from('interviews').update({ ...fields, status: 'scheduled' }).eq('id', input.interviewId).select('id').single()
    : await db().from('interviews').insert({
        ...fields, application_id: app.id, candidate_id: app.candidateId, recruiter_id: recruiter.id,
      }).select('id').single();
  if (saved.error) return { ok: false, error: 'Couldn’t save the interview. Try again.' };

  if (app.status === 'shortlisted') {
    try {
      await changeApplicationStatus({
        applicationId: app.id, to: 'interview', actorId: recruiter.id, reason: 'Interview scheduled',
      });
    } catch (error) {
      console.error('saveInterviewAction status', error);
      // Don't leave a booked interview on an application still marked shortlisted.
      await db().from('interviews').delete().eq('id', saved.data.id);
      return { ok: false, error: 'Couldn’t update the application status, so the interview wasn’t saved. Try again.' };
    }
  }

  const when = `${formatDay(start.toISOString())}, ${formatTimeRange(start.toISOString(), end.toISOString())}`;
  await notify(app.candidateId,
    input.interviewId ? `Interview moved: ${app.jobTitle}` : `Interview scheduled: ${app.jobTitle}`,
    `Your interview is on ${when}.`);

  refresh(app.id);
  return { ok: true };
}

export async function cancelInterviewAction(interviewId: string): Promise<ActionResult> {
  const recruiter = await requireRecruiter();
  const { data: interview } = await db().from('interviews').select('id, application_id, status, starts_at')
    .eq('id', interviewId).eq('recruiter_id', recruiter.id).maybeSingle();
  if (!interview) return { ok: false, error: "You can't change this interview." };
  if (interview.status !== 'scheduled') return { ok: false, error: 'Only scheduled interviews can be cancelled.' };

  const app = await getOwnedApplication(interview.application_id, recruiter.id);
  if (!app) return { ok: false, error: "You can't change this interview." };

  const { error } = await db().from('interviews')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', interviewId);
  if (error) return { ok: false, error: 'Couldn’t cancel the interview. Try again.' };

  await notify(app.candidateId, `Interview cancelled: ${app.jobTitle}`,
    `Your interview on ${formatDay(interview.starts_at)} was cancelled.`);
  refresh(app.id);
  return { ok: true };
}

export async function saveFeedbackAction(raw: unknown): Promise<ActionResult> {
  const recruiter = await requireRecruiter();
  const parsed = feedbackSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { interviewId, ...fields } = parsed.data;

  const { data: interview } = await db().from('interviews').select('id, application_id, status')
    .eq('id', interviewId).eq('recruiter_id', recruiter.id).maybeSingle();
  if (!interview) return { ok: false, error: "You can't add feedback to this interview." };
  if (interview.status === 'cancelled') return { ok: false, error: 'This interview was cancelled.' };

  const now = new Date().toISOString();
  const { error } = await db().from('interview_feedback').upsert(
    { ...fields, interview_id: interviewId, recorded_by: recruiter.id, updated_at: now },
    { onConflict: 'interview_id' });
  if (error) return { ok: false, error: 'Couldn’t save the feedback. Try again.' };

  const { error: statusError } = await db().from('interviews')
    .update({ status: 'completed', updated_at: now }).eq('id', interviewId);
  if (statusError) return { ok: false, error: 'Feedback saved, but the interview wasn’t marked completed. Try again.' };

  refresh(interview.application_id);
  return { ok: true };
}

export async function recordDecisionAction(raw: unknown): Promise<DecisionResult> {
  const recruiter = await requireRecruiter();
  const parsed = decisionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const input = parsed.data;

  // Authorization: only the recruiter who owns this job gets past here.
  const app = await getOwnedApplication(input.applicationId, recruiter.id);
  if (!app) return { ok: false, error: 'You aren’t authorized to record a decision for this application.' };
  if (app.status !== 'interview') return { ok: false, error: 'A final decision can only be recorded after an interview is scheduled.' };

  const { data: interviews, error: readError } = await db().from('interviews')
    .select('id, interview_feedback(id)').eq('application_id', app.id);
  if (readError) return { ok: false, error: 'Couldn’t check this application. Try again.' };
  const hasFeedback = (interviews ?? []).some((i) => {
    const f = i.interview_feedback as unknown;
    return Array.isArray(f) ? f.length > 0 : Boolean(f);
  });
  if (!hasFeedback && !input.confirmNoFeedback) return { ok: false, needsNoFeedbackConfirm: true };

  try {
    await changeApplicationStatus({
      applicationId: app.id, to: input.decision, actorId: recruiter.id, reason: input.reason,
    });
  } catch (error) {
    console.error('recordDecisionAction', error);
    return { ok: false, error: 'Couldn’t record the decision. Try again.' };
  }

  await notify(app.candidateId, `Application update: ${app.jobTitle}`,
    input.decision === 'selected'
      ? 'You have been selected for this role.'
      : 'You were not selected for this role.');
  refresh(app.id);
  return { ok: true };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/recruiter/interviews/actions.ts
git commit -m "feat(interviews): add schedule, cancel, feedback and decision actions" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6: The schedule screen

**Files:**
- Create: `app/recruiter/interviews/page.tsx`, `app/recruiter/interviews/interviews.module.css`

- [ ] **Step 1: Load the `frontend-design` skill.**

- [ ] **Step 2: Write the page**

The schedule works out clashes when it's displayed, so a clash always shows up, even one created by two people saving at the same moment.

```tsx
// app/recruiter/interviews/page.tsx
import Link from 'next/link';
import { requireRecruiter } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { flagConflicts, type Slot } from '@/lib/interviews/conflicts';
import { INTERVIEW_TYPES } from '@/lib/interviews/schemas';
import { formatDay, formatTimeRange } from '@/lib/interviews/time';
import styles from './interviews.module.css';

export const dynamic = 'force-dynamic';

type Row = {
  id: string; application_id: string; interviewer_id: string; candidate_id: string;
  starts_at: string; ends_at: string; status: Slot['status']; type: string;
  interviewers: { name: string };
  applications: { jobs: { title: string }; candidate: { full_name: string } };
};

const typeLabel = (value: string) => INTERVIEW_TYPES.find((t) => t.value === value)?.label ?? value;

export default async function InterviewsPage() {
  const recruiter = await requireRecruiter();
  const { data, error } = await db().from('interviews')
    .select(`id, application_id, interviewer_id, candidate_id, starts_at, ends_at, status, type,
      interviewers(name),
      applications(jobs(title), candidate:profiles!applications_candidate_id_fkey(full_name))`)
    .eq('recruiter_id', recruiter.id)
    .order('starts_at');
  if (error) throw error;

  const rows = (data ?? []) as unknown as Row[];
  const flagged = flagConflicts(rows.map((r) => ({
    id: r.id, interviewerId: r.interviewer_id, candidateId: r.candidate_id,
    startsAt: r.starts_at, endsAt: r.ends_at, status: r.status,
  })));

  const byId = new Map(rows.map((r) => [r.id, r]));
  const describe = (row: Row) => (flagged.get(row.id) ?? []).map((c) => {
    const other = byId.get(c.withId);
    return c.type === 'interviewer'
      ? `${row.interviewers.name} is also booked with ${other?.applications.candidate.full_name}`
      : `${row.applications.candidate.full_name} also has an interview with ${other?.interviewers.name}`;
  });

  const now = Date.now();
  const upcoming = rows.filter((r) => r.status === 'scheduled' && Date.parse(r.ends_at) >= now);
  const others = rows.filter((r) => !upcoming.includes(r)).reverse();

  const days = new Map<string, Row[]>();
  for (const row of upcoming) {
    const day = formatDay(row.starts_at);
    days.set(day, [...(days.get(day) ?? []), row]);
  }

  const renderRow = (row: Row) => (
    <li key={row.id} className={styles.row}>
      <Link href={`/recruiter/applications/${row.application_id}/interview`} className={styles.rowLink}>
        <span className={styles.time}>{formatTimeRange(row.starts_at, row.ends_at)}</span>
        <span className={styles.who}>{row.applications.candidate.full_name}</span>
        <span>{row.applications.jobs.title}</span>
        <span>{typeLabel(row.type)} · {row.interviewers.name}</span>
        {row.status !== 'scheduled' && <span className={styles.status}>{row.status === 'completed' ? 'Completed' : 'Cancelled'}</span>}
      </Link>
      {describe(row).map((message) => <p key={message} className={styles.conflict}>Conflict: {message}</p>)}
    </li>
  );

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Interviews</h1>

      {rows.length === 0 && (
        <p>No interviews yet. Open a shortlisted applicant to schedule one. <Link href="/recruiter/jobs">View jobs</Link></p>
      )}

      {[...days.entries()].map(([day, list]) => (
        <section key={day}>
          <h2 className={styles.section}>{day}</h2>
          <ul className={styles.list}>{list.map(renderRow)}</ul>
        </section>
      ))}

      {others.length > 0 && (
        <section>
          <h2 className={styles.section}>Past and cancelled</h2>
          <ul className={styles.list}>{others.map(renderRow)}</ul>
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Write the styles**

```css
/* app/recruiter/interviews/interviews.module.css */
.page { padding: var(--spacing-32) var(--shell-pad); font-size: 14px; color: var(--color-silver-mist); }
.title { margin: 0 0 var(--spacing-16); font: 500 24px/1.3 var(--font-matter); letter-spacing: -.02em; color: var(--color-platinum); }
.breadcrumb { margin: 0 0 4px; font: 400 14px var(--font-arial); }
.breadcrumb a { color: var(--color-silver-mist); }
.breadcrumb a:hover { color: var(--color-platinum); }
.header { display: flex; justify-content: space-between; align-items: flex-end; gap: var(--spacing-16); flex-wrap: wrap; margin-bottom: var(--spacing-16); }
.section { margin: var(--spacing-32) 0 var(--spacing-12); font: 500 12px var(--font-matter); letter-spacing: .12em; text-transform: uppercase; color: var(--color-silver-mist); }
.list { list-style: none; margin: 0; padding: 0; border-bottom: 1px solid var(--hairline-soft); }
.row { padding: var(--spacing-12); border-top: 1px solid var(--hairline-soft); }
.row:hover { background: var(--wash); }
.rowLink { display: grid; grid-template-columns: 170px minmax(120px, 1fr) minmax(120px, 1fr) minmax(160px, 1fr) 90px; gap: var(--spacing-16); color: inherit; text-decoration: none; }
.time { font: 400 13px var(--font-mono); font-variant-numeric: tabular-nums; color: var(--color-liquid-mist); }
.who { color: var(--color-platinum); }
.status { color: var(--color-silver-mist); }
.conflict { margin: 8px 0 0; color: var(--color-coral); }
.conflict::before { content: '! '; font-weight: 500; }
.actions { display: flex; align-items: center; gap: var(--spacing-12); flex-wrap: wrap; margin-top: var(--spacing-12); }
.field { display: block; margin-bottom: var(--spacing-12); }
.textarea { display: block; width: 100%; margin-top: 4px; padding: var(--spacing-12); background: var(--color-liquid-deep); color: var(--color-liquid-mist); border: 1px solid var(--hairline); border-radius: var(--radius-small); font: 400 14px/1.5 var(--font-arial); }
.textarea:focus { border-color: var(--color-silver-mist); }
.alert { margin: 0 0 var(--spacing-12); padding: var(--spacing-12); border: 1px solid var(--color-coral); border-radius: var(--radius-small); color: var(--color-liquid-mist); }
.alert p { margin: 0 0 4px; }
.ratings { display: grid; gap: var(--spacing-12); margin-bottom: var(--spacing-16); padding: 0; border: 0; }
.ratingRow { display: flex; justify-content: space-between; align-items: center; gap: var(--spacing-12); flex-wrap: wrap; }
.scale { display: flex; gap: 4px; }
.scale button { width: 36px; height: 36px; border: 1px solid var(--hairline); border-radius: var(--radius-small); background: transparent; color: var(--color-liquid-mist); font-variant-numeric: tabular-nums; cursor: pointer; }
.scale button:hover { background: var(--wash); border-color: var(--hairline-strong); }
.scale button[aria-checked='true'] { background: var(--viz-cited); border-color: var(--viz-cited); color: var(--color-liquid-abyss); }
.feedback { margin: var(--spacing-12) 0 0; line-height: 1.6; }
.feedback dt { color: var(--color-silver-mist); }
.feedback dd { margin: 0 0 8px; color: var(--color-liquid-mist); }

@media (max-width: 1080px) {
  .rowLink { grid-template-columns: 1fr; gap: 2px; }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/recruiter/interviews/page.tsx app/recruiter/interviews/interviews.module.css
git commit -m "feat(interviews): add schedule screen with conflict flags" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 7: The applicant's interview screen

**Files:**
- Create in `app/recruiter/applications/[id]/interview/`: `page.tsx`, `ScheduleDialog.tsx`, `FeedbackDialog.tsx`, `InterviewRowActions.tsx`, `DecisionControl.tsx`
- Modify: `app/recruiter/applications/[id]/page.tsx` (add the link)

- [ ] **Step 1: Write the schedule dialog**

```tsx
// app/recruiter/applications/[id]/interview/ScheduleDialog.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Dialog } from '@/components/ui/Dialog';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/useToast';
import { addInterviewerAction, saveInterviewAction } from '@/app/recruiter/interviews/actions';
import { DURATIONS, INTERVIEW_TYPES } from '@/lib/interviews/schemas';
import { TIME_SLOTS } from '@/lib/interviews/time';
import styles from '@/app/recruiter/interviews/interviews.module.css';

export type InterviewerOption = { id: string; name: string };
export type ScheduleInitial = {
  interviewId: string; interviewerId: string; type: string; date: string; time: string; durationMinutes: number;
};

const NEW = '__new__';

export function ScheduleDialog({ applicationId, interviewers, initial, trigger, today }: {
  applicationId: string; interviewers: InterviewerOption[]; initial?: ScheduleInitial; trigger: ReactNode; today: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(interviewers);
  const [interviewerId, setInterviewerId] = useState(initial?.interviewerId ?? '');
  const [newName, setNewName] = useState('');
  const [type, setType] = useState(initial?.type ?? 'technical');
  const [date, setDate] = useState(initial?.date ?? '');
  const [time, setTime] = useState(initial?.time ?? '10:00');
  const [duration, setDuration] = useState(String(initial?.durationMinutes ?? 60));
  const [conflicts, setConflicts] = useState<string[]>([]);

  const submit = (acknowledgeConflict: boolean) => start(async () => {
    let chosen = interviewerId;
    if (chosen === NEW) {
      const added = await addInterviewerAction(newName);
      if (!added.ok) { toast(added.error, { tone: 'error' }); return; }
      setList((l) => [...l, { id: added.id, name: added.name }]);
      setInterviewerId(added.id);
      chosen = added.id;
    }
    const result = await saveInterviewAction({
      applicationId, interviewId: initial?.interviewId ?? null, interviewerId: chosen, type, date, time,
      durationMinutes: Number(duration), acknowledgeConflict,
    });
    if (result.ok) {
      toast(initial ? 'Interview moved. Candidate notified (simulated).' : 'Interview scheduled. Candidate notified (simulated).');
      setOpen(false); setConflicts([]); router.refresh();
    } else if ('conflicts' in result) {
      setConflicts(result.conflicts);
    } else {
      toast(result.error, { tone: 'error' });
    }
  });

  // Changing any field invalidates a warning about the old slot.
  const edit = <T,>(setter: (v: T) => void) => (value: T) => { setter(value); setConflicts([]); };

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onClose={() => setOpen(false)} title={initial ? 'Move interview' : 'Schedule interview'}
        footer={conflicts.length
          ? <Button variant="primary" disabled={pending} onClick={() => submit(true)}>Schedule anyway</Button>
          : <Button variant="primary" disabled={pending} onClick={() => submit(false)}>{initial ? 'Move interview' : 'Schedule interview'}</Button>}>
        {conflicts.length > 0 && (
          <div className={styles.alert} role="alert">
            {conflicts.map((c) => <p key={c}><strong>Conflict:</strong> {c}</p>)}
            <p>Change the time or interviewer, or schedule anyway.</p>
          </div>
        )}
        <div className={styles.field}>
          <DatePicker label="Date" value={date} min={today} onChange={edit(setDate)} />
        </div>
        <div className={styles.field}>
          <Select label="Time (PKT)" value={time} onChange={edit(setTime)}
            options={TIME_SLOTS.map((t) => ({ value: t, label: t }))} />
        </div>
        <div className={styles.field}>
          <Select label="Duration" value={duration} onChange={edit(setDuration)}
            options={DURATIONS.map((d) => ({ value: String(d), label: `${d} minutes` }))} />
        </div>
        <div className={styles.field}>
          <Select label="Interviewer" value={interviewerId} onChange={edit(setInterviewerId)}
            options={[...list.map((i) => ({ value: i.id, label: i.name })), { value: NEW, label: 'Add new interviewer' }]} />
        </div>
        {interviewerId === NEW && (
          <label className={styles.field}>New interviewer’s name
            <input className={styles.textarea} value={newName} onChange={(e) => setNewName(e.target.value)} />
          </label>
        )}
        <div className={styles.field}>
          <Select label="Interview type" value={type} onChange={edit(setType)} options={[...INTERVIEW_TYPES]} />
        </div>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 2: Write the feedback dialog**

```tsx
// app/recruiter/applications/[id]/interview/FeedbackDialog.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/useToast';
import { saveFeedbackAction } from '@/app/recruiter/interviews/actions';
import { RATING_CRITERIA, RECOMMENDATIONS } from '@/lib/interviews/schemas';
import styles from '@/app/recruiter/interviews/interviews.module.css';

export type FeedbackValues = {
  technical_skill: number; problem_solving: number; communication: number; job_knowledge: number;
  recommendation: string; strengths: string; concerns: string;
};

export function FeedbackDialog({ interviewId, interviewerName, initial }: {
  interviewId: string; interviewerName: string; initial: FeedbackValues | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({
    technical_skill: initial?.technical_skill ?? 0, problem_solving: initial?.problem_solving ?? 0,
    communication: initial?.communication ?? 0, job_knowledge: initial?.job_knowledge ?? 0,
  });
  const [recommendation, setRecommendation] = useState(initial?.recommendation ?? '');
  const [strengths, setStrengths] = useState(initial?.strengths ?? '');
  const [concerns, setConcerns] = useState(initial?.concerns ?? '');

  const save = () => start(async () => {
    const result = await saveFeedbackAction({ interviewId, ...ratings, recommendation, strengths, concerns });
    if (!result.ok) { toast(result.error, { tone: 'error' }); return; }
    toast('Feedback saved');
    setOpen(false);
    router.refresh();
  });

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>{initial ? 'Edit feedback' : 'Add feedback'}</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Feedback from ${interviewerName}`}
        footer={<Button variant="primary" disabled={pending} onClick={save}>Save feedback</Button>}>
        <div className={styles.ratings}>
          {RATING_CRITERIA.map(({ key, label }) => (
            <div key={key} className={styles.ratingRow} role="radiogroup" aria-label={label}>
              <span>{label}</span>
              <div className={styles.scale}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={ratings[key] === n}
                    aria-label={`${label}: ${n} out of 5`}
                    onClick={() => setRatings((r) => ({ ...r, [key]: n }))}>{n}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className={styles.field}>
          <Select label="Recommendation" value={recommendation} onChange={setRecommendation} options={[...RECOMMENDATIONS]} />
        </div>
        <label className={styles.field}>Strengths
          <textarea className={styles.textarea} rows={4} value={strengths} onChange={(e) => setStrengths(e.target.value)} />
        </label>
        <label className={styles.field}>Concerns
          <textarea className={styles.textarea} rows={4} value={concerns} onChange={(e) => setConcerns(e.target.value)} />
        </label>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 3: Write the row actions and decision control**

```tsx
// app/recruiter/applications/[id]/interview/InterviewRowActions.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/useToast';
import { cancelInterviewAction } from '@/app/recruiter/interviews/actions';

export function CancelInterview({ interviewId }: { interviewId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) return <Button variant="ghost" onClick={() => setConfirming(true)}>Cancel interview</Button>;
  return (
    <>
      <span>Cancel this interview?</span>
      <Button variant="ghost" disabled={pending} onClick={() => start(async () => {
        const result = await cancelInterviewAction(interviewId);
        if (!result.ok) { toast(result.error, { tone: 'error' }); return; }
        toast('Interview cancelled. Candidate notified (simulated).');
        router.refresh();
      })}>Yes, cancel it</Button>
      <Button variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>Keep it</Button>
    </>
  );
}
```

```tsx
// app/recruiter/applications/[id]/interview/DecisionControl.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/useToast';
import { recordDecisionAction } from '@/app/recruiter/interviews/actions';
import styles from '@/app/recruiter/interviews/interviews.module.css';

export function DecisionControl({ applicationId, candidateName }: { applicationId: string; candidateName: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [decision, setDecision] = useState<'selected' | 'rejected' | null>(null);
  const [reason, setReason] = useState('');
  const [needsConfirm, setNeedsConfirm] = useState(false);

  const close = () => { setDecision(null); setNeedsConfirm(false); };
  const submit = () => start(async () => {
    const result = await recordDecisionAction({ applicationId, decision, reason, confirmNoFeedback: needsConfirm });
    if (result.ok) {
      toast('Decision recorded. Candidate notified (simulated).');
      close();
      router.refresh();
    } else if ('needsNoFeedbackConfirm' in result) {
      setNeedsConfirm(true);
    } else {
      toast(result.error, { tone: 'error' });
    }
  });

  const verb = decision === 'selected' ? 'Select' : 'Reject';
  return (
    <>
      <div className={styles.actions}>
        <Button variant="ghost" onClick={() => setDecision('selected')}>Select candidate</Button>
        <Button variant="ghost" onClick={() => setDecision('rejected')}>Reject candidate</Button>
      </div>
      <Dialog open={decision !== null} onClose={close} title={`${verb} ${candidateName}?`}
        footer={<Button variant="primary" disabled={pending} onClick={submit}>
          {needsConfirm ? `${verb} without feedback` : `${verb} candidate`}
        </Button>}>
        {needsConfirm && (
          <div className={styles.alert} role="alert"><p>No interview feedback has been recorded yet.</p></div>
        )}
        <label className={styles.field}>Reason (not shown to the candidate)
          <textarea className={styles.textarea} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 4: Write the page**

```tsx
// app/recruiter/applications/[id]/interview/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { getOwnedApplication } from '@/lib/auth/ownership';
import { requireRecruiter } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { INTERVIEW_TYPES, RATING_CRITERIA, RECOMMENDATIONS } from '@/lib/interviews/schemas';
import { formatDay, formatTimeRange, toPktFields } from '@/lib/interviews/time';
import { DecisionControl } from './DecisionControl';
import { FeedbackDialog, type FeedbackValues } from './FeedbackDialog';
import { CancelInterview } from './InterviewRowActions';
import { ScheduleDialog } from './ScheduleDialog';
import styles from '@/app/recruiter/interviews/interviews.module.css';

export const dynamic = 'force-dynamic';

type Row = {
  id: string; type: string; status: 'scheduled' | 'completed' | 'cancelled'; starts_at: string; ends_at: string;
  interviewer_id: string; interviewers: { name: string };
  interview_feedback: FeedbackValues | FeedbackValues[] | null;
};

const label = (list: readonly { value: string; label: string }[], value: string) =>
  list.find((i) => i.value === value)?.label ?? value;

export default async function ApplicationInterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recruiter = await requireRecruiter();
  const app = await getOwnedApplication(id, recruiter.id);
  if (!app) notFound();

  const [interviews, interviewers] = await Promise.all([
    db().from('interviews')
      .select(`id, type, status, starts_at, ends_at, interviewer_id, interviewers(name),
        interview_feedback(technical_skill, problem_solving, communication, job_knowledge, recommendation, strengths, concerns)`)
      .eq('application_id', id).order('starts_at'),
    db().from('interviewers').select('id, name').eq('recruiter_id', recruiter.id).order('name'),
  ]);
  if (interviews.error) throw interviews.error;
  if (interviewers.error) throw interviewers.error;

  const rows = (interviews.data ?? []) as unknown as Row[];
  const canSchedule = app.status === 'shortlisted' || app.status === 'interview';
  const today = toPktFields(new Date().toISOString()).date;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.breadcrumb}>
            <Link href={`/recruiter/applications/${id}`}>{app.candidateName} · {app.jobTitle}</Link>
          </p>
          <h1 className={styles.title}>Interview</h1>
        </div>
        {canSchedule && (
          <ScheduleDialog applicationId={id} interviewers={interviewers.data ?? []} today={today}
            trigger={<Button variant="primary">Schedule interview</Button>} />
        )}
      </header>

      {!canSchedule && app.status !== 'selected' && app.status !== 'rejected' && (
        <p>Shortlist this applicant to schedule an interview.</p>
      )}
      {(app.status === 'selected' || app.status === 'rejected') && (
        <p>Final decision: {app.status === 'selected' ? 'Selected' : 'Rejected'}.</p>
      )}
      {rows.length === 0 && canSchedule && <p>No interviews scheduled yet.</p>}

      {rows.length > 0 && (
        <ul className={styles.list}>
          {rows.map((row) => {
            const feedback = Array.isArray(row.interview_feedback) ? row.interview_feedback[0] ?? null : row.interview_feedback;
            const fields = toPktFields(row.starts_at);
            const minutes = (Date.parse(row.ends_at) - Date.parse(row.starts_at)) / 60_000;
            return (
              <li key={row.id} className={styles.row}>
                <p className={styles.who}>
                  {formatDay(row.starts_at)}, {formatTimeRange(row.starts_at, row.ends_at)}
                </p>
                <p>
                  {label(INTERVIEW_TYPES, row.type)} · {row.interviewers.name}
                  {row.status !== 'scheduled' && ` · ${row.status === 'completed' ? 'Completed' : 'Cancelled'}`}
                </p>

                {feedback && (
                  <dl className={styles.feedback}>
                    {RATING_CRITERIA.map(({ key, label: name }) => (
                      <div key={key}><dt>{name}</dt><dd>{feedback[key]} out of 5</dd></div>
                    ))}
                    <dt>Recommendation</dt><dd>{label(RECOMMENDATIONS, feedback.recommendation)}</dd>
                    {feedback.strengths && <><dt>Strengths</dt><dd>{feedback.strengths}</dd></>}
                    {feedback.concerns && <><dt>Concerns</dt><dd>{feedback.concerns}</dd></>}
                  </dl>
                )}

                <div className={styles.actions}>
                  {row.status !== 'cancelled' && (
                    <FeedbackDialog interviewId={row.id} interviewerName={row.interviewers.name} initial={feedback} />
                  )}
                  {row.status === 'scheduled' && (
                    <>
                      <ScheduleDialog applicationId={id} interviewers={interviewers.data ?? []} today={today}
                        initial={{ interviewId: row.id, interviewerId: row.interviewer_id, type: row.type,
                          date: fields.date, time: fields.time, durationMinutes: minutes }}
                        trigger={<Button variant="ghost">Move</Button>} />
                      <CancelInterview interviewId={row.id} />
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {app.status === 'interview' && (
        <section>
          <h2 className={styles.section}>Final decision</h2>
          <DecisionControl applicationId={id} candidateName={app.candidateName} />
        </section>
      )}
    </main>
  );
}
```

A move to a time not in the 15-minute slots, or a duration not on the list, can't arise, since all interviews are created through this form.

- [ ] **Step 5: Link it from the application detail page.** In `app/recruiter/applications/[id]/page.tsx`, add this next to the existing actions:

```tsx
<Link href={`/recruiter/applications/${id}/interview`}>Interview</Link>
```

- [ ] **Step 6: Add Interviews to the recruiter navigation.** In the recruiter layout from module 2, add a link to `/recruiter/interviews` labelled `Interviews`.

- [ ] **Step 7: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add "app/recruiter/applications/[id]/interview" "app/recruiter/applications/[id]/page.tsx" app/recruiter/layout.tsx
git commit -m "feat(interviews): add applicant interview, feedback and decision screen" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 8: What the candidate sees

**Files:**
- Create: `lib/interviews/candidate-view.ts`
- Modify: `app/candidate/applications/page.tsx`

- [ ] **Step 1: Write the candidate read functions**

This file lists the exact columns, so recruiter-only data can't be included by accident.

```ts
// lib/interviews/candidate-view.ts
import 'server-only';
import { db } from '@/lib/db';

export async function getCandidateInterviews(candidateId: string) {
  const { data, error } = await db().from('interviews')
    .select('application_id, type, status, starts_at, ends_at')
    .eq('candidate_id', candidateId).order('starts_at');
  if (error) throw error;
  return data ?? [];
}

export async function getCandidateNotifications(candidateId: string) {
  const { data, error } = await db().from('notifications')
    .select('id, title, body, created_at')
    .eq('user_id', candidateId).order('created_at', { ascending: false }).limit(20);
  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 2: Show them on the candidate's page.** In `app/candidate/applications/page.tsx`, after `requireCandidate()`, add the code below. `candidate` is the value `requireCandidate()` returned.

```tsx
const [interviews, notifications] = await Promise.all([
  getCandidateInterviews(candidate.id),
  getCandidateNotifications(candidate.id),
]);
```

Inside each application's row, where `application` is the row's item:

```tsx
{interviews.filter((i) => i.application_id === application.id).map((i) => (
  <p key={i.starts_at}>
    {INTERVIEW_TYPES.find((t) => t.value === i.type)?.label} interview,{' '}
    {formatDay(i.starts_at)}, {formatTimeRange(i.starts_at, i.ends_at)}
    {i.status === 'cancelled' ? ' (cancelled)' : ''}
  </p>
))}
```

At the end of the page:

```tsx
{notifications.length > 0 && (
  <section aria-label="Notifications">
    <h2>Notifications</h2>
    <p>Simulated in this demo. No email was sent.</p>
    <ul>
      {notifications.map((n) => <li key={n.id}><strong>{n.title}</strong> {n.body}</li>)}
    </ul>
  </section>
)}
```

Add these imports:

```tsx
import { getCandidateInterviews, getCandidateNotifications } from '@/lib/interviews/candidate-view';
import { INTERVIEW_TYPES } from '@/lib/interviews/schemas';
import { formatDay, formatTimeRange } from '@/lib/interviews/time';
```

- [ ] **Step 3: Commit**

```bash
git add lib/interviews/candidate-view.ts app/candidate/applications/page.tsx
git commit -m "feat(interviews): show candidates their interviews and simulated notifications" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 9: Browser test and handover

**Files:**
- Create: `e2e/scheduling.spec.ts`

- [ ] **Step 1: Write the browser test**

```ts
// e2e/scheduling.spec.ts
import { expect, test, type Page } from '@playwright/test';
import { CANDIDATE_EMAIL, loginAs, seedApplication } from './helpers';

// A different future date on each run, so a rerun doesn't clash with interviews from earlier runs.
const testDate = new Date(Date.now() + (2 + Math.floor(Math.random() * 300)) * 86_400_000)
  .toISOString().slice(0, 10);

async function pick(page: Page, label: string, option: string) {
  await page.getByRole('combobox', { name: label }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

async function fillSchedule(page: Page, applicationId: string, interviewer: string, time: string, isNew: boolean) {
  await page.goto(`/recruiter/applications/${applicationId}/interview`);
  await page.getByRole('button', { name: 'Schedule interview' }).click();
  await page.getByLabel('Date').fill(testDate);
  await pick(page, 'Time (PKT)', time);
  if (isNew) {
    await pick(page, 'Interviewer', 'Add new interviewer');
    await page.getByLabel('New interviewer’s name').fill(interviewer);
  } else {
    await pick(page, 'Interviewer', interviewer);
  }
  await page.getByRole('dialog').getByRole('button', { name: 'Schedule interview' }).click();
}

test('double-booked interviewer is flagged, and the recruiter decides', async ({ page }) => {
  const interviewer = `Ali ${Date.now()}`;
  const first = await seedApplication({ status: 'shortlisted' });
  const second = await seedApplication({ status: 'shortlisted' });
  await loginAs(page, 'recruiter');

  await fillSchedule(page, first.applicationId, interviewer, '10:00', true);
  await expect(page.getByText('Interview scheduled')).toBeVisible();

  // Same interviewer, overlapping time: warned and NOT saved yet.
  await fillSchedule(page, second.applicationId, interviewer, '10:30', false);
  await expect(page.getByRole('alert')).toContainText(`${interviewer} already has an interview`);
  await page.reload();
  await expect(page.getByText('No interviews scheduled yet.')).toBeVisible();

  await fillSchedule(page, second.applicationId, interviewer, '10:30', false);
  await page.getByRole('button', { name: 'Schedule anyway' }).click();
  await expect(page.getByText('Interview scheduled')).toBeVisible();

  // Both rows are flagged on the schedule.
  await page.goto('/recruiter/interviews');
  await expect(page.getByText(`Conflict: ${interviewer} is also booked`)).toHaveCount(2);
});

test('feedback and decision stay hidden from the candidate', async ({ page, browser }) => {
  const app = await seedApplication({ status: 'shortlisted', candidateEmail: CANDIDATE_EMAIL });
  await loginAs(page, 'recruiter');
  await fillSchedule(page, app.applicationId, `Sara ${Date.now()}`, '14:00', true);
  await expect(page.getByText('Interview scheduled')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Add feedback' }).click();
  for (const label of ['Technical skill', 'Problem solving', 'Communication', 'Job knowledge']) {
    await page.getByRole('radio', { name: `${label}: 4 out of 5` }).click();
  }
  await pick(page, 'Recommendation', 'Advance');
  await page.getByLabel('Concerns').fill('SECRET-FEEDBACK-TEXT');
  await page.getByRole('button', { name: 'Save feedback' }).click();
  await expect(page.getByText('SECRET-FEEDBACK-TEXT')).toBeVisible();

  await page.reload();
  await expect(page.getByText('SECRET-FEEDBACK-TEXT')).toBeVisible();

  await page.getByRole('button', { name: 'Select candidate' }).click();
  await page.getByLabel('Reason (not shown to the candidate)').fill('SECRET-REASON-TEXT');
  await page.getByRole('dialog').getByRole('button', { name: 'Select candidate' }).click();
  await expect(page.getByText('Final decision: Selected.')).toBeVisible();

  const candidate = await (await browser.newContext()).newPage();
  await loginAs(candidate, 'candidate');
  await candidate.goto('/candidate/applications');
  await expect(candidate.getByText('You have been selected for this role.').first()).toBeVisible();
  await expect(candidate.getByText('SECRET-FEEDBACK-TEXT')).toHaveCount(0);
  await expect(candidate.getByText('SECRET-REASON-TEXT')).toHaveCount(0);

  // Recruiter pages are blocked too.
  await candidate.goto(`/recruiter/applications/${app.applicationId}/interview`);
  await expect(candidate.getByText('SECRET-FEEDBACK-TEXT')).toHaveCount(0);
});
```

- [ ] **Step 2: Run all tests**

Run: `npm run test && npx playwright test e2e/scheduling.spec.ts && npx tsc --noEmit`
Expected: everything passes with no type errors.

- [ ] **Step 3: Run the `frontend-design` pre-handover checklist.** Screenshot at 1280, 1440 and 390 wide: empty schedule, full schedule, a flagged row, the schedule dialog with a conflict showing, the feedback dialog, the decision dialog. Open each dialog at 1280×640 and 390×700 and confirm its body scrolls and its footer button stays reachable.

- [ ] **Step 4: Commit and push**

```bash
git add e2e/scheduling.spec.ts
git commit -m "test(interviews): cover double booking, feedback and candidate privacy" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin main
```

Push from this project's own repo. Never from `C:\Users\LENOVO`.

- [ ] **Step 5: Check it live.** Once the deploy shows the new commit, on the live URL: double-book an interviewer and confirm the warning. Then choose "Schedule anyway" and confirm both rows are flagged on `/recruiter/interviews`. Log in as the candidate and confirm they see the interview time but no interviewer, feedback or reason.

- [ ] **Step 6: Hand over.** Report what's live, the route, a test account, the clicks to see it, who can and can't see it, the commit and branch, and anything still local.
