# Recruitment & Talent Intelligence Platform

Built from the [Next.js and Supabase starter](https://vercel.com/templates/next.js/supabase).

## Run it

1. Copy `.env.example` to `.env.local` and fill in the Supabase URL and publishable key.
2. Apply `supabase/migrations/` to the project.
3. `npm install`, then `npm run dev`, and open http://localhost:3000.

## Checks

`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`

## Accounts and access

- People register as a recruiter or a candidate at `/auth/sign-up`.
- The role is stored in `public.profiles`, which users can read but not change.
- `proxy.ts` blocks the wrong role from `/recruiter` and `/candidate`.
- Every page and server action also calls `requireRecruiter()` or `requireCandidate()` from
  `lib/auth/guards.ts`.
