import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Real Gemini and real database. Run with: RUN_LIVE=1 vitest run lib/talent/search.live.test.ts
const LIVE = Boolean(process.env.RUN_LIVE);

function loadEnvFile() {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

const DIFFERENT_WORDING = `Noor Ahmed
noor.fixture@example.invalid
Gender: Female

Experience
Software Engineer, Lahore Logistics, 2021 - 2024
Designed HTTP JSON services with Flask and FastAPI that partner apps call to create shipments.
Wrote pytest suites and data pipelines using pandas.`;

const UNRELATED = `Sana Malik
sana.fixture@example.invalid

Experience
Marketing Manager, Islamabad Retail, 2018 - 2024
Planned seasonal campaigns, managed a social media budget and ran customer focus groups.
Wrote brand guidelines and press releases.`;

const QUERY = "Python developers with REST API experience";

describe.runIf(LIVE)("talent search with real AI and data", () => {
  const userIds: string[] = [];
  const jobIds: string[] = [];
  const resumeIds: string[] = [];
  let admin: ReturnType<typeof createClient>;
  let recruiter: string;
  let strangerRecruiter: string;
  let different: string;
  let unrelated: string;
  // Imported after the env file loads, because these read keys on use.
  let search: typeof import("./search");

  async function makeUser(role: "recruiter" | "candidate", fullName: string) {
    const { data, error } = await admin.auth.admin.createUser({
      email: `test+search-${randomUUID()}@example.invalid`,
      password: randomUUID(),
      email_confirm: true,
      user_metadata: { role, full_name: fullName },
    });
    if (error) throw error;
    userIds.push(data.user.id);
    return data.user.id;
  }

  async function applicant(jobId: string, name: string, rawText: string) {
    const { ensureChunks } = await import("@/lib/matching/run");
    const candidateId = await makeUser("candidate", name);
    const resume = await admin
      .from("resumes")
      .insert({
        candidate_id: candidateId,
        file_name: "test.pdf",
        file_type: "pdf",
        raw_text: rawText,
        parse_status: "parsed",
        parsed: { name },
      } as never)
      .select("id")
      .single();
    if (resume.error) throw resume.error;
    const resumeId = (resume.data as { id: string }).id;
    resumeIds.push(resumeId);
    await ensureChunks(admin as never, resumeId, rawText, name);
    const application = await admin.from("applications").insert({
      job_id: jobId,
      candidate_id: candidateId,
      resume_id: resumeId,
    } as never);
    if (application.error) throw application.error;
    return candidateId;
  }

  beforeAll(async () => {
    loadEnvFile();
    admin = createClient(process.env.SUPABASE_URL!, process.env.ANON_API_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    search = await import("./search");
    recruiter = await makeUser("recruiter", "Test Recruiter");
    strangerRecruiter = await makeUser("recruiter", "Other Recruiter");
    const job = await admin
      .from("jobs")
      .insert({
        recruiter_id: recruiter,
        title: "Search test job",
        description: "Test job for talent search.",
        status: "closed",
      } as never)
      .select("id")
      .single();
    if (job.error) throw job.error;
    const jobId = (job.data as { id: string }).id;
    jobIds.push(jobId);
    different = await applicant(jobId, "Noor Ahmed", DIFFERENT_WORDING);
    unrelated = await applicant(jobId, "Sana Malik", UNRELATED);
  }, 120_000);

  afterAll(async () => {
    if (!admin) return;
    for (const jobId of jobIds) {
      await admin.from("applications").delete().eq("job_id", jobId);
      await admin.from("jobs").delete().eq("id", jobId);
    }
    for (const resumeId of resumeIds) {
      await admin.from("resumes").delete().eq("id", resumeId);
    }
    for (const id of userIds) await admin.auth.admin.deleteUser(id);
  }, 60_000);

  it("the fixture really avoids the search words", () => {
    expect(DIFFERENT_WORDING).not.toMatch(/python|\brest\b/i);
  });

  it("finds the candidate whose resume uses different wording, with evidence", async () => {
    const { facets, results } = await search.searchTalent(admin as never, recruiter, QUERY);
    console.log("facets", facets);
    const found = results.find((r) => r.candidateId === different);
    expect(found).toBeDefined();
    expect(found!.evidence.some((e) => /Flask|FastAPI/.test(e.excerpt))).toBe(true);
  }, 60_000);

  it("filters on years of experience", async () => {
    const { results } = await search.searchTalent(admin as never, recruiter, "5+ years of experience");
    const ids = results.map((r) => r.candidateId);
    expect(ids).toContain(unrelated); // 2018 - 2024
    expect(ids).not.toContain(different); // 2021 - 2024
  }, 60_000);

  it("finds experience in a field and leaves out everyone else", async () => {
    const logistics = await search.searchTalent(admin as never, recruiter, "experience in logistics software");
    expect(logistics.results.map((r) => r.candidateId)).toEqual([different]);
    const marketing = await search.searchTalent(admin as never, recruiter, "marketing managers");
    expect(marketing.results.map((r) => r.candidateId)).toEqual([unrelated]);
  }, 60_000);

  it("shows nobody when years of a skill aren't met", async () => {
    const { results } = await search.searchTalent(admin as never, recruiter, "10 years of Python development");
    expect(results).toEqual([]);
  }, 60_000);

  it("shows nobody for work no one has done", async () => {
    const { results, partial } = await search.searchTalent(admin as never, recruiter, "registered nurse with ICU experience");
    expect([...results, ...partial]).toEqual([]);
  }, 60_000);

  it("leaves out the unrelated candidate", async () => {
    const { results } = await search.searchTalent(admin as never, recruiter, QUERY);
    expect(results.map((r) => r.candidateId)).not.toContain(unrelated);
  }, 60_000);

  it("does not show another recruiter's applicants", async () => {
    const { results } = await search.searchTalent(admin as never, strangerRecruiter, QUERY);
    expect(results).toEqual([]);
  }, 60_000);

  it("keeps personal details out of the evidence, and ignores a personal query", async () => {
    const { results } = await search.searchTalent(admin as never, recruiter, QUERY);
    expect(JSON.stringify(results.flatMap((r) => r.evidence))).not.toMatch(
      /Noor|Gender: Female|noor\.fixture/,
    );
    const byGender = await search.searchTalent(admin as never, recruiter, "female candidates");
    expect(byGender.results).toEqual([]);
  }, 60_000);
});
