// e2e/helpers.ts
// Test data only. Each run uses its own accounts, so nothing appears on a real recruiter's dashboard.
// The fixed assessment row below stands in for module 5's output so tests don't depend on Gemini.
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

type Status = "submitted" | "parsed" | "assessed" | "in_review" | "shortlisted" | "interview" | "selected" | "rejected";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY ?? process.env.ANON_API_KEY!,
  { auth: { persistSession: false } },
);

type Account = { id: string; email: string; password: string };

async function createAccount(role: "recruiter" | "candidate", fullName: string): Promise<Account> {
  const email = `e2e+${role}-${randomUUID()}@example.invalid`;
  const password = randomUUID();
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { role, full_name: fullName },
  });
  if (error) throw error;
  return { id: data.user.id, email, password };
}

const accounts = {
  recruiter: createAccount("recruiter", "E2E Recruiter"),
  candidate: createAccount("candidate", "E2E Candidate"),
};

export async function loginAs(page: Page, who: "recruiter" | "candidate"): Promise<void> {
  const account = await accounts[who];
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/"));
}

function must<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data as T;
}

/**
 * A fresh job and application in the given status, with a Docker gap and one project.
 * Uses a new candidate unless useLoginCandidate is set.
 */
export async function seedApplication(args: { status: Status; useLoginCandidate?: boolean }) {
  const recruiter = await accounts.recruiter;
  const candidateName = args.useLoginCandidate ? "E2E Candidate" : `E2E Applicant ${randomUUID().slice(0, 8)}`;
  const candidate = args.useLoginCandidate ? await accounts.candidate : await createAccount("candidate", candidateName);

  const job = must(await admin.from("jobs").insert({
    recruiter_id: recruiter.id, title: `Backend Developer ${randomUUID().slice(0, 8)}`,
    description: "Build REST APIs with Python, Django, PostgreSQL and Docker.", status: "open",
  }).select("id, title").single()) as { id: string; title: string };

  must(await admin.from("job_requirements").insert(["Python", "Django", "PostgreSQL", "Docker"].map((label) => ({
    job_id: job.id, kind: "skill", label, importance: 4, is_required: true,
  }))));

  const project = "Shopwise\nBuilt the Shopwise order API with Django REST Framework and PostgreSQL.";
  const resume = must(await admin.from("resumes").insert({
    candidate_id: candidate.id, file_name: "resume.pdf", file_type: "pdf", raw_text: project,
    parse_status: "parsed",
    parsed: {
      name: candidateName, email: "", phone: "", location: "", links: "", unverifiedContact: [],
      experience: [], projects: [], education: [],
    },
  }).select("id").single()) as { id: string };

  must(await admin.from("candidate_skills").insert({
    resume_id: resume.id, name: "Django", normalized_name: "django", raw_term: "Django",
    excerpt: "Built the Shopwise order API with Django REST Framework", verified: true, source: "ai",
  }));

  must(await admin.from("resume_chunks").insert({
    resume_id: resume.id, section: "project", ordinal: 0, content: project, start_offset: 0,
  }));

  const application = must(await admin.from("applications").insert({
    job_id: job.id, candidate_id: candidate.id, resume_id: resume.id, status: args.status,
  }).select("id").single()) as { id: string };

  const path: Status[] = args.status === "submitted" ? ["submitted"] : ["submitted", args.status];
  must(await admin.from("application_status_events").insert(path.map((to_status) => ({
    application_id: application.id, to_status, actor_kind: "system",
  }))));

  const assessment = must(await admin.from("assessments").insert({
    application_id: application.id, input_hash: randomUUID(), status: "complete", model: "e2e-fixture",
    score: 60, ceiling: 90, completed_at: new Date().toISOString(),
  }).select("id").single()) as { id: string };

  must(await admin.from("assessment_requirements").insert({
    assessment_id: assessment.id, requirement_key: "skill:docker", component: "skill", label: "Docker",
    importance: 4, is_required: true, status: "no_evidence", explanation: "The resume does not mention Docker.",
  }));

  return { applicationId: application.id, jobId: job.id, jobTitle: job.title, candidateName, candidateId: candidate.id, resumeId: resume.id };
}

export async function resumesOf(candidateId: string): Promise<string[]> {
  const rows = must(await admin.from("resumes").select("id").eq("candidate_id", candidateId)) as { id: string }[];
  return rows.map((row) => row.id);
}

export async function applicationResume(applicationId: string): Promise<string> {
  const row = must(await admin.from("applications").select("resume_id").eq("id", applicationId).single()) as { resume_id: string };
  return row.resume_id;
}
