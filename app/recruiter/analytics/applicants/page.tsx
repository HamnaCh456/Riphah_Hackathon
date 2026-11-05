// app/recruiter/analytics/applicants/page.tsx
// Dashboard numbers open a pop-up. This page is for links opened in a new tab or shared.
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { stageLabel } from '@/lib/analytics/compute';
import { loadDrill } from '@/lib/analytics/drill';
import { Badge } from '@/components/ui/badge';
import { stageTone } from '@/components/matching/labels';
import { requireRecruiter } from '@/lib/auth/guards';
import styles from '../analytics.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Applicants' };

export default async function AnalyticsApplicantsPage({ searchParams }: {
  searchParams: Promise<{ metric?: string; job?: string }>;
}) {
  const recruiter = await requireRecruiter();
  const { metric, job } = await searchParams;
  const result = metric ? await loadDrill(recruiter.id, metric, job) : null;
  if (!result) notFound();
  const { rows } = result;

  const back = result.jobFilter ? `/recruiter/analytics?job=${result.jobFilter}` : '/recruiter/analytics';
  return (
    <div className={styles.page}>
      <p className={styles.breadcrumb}><Link href={back}>Dashboard</Link></p>
      <h1 className={styles.title}>{result.title}</h1>
      <p>{rows.length} {rows.length === 1 ? 'applicant' : 'applicants'}</p>
      {rows.length > 0 && (
        <ul className={styles.list}>
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/recruiter/jobs/${row.job_id}/applicants/${row.id}`} className={styles.row}>
                <span className={styles.who}>{row.candidate.full_name}</span>
                <span>{row.jobs.title}</span>
                <Badge tone={stageTone(row.status)}>{stageLabel(row.status)}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
