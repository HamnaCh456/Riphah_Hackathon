// app/recruiter/analytics/actions.ts
'use server';
import { requireRecruiter } from '@/lib/auth/guards';
import { loadDrill } from '@/lib/analytics/drill';

export async function drillAction(metric: string, job?: string) {
  const recruiter = await requireRecruiter();
  const result = await loadDrill(recruiter.id, metric, job);
  return result?.rows ?? null;
}
