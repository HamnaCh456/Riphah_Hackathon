// app/recruiter/interviews/actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { getOwnedApplication } from '@/lib/auth/ownership';
import { requireRecruiter } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { findConflicts, type Slot } from '@/lib/interviews/conflicts';
import { decisionSchema, feedbackSchema, scheduleSchema } from '@/lib/interviews/schemas';
import { addMinutes, formatDay, formatTimeRange, parsePkt } from '@/lib/interviews/time';
import { changeApplicationStatus } from '@/lib/pipeline/change-status';

export type ActionResult = { ok: true } | { ok: false; error: string };
export type SaveResult = ActionResult | { ok: false; conflicts: string[] };
export type DecisionResult = ActionResult | { ok: false; needsNoFeedbackConfirm: true };

function refresh() {
  revalidatePath('/recruiter', 'layout');
  revalidatePath('/candidate/applications');
}

async function notify(userId: string, title: string, body: string) {
  const { error } = await db().from('notifications').insert({ user_id: userId, title, body });
  // A simulated notification failing must not undo the recruiter's real action.
  if (error) console.error('notify', error);
}

function toSlot(row: {
  id: string; interviewer_id: string; candidate_id: string; starts_at: string; ends_at: string; status: Slot['status'];
}): Slot {
  return {
    id: row.id, interviewerId: row.interviewer_id, candidateId: row.candidate_id,
    startsAt: row.starts_at, endsAt: row.ends_at, status: row.status,
  };
}

const SLOT_COLUMNS = 'id, interviewer_id, candidate_id, starts_at, ends_at, status';

export async function addInterviewerAction(rawName: string):
  Promise<{ ok: true; id: string; name: string } | { ok: false; error: string }> {
  const recruiter = await requireRecruiter();
  const name = rawName.trim();
  if (!name || name.length > 120) return { ok: false, error: 'Enter the interviewer’s name' };

  const { data, error } = await db().from('interviewers')
    .insert({ recruiter_id: recruiter.id, name }).select('id, name').single();
  if (error) {
    return { ok: false, error: error.code === '23505' ? `${name} is already on your list` : 'Couldn’t add the interviewer. Try again.' };
  }
  return { ok: true, id: data.id, name: data.name };
}

export async function saveInterviewAction(raw: unknown): Promise<SaveResult> {
  const recruiter = await requireRecruiter();
  const parsed = scheduleSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const input = parsed.data;

  const app = await getOwnedApplication(input.applicationId, recruiter.id);
  if (!app) return { ok: false, error: "You can't schedule interviews for this application." };
  if (app.status !== 'shortlisted' && app.status !== 'interview') {
    return { ok: false, error: 'Shortlist this applicant before scheduling an interview.' };
  }

  // The interviewer must be on this recruiter's own list.
  const { data: interviewer } = await db().from('interviewers').select('id, name')
    .eq('id', input.interviewerId).eq('recruiter_id', recruiter.id).maybeSingle();
  if (!interviewer) return { ok: false, error: 'Choose an interviewer' };

  let start: Date;
  try {
    start = parsePkt(input.date, input.time);
  } catch {
    return { ok: false, error: 'Choose a valid date and time' };
  }
  if (start.getTime() <= Date.now()) return { ok: false, error: 'Choose a date and time in the future' };
  const end = addMinutes(start, input.durationMinutes);

  if (input.interviewId) {
    const { data: existing } = await db().from('interviews').select('id, status')
      .eq('id', input.interviewId).eq('application_id', app.id).maybeSingle();
    if (!existing || existing.status === 'cancelled') return { ok: false, error: 'This interview can’t be changed.' };
  }

  const [byInterviewer, byCandidate] = await Promise.all([
    db().from('interviews').select(SLOT_COLUMNS).eq('interviewer_id', input.interviewerId)
      .neq('status', 'cancelled').lt('starts_at', end.toISOString()).gt('ends_at', start.toISOString()),
    db().from('interviews').select(SLOT_COLUMNS).eq('candidate_id', app.candidateId)
      .neq('status', 'cancelled').lt('starts_at', end.toISOString()).gt('ends_at', start.toISOString()),
  ]);
  if (byInterviewer.error) throw byInterviewer.error;
  if (byCandidate.error) throw byCandidate.error;

  const target: Slot = {
    id: input.interviewId ?? 'new', interviewerId: input.interviewerId, candidateId: app.candidateId,
    startsAt: start.toISOString(), endsAt: end.toISOString(), status: 'scheduled',
  };
  const others = [...(byInterviewer.data ?? []), ...(byCandidate.data ?? [])].map(toSlot);
  const conflicts = findConflicts(target, others);
  const seen = new Set<string>();
  const messages = conflicts
    .map((c) => (c.type === 'interviewer'
      ? `${interviewer.name} already has an interview at this time.`
      : `${app.candidateName} already has an interview at this time.`))
    .filter((m) => (seen.has(m) ? false : (seen.add(m), true)));

  if (messages.length && !input.acknowledgeConflict) return { ok: false, conflicts: messages };

  const fields = {
    interviewer_id: input.interviewerId, type: input.type,
    starts_at: start.toISOString(), ends_at: end.toISOString(),
    conflict_acknowledged: messages.length > 0, updated_at: new Date().toISOString(),
  };

  const saved = input.interviewId
    ? await db().from('interviews').update({ ...fields, status: 'scheduled' }).eq('id', input.interviewId).select('id').single()
    : await db().from('interviews').insert({
        ...fields, application_id: app.id, candidate_id: app.candidateId, recruiter_id: recruiter.id,
      }).select('id').single();
  if (saved.error) return { ok: false, error: 'Couldn’t save the interview. Try again.' };

  if (app.status === 'shortlisted') {
    try {
      await changeApplicationStatus({
        applicationId: app.id, to: 'interview', reason: 'Interview scheduled',
      });
    } catch (error) {
      console.error('saveInterviewAction status', error);
      // Don't leave a booked interview on an application still marked shortlisted.
      await db().from('interviews').delete().eq('id', saved.data.id);
      return { ok: false, error: 'Couldn’t update the application status, so the interview wasn’t saved. Try again.' };
    }
  }

  const when = `${formatDay(start.toISOString())}, ${formatTimeRange(start.toISOString(), end.toISOString())}`;
  await notify(app.candidateId,
    input.interviewId ? `Interview moved: ${app.jobTitle}` : `Interview scheduled: ${app.jobTitle}`,
    `Your interview is on ${when}.`);

  refresh();
  return { ok: true };
}

