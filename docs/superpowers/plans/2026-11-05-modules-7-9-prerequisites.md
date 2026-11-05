# Modules 7–9: What They Need From Modules 1–6

Date: 2026-11-05

Modules 7, 8 and 9 plug into code that does not exist yet. On 2026-11-05 the repo had no commits,
no git remote and no app code, and Supabase project `lbxozdqgboubbyvzgquz` had no public tables.
This file is the interface those modules assume. Whoever builds modules 1–6 should provide these
names, or change the three plans to match what they built.

**Task 0 of each plan checks this list against the real code.** Do not skip it.

## Stack assumed

The stack is still only a proposal in `CLAUDE.md`. These plans use it:

- Next.js (App Router, TypeScript, Server Actions) on Vercel
- Supabase Postgres, accessed only from the server with the secret key
- Gemini `gemini-2.5-flash` through `@google/genai` (confirmed available to this key on 2026-11-05)
- `zod` for validation, `vitest` for unit tests, `@playwright/test` for browser tests

If the stack changes, the logic in `lib/` and the SQL carry over. The pages and actions do not.

## Safety rules

- **Wrong database risk.** The MCP server named `supabase` points at another project
  (`indxzhcrykhinhefhhop`, which holds real client data). `supabase-riphah` is the right one and
  needs authorizing through `/mcp`. Never run this project's migrations through `supabase`. Before
  any schema change, confirm the project ref is `lbxozdqgboubbyvzgquz`.
- **Secret key.** `ANON-API-KEY` holds a secret key that bypasses row level security, so
  authorization lives in server code. Every new table turns RLS on with no policies, which blocks
  direct browser access. Every action checks the role and job ownership first.
- **Environment names.** `.env` uses hyphens (`GEMINI-API-KEY`). Vercel only accepts letters,
  digits and underscores, so module 1 needs to settle this before deploying. The code below only
  calls `generateJson`, so it does not depend on the answer.

## Tables

```sql
profiles (id uuid primary key, role text check (role in ('recruiter','candidate')),
          full_name text not null, email text not null)

jobs (id uuid primary key, recruiter_id uuid not null references profiles(id), title text not null,
      description text not null, status text not null check (status in ('open','closed')),
      created_at timestamptz not null default now())

job_skills (id uuid primary key, job_id uuid not null references jobs(id) on delete cascade,
            skill text not null,          -- normalized name, e.g. 'JavaScript'
            importance text not null check (importance in ('required','preferred')))

applications (id uuid primary key, job_id uuid not null references jobs(id),
              candidate_id uuid not null references profiles(id),
              status text not null,       -- see ApplicationStatus below
              created_at timestamptz not null default now())

application_status_events (id uuid primary key,
              application_id uuid not null references applications(id) on delete cascade,
              from_status text, to_status text not null,
              actor_id uuid references profiles(id), reason text,
              created_at timestamptz not null default now())

resume_evidence (id uuid primary key,
              application_id uuid not null references applications(id) on delete cascade,
              kind text not null check (kind in ('skill','experience','project','education')),
              label text not null,        -- e.g. the project's name
              excerpt text not null)      -- exact resume text

skill_assessments (application_id uuid not null references applications(id) on delete cascade,
              job_skill_id uuid not null references job_skills(id) on delete cascade,
              result text not null check (result in ('matched','missing_evidence','confirmed_absent')),
              primary key (application_id, job_skill_id))
```

Modules 7–9 only read `resume_evidence` and `skill_assessments`. Module 5 owns them.

Another session is building modules 3 and 4. Its migration
`20261105010000_jobs_resumes.sql` creates `jobs`, `job_skills`, `resumes` and `applications` in this
shape, with extra job columns and a `job_skills.weight` column. Migrations here use timestamp names
so they run after it: module 7 is `20261105070000`, module 8 is `20261105080000`. Change a table it
owns with `alter`, never `create`.

## Code

```ts
// lib/db.ts: server-only Supabase client using the secret key
export function db(): SupabaseClient;

// lib/auth/guards.ts: redirect to /login on no session, /forbidden on the wrong role
export async function requireRecruiter(): Promise<{ id: string; fullName: string }>;
export async function requireCandidate(): Promise<{ id: string; fullName: string }>;

// lib/auth/ownership.ts: null unless this recruiter owns the application's job
export type OwnedApplication = {
  id: string; status: ApplicationStatus; candidateId: string; candidateName: string;
  jobId: string; jobTitle: string; jobDescription: string;
};
export async function getOwnedApplication(applicationId: string, recruiterId: string):
  Promise<OwnedApplication | null>;

// lib/ai/gemini.ts: calls Gemini in JSON mode, handles timeout, returns the parsed JSON
export async function generateJson(args: {
  system: string; prompt: string; responseSchema: object;
}): Promise<unknown>;

// lib/pipeline/statuses.ts
export const APPLICATION_STATUSES = ['submitted', 'parsed', 'ai_assessment_available',
  'recruiter_review', 'shortlisted', 'interview', 'selected', 'rejected'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

// lib/pipeline/change-status.ts: updates the status AND writes application_status_events.
// Throws on a transition that isn't allowed. Must allow shortlisted→interview,
// interview→selected and interview→rejected.
export async function changeApplicationStatus(args: {
  applicationId: string; to: ApplicationStatus; actorId: string; reason: string;
}): Promise<void>;
```

## Pages

- `app/recruiter/applications/[id]/page.tsx`: application detail (modules 7 and 8 add links to it)
- `app/candidate/applications/page.tsx`: the candidate's applications (module 8 adds to it)
- `app/recruiter/page.tsx`: recruiter home (module 9 redirects it to analytics)
- `app/recruiter/jobs/page.tsx`: the recruiter's jobs (module 9 links to it)

## UI

DESIGN.md's tokens defined as CSS variables in `app/globals.css`, plus these in `components/ui/`.
Native date and select pop-ups are not allowed on screens, so these must be custom.

```ts
Button   // props: variant 'primary' | 'ghost', plus normal <button> props
Select   // props: label, value, onChange(value), options {value,label}[]; ARIA combobox and options
DatePicker // props: label, value 'YYYY-MM-DD', onChange(value), min; includes a text input for typing
Dialog   // props: open, onClose, title, children, footer; body scrolls on short screens
useToast // returns toast(message, { tone?: 'error' })
```

## Tests

```ts
// e2e/helpers.ts
export async function loginAs(page: Page, who: 'recruiter' | 'candidate'): Promise<void>;
export const CANDIDATE_EMAIL: string; // the account loginAs(page, 'candidate') signs in with
// Creates a fresh job and application in the given status, using a test job with
// Python, Django, PostgreSQL and Docker. Uses a new candidate unless candidateEmail is given.
// Returns the IDs.
export async function seedApplication(args: { status: ApplicationStatus; candidateEmail?: string }):
  Promise<{ applicationId: string; jobId: string; jobTitle: string; candidateName: string }>;
```

`seedApplication` must include at least one `project` row in `resume_evidence` and one
`missing_evidence` row in `skill_assessments`.

Vitest needs the `@/` path alias and `npm run test` mapped to `vitest run`.
