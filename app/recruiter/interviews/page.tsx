// app/recruiter/interviews/page.tsx
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { requireRecruiter } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { flagConflicts, type Slot } from '@/lib/interviews/conflicts';
import { INTERVIEW_TYPES } from '@/lib/interviews/schemas';
import { formatDay, formatTimeRange } from '@/lib/interviews/time';
import styles from './interviews.module.css';

export const dynamic = 'force-dynamic';

type Row = {
  id: string; application_id: string; interviewer_id: string; candidate_id: string;
  starts_at: string; ends_at: string; status: Slot['status']; type: string;
  interviewers: { name: string };
  applications: { jobs: { title: string }; candidate: { full_name: string } };
};

const typeLabel = (value: string) => INTERVIEW_TYPES.find((t) => t.value === value)?.label ?? value;

export default async function InterviewsPage() {
  const recruiter = await requireRecruiter();
  const { data, error } = await db().from('interviews')
    .select(`id, application_id, interviewer_id, candidate_id, starts_at, ends_at, status, type,
      interviewers(name),
      applications(jobs(title), candidate:profiles!applications_candidate_id_fkey(full_name))`)
    .eq('recruiter_id', recruiter.id)
    .order('starts_at');
  if (error) throw error;

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
      <Link href={`/recruiter/applications/${row.application_id}/interview`} className={styles.rowLink}>
        <span className={styles.time}>{formatTimeRange(row.starts_at, row.ends_at)}</span>
        <span className={styles.who}>{row.applications.candidate.full_name}</span>
        <span>{row.applications.jobs.title}</span>
        <span>{typeLabel(row.type)} · {row.interviewers.name}</span>
        {row.status !== 'scheduled' && <span className={styles.status}>{row.status === 'completed' ? 'Completed' : 'Cancelled'}</span>}
      </Link>
      {describe(row).map((message) => <p key={message} className={styles.conflict}>Conflict: {message}</p>)}
    </li>
  );

  return (
    <AppShell profile={recruiter}><div className={styles.page}>
      <h1 className={styles.title}>Interviews</h1>

      {rows.length === 0 && (
        <p>No interviews yet. Open a shortlisted applicant to schedule one. <Link href="/recruiter/jobs">View jobs</Link></p>
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
    </div></AppShell>
  );
}
