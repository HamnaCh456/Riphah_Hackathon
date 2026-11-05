// app/recruiter/analytics/page.tsx
import Link from 'next/link';
import { computeDashboard, drillDown, stageLabel } from '@/lib/analytics/compute';
import { loadDashboardInput } from '@/lib/analytics/load';
import { requireRecruiter } from '@/lib/auth/guards';
import { StatCard } from '@/components/ui/stat-card';
import { DrillLink, DrillProvider } from './DrillDialog';
import { JobFilter } from './JobFilter';
import { RingList } from './RingList';
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

  const href = (metric: string) => {
    const query = new URLSearchParams({ metric });
    if (input.jobFilter) query.set('job', input.jobFilter);
    return `/recruiter/analytics/applicants?${query}`;
  };
  const drill = (metric: string) => {
    const found = drillDown(d, metric);
    return { metric, title: found?.title ?? 'Applicants', count: found?.ids.length ?? 0 };
  };

  if (input.jobs.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className="mt-2">No jobs yet. <Link href="/recruiter/jobs" className="textlink">Post your first job</Link> to see your dashboard.</p>
      </div>
    );
  }

  const flow = d.byStage.filter((s) => s.status !== 'rejected');
  const rejected = d.byStage.find((s) => s.status === 'rejected');

  return (
    <DrillProvider job={input.jobFilter}>
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Dashboard</h1>
          <JobFilter jobs={input.jobs} value={input.jobFilter} />
        </header>

        <ul className={styles.tiles}>
          <li><StatCard label="Open positions" value={d.activeJobs} href="/recruiter/jobs" icon="briefcase" tone="navy" testId="tile-Open positions" /></li>
          <li><StatCard label="Applicants" value={d.applications.length} href={href('applications')} drill={drill('applications')} icon="people" testId="tile-Applicants" /></li>
          <li><StatCard label="Under review" value={d.pending.length} href={href('pending')} drill={drill('pending')} icon="review" tone="teal" testId="tile-Under review" /></li>
          <li><StatCard label="Reached shortlist" value={d.shortlisted.length} href={href('shortlisted')} drill={drill('shortlisted')} icon="star" tone="gold" testId="tile-Shortlisted" /></li>
          <li><StatCard label="Scheduled interviews" value={d.upcomingInterviews} href="/recruiter/interviews" icon="calendar" testId="tile-Scheduled interviews" /></li>
        </ul>

        <section className={`card ${styles.pipelineCard}`}>
          <h2 className={styles.section}>Recruitment pipeline</h2>
          <ol className={styles.pipeline} aria-label="Applications by stage">
            {flow.map((stage) => {
              const metric = `stage:${stage.status}`;
              return (
                <li key={stage.status} className={styles.step}>
                  <DrillLink href={href(metric)} target={drill(metric)} className={styles.stage}
                    title={`${stageLabel(stage.status)}: ${stage.ids.length}. Open applicants.`}>
                    <span className={`${styles.node} ${stage.ids.length ? styles[`on_${stage.status}`] : ''}`}>{stage.ids.length}</span>
                    <span className={styles.stageLabel}>{stageLabel(stage.status)}</span>
                    {RECRUITER_DECIDES.has(stage.status) && <span className={styles.decided}>Recruiter decides</span>}
                  </DrillLink>
                </li>
              );
            })}
            {rejected && (
              <li className={styles.stepOut}>
                <DrillLink href={href('stage:rejected')} target={drill('stage:rejected')} className={styles.stage}
                  title={`${stageLabel('rejected')}: ${rejected.ids.length}. Open applicants.`}>
                  <span className={`${styles.node} ${rejected.ids.length ? styles.on_rejected : ''}`}>{rejected.ids.length}</span>
                  <span className={styles.stageLabel}>{stageLabel('rejected')}</span>
                </DrillLink>
              </li>
            )}
          </ol>
        </section>

        <div className={styles.charts}>
          <section className={`card ${styles.chart}`}>
            <h2 className={styles.section}>Applications by job</h2>
            <RingList ariaLabel="Applications by job" items={d.byJob.map((j) => ({
              key: j.id, label: j.label, value: j.ids.length, total: d.applications.length,
              segments: [{ value: j.ids.length, color: 'var(--color-teal)' }],
              href: href(`job:${j.id}`), drill: drill(`job:${j.id}`),
              detail: `of ${d.applications.length}`,
            }))} />
          </section>

          <section className={`card ${styles.chart}`}>
            <h2 className={styles.section}>Common skill gaps</h2>
            {d.skillGaps.length === 0
              ? <p>No skill gaps found in assessed applications.</p>
              : <RingList ariaLabel="Common skill gaps" items={d.skillGaps.map((g) => {
                  const parts = [
                    g.missingEvidence.length ? `${g.missingEvidence.length} no evidence` : '',
                    g.confirmedAbsent.length ? `${g.confirmedAbsent.length} confirmed absent` : '',
                  ].filter(Boolean).join(', ');
                  return {
                    key: g.skill, label: g.skill,
                    value: g.missingEvidence.length + g.confirmedAbsent.length, total: g.assessed,
                    // Two colours, because "no evidence" and "confirmed absent" are different results.
                    segments: [
                      { value: g.confirmedAbsent.length, color: 'var(--color-danger)' },
                      { value: g.missingEvidence.length, color: 'var(--color-gold-bright)' },
                    ],
                    href: href(`gap:${g.skill}`), drill: drill(`gap:${g.skill}`),
                    detail: `${parts} of ${g.assessed}`,
                  };
                })} />}
          </section>
        </div>
      </div>
    </DrillProvider>
  );
}
