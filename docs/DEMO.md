# Demo click script

Date: 2026-11-05. All people and companies in the demo data are fictional.

## Before you start

1. Run `node scripts/seed-demo.mjs`. It creates the logins and resets their passwords. It never creates scores.
2. Open the live site in one normal window and one private window, so recruiter and candidate stay signed in separately.
3. For a clean rehearsal, post a new job. Each candidate can apply once per job.

| Who | Email | Password | Resume to upload |
|---|---|---|---|
| Recruiter | `recruiter@demo.test` | `DemoRiphah!2026` | none |
| Candidate, strong | `hira@demo.test` | `DemoRiphah!2026` | `demo/resumes/hira-malik-strong.pdf` |
| Candidate, different wording | `omar@demo.test` | `DemoRiphah!2026` | `demo/resumes/omar-tariq-semantic.pdf` |
| Candidate, real gap | `zara@demo.test` | `DemoRiphah!2026` | `demo/resumes/zara-noor-weak.pdf` |

## 1. Recruiter posts the job

1. Sign in as the recruiter at `/auth/login`, then open `/recruiter/jobs/new`.
2. Paste this description and fill the form from it:

   > Backend Developer, Lahore, full time. You will build and maintain web APIs. Required: Python, Django, PostgreSQL and Docker. At least 2 years of backend experience. Bachelor's degree in Computer Science or similar.

3. **Show:** the fields fill in from the text. Check that all four skills are there, then save.

## 2. Three candidates apply

For each candidate, in the private window:

1. Sign in and open `/candidate/resume`. Upload their PDF.
2. **Show once:** each extracted skill has its supporting resume text.
3. Open `/candidate/jobs` and apply to Backend Developer.
4. Sign out before the next candidate.

## 3. Recruiter reviews the evidence

1. In `/recruiter/jobs`, open the job's applicants at `/recruiter/jobs/<job id>/applicants`. Wait for the scores to appear.
2. **Expect:** Hira is first, then Omar, then Zara. Read the real scores out, because they come from the live AI.
3. **Open Omar:** his resume never says Python, Django, PostgreSQL or Docker. "Postgres" and "containerised every service" still earn credit, which is the semantic match. Each result shows the resume text behind it.
4. **Open Zara:** Docker shows as confirmed missing because her resume says so. Django shows as not mentioned. Point out that these are different results.
5. **Say:** the AI recommends and the recruiter decides. Nothing has been shortlisted yet.

## 4. Recruiter shortlists one applicant

1. Click Hira in the applicants table, then press Shortlist.
2. **Show:** the change appears in the history.
3. **Optional:** in the private window, sign in as Hira. She sees her status but no score, gaps or notes.

## 5. Interview questions and scheduling

1. On Hira's page, click Interview questions, then Generate questions.
2. **Show:** some questions mention her real projects, such as Clinic Booking API.
3. Open `/recruiter/applications/<application id>/interview` and schedule an interview. If no interviewer is saved yet, choose Add new interviewer and type a name.
4. **Show:** it appears in `/recruiter/interviews`.

## 6. Dashboard updates

1. Open `/recruiter/analytics`.
2. **Show:** the applicant, shortlist and interview counts include what you just did.

## If something goes wrong

- **A score doesn't appear, or the AI failed:** open that applicant and press retry. The app never invents a score, so this is honest behaviour to show.
- **"Already applied":** post a new job and apply to that one.
- **A login fails:** run the seed script again.

## Before the real demo

- Resumes for all three demo candidates are already parsed. Skip the upload to save AI quota, unless you want to show it.
- The Gemini free tier allows few requests per day per model. If they all run out, the app falls back to OpenAI automatically, at about $0.0003 per assessment. Embeddings still need Gemini.
- "Run fairness check" uses more AI calls and hasn't been run live, so leave it out of the main demo.
