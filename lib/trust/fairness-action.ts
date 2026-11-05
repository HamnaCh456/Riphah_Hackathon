"use server";

import { z } from "zod";

import { COMPARISON_MODELS } from "@/lib/ai/gemini";
import { requireRecruiter } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { redact } from "@/lib/matching/redact";
import { buildRequirements } from "@/lib/matching/requirements";

import { runFairnessCheck, tryEachModel, type FairnessReport } from "./fairness-check";
import { scoreRedactedText } from "./score-text";

export type FairnessActionResult =
  | { ok: true; report: FairnessReport }
  | { ok: false; message: string };

const NOT_FOUND = "This application was not found.";

export async function runFairnessAction(
  applicationId: string,
): Promise<FairnessActionResult> {
  const profile = await requireRecruiter();
  const parsedId = z.string().uuid().safeParse(applicationId);
  if (!parsedId.success) return { ok: false, message: NOT_FOUND };

  try {
    const admin = db();
    const { data: application, error } = await admin
      .from("applications")
      .select("job_id, resume:resumes(raw_text, parsed), job:jobs(title, recruiter_id)")
      .eq("id", parsedId.data)
      .maybeSingle();
    if (error) throw error;
    const job = application?.job as unknown as
      | { title: string; recruiter_id: string }
      | undefined;
    // The secret key bypasses database rules, so ownership is checked here.
    if (!application || !job || job.recruiter_id !== profile.id) {
      return { ok: false, message: NOT_FOUND };
    }

    const resume = application.resume as unknown as {
      raw_text: string;
      parsed: { name?: string } | null;
    };
    const { data: rows, error: rowsError } = await admin
      .from("job_requirements")
      .select("id, kind, label, importance, is_required")
      .eq("job_id", application.job_id);
    if (rowsError) throw rowsError;
    const requirements = buildRequirements(job.title, rows);
    if (requirements.length === 0) {
      return { ok: false, message: "This job has no requirements to check against." };
    }

    const redacted = redact(resume.raw_text, resume.parsed?.name ?? null);
    const report = await tryEachModel(COMPARISON_MODELS, (model) =>
      runFairnessCheck(redacted, (text) =>
        scoreRedactedText(job.title, requirements, text, model),
      ),
    );
    return { ok: true, report };
  } catch (error) {
    console.error("Fairness check failed", error);
    return {
      ok: false,
      message: "The fairness check could not finish. Please try again.",
    };
  }
}
