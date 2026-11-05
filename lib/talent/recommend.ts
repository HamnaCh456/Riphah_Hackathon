import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { embedTexts } from "@/lib/ai/gemini";
import { ensureChunks } from "@/lib/matching/run";
import { cosineSimilarity } from "@/lib/trust/cosine";

import {
  buildProfileText,
  matchSkills,
  toPublicRecommendation,
  type PublicRecommendation,
} from "./recommend-logic";

const MAX_RECOMMENDATIONS = 5;
const MIN_JOB_SIMILARITY = 0.55;
const MAX_JOBS_CONSIDERED = 50;

export type Recommendations = {
  status: "ok" | "needs_resume" | "needs_verified_skills";
  jobs: PublicRecommendation[];
};

/** Rule 8: the result holds no score, only the job and which of the candidate's skills fit. */
export async function recommendJobs(
  db: SupabaseClient,
  candidateId: string,
  interests: string[],
): Promise<Recommendations> {
  const { data: resume, error: resumeError } = await db
    .from("resumes")
    .select("id, raw_text, parsed")
    .eq("candidate_id", candidateId)
    .eq("parse_status", "parsed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (resumeError) throw resumeError;
  if (!resume) return { status: "needs_resume", jobs: [] };

  const { data: skillRows, error: skillError } = await db
    .from("candidate_skills")
    .select("name")
    .eq("resume_id", resume.id)
    .eq("verified", true);
  if (skillError) throw skillError;
  const skills = [...new Set(skillRows.map((row) => row.name as string))];
  if (skills.length === 0) return { status: "needs_verified_skills", jobs: [] };

  const [jobsResult, appliedResult] = await Promise.all([
    db
      .from("jobs")
      .select("id, title, description, job_requirements(kind, label)")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(MAX_JOBS_CONSIDERED),
    db.from("applications").select("job_id").eq("candidate_id", candidateId),
  ]);
  if (jobsResult.error) throw jobsResult.error;
  if (appliedResult.error) throw appliedResult.error;
  const applied = new Set(appliedResult.data.map((row) => row.job_id as string));
  const jobs = jobsResult.data.filter((job) => !applied.has(job.id));
  if (jobs.length === 0) return { status: "ok", jobs: [] };

  await ensureChunks(
    db as never,
    resume.id,
    resume.raw_text,
    (resume.parsed as { name?: string } | null)?.name ?? null,
  );
  const { data: projects, error: projectError } = await db
    .from("resume_chunks")
    .select("content")
    .eq("resume_id", resume.id)
    .eq("section", "project");
  if (projectError) throw projectError;

  const labelsFor = (job: (typeof jobs)[number]) =>
    job.job_requirements
      .filter((r) => r.kind === "skill")
      .map((r) => r.label as string);
  const profile = buildProfileText(
    skills,
    interests,
    projects.map((p) => p.content as string),
  );
  const [[profileVector], jobVectors] = await Promise.all([
    embedTexts([profile], "RETRIEVAL_QUERY"),
    embedTexts(
      jobs.map(
        (job) =>
          `${job.title}\n${job.description}\nSkills: ${labelsFor(job).join(", ")}`,
      ),
      "RETRIEVAL_DOCUMENT",
    ),
  ]);

  const top = jobs
    .map((job, i) => ({
      job,
      similarity: cosineSimilarity(profileVector, jobVectors[i]),
    }))
    .filter((item) => item.similarity >= MIN_JOB_SIMILARITY)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, MAX_RECOMMENDATIONS);
  if (top.length === 0) return { status: "ok", jobs: [] };

  const labels = [...new Set(top.flatMap(({ job }) => labelsFor(job)))];
  const [skillVectors, labelVectors] = await Promise.all([
    embedTexts(skills, "RETRIEVAL_DOCUMENT"),
    labels.length ? embedTexts(labels, "RETRIEVAL_DOCUMENT") : Promise.resolve([]),
  ]);
  const fits = matchSkills(labels, labelVectors, skills, skillVectors);

  return {
    status: "ok",
    jobs: top.map(({ job, similarity }) =>
      toPublicRecommendation({
        jobId: job.id,
        title: job.title,
        description: job.description,
        similarity,
        matchedSkills: labelsFor(job).filter((label) => fits.has(label)),
        otherRequirements: labelsFor(job).filter((label) => !fits.has(label)),
      }),
    ),
  };
}
