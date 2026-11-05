// app/recruiter/applications/[id]/interview/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { getOwnedApplication } from '@/lib/auth/ownership';
import { requireRecruiter } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { INTERVIEW_TYPES, RATING_CRITERIA, RECOMMENDATIONS } from '@/lib/interviews/schemas';
import { formatDay, formatTimeRange, toPktFields } from '@/lib/interviews/time';
import { DecisionControl } from './DecisionControl';
import { FeedbackDialog, type FeedbackValues } from './FeedbackDialog';
import { CancelInterview } from './InterviewRowActions';
import { ScheduleDialog } from './ScheduleDialog';
import styles from '@/app/recruiter/interviews/interviews.module.css';

export const dynamic = 'force-dynamic';

type Row = {
  id: string; type: string; status: 'scheduled' | 'completed' | 'cancelled'; starts_at: string; ends_at: string;
  interviewer_id: string; interviewers: { name: string };
  interview_feedback: FeedbackValues | FeedbackValues[] | null;
};

const label = (list: readonly { value: string; label: string }[], value: string) =>
  list.find((i) => i.value === value)?.label ?? value;

export default async function ApplicationInterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recruiter = await requireRecruiter();
  const app = await getOwnedApplication(id, recruiter.id);
  if (!app) notFound();

  const [interviews, interviewers] = await Promise.all([
    db().from('interviews')
      .select(`id, type, status, starts_at, ends_at, interviewer_id, interviewers(name),
        interview_feedback(technical_skill, problem_solving, communication, job_knowledge, recommendation, strengths, concerns)`)
      .eq('application_id', id).order('starts_at'),
    db().from('interviewers').select('id, name').eq('recruiter_id', recruiter.id).order('name'),
  ]);
  if (interviews.error) throw interviews.error;
  if (interviewers.error) throw interviewers.error;

  const rows = (interviews.data ?? []) as unknown as Row[];
  const canSchedule = app.status === 'shortlisted' || app.status === 'interview';
  const today = toPktFields(new Date().toISOString()).date;

  return (
    <AppShell profile={recruiter}><div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.breadcrumb}>
            <Link href={`/recruiter/jobs/${app.jobId}/applicants/${id}`}>{app.candidateName} · {app.jobTitle}</Link>
          </p>
          <h1 className={styles.title}>Interview</h1>
        </div>
        {canSchedule && (
          <ScheduleDialog applicationId={id} interviewers={interviewers.data ?? []} today={today}
            trigger={<Button variant="primary">Schedule interview</Button>} />
        )}
      </header>

      {!canSchedule && app.status !== 'selected' && app.status !== 'rejected' && (
        <p>Shortlist this applicant to schedule an interview.</p>
      )}
      {(app.status === 'selected' || app.status === 'rejected') && (
        <p>Final decision: {app.status === 'selected' ? 'Selected' : 'Rejected'}.</p>
      )}
      {rows.length === 0 && canSchedule && <p>No interviews scheduled yet.</p>}

      {rows.length > 0 && (
        <ul className={styles.list}>
          {rows.map((row) => {
            const feedback = Array.isArray(row.interview_feedback) ? row.interview_feedback[0] ?? null : row.interview_feedback;
            const fields = toPktFields(row.starts_at);
            const minutes = (Date.parse(row.ends_at) - Date.parse(row.starts_at)) / 60_000;
            return (
              <li key={row.id} className={styles.row}>
                <p className={styles.who}>
                  {formatDay(row.starts_at)}, {formatTimeRange(row.starts_at, row.ends_at)}
                </p>
                <p>
                  {label(INTERVIEW_TYPES, row.type)} · {row.interviewers.name}
                  {row.status !== 'scheduled' && ` · ${row.status === 'completed' ? 'Completed' : 'Cancelled'}`}
                </p>

                {feedback && (
                  <dl className={styles.feedback}>
                    {RATING_CRITERIA.map(({ key, label: name }) => (
                      <div key={key}><dt>{name}</dt><dd>{feedback[key]} out of 5</dd></div>
                    ))}
                    <dt>Recommendation</dt><dd>{label(RECOMMENDATIONS, feedback.recommendation)}</dd>
                    {feedback.strengths && <><dt>Strengths</dt><dd>{feedback.strengths}</dd></>}
                    {feedback.concerns && <><dt>Concerns</dt><dd>{feedback.concerns}</dd></>}
                  </dl>
                )}

                <div className={styles.actions}>
                  {row.status !== 'cancelled' && (
                    <FeedbackDialog interviewId={row.id} interviewerName={row.interviewers.name} initial={feedback} />
                  )}
                  {row.status === 'scheduled' && (
                    <>
                      <ScheduleDialog applicationId={id} interviewers={interviewers.data ?? []} today={today}
                        initial={{ interviewId: row.id, interviewerId: row.interviewer_id, type: row.type,
                          date: fields.date, time: fields.time, durationMinutes: minutes }}
                        trigger={<Button variant="ghost">Move</Button>} />
                      <CancelInterview interviewId={row.id} />
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {app.status === 'interview' && (
        <section>
          <h2 className={styles.section}>Final decision</h2>
          <DecisionControl applicationId={id} candidateName={app.candidateName} />
        </section>
      )}
    </div></AppShell>
  );
}