/** Moves a shortlisted applicant to the interview stage with no date yet. */
export async function moveToInterviewAction(applicationId: string): Promise<ActionResult> {
  const recruiter = await requireRecruiter();
  const app = await getOwnedApplication(applicationId, recruiter.id);
  if (!app) return { ok: false, error: "You can't change this application." };
  try {
    await changeApplicationStatus({ applicationId: app.id, to: 'interview' });
  } catch (error) {
    console.error('moveToInterviewAction', error);
    return { ok: false, error: 'Couldn’t move this applicant to interview. Try again.' };
  }
  refresh();
  return { ok: true };
}

export async function cancelInterviewAction(interviewId: string): Promise<ActionResult> {
  const recruiter = await requireRecruiter();
  const { data: interview } = await db().from('interviews').select('id, application_id, status, starts_at')
    .eq('id', interviewId).eq('recruiter_id', recruiter.id).maybeSingle();
  if (!interview) return { ok: false, error: "You can't change this interview." };
  if (interview.status !== 'scheduled') return { ok: false, error: 'Only scheduled interviews can be cancelled.' };

  const app = await getOwnedApplication(interview.application_id, recruiter.id);
  if (!app) return { ok: false, error: "You can't change this interview." };

  const { error } = await db().from('interviews')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', interviewId);
  if (error) return { ok: false, error: 'Couldn’t cancel the interview. Try again.' };

  await notify(app.candidateId, `Interview cancelled: ${app.jobTitle}`,
    `Your interview on ${formatDay(interview.starts_at)} was cancelled.`);
  refresh();
  return { ok: true };
}

export async function saveFeedbackAction(raw: unknown): Promise<ActionResult> {
  const recruiter = await requireRecruiter();
  const parsed = feedbackSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { interviewId, ...fields } = parsed.data;

  const { data: interview } = await db().from('interviews').select('id, application_id, status')
    .eq('id', interviewId).eq('recruiter_id', recruiter.id).maybeSingle();
  if (!interview) return { ok: false, error: "You can't add feedback to this interview." };
  if (interview.status === 'cancelled') return { ok: false, error: 'This interview was cancelled.' };

  const now = new Date().toISOString();
  const { error } = await db().from('interview_feedback').upsert(
    { ...fields, interview_id: interviewId, recorded_by: recruiter.id, updated_at: now },
    { onConflict: 'interview_id' });
  if (error) return { ok: false, error: 'Couldn’t save the feedback. Try again.' };

  const { error: statusError } = await db().from('interviews')
    .update({ status: 'completed', updated_at: now }).eq('id', interviewId);
  if (statusError) return { ok: false, error: 'Feedback saved, but the interview wasn’t marked completed. Try again.' };

  refresh();
  return { ok: true };
}

export async function recordDecisionAction(raw: unknown): Promise<DecisionResult> {
  const recruiter = await requireRecruiter();
  const parsed = decisionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const input = parsed.data;

  // Authorization: only the recruiter who owns this job gets past here.
  const app = await getOwnedApplication(input.applicationId, recruiter.id);
  if (!app) return { ok: false, error: 'You aren’t authorized to record a decision for this application.' };
  if (app.status !== 'interview') return { ok: false, error: 'A final decision can only be recorded after an interview is scheduled.' };

  const { data: interviews, error: readError } = await db().from('interviews')
    .select('id, interview_feedback(id)').eq('application_id', app.id);
  if (readError) return { ok: false, error: 'Couldn’t check this application. Try again.' };
  const hasFeedback = (interviews ?? []).some((i) => {
    const f = i.interview_feedback as unknown;
    return Array.isArray(f) ? f.length > 0 : Boolean(f);
  });
  if (!hasFeedback && !input.confirmNoFeedback) return { ok: false, needsNoFeedbackConfirm: true };

  try {
    await changeApplicationStatus({
      applicationId: app.id, to: input.decision, reason: input.reason,
    });
  } catch (error) {
    console.error('recordDecisionAction', error);
    return { ok: false, error: 'Couldn’t record the decision. Try again.' };
  }

  await notify(app.candidateId, `Application update: ${app.jobTitle}`,
    input.decision === 'selected'
      ? 'You have been selected for this role.'
      : 'You were not selected for this role.');
  refresh();
  return { ok: true };
}
