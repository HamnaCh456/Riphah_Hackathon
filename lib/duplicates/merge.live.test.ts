import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { orderedPair } from "./decide-logic";

// Real database, no AI. Run with: RUN_LIVE=1 vitest run lib/duplicates/merge.live.test.ts
const LIVE = Boolean(process.env.RUN_LIVE);

function loadEnvFile() {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

describe.runIf(LIVE)("merging candidates against the real database", () => {
  const users: string[] = [];
  const jobs: string[] = [];
  const resumes: string[] = [];
  let admin: ReturnType<typeof createClient>;
  let load: typeof import("./load");
  let recruiter: string;
  let job: string;

  async function makeUser(role: "recruiter" | "candidate") {
    const { data, error } = await admin.auth.admin.createUser({
      email: `test+merge-${randomUUID()}@example.invalid`,
      password: randomUUID(),
      email_confirm: true,
      user_metadata: { role, full_name: `Test ${role}` },
    });
    if (error) throw error;
    users.push(data.user.id);
    return data.user.id;
  }

  async function applicant(phone: string, text: string) {
    const candidate = await makeUser("candidate");
    const resume = await admin
      .from("resumes")
      .insert({
        candidate_id: candidate,
        file_name: "t.pdf",
        file_type: "pdf",
        raw_text: text,
        parse_status: "parsed",
        parsed: { name: "Test", phone },
      } as never)
      .select("id")
      .single();
    if (resume.error) throw resume.error;
    const resumeId = (resume.data as { id: string }).id;
    resumes.push(resumeId);
    const application = await admin
      .from("applications")
      .insert({ job_id: job, candidate_id: candidate, resume_id: resumeId } as never)
      .select("id")
      .single();
    if (application.error) throw application.error;
    return { candidate, applicationId: (application.data as { id: string }).id };
  }

  const merge = (keep: string, other: string, by: string) =>
    admin.rpc("merge_candidates" as never, {
      p_keep: keep,
      p_other: other,
      p_recruiter: by,
    } as never);
  const mergedInto = async (id: string) =>
    (
      (await admin.from("profiles").select("merged_into").eq("id", id).single()).data as unknown as {
        merged_into: string | null;
      }
    ).merged_into;

  beforeAll(async () => {
    loadEnvFile();
    admin = createClient(process.env.SUPABASE_URL!, process.env.ANON_API_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    load = await import("./load");
    recruiter = await makeUser("recruiter");
    const made = await admin
      .from("jobs")
      .insert({
        recruiter_id: recruiter,
        title: "Merge test job",
        description: "Test job.",
        status: "closed",
      } as never)
      .select("id")
      .single();
    if (made.error) throw made.error;
    job = (made.data as { id: string }).id;
    jobs.push(job);
  }, 60_000);

  afterAll(async () => {
    if (!admin) return;
    await admin.from("duplicate_decisions").delete().in("decided_by", users);
    await admin.from("profiles").update({ merged_into: null } as never).in("id", users);
    for (const id of jobs) {
      await admin.from("applications").delete().eq("job_id", id);
      await admin.from("jobs").delete().eq("id", id);
    }
    for (const id of resumes) await admin.from("resumes").delete().eq("id", id);
    for (const id of users) await admin.auth.admin.deleteUser(id);
  }, 60_000);

  it("flags a phone written differently, and merges nothing by itself", async () => {
    const a = await applicant("+92 300 1112233", "Sold shoes in Lahore for years");
    const b = await applicant("0300-1112233", "Wrote compilers in Karachi for years");
    const { pairs } = await load.loadDuplicates(admin as never, recruiter);
    const pair = pairs.find((p) =>
      [p.a.candidateId, p.b.candidateId].every((id) => [a.candidate, b.candidate].includes(id)),
    );
    expect(pair?.reasons).toContain("Same phone number");
    expect(await mergedInto(a.candidate)).toBeNull();
    expect(await mergedInto(b.candidate)).toBeNull();
  }, 60_000);

  it("links on approval, moves no application, and can't be repeated", async () => {
    const a = await applicant("+92 301 2223344", "Sold shoes in Multan for years");
    const b = await applicant("0301-2223344", "Wrote compilers in Quetta for years");
    const { error } = await merge(a.candidate, b.candidate, recruiter);
    expect(error).toBeNull();
    expect(await mergedInto(b.candidate)).toBe(a.candidate);

    const application = await admin
      .from("applications")
      .select("candidate_id")
      .eq("id", b.applicationId)
      .single();
    expect((application.data as unknown as { candidate_id: string }).candidate_id).toBe(b.candidate);

    const [candidate_a, candidate_b] = orderedPair(a.candidate, b.candidate);
    const decision = await admin
      .from("duplicate_decisions")
      .select("decision, kept_candidate, decided_by")
      .eq("candidate_a", candidate_a)
      .eq("candidate_b", candidate_b)
      .single();
    expect(decision.data).toEqual({
      decision: "merged",
      kept_candidate: a.candidate,
      decided_by: recruiter,
    });

    const again = await merge(a.candidate, b.candidate, recruiter);
    expect(again.error?.message).toMatch(/already decided/);
    const { pairs } = await load.loadDuplicates(admin as never, recruiter);
    expect(pairs.some((p) => p.b.candidateId === b.candidate)).toBe(false);
  }, 60_000);

  it("refuses a candidate, and a recruiter with no applications from these people", async () => {
    const a = await applicant("+92 302 3334455", "Sold shoes in Sialkot for years");
    const b = await applicant("0302-3334455", "Wrote compilers in Peshawar for years");
    const candidate = await makeUser("candidate");
    const stranger = await makeUser("recruiter");
    expect((await merge(a.candidate, b.candidate, candidate)).error?.message).toMatch(/not valid/);
    expect((await merge(a.candidate, b.candidate, stranger)).error?.message).toMatch(/not valid/);
    expect(await mergedInto(b.candidate)).toBeNull();
  }, 60_000);

  it("the browser's signed-in roles can't call the merge", async () => {
    const anon = createClient(
      process.env.SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "missing",
      { auth: { persistSession: false } },
    );
    const { error } = await anon.rpc("merge_candidates" as never, {
      p_keep: recruiter,
      p_other: recruiter,
      p_recruiter: recruiter,
    } as never);
    expect(error).not.toBeNull();
  }, 30_000);
});
