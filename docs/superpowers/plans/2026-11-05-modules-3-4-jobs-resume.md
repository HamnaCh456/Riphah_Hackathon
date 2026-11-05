# Modules 3 and 4: Jobs and Resume Parsing Implementation Plan

> Executed inline, immediately, on the user's "auto approve". Steps use checkboxes for tracking.

**Goal:** Recruiters manage jobs and can fill the form from a pasted description. Candidates upload a
resume, see what was extracted with the supporting text, and correct it.

**Architecture:** Next.js App Router pages call server-only code. Supabase is reached with the secret
key from the server, and every new table has RLS on with no policies. Gemini proposes; plain code
normalizes skills and checks that each quoted excerpt really appears in the source text. Nothing is
saved from a job extraction until the recruiter presses Save.

**Tech stack:** Next.js, TypeScript, Supabase Postgres, `@google/genai` (`gemini-2.5-flash`), `unpdf`,
`mammoth`, `zod`, `vitest`.

**Depends on:** module 2 from the auth session (`lib/auth/guards.ts`, `profiles`, app shell). Follows
the names in `2026-11-05-modules-7-9-prerequisites.md`.

## Database safety

The MCP tool named `supabase` in this session points at another app's live project
(`indxzhcrykhinhefhhop`). Never use it. Migrations go only to `lbxozdqgboubbyvzgquz`, and the script
refuses any other ref.

## Schema: `supabase/migrations/20261105010000_jobs_resumes.sql`

- `jobs`: `recruiter_id`, `title`, `department`, `location`, `employment_type`, `salary`,
  `min_experience_years`, `qualifications text[]`, `description`, `status` (`open`/`closed`), timestamps.
- `job_skills`: `job_id`, `skill` (normalized), `importance` (`required`/`preferred`), `weight` (1 to 3).
- `applications`: the shape in the prerequisites doc, so applicant counts are real. Module 6 owns it
  from then on.
- `resumes`: `candidate_id`, `file_name`, `file_type`, `status` (`parsed`/`failed`), `failure_code`,
  `raw_text`, `extracted jsonb` (AI's untouched output), `data jsonb` (current, candidate-corrected),
  `corrected_at`, `created_at`.

## Tasks

### Task 1: Skill normalization (TDD)
Files: `lib/skills/normalize.ts`, `lib/skills/normalize.test.ts`
- [ ] Tests first: JS to JavaScript, Postgres to PostgreSQL, k8s to Kubernetes, case and punctuation
      variants, unknown terms kept, duplicates merged with the original wording kept.
- [ ] Implement a plain alias table. No AI, so results are repeatable.

### Task 2: Excerpt verification (TDD)
Files: `lib/ai/verify-excerpt.ts`, `lib/ai/verify-excerpt.test.ts`
- [ ] Tests first: exact, different whitespace or case, invented quote, empty quote, very short quote.
- [ ] Implement it. A quote that fails is flagged for manual review, never silently accepted.

### Task 3: Server plumbing
Files: `lib/db.ts`, `lib/ai/gemini.ts`
- [ ] `db()` is server-only and uses the secret key. `generateJson` uses JSON mode with a timeout and
      throws a typed error the UI can turn into a retry.

### Task 4: Migration
- [ ] Write the SQL, apply it to `lbxozdqgboubbyvzgquz` only, confirm RLS is on and the advisors are clean.

### Task 5: Jobs domain (TDD on validation)
Files: `lib/jobs/schema.ts`, `lib/jobs/schema.test.ts`, `lib/jobs/extract.ts`, `lib/jobs/queries.ts`,
`app/recruiter/jobs/actions.ts`
- [ ] Validation, ownership check on every read and write, list with applicant counts, close and reopen.
- [ ] AI extraction: real Gemini call, quotes checked against the description, fields left blank when
      the description does not say.

### Task 6: Jobs screens
Files: `app/recruiter/jobs/page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx`, `components/jobs/*`
- [ ] Ruled table with status and applicant counts. Form with the description beside the fields.
      Filling from the description fills only empty fields, never overwrites what the recruiter typed.

### Task 7: Resume parsing core (TDD on the file checks)
Files: `lib/resume/file-check.ts`, `lib/resume/file-check.test.ts`, `lib/resume/extract-text.ts`,
`lib/resume/parse.ts`, `lib/resume/schema.ts`, `lib/resume/queries.ts`, `app/api/resume/route.ts`
- [ ] Check real file bytes, not the extension. Outcomes: wrong type, too large, empty file, no text
      (scanned or blank), corrupt or password protected, not a resume, AI failed (retry without re-upload).
- [ ] The schema has no field for protected characteristics, so they are never extracted.
- [ ] A failed new upload leaves the previous good resume in place.

### Task 8: Resume screen
Files: `app/candidate/resume/page.tsx`, `components/resume/*`, `app/candidate/resume/actions.ts`
- [ ] Whole-box upload (click, drag, Enter/Space). Review and correct every section. Each item shows
      its excerpt, unverified items are flagged, and items the candidate adds say so.

### Task 9: Verify and ship
- [ ] Unit tests, typecheck, lint and build.
- [ ] Browser, as a real recruiter: paste a description, save, reload, edit, close, reopen; check the DB.
- [ ] Browser, as a real candidate: good PDF, DOCX, empty, scanned, wrong type, corrupt; correct, reload.
- [ ] A candidate is blocked from recruiter job pages and from other people's data.
- [ ] Run the frontend-design checklist at 1280, 1440 and 390 wide.
- [ ] Commit by explicit paths and push each module to `HamnaCh456/Riphah_Hackathon`.
