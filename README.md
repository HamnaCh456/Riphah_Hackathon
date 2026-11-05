# Talent Intelligence: AI recruitment platform

Recruiters post jobs, candidates apply with a resume, and AI finds the evidence for each requirement.
Every score links back to the resume text behind it, and a person makes every hiring decision.

**Live:** https://riphah-recruitment.vercel.app

## How the AI is used

| Step | What the AI does | What normal code does |
|---|---|---|
| Job posting | Reads a free-text description and proposes requirements | Fills only empty fields. Nothing saves until the recruiter presses Post job |
| Resume parsing | Extracts skills, education, experience and projects, quoting the resume | Checks that each quote really appears in the file, normalizes terms (JS to JavaScript) and flags anything unsupported |
| Matching | Judges each requirement against the resume passages retrieved by embedding similarity (pgvector) | Verifies every quote against the resume, then calculates the score |
| Interview questions | Writes questions at three levels, including about the candidate's own projects | Checks each project quote against the resume and flags it if it isn't there |
| Talent search | Splits a plain-language query into separate needs | Runs a vector search per need and returns the matching resume text as evidence |

Answers are never hardcoded. If the AI fails, the screen says so and offers a retry, and no score is invented.

## How the score works

The AI never picks the score. It reports a result per requirement, and `lib/matching/score.ts` calculates the rest.

- **Weights:** skills 50%, experience 25%, project relevance 15%, qualifications 10%, as the brief suggests. If a job has no requirements for a category, the rest are rescaled and the screen says so.
- **Credit:** demonstrated use 1.0, listed only 0.7, partial 0.5, no evidence or confirmed absent 0. Listed-only earns less, so a keyword list can't beat described experience.
- **Importance:** each requirement counts by its 1 to 5 importance. Preferred requirements count half.

### Missing is not absent

| Result | Meaning | Effect |
|---|---|---|
| Not mentioned | The resume doesn't say either way | Lowers the score, but the "could reach" ceiling stays up |
| Confirmed missing | The resume says so, with a verified quote, or a recruiter records it with a reason | Lowers the score and the ceiling |

The AI can't infer confirmed absence from silence.

## Human control and fairness

- AI can only move an application through the system steps `parsed` and `assessed`. Shortlisting, rejecting and selecting need a recruiter's click.
- Status changes go through one database function that checks the move and writes an append-only audit row. A direct update is refused, even with the secret key.
- Recruiters can override any AI result or extracted skill, with a written reason. The original result is kept.
- Name, contact details and similar personal details are removed before resume text reaches the AI for scoring.
- The fairness check on each applicant page scores the resume again with personal details changed (name, gender, age, nationality, religion, marital status) and shows whether the result moves. The saved score stays as it was.
- Candidates only see a simplified status, through database functions. They never see scores, gaps, notes or AI results.

## Architecture

```text
Browser
  -> Next.js App Router (Vercel): pages, server actions, proxy.ts (role checks, rate limit)
       -> Supabase Auth: sessions, secure password handling
       -> Supabase Postgres + pgvector: row level security, audit trail, resume chunks
       -> Gemini, then OpenAI gpt-4o-mini if Gemini fails: extraction, assessment and question generation; gemini-embedding-001 for vectors
```

| Folder | Purpose |
|---|---|
| `lib/matching` | Chunking, redaction, quote checks, scoring, explanations, ranking |
| `lib/resume`, `lib/jobs` | File checks, parsing, job requirements |
| `lib/pipeline` | Status moves and labels |
| `lib/interview-questions`, `lib/interviews` | Question generation, scheduling, conflicts, feedback |
| `lib/analytics` | Every dashboard number, calculated by code |
| `lib/talent`, `lib/trust` | Semantic search, fairness check |
| `supabase/migrations` | Schema and access rules |

## Security

- Passwords and sessions are handled by Supabase Auth. Inputs are validated with Zod on the server.
- Roles are checked in `proxy.ts` and again on every page and action.
- The secret key and AI keys are server-only. Secret-key queries check ownership first.
- Uploads are checked by their real file bytes, not their extension.
- Resume text is treated as data: instructions hidden in a resume are ignored, and a test covers this.
- Security headers and a per-client limit on POST requests. The limit is per server instance.

## Run it

1. Copy `.env.example` to `.env.local` and fill in the Supabase and Gemini values.
2. Apply `supabase/migrations/` in order.
3. `npm install`, then `npm run dev`, and open http://localhost:3000.
4. Optional: `node scripts/seed-demo.mjs` creates demo logins. `docs/DEMO.md` has the click script.

## Checks

`npm test`, `npm run typecheck` and `npm run build`. GitHub Actions runs them on every push.

Unit tests cover scoring, quote verification, redaction, skill normalization, filters, scheduling conflicts, analytics and access rules.

## Known limits

- The Gemini free tier allows few requests per day per model. The client falls back to other Gemini models when one is out of quota or overloaded, then to OpenAI gpt-4o-mini, at about $0.0003 per assessment. Vectors stay on Gemini, because vectors from two models cannot be compared.
- Interview notifications are simulated in the app, as the brief allows.
- Duplicate application detection isn't built. It was the planned first cut.
