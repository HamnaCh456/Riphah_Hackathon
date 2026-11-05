// app/recruiter/analytics/page.tsx
import Link from 'next/link';
import { AccountRows, AppShell } from '@/components/app-shell';
import { computeDashboard, stageLabel } from '@/lib/analytics/compute';
import { loadDashboardInput } from '@/lib/analytics/load';
import { requireRecruiter } from '@/lib/auth/guards';
import { BarList } from './BarList';
import { JobFilter } from './JobFilter';
import { RefreshOnShow } from './RefreshOnShow';
import styles from './analytics.module.css';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const recruiter = await requireRecruiter();
  const { job } = await searchParams;
  const input = await loadDashboardInput(recruiter.id, job);
  const d = computeDashboard(input);

  const drill = (metric: string) => {
    const query = new URLSearchParams({ metric });
    if (input.jobFilter) query.set('job', input.jobFilter);
    return `/recruiter/analytics/applicants?${query}`;
  };

  if (input.jobs.length === 0) {
    return (
      <AppShell profile={recruiter}><div className={styles.page}>
        <h1 className={styles.title}>Analytics</h1>
        <p>No jobs yet. <Link href="/recruiter/jobs">Post your first job</Link> to see analytics.</p>
      </div></AppShell>
    );
  }

  const tiles = [
    { label: 'Job vacancies', value: String(d.activeJobs), href: '/recruiter/jobs' },
    { label: 'Applications', value: String(d.applications.length), href: drill('applications') },
    { label: 'Shortlisted', value: String(d.shortlisted.length), href: drill('shortlisted') },
    { label: 'Pending reviews', value: String(d.pending.length), href: drill('pending') },
    { label: 'Upcoming interviews', value: String(d.upcomingInterviews), href: '/recruiter/interviews' },
  ];

  return (
    <AppShell profile={recruiter}><div className={styles.page}>
      <RefreshOnShow />
      <header className={styles.header}>
        <h1 className={styles.title}>Analytics</h1>
        <div className={styles.filter}><JobFilter jobs={input.jobs} value={input.jobFilter} /></div>
      </header>

      <ul className={styles.tiles}>
        {tiles.map((tile) => (
          <li key={tile.label}>
            <Link href={tile.href} className={styles.tile}>
              <span className={styles.figure} data-testid={`tile-${tile.label}`}>{tile.value}</span>
              <span className={styles.tileLabel}>{tile.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className={styles.charts}>
        <section>
          <h2 className={styles.section}>Applications by stage</h2>
          <BarList ariaLabel="Applications by stage" bars={d.byStage.map((s) => ({
            key: s.status, label: stageLabel(s.status), value: s.ids.length, href: drill(`stage:${s.status}`),
          }))} />
        </section>

        <section>
          <h2 className={styles.section}>Applications by job</h2>
          <BarList ariaLabel="Applications by job" bars={d.byJob.map((j) => ({
            key: j.id, label: j.label, value: j.ids.length, href: drill(`job:${j.id}`),
          }))} />
        </section>

        <section>
          <h2 className={styles.section}>Common skill gaps</h2>
          {d.skillGaps.length === 0
            ? <p>No skill gaps found in assessed applications.</p>
            : <BarList ariaLabel="Common skill gaps" bars={d.skillGaps.map((g) => {
                const parts = [
                  g.missingEvidence.length ? `${g.missingEvidence.length} no evidence` : '',
                  g.confirmedAbsent.length ? `${g.confirmedAbsent.length} confirmed absent` : '',
                ].filter(Boolean).join(', ');
                return {
                  key: g.skill, label: g.skill, value: g.missingEvidence.length + g.confirmedAbsent.length,
                  href: drill(`gap:${g.skill}`), detail: `${parts} of ${g.assessed}`,
                };
              })} />}
        </section>
      </div>

      <section className={styles.account}>
        <h2 className={styles.section}>Account</h2>
        <AccountRows profile={recruiter} />
      </section>
    </div></AppShell>
  );
}
