// lib/analytics/compute.ts
import type { ApplicationStatus } from '@/lib/pipeline/status';

export type DashboardInput = {
  now: string;
  jobFilter?: string;
  jobs: { id: string; title: string; status: 'open' | 'closed' }[];
  applications: { id: string; jobId: string; status: ApplicationStatus; createdAt: string }[];
  events: { applicationId: string; toStatus: string; createdAt: string }[];
  interviews: { applicationId: string; status: string; endsAt: string }[];
  skillResults: {
    applicationId: string; skill: string;
    result: 'matched' | 'partial' | 'no_evidence' | 'confirmed_absent';
  }[];
};

export type SkillGap = {
  skill: string; missingEvidence: string[]; confirmedAbsent: string[]; assessed: number;
};

const STAGES: ApplicationStatus[] = ['submitted', 'parsed', 'assessed', 'in_review', 'shortlisted', 'interview', 'selected', 'rejected'];
const PENDING: ApplicationStatus[] = ['submitted', 'parsed', 'assessed', 'in_review'];
const MAX_SKILL_GAPS = 8;

export function computeDashboard(input: DashboardInput) {
  const jobs = input.jobFilter ? input.jobs.filter((j) => j.id === input.jobFilter) : input.jobs;
  const jobIds = new Set(jobs.map((j) => j.id));
  const applications = input.applications.filter((a) => jobIds.has(a.jobId));
  const appIds = new Set(applications.map((a) => a.id));
  const events = input.events.filter((e) => appIds.has(e.applicationId));
  const now = Date.parse(input.now);

  const shortlisted = [...new Set(events.filter((e) => e.toStatus === 'shortlisted').map((e) => e.applicationId))];

  const gapsBySkill = new Map<string, SkillGap>();
  for (const row of input.skillResults) {
    if (!appIds.has(row.applicationId)) continue;
    const key = row.skill.trim().toLowerCase();
    const gap = gapsBySkill.get(key)
      ?? { skill: row.skill, missingEvidence: [], confirmedAbsent: [], assessed: 0 };
    gap.assessed += 1;
    if (row.result === 'no_evidence') gap.missingEvidence.push(row.applicationId);
    if (row.result === 'confirmed_absent') gap.confirmedAbsent.push(row.applicationId);
    gapsBySkill.set(key, gap);
  }
  const gapSize = (g: SkillGap) => g.missingEvidence.length + g.confirmedAbsent.length;

  return {
    activeJobs: jobs.filter((j) => j.status === 'open').length,
    applications: applications.map((a) => a.id),
    shortlisted,
    pending: applications.filter((a) => PENDING.includes(a.status)).map((a) => a.id),
    upcomingInterviews: input.interviews.filter((i) =>
      appIds.has(i.applicationId) && i.status === 'scheduled' && Date.parse(i.endsAt) >= now).length,
    byJob: jobs
      .map((j) => ({
        id: j.id, label: j.title,
        ids: applications.filter((a) => a.jobId === j.id).map((a) => a.id),
      }))
      .sort((a, b) => b.ids.length - a.ids.length),
    byStage: STAGES.map((status) => ({
      status, ids: applications.filter((a) => a.status === status).map((a) => a.id),
    })),
    skillGaps: [...gapsBySkill.values()]
      .filter((g) => gapSize(g) > 0)
      .sort((a, b) => gapSize(b) - gapSize(a) || a.skill.localeCompare(b.skill))
      .slice(0, MAX_SKILL_GAPS),
  };
}

export type Dashboard = ReturnType<typeof computeDashboard>;

const STAGE_LABELS: Record<ApplicationStatus, string> = {
  submitted: 'Submitted', parsed: 'Resume read', assessed: 'AI assessment ready',
  in_review: 'In review', shortlisted: 'Shortlisted', interview: 'Interview',
  selected: 'Selected', rejected: 'Rejected',
};
export const stageLabel = (status: ApplicationStatus) => STAGE_LABELS[status];

/** The applicants behind a number, and the heading for that list. Null if the key is unknown. */
export function drillDown(dashboard: Dashboard, metric: string): { title: string; ids: string[] } | null {
  if (metric === 'applications') return { title: 'Applicants', ids: dashboard.applications };
  if (metric === 'shortlisted') return { title: 'Reached shortlist', ids: dashboard.shortlisted };
  if (metric === 'pending') return { title: 'Under review', ids: dashboard.pending };

  const [kind, value] = [metric.slice(0, metric.indexOf(':')), metric.slice(metric.indexOf(':') + 1)];
  if (kind === 'stage') {
    const stage = dashboard.byStage.find((s) => s.status === value);
    return stage ? { title: `Stage: ${stageLabel(stage.status)}`, ids: stage.ids } : null;
  }
  if (kind === 'job') {
    const job = dashboard.byJob.find((j) => j.id === value);
    return job ? { title: `Job: ${job.label}`, ids: job.ids } : null;
  }
  if (kind === 'gap') {
    const gap = dashboard.skillGaps.find((g) => g.skill === value);
    return gap ? { title: `Skill gap: ${gap.skill}`, ids: [...gap.missingEvidence, ...gap.confirmedAbsent] } : null;
  }
  return null;
}
