// lib/analytics/drill.ts
import 'server-only';
import { computeDashboard, drillDown } from '@/lib/analytics/compute';
import { loadDashboardInput } from '@/lib/analytics/load';
import { db } from '@/lib/db';
import type { ApplicationStatus } from '@/lib/pipeline/status';

export type DrillRow = {
  id: string; job_id: string; status: ApplicationStatus;
  jobs: { title: string };
  candidate: { full_name: string };
};

/** The applicants behind one dashboard number. Only this recruiter's jobs are ever read. */
export async function loadDrill(recruiterId: string, metric: string, job?: string) {
  const input = await loadDashboardInput(recruiterId, job);
  const result = drillDown(computeDashboard(input), metric);
  if (!result) return null;

  let rows: DrillRow[] = [];
  if (result.ids.length) {
    const { data, error } = await db().from('applications')
      .select('id, job_id, status, jobs(title), candidate:profiles!applications_candidate_id_fkey(full_name)')
      .in('id', [...new Set(result.ids)]);
    if (error) throw error;
    rows = (data ?? []) as unknown as DrillRow[];
  }
  return { title: result.title, rows, jobFilter: input.jobFilter };
}
