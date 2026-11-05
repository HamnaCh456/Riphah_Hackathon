// lib/analytics/load.ts
import 'server-only';
import { db } from '@/lib/db';
import { loadSkillResults } from '@/lib/matching/skill-results';
import type { DashboardInput } from './compute';

function unwrap<T>(result: { data: T[] | null; error: unknown }): T[] {
  if (result.error) throw result.error;
  return result.data ?? [];
}

export async function loadDashboardInput(recruiterId: string, jobFilter?: string): Promise<DashboardInput> {
  const now = new Date().toISOString();
  const jobs = unwrap(await db().from('jobs').select('id, title, status').eq('recruiter_id', recruiterId).order('created_at'));
  const base = { now, jobFilter: jobs.some((j) => j.id === jobFilter) ? jobFilter : undefined, jobs };
  if (jobs.length === 0) return { ...base, applications: [], events: [], interviews: [], skillResults: [] };

  const applications = unwrap(await db().from('applications')
    .select('id, job_id, status, created_at').in('job_id', jobs.map((j) => j.id)));
  if (applications.length === 0) return { ...base, applications: [], events: [], interviews: [], skillResults: [] };

  const appIds = applications.map((a) => a.id);
  const [events, interviews, skillResults] = await Promise.all([
    db().from('application_status_events').select('application_id, to_status, created_at').in('application_id', appIds),
    db().from('interviews').select('application_id, status, ends_at').in('application_id', appIds),
    loadSkillResults(appIds),
  ]);

  return {
    ...base,
    applications: applications.map((a) => ({ id: a.id, jobId: a.job_id, status: a.status, createdAt: a.created_at })),
    events: unwrap(events).map((e) => ({ applicationId: e.application_id, toStatus: e.to_status, createdAt: e.created_at })),
    interviews: unwrap(interviews).map((i) => ({ applicationId: i.application_id, status: i.status, endsAt: i.ends_at })),
    skillResults,
  };
}
