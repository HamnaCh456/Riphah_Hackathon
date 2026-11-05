// app/recruiter/interviews/page.tsx
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { InterviewCard } from '@/app/recruiter/applications/[id]/interview/InterviewCard';
import { requireRecruiter } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { flagConflicts, type Slot } from '@/lib/interviews/conflicts';
import { INTERVIEW_TYPES } from '@/lib/interviews/schemas';
import { INTERVIEW_COLUMNS, loadInterviewers, type InterviewRow } from '@/lib/interviews/read';
import { formatDay, formatTimeRange, toPktFields } from '@/lib/interviews/time';
import { InterviewDetails } from './InterviewDetails';
import styles from './interviews.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Interviews' };

type Row = InterviewRow & {
  application_id: string; candidate_id: string;
  applications: { job_id: string; jobs: { title: string }; candidate: { full_name: string } };
};

const typeLabel = (value: string) => INTERVIEW_TYPES.find((t) => t.value === value)?.label ?? value;

export default async function InterviewsPage() {
  const recruiter = await requireRecruiter();
  const [{ data, error }, interviewers] = await Promise.all([
    db().from('interviews')
      .select(`${INTERVIEW_COLUMNS}, application_id, candidate_id,
        applications(job_id, jobs(title), candidate:profiles!applications_candidate_id_fkey(full_name))`)
      .eq('recruiter_id', recruiter.id)
      .order('starts_at'),
    loadInterviewers(recruiter.id),
  ]);
  if (error) throw error;
  const today = toPktFields(new Date().toISOString()).date;

  const rows = (data ?? []) as unknown as Row[];
  const flagged = flagConflicts(rows.map((r) => ({
    id: r.id, interviewerId: r.interviewer_id, candidateId: r.candidate_id,
    startsAt: r.starts_at, endsAt: r.ends_at, status: r.status,
  })));

  const byId = new Map(rows.map((r) => [r.id, r]));
  const describe = (row: Row) => (flagged.get(row.id) ?? []).map((c) => {
    const other = byId.get(c.withId);
    return c.type === 'interviewer'
      ? `${row.interviewers.name} is also booked with ${other?.applications.candidate.full_name}`
      : `${row.applications.candidate.full_name} also has an interview with ${other?.interviewers.name}`;
  });

  const now = Date.now();
  const upcoming = rows.filter((r) => r.status === 'scheduled' && Date.parse(r.ends_at) >= now);
  const others = rows.filter((r) => !upcoming.includes(r)).reverse();

  const days = new Map<string, Row[]>();
  for (const row of upcoming) {
    const day = formatDay(row.starts_at);
    days.set(day, [...(days.get(day) ?? []), row]);
  }

  const renderRow = (row: Row) => (
    <li key={row.id} className={styles.row}>
      <InterviewDetails
        title={`${row.applications.candidate.full_name} · ${row.applications.jobs.title}`}
        row={
          <>
            <span className={styles.time}>{formatTimeRange(row.starts_at, row.ends_at)}</span>
            <span className={styles.who}>{row.applications.candidate.full_name}</span>
            <span>{row.applications.jobs.title}</span>
            <span>{typeLabel(row.type)} · {row.interviewers.name}</span>
            {row.status !== 'scheduled' && <Badge tone={row.status === 'completed' ? 'teal' : 'neutral'}>{row.status === 'completed' ? 'Completed' : 'Cancelled'}</Badge>}
          </>
        }
      >
        <InterviewCard applicationId={row.application_id} row={row} interviewers={interviewers} today={today} />
        <p className="mt-4">
          <Link href={`/recruiter/jobs/${row.applications.job_id}/applicants/${row.application_id}`} className="textlink">
            Open applicant
          </Link>
        </p>
      </InterviewDetails>
      {describe(row).map((message) => <p key={message} className={styles.conflict}>Conflict: {message}</p>)}
    </li>
  );

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Interviews</h1>

      {rows.length === 0 && (
        <p>No interviews yet. Open a shortlisted applicant to schedule one. <Link href="/recruiter/jobs" className="textlink">View jobs</Link></p>
      )}

      {[...days.entries()].map(([day, list]) => (
        <section key={day}>
          <h2 className={styles.section}>{day}</h2>
          <ul className={styles.list}>{list.map(renderRow)}</ul>
        </section>
      ))}

      {others.length > 0 && (
        <section>
          <h2 className={styles.section}>Past and cancelled</h2>
          <ul className={styles.list}>{others.map(renderRow)}</ul>
        </section>
      )}
    </div>
  );
}
