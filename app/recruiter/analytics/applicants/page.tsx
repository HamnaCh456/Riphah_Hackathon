// app/recruiter/analytics/applicants/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { computeDashboard, drillDown, stageLabel } from '@/lib/analytics/compute';
import { loadDashboardInput } from '@/lib/analytics/load';
import { requireRecruiter } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import type { ApplicationStatus } from '@/lib/pipeline/status';
import styles from '../analytics.module.css';

export const dynamic = 'force-dynamic';

type Row = {
  id: string; job_id: string; status: ApplicationStatus;
  jobs: { title: string };
  candidate: { full_name: string };
};

export default async function AnalyticsApplicantsPage({ searchParams }: {
  searchParams: Promise<{ metric?: string; job?: string }>;
}) {
  const recruiter = await requireRecruiter();
  const { metric, job } = await searchParams;
  const input = await loadDashboardInput(recruiter.id, job);
  const result = metric ? drillDown(computeDashboard(input), metric) : null;
  if (!result) notFound();

  let rows: Row[] = [];
  if (result.ids.length) {
    const { data, error } = await db().from('applications')
      .select('id, job_id, status, jobs(title), candidate:profiles!applications_candidate_id_fkey(full_name)')
      .in('id', [...new Set(result.ids)]);
    if (error) throw error;
    rows = (data ?? []) as unknown as Row[];
  }

  const back = input.jobFilter ? `/recruiter/analytics?job=${input.jobFilter}` : '/recruiter/analytics';
  return (
    <AppShell profile={recruiter}><div className={styles.page}>
      <p className={styles.breadcrumb}><Link href={back}>Analytics</Link></p>
      <h1 className={styles.title}>{result.title}</h1>
      <p>{rows.length} {rows.length === 1 ? 'applicant' : 'applicants'}</p>
      {rows.length > 0 && (
        <ul className={styles.list}>
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/recruiter/jobs/${row.job_id}/applicants/${row.id}`} className={styles.row}>
                <span className={styles.who}>{row.candidate.full_name}</span>
                <span>{row.jobs.title}</span>
                <span>{stageLabel(row.status)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div></AppShell>
  );
}
