// app/recruiter/analytics/page.tsx
import Link from 'next/link';
import { computeDashboard, stageLabel } from '@/lib/analytics/compute';
import { loadDashboardInput } from '@/lib/analytics/load';
import { requireRecruiter } from '@/lib/auth/guards';
import { StatCard } from '@/components/ui/stat-card';
import { BarList } from './BarList';
import { JobFilter } from './JobFilter';
import styles from './analytics.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard' };

// Stages only a recruiter can move someone into.
const RECRUITER_DECIDES = new Set(['shortlisted', 'selected']);

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
      <div className={styles.page}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className="mt-2">No jobs yet. <Link href="/recruiter/jobs" className="textlink">Post your first job</Link> to see your dashboard.</p>
      </div>
    );
  }

  const tiles = [
    { label: 'Open positions', value: d.activeJobs, href: '/recruiter/jobs', icon: 'briefcase', tone: 'navy' },
    { label: 'Applicants', value: d.applications.length, href: drill('applications'), icon: 'people', tone: 'blue' },
    { label: 'Under review', value: d.pending.length, href: drill('pending'), icon: 'review', tone: 'teal' },
    { label: 'Shortlisted', value: d.shortlisted.length, href: drill('shortlisted'), icon: 'star', tone: 'gold' },
    { label: 'Scheduled interviews', value: d.upcomingInterviews, href: '/recruiter/interviews', icon: 'calendar', tone: 'blue' },
  ] as const;

  const flow = d.byStage.filter((s) => s.status !== 'rejected');
  const rejected = d.byStage.find((s) => s.status === 'rejected');

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <div className={styles.filter}><JobFilter jobs={input.jobs} value={input.jobFilter} /></div>
      </header>

      <ul className={styles.tiles}>
        {tiles.map((tile) => (
          <li key={tile.label}>
            <StatCard {...tile} testId={`tile-${tile.label}`} />
          </li>
        ))}
      </ul>

      <section className={`card ${styles.pipelineCard}`}>
        <h2 className={styles.section}>Recruitment pipeline</h2>
        <ol className={styles.pipeline} aria-label="Applications by stage">
          {flow.map((stage, index) => (
            <li key={stage.status}>
              <Link
                href={drill(`stage:${stage.status}`)}
                className={`${styles.stage} ${styles[`s${index}`]}`}
                title={`${stageLabel(stage.status)}: ${stage.ids.length}. Open applicants.`}
              >
                <span className={styles.stageCount}>{stage.ids.length}</span>
                <span className={styles.stageLabel}>{stageLabel(stage.status)}</span>
                {RECRUITER_DECIDES.has(stage.status) && <span className={styles.decided}>Recruiter decides</span>}
              </Link>
            </li>
          ))}
          {rejected && (
            <li>
              <Link
                href={drill('stage:rejected')}
                className={styles.stageOut}
                title={`${stageLabel('rejected')}: ${rejected.ids.length}. Open applicants.`}
              >
                <span className={styles.stageCount}>{rejected.ids.length}</span>
                <span className={styles.stageLabel}>{stageLabel('rejected')}</span>
              </Link>
            </li>
          )}
        </ol>
      </section>

      <div className={styles.charts}>
        <section className={`card ${styles.chart}`}>
          <h2 className={styles.section}>Applications by job</h2>
          <BarList ariaLabel="Applications by job" bars={d.byJob.map((j) => ({
            key: j.id, label: j.label, value: j.ids.length, href: drill(`job:${j.id}`),
          }))} />
        </section>

        <section className={`card ${styles.chart}`}>
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
    </div>
  );
}
