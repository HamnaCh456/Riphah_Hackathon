"use server";

import { revalidatePath, updateTag } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { requireCandidate } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { RESUME_FAILURE_MESSAGES } from "@/lib/resume/file-check";
import { applyCorrections, resumeDataSchema } from "@/lib/resume/schema";
import type { ResumeData } from "@/lib/resume/schema";
import { parseStoredResume, reassessApplications, type ResumeSkill } from "@/lib/resume/service";
import { displaySkill, normalizeSkill } from "@/lib/skills/normalize";
import { recommendationsTagFor } from "@/lib/talent/recommend-cache";

const PAGE = "/candidate/resume";

const correctionsSchema = z.object({
  resumeId: z.string().uuid(),
  data: resumeDataSchema,
  keptSkillIds: z.array(z.string().uuid()).max(300),
  addedSkills: z.array(z.string().trim().min(1).max(100)).max(100),
});

export type CorrectionInput = z.input<typeof correctionsSchema>;
type ActionResult = { ok: true } | { ok: false; error: string };
/** What the server worked out, so the page can show it without reloading the editor. */
type SaveResult = { ok: true; data: ResumeData; added: ResumeSkill[] } | { ok: false; error: string };

const SAVE_FAILED = "Your corrections could not be saved. Try again.";

export async function saveResumeCorrections(input: unknown): Promise<SaveResult> {
  const candidate = await requireCandidate();

  const parsed = correctionsSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `Check ${issue.path.at(-1) ?? "your entries"}: ${issue.message}` };
  }
  const { resumeId, data, keptSkillIds, addedSkills } = parsed.data;

  const client = db();
  const { data: resume, error: loadError } = await client
    .from("resumes")
    .select("id, raw_text, extracted, candidate_skills(id, normalized_name)")
    .eq("id", resumeId)
    .eq("candidate_id", candidate.id)
    .eq("parse_status", "parsed")
    .maybeSingle();
  if (loadError) {
    console.error("Loading resume for corrections failed", loadError);
    return { ok: false, error: SAVE_FAILED };
  }
  if (!resume) return { ok: false, error: "This resume no longer exists." };

  const merged = applyCorrections(
    data,
    resumeDataSchema.parse(resume.extracted),
    resume.raw_text,
  );

  const kept = new Set(keptSkillIds);
  const removedIds = resume.candidate_skills
    .filter((skill) => !kept.has(skill.id))
    .map((skill) => skill.id);
  const remaining = new Set(
    resume.candidate_skills
      .filter((skill) => kept.has(skill.id))
      .map((skill) => skill.normalized_name),
  );
  const newSkills = new Map<string, string>();
  for (const term of addedSkills) {
    const key = normalizeSkill(term);
    if (!remaining.has(key)) newSkills.set(key, displaySkill(term));
  }

  const results = await Promise.all([
    client
      .from("resumes")
      .update({ parsed: merged, corrected_at: new Date().toISOString() })
      .eq("id", resumeId)
      .eq("candidate_id", candidate.id),
    removedIds.length
      ? client.from("candidate_skills").delete().in("id", removedIds)
      : null,
  ]);
  const newSkillsResult = newSkills.size
    ? await client.from("candidate_skills").upsert(
        [...newSkills].map(([normalizedName, name]) => ({
          resume_id: resumeId,
          name,
          normalized_name: normalizedName,
          raw_term: null,
          excerpt: null,
          verified: false,
          source: "candidate",
        })),
        { onConflict: "resume_id,normalized_name" },
      ).select("id, name, raw_term, excerpt, verified, source")
    : null;

  const failure = results.find((r) => r?.error)?.error ?? newSkillsResult?.error;
  if (failure) {
    console.error("Saving resume corrections failed", failure);
    return { ok: false, error: SAVE_FAILED };
  }

  updateTag(recommendationsTagFor(candidate.id));
  revalidatePath(PAGE);
  return {
    ok: true,
    data: merged,
    added: (newSkillsResult?.data ?? []).map((skill) => ({
      id: skill.id,
      name: skill.name,
      rawTerm: skill.raw_term,
      excerpt: skill.excerpt,
      verified: skill.verified,
      source: skill.source,
    })),
  };
}

/** Runs extraction again on text already stored, after the AI service failed. */
export async function retryResumeParse(resumeId: string): Promise<ActionResult> {
  const candidate = await requireCandidate();
  if (!z.string().uuid().safeParse(resumeId).success) {
    return { ok: false, error: "This resume no longer exists." };
  }

  const { data: resume, error } = await db()
    .from("resumes")
    .select("id, raw_text")
    .eq("id", resumeId)
    .eq("candidate_id", candidate.id)
    .eq("parse_status", "failed")
    .maybeSingle();
  if (error) {
    console.error("Loading resume for retry failed", error);
    return { ok: false, error: RESUME_FAILURE_MESSAGES.ai_failed };
  }
  if (!resume) return { ok: false, error: "This resume no longer exists." };

  const outcome = await parseStoredResume(candidate.id, resume.id, resume.raw_text);
  if (outcome.ok) after(() => reassessApplications(outcome.applicationIds));
  updateTag(recommendationsTagFor(candidate.id));
  revalidatePath(PAGE);
  return outcome.ok
    ? { ok: true }
    : { ok: false, error: RESUME_FAILURE_MESSAGES[outcome.code] };
}
