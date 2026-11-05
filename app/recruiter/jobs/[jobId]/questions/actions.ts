// app/recruiter/jobs/[jobId]/questions/actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { generateJson } from '@/lib/ai/gemini';
import { requireRecruiter } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { generateQuestionSet } from '@/lib/interview-questions/generate';
import { getOwnedJob } from '@/lib/jobs/queries';

export type ActionResult = { ok: true } | { ok: false; error: string };

const NOT_ALLOWED = "You can't change questions for this job.";
const ALREADY_GENERATED = 'This job already has its questions.';

function refresh(jobId: string) {
  revalidatePath(`/recruiter/jobs/${jobId}/questions`);
}

/** The only code that writes a set, and only a recruiter's click on Generate questions reaches it. */
export async function generateSetAction(jobId: string): Promise<ActionResult> {
  const recruiter = await requireRecruiter();
  const job = await getOwnedJob(jobId, recruiter.id);
  if (!job) return { ok: false, error: NOT_ALLOWED };

  try {
    const existing = await db().from('job_interview_questions')
      .select('id', { count: 'exact', head: true }).eq('job_id', jobId);
    if (existing.error) throw existing.error;
    if (existing.count) return { ok: false, error: ALREADY_GENERATED };

    const drafts = await generateQuestionSet({
      jobTitle: job.title,
      jobDescription: job.description,
      skills: job.requirements.filter((r) => r.kind === 'skill').map((r) => ({
        skill: r.label, importance: r.isRequired ? 'required' as const : 'preferred' as const,
      })),
    }, generateJson);

    const { data: saved, error } = await db().rpc('save_job_questions', {
      p_job_id: jobId, p_created_by: recruiter.id, p_questions: drafts,
    });
    if (error) throw error;
    if (!saved) return { ok: false, error: ALREADY_GENERATED };
  } catch (error) {
    console.error('generateSetAction', error);
    return { ok: false, error: "Couldn't write questions. Try again." };
  }
  refresh(jobId);
  return { ok: true };
}

async function ownedQuestion(questionId: string) {
  const recruiter = await requireRecruiter();
  const { data } = await db().from('job_interview_questions').select('job_id').eq('id', questionId).maybeSingle();
  if (!data) return null;
  return await getOwnedJob(data.job_id, recruiter.id) ? data.job_id as string : null;
}

const editSchema = z.object({
  question: z.string().trim().min(1, 'Question can’t be empty').max(1000),
  answer_guidelines: z.string().trim().min(1, 'Answer guidelines can’t be empty').max(3000),
});

export async function updateQuestionAction(questionId: string, raw: unknown): Promise<ActionResult> {
  const jobId = await ownedQuestion(questionId);
  if (!jobId) return { ok: false, error: NOT_ALLOWED };

  const parsed = editSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await db().from('job_interview_questions')
    .update({ ...parsed.data, edited: true, updated_at: new Date().toISOString() })
    .eq('id', questionId);
  if (error) return { ok: false, error: "Couldn't save your edit. Try again." };
  refresh(jobId);
  return { ok: true };
}

export async function removeQuestionAction(questionId: string): Promise<ActionResult> {
  const jobId = await ownedQuestion(questionId);
  if (!jobId) return { ok: false, error: NOT_ALLOWED };

  const { error } = await db().from('job_interview_questions').delete().eq('id', questionId);
  if (error) return { ok: false, error: "Couldn't remove the question. Try again." };
  refresh(jobId);
  return { ok: true };
}
