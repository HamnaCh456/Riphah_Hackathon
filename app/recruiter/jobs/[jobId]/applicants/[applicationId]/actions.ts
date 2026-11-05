'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { z } from 'zod';

import type { ActionResult } from '@/components/matching/ActionForm';
import { requireRecruiter } from '@/lib/auth/guards';
import { getOwnedApplication } from '@/lib/auth/ownership';
import { overridesFromCorrection } from '@/lib/matching/corrections';
import { runAssessment } from '@/lib/matching/run';
import { changeApplicationStatus } from '@/lib/pipeline/change-status';
import { normalizeSkill } from '@/lib/skills/normalize';
import { createClient } from '@/lib/supabase/server';

const NOT_FOUND: ActionResult = { ok: false, error: 'This application could not be found.' };

function refresh(jobId: string, applicationId: string) {
  revalidatePath(`/recruiter/jobs/${jobId}/applicants/${applicationId}`);
  revalidatePath(`/recruiter/jobs/${jobId}/applicants`);
}

async function owned(applicationId: string) {
  const profile = await requireRecruiter();
  const application = await getOwnedApplication(applicationId, profile.id);
  return application ? { profile, jobId: application.jobId } : null;
}

const firstIssue = (error: z.ZodError) => error.issues[0]?.message ?? 'Check the form and try again.';
const idSchema = z.string().uuid();

export async function runAssessmentAction(formData: FormData): Promise<ActionResult> {
  const id = idSchema.safeParse(formData.get('applicationId'));
  if (!id.success) return NOT_FOUND;
  const ctx = await owned(id.data);
  if (!ctx) return NOT_FOUND;

  after(async () => {
    try {
      await runAssessment(id.data, { retry: true });
    } catch (error) {
      // No row may exist yet, so the page keeps offering the run button.
      console.error('Assessment could not start', error);
    }
  });
  refresh(ctx.jobId, id.data);
  return { ok: true, message: 'Assessment started' };
}

const overrideSchema = z.object({
  applicationId: z.string().uuid(),
  requirementKey: z.string().min(1),
  status: z.enum(['matched', 'partial', 'no_evidence', 'confirmed_absent', 'clear']),
  reason: z.string().trim().min(3, 'Give a reason for the correction').max(1000),
});

export async function overrideRequirementAction(formData: FormData): Promise<ActionResult> {
  const input = overrideSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) return { ok: false, error: firstIssue(input.error) };
  const ctx = await owned(input.data.applicationId);
  if (!ctx) return NOT_FOUND;

  const supabase = await createClient();
  const { error } = await supabase.from('requirement_overrides').insert({
    application_id: input.data.applicationId,
    requirement_key: input.data.requirementKey,
    status: input.data.status === 'clear' ? null : input.data.status,
    reason: input.data.reason,
    recruiter_id: ctx.profile.id,
  });
  if (error) return { ok: false, error: 'Could not save the correction.' };
  refresh(ctx.jobId, input.data.applicationId);
  return { ok: true, message: 'Correction saved' };
}

const correctionSchema = z.object({
  applicationId: z.string().uuid(),
  action: z.enum(['add', 'remove', 'rename']),
  skillName: z.string().trim().min(1, 'Enter a skill name').max(80),
  newName: z.string().trim().max(80).optional(),
  reason: z.string().trim().min(3, 'Give a reason for the correction').max(1000),
}).refine((v) => v.action !== 'rename' || !!v.newName, { message: 'Enter the new skill name' });

export async function correctSkillAction(formData: FormData): Promise<ActionResult> {
  const input = correctionSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) return { ok: false, error: firstIssue(input.error) };
  const { applicationId } = input.data;
  const ctx = await owned(applicationId);
  if (!ctx) return NOT_FOUND;

  const correction = {
    action: input.data.action,
    skill_name: input.data.skillName,
    new_name: input.data.newName || null,
    reason: input.data.reason,
  };
  const supabase = await createClient();
  const saved = await supabase.from('skill_corrections')
    .insert({ ...correction, application_id: applicationId, recruiter_id: ctx.profile.id });
  if (saved.error) return { ok: false, error: 'Could not save the correction.' };

  const latest = await supabase.from('assessments')
    .select('assessment_requirements(requirement_key, label, component)')
    .eq('application_id', applicationId).eq('status', 'complete')
    .order('started_at', { ascending: false }).limit(1).maybeSingle();
  if (latest.error) return { ok: false, error: 'The skill was saved, but the score could not be updated.' };

  const requirements = (latest.data?.assessment_requirements ?? []) as unknown as
    Parameters<typeof overridesFromCorrection>[1];
  const overrides = overridesFromCorrection(correction, requirements, normalizeSkill)
    .map((o) => ({ ...o, application_id: applicationId, recruiter_id: ctx.profile.id }));
  if (overrides.length > 0) {
    const { error } = await supabase.from('requirement_overrides').insert(overrides);
    if (error) return { ok: false, error: 'The skill was saved, but the score could not be updated.' };
  }
  refresh(ctx.jobId, applicationId);
  return { ok: true, message: 'Skill updated' };
}

export async function togglePinAction(formData: FormData): Promise<ActionResult> {
  const id = idSchema.safeParse(formData.get('applicationId'));
  if (!id.success) return NOT_FOUND;
  const ctx = await owned(id.data);
  if (!ctx) return NOT_FOUND;

  const supabase = await createClient();
  const { error } = await supabase.from('application_review').upsert({
    application_id: id.data,
    pinned: formData.get('pinned') === 'true',
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: 'Could not save the pin.' };
  refresh(ctx.jobId, id.data);
  return { ok: true };
}

const statusSchema = z.object({
  applicationId: z.string().uuid(),
  to: z.enum(['in_review', 'shortlisted', 'interview', 'selected', 'rejected']),
  reason: z.string().trim().max(1000).optional(),
});

/** Only a recruiter's click reaches this. The database checks the move and writes the audit row. */
export async function changeStatusAction(formData: FormData): Promise<ActionResult> {
  const input = statusSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) return { ok: false, error: firstIssue(input.error) };
  const ctx = await owned(input.data.applicationId);
  if (!ctx) return NOT_FOUND;

  try {
    await changeApplicationStatus({
      applicationId: input.data.applicationId,
      to: input.data.to,
      reason: input.data.reason || undefined,
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not change the stage.' };
  }
  refresh(ctx.jobId, input.data.applicationId);
  return { ok: true, message: 'Stage updated' };
}

const noteSchema = z.object({
  applicationId: z.string().uuid(),
  body: z.string().trim().min(1, 'Write a note first').max(5000),
});

export async function addNoteAction(formData: FormData): Promise<ActionResult> {
  const input = noteSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) return { ok: false, error: firstIssue(input.error) };
  const ctx = await owned(input.data.applicationId);
  if (!ctx) return NOT_FOUND;

  const supabase = await createClient();
  const { error } = await supabase.from('application_notes').insert({
    application_id: input.data.applicationId, body: input.data.body, author_id: ctx.profile.id,
  });
  if (error) return { ok: false, error: 'Could not save the note.' };
  refresh(ctx.jobId, input.data.applicationId);
  return { ok: true, message: 'Note saved' };
}
