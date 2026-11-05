import "server-only";

import { AiError, generateJson } from "@/lib/ai/gemini";
import { db } from "@/lib/db";
import type { ResumeFailureCode, ResumeFileType } from "./file-check";
import {
  PARSE_RESPONSE_SCHEMA,
  PARSE_SYSTEM_PROMPT,
  toParsedResume,
  type ParsedResume,
} from "./parse";
import { resumeDataSchema, type ResumeData } from "./schema";

export type ResumeSkill = {
  id: string;
  name: string;
  rawTerm: string | null;
  excerpt: string | null;
  verified: boolean;
  source: "ai" | "candidate";
};

export type ResumeView = {
  id: string;
  fileName: string;
  createdAt: string;
  correctedAt: string | null;
  data: ResumeData;
  skills: ResumeSkill[];
};

export type ParseOutcome =
  | { ok: true; resumeId: string }
  | { ok: false; code: ResumeFailureCode; resumeId?: string };

async function runAi(rawText: string): Promise<ParsedResume> {
  const raw = await generateJson({
    system: PARSE_SYSTEM_PROMPT,
    prompt: `<resume>\n${rawText}\n</resume>`,
    responseSchema: PARSE_RESPONSE_SCHEMA,
  });
  const parsed = toParsedResume(raw, rawText);
  if (!parsed) throw new AiError("The AI answer did not match the expected shape");
  return parsed;
}

/** Runs extraction for a stored row. A failure keeps the text, so a retry needs no new upload. */
export async function parseStoredResume(
  resumeId: string,
  rawText: string,
): Promise<ParseOutcome> {
  const client = db();

  let parsed: ParsedResume;
  try {
    parsed = await runAi(rawText);
  } catch (error) {
    console.error("Resume AI extraction failed", error);
    await client
      .from("resumes")
      .update({ parse_status: "failed", failure_code: "ai_failed" })
      .eq("id", resumeId);
    return { ok: false, code: "ai_failed", resumeId };
  }

  if (!parsed.isResume) {
    await client.from("resumes").delete().eq("id", resumeId);
    return { ok: false, code: "not_a_resume" };
  }

  const { error: skillsError } = await client.from("candidate_skills").upsert(
    parsed.skills.map((skill) => ({
      resume_id: resumeId,
      name: skill.name,
      normalized_name: skill.normalizedName,
      raw_term: skill.rawTerm,
      excerpt: skill.excerpt,
      verified: skill.verified,
      source: "ai",
    })),
    { onConflict: "resume_id,normalized_name" },
  );
  const { error } = skillsError
    ? { error: skillsError }
    : await client
        .from("resumes")
        .update({
          parse_status: "parsed",
          failure_code: null,
          extracted: parsed.data,
          parsed: parsed.data,
        })
        .eq("id", resumeId);

  if (error) {
    console.error("Saving parsed resume failed", error);
    await client
      .from("resumes")
      .update({ parse_status: "failed", failure_code: "ai_failed" })
      .eq("id", resumeId);
    return { ok: false, code: "ai_failed", resumeId };
  }

  return { ok: true, resumeId };
}

export async function storeAndParseResume(args: {
  candidateId: string;
  fileName: string;
  fileType: ResumeFileType;
  rawText: string;
}): Promise<ParseOutcome> {
  const { data, error } = await db()
    .from("resumes")
    .insert({
      candidate_id: args.candidateId,
      file_name: args.fileName.slice(0, 255),
      file_type: args.fileType,
      raw_text: args.rawText,
    })
    .select("id")
    .single();
  if (error) {
    console.error("Saving resume failed", error);
    return { ok: false, code: "ai_failed" };
  }

  return parseStoredResume(data.id, args.rawText);
}

/** The newest successfully read resume, always scoped to this candidate. */
export async function getCurrentResume(
  candidateId: string,
): Promise<ResumeView | null> {
  const { data, error } = await db()
    .from("resumes")
    .select(
      "id, file_name, created_at, corrected_at, parsed, candidate_skills(id, name, raw_term, excerpt, verified, source, created_at)",
    )
    .eq("candidate_id", candidateId)
    .eq("parse_status", "parsed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not load the resume: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    fileName: data.file_name,
    createdAt: data.created_at,
    correctedAt: data.corrected_at,
    data: resumeDataSchema.parse(data.parsed),
    skills: [...data.candidate_skills]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((skill) => ({
        id: skill.id,
        name: skill.name,
        rawTerm: skill.raw_term,
        excerpt: skill.excerpt,
        verified: skill.verified,
        source: skill.source,
      })),
  };
}

/** The newest attempt, if it failed in a way a retry can fix and is newer than the current resume. */
export async function getRetryableResume(
  candidateId: string,
): Promise<{ id: string; fileName: string } | null> {
  const { data, error } = await db()
    .from("resumes")
    .select("id, file_name, parse_status")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not load the resume: ${error.message}`);
  if (data?.parse_status !== "failed") return null;
  return { id: data.id, fileName: data.file_name };
}
