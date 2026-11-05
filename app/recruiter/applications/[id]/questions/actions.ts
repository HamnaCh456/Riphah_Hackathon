// app/recruiter/applications/[id]/questions/actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { generateJson } from '@/lib/ai/gemini';
import { getOwnedApplication } from '@/lib/auth/ownership';
import { requireRecruiter } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { generateOneQuestion, generateQuestionSet } from '@/lib/interview-questions/generate';
import { loadQuestionInput } from '@/lib/interview-questions/load';

export type ActionResult = { ok: true } | { ok: false; error: string };

const GENERATION_FAILED = "Couldn't write questions. Your existing questions are unchanged. Try again.";
const NOT_ALLOWED = "You can't change questions for this application.";

async function authorize(applicationId: string) {
  const recruiter = await requireRecruiter();
  const app = await getOwnedApplication(applicationId, recruiter.id);
  const eligible = app && (app.status === 'shortlisted' || app.status === 'interview');
  return eligible ? { recruiter, app } : null;
}

async function ownedQuestion(questionId: string) {
  const { data } = await db().from('interview_questions').select('*').eq('id', questionId).maybeSingle();
  if (!data) return null;
  const auth = await authorize(data.application_id);
  return auth ? { ...auth, question: data } : null;
}

function refresh(app: { id: string; jobId: string }) {
  revalidatePath(`/recruiter/applications/${app.id}/questions`);
  revalidatePath(`/recruiter/jobs/${app.jobId}/applicants/${app.id}`);
}

export async function generateSetAction(applicationId: string): Promise<ActionResult> {
  const auth = await authorize(applicationId);
  if (!auth) return { ok: false, error: NOT_ALLOWED };

  try {
    // Generate first: if this throws, nothing has been changed.
    const drafts = await generateQuestionSet(await loadQuestionInput(auth.app), generateJson);
    const { data: old, error: readError } = await db().from('interview_questions')
      .select('id').eq('application_id', applicationId).eq('edited', false);
    if (readError) throw readError;

    const { error: insertError } = await db().from('interview_questions').insert(
      drafts.map((d) => ({ ...d, application_id: applicationId, created_by: auth.recruiter.id })));
    if (insertError) throw insertError;

    if (old?.length) {
      const { error } = await db().from('interview_questions').delete().in('id', old.map((q) => q.id));
      if (error) throw error;
    }
  } catch (error) {
    console.error('generateSetAction', error);
    return { ok: false, error: GENERATION_FAILED };
  }
  refresh(auth.app);
  return { ok: true };
}

export async function regenerateOneAction(questionId: string): Promise<ActionResult> {
  const auth = await ownedQuestion(questionId);
  if (!auth) return { ok: false, error: NOT_ALLOWED };

  try {
    const { data: siblings } = await db().from('interview_questions')
      .select('question').eq('application_id', auth.app.id);
    const draft = await generateOneQuestion(
      await loadQuestionInput(auth.app),
      { kind: auth.question.kind, difficulty: auth.question.difficulty, skill: auth.question.skill },
      (siblings ?? []).map((q) => q.question),
      generateJson,
    );
    const { error } = await db().from('interview_questions')
      .update({ ...draft, edited: false, updated_at: new Date().toISOString() })
      .eq('id', questionId);
    if (error) throw error;
  } catch (error) {
    console.error('regenerateOneAction', error);
    return { ok: false, error: "Couldn't write a new question. This one is unchanged. Try again." };
  }
  refresh(auth.app);
  return { ok: true };
}

const editSchema = z.object({
  question: z.string().trim().min(1, 'Question can’t be empty').max(1000),
  answer_guidelines: z.string().trim().min(1, 'Answer guidelines can’t be empty').max(3000),
});

export async function updateQuestionAction(questionId: string, raw: unknown): Promise<ActionResult> {
  const auth = await ownedQuestion(questionId);
  if (!auth) return { ok: false, error: NOT_ALLOWED };

  const parsed = editSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await db().from('interview_questions')
    .update({ ...parsed.data, edited: true, updated_at: new Date().toISOString() })
    .eq('id', questionId);
  if (error) return { ok: false, error: "Couldn't save your edit. Try again." };
  refresh(auth.app);
  return { ok: true };
}

export async function removeQuestionAction(questionId: string): Promise<ActionResult> {
  const auth = await ownedQuestion(questionId);
  if (!auth) return { ok: false, error: NOT_ALLOWED };

  const { error } = await db().from('interview_questions').delete().eq('id', questionId);
  if (error) return { ok: false, error: "Couldn't remove the question. Try again." };
  refresh(auth.app);
  return { ok: true };
}
