"use server";

import { revalidatePath } from "next/cache";

import { AiError } from "@/lib/ai/gemini";
import { requireRecruiter } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { extractJobFromDescription, type ExtractedJob } from "@/lib/jobs/extract";
import { getOwnedJob, type JobStatus } from "@/lib/jobs/queries";
import {
  fieldErrors,
  jobInputSchema,
  type JobFieldErrors,
  type JobInput,
} from "@/lib/jobs/schema";

export type SaveJobResult =
  | { ok: true; jobId: string }
  | { ok: false; error: string; fieldErrors?: JobFieldErrors };

const SAVE_FAILED = "The job could not be saved. Try again.";

function jobRow(job: JobInput) {
  return {
    title: job.title,
    department: job.department,
    location: job.location,
    employment_type: job.employmentType,
    salary: job.salary,
    description: job.description,
  };
}

function requirementRow(
  jobId: string,
  requirement: JobInput["requirements"][number],
) {
  return {
    job_id: jobId,
    kind: requirement.kind,
    label: requirement.label,
    importance: requirement.importance,
    is_required: requirement.isRequired,
  };
}

/** Creates the job when jobId is null, otherwise updates a job this recruiter owns. */
export async function saveJob(
  jobId: string | null,
  input: unknown,
): Promise<SaveJobResult> {
  const recruiter = await requireRecruiter();

  const parsed = jobInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Fix the marked fields and save again.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const result = jobId
    ? await updateJob(jobId, recruiter.id, parsed.data)
    : await createJob(recruiter.id, parsed.data);

  if (result.ok) revalidatePath("/recruiter/jobs");
  return result;
}

async function createJob(
  recruiterId: string,
  job: JobInput,
): Promise<SaveJobResult> {
  const client = db();
  const { data, error } = await client
    .from("jobs")
    .insert({ ...jobRow(job), recruiter_id: recruiterId })
    .select("id")
    .single();
  if (error) {
    console.error("Job insert failed", error);
    return { ok: false, error: SAVE_FAILED };
  }

  const { error: requirementsError } = await client
    .from("job_requirements")
    .insert(job.requirements.map((r) => requirementRow(data.id, r)));
  if (requirementsError) {
    // Don't leave a job behind with no requirements.
    console.error("Requirement insert failed", requirementsError);
    await client.from("jobs").delete().eq("id", data.id);
    return { ok: false, error: SAVE_FAILED };
  }

  return { ok: true, jobId: data.id };
}

/**
 * Keeps the ids of requirements that still exist, because later modules attach assessments to them.
 * Saving twice gives the same result, so a retry after a failure is safe.
 */
async function updateJob(
  jobId: string,
  recruiterId: string,
  job: JobInput,
): Promise<SaveJobResult> {
  const existing = await getOwnedJob(jobId, recruiterId);
  if (!existing) return { ok: false, error: "This job no longer exists." };

  const client = db();
  const { error } = await client
    .from("jobs")
    .update({ ...jobRow(job), updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("recruiter_id", recruiterId);

  const existingIds = new Set(existing.requirements.map((r) => r.id));
  const kept = job.requirements.filter((r) => r.id && existingIds.has(r.id));
  const added = job.requirements.filter((r) => !r.id || !existingIds.has(r.id));
  const keptIds = new Set(kept.map((r) => r.id));
  const removedIds = [...existingIds].filter((id) => !keptIds.has(id));

  const results = await Promise.all([
    ...kept.map((r) =>
      client
        .from("job_requirements")
        .update(requirementRow(jobId, r))
        .eq("id", r.id!)
        .eq("job_id", jobId),
    ),
    removedIds.length
      ? client.from("job_requirements").delete().in("id", removedIds)
      : null,
    added.length
      ? client
          .from("job_requirements")
          .insert(added.map((r) => requirementRow(jobId, r)))
      : null,
  ]);

  const failure = error ?? results.find((r) => r?.error)?.error;
  if (failure) {
    console.error("Job update failed", failure);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath(`/recruiter/jobs/${jobId}/edit`);
  return { ok: true, jobId };
}

export async function setJobStatus(
  jobId: string,
  status: JobStatus,
): Promise<{ ok: boolean; error?: string }> {
  const recruiter = await requireRecruiter();
  if (status !== "open" && status !== "closed") {
    return { ok: false, error: "Unknown job status." };
  }
  if (!(await getOwnedJob(jobId, recruiter.id))) {
    return { ok: false, error: "This job no longer exists." };
  }

  const { error } = await db()
    .from("jobs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("recruiter_id", recruiter.id);
  if (error) {
    console.error("Job status update failed", error);
    return {
      ok: false,
      error: `The job could not be ${status === "open" ? "reopened" : "closed"}. Try again.`,
    };
  }

  revalidatePath("/recruiter/jobs");
  revalidatePath(`/recruiter/jobs/${jobId}/edit`);
  return { ok: true };
}

export type ExtractResult =
  | { ok: true; job: ExtractedJob }
  | { ok: false; error: string };

/** Suggestions only. Nothing is stored until the recruiter presses Save. */
export async function extractRequirements(
  description: string,
): Promise<ExtractResult> {
  await requireRecruiter();

  const text = typeof description === "string" ? description.trim() : "";
  if (text.length < 20) {
    return { ok: false, error: "Paste a job description of at least 20 characters first." };
  }
  if (text.length > 20_000) {
    return { ok: false, error: "The job description must be 20,000 characters or fewer." };
  }

  try {
    return { ok: true, job: await extractJobFromDescription(text) };
  } catch (error) {
    if (!(error instanceof AiError)) console.error(error);
    return {
      ok: false,
      error: "The description could not be read right now. Try again, or fill in the fields yourself.",
    };
  }
}
