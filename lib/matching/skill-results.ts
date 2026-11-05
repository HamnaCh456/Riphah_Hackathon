// lib/matching/skill-results.ts
import 'server-only';
import { db } from '@/lib/db';
import { applyOverrides, type OverrideRow, type StoredRequirement } from '@/lib/matching/effective';
import type { MatchStatus } from '@/lib/matching/types';

export type SkillResult = { applicationId: string; skill: string; isRequired: boolean; result: MatchStatus };

export async function loadSkillResults(applicationIds: string[]): Promise<SkillResult[]> {
  if (applicationIds.length === 0) return [];

  const { data: assessments, error } = await db().from('assessments')
    .select('id, application_id, completed_at')
    .in('application_id', applicationIds).eq('status', 'complete')
    .order('completed_at', { ascending: true });
  if (error) throw error;

  // Sorted oldest first, so the newest assessment for each application wins.
  const latest = new Map((assessments ?? []).map((a) => [a.application_id as string, a.id as string]));
  if (latest.size === 0) return [];

  const [requirements, overrides] = await Promise.all([
    db().from('assessment_requirements')
      .select('assessment_id, requirement_key, component, label, importance, is_required, status, depth')
      .in('assessment_id', [...latest.values()]).eq('component', 'skill'),
    db().from('requirement_overrides')
      .select('application_id, requirement_key, status, reason, created_at')
      .in('application_id', [...latest.keys()]),
  ]);
  if (requirements.error) throw requirements.error;
  if (overrides.error) throw overrides.error;

  return [...latest.entries()].flatMap(([applicationId, assessmentId]) => {
    const rows = (requirements.data ?? [])
      .filter((r) => r.assessment_id === assessmentId) as unknown as StoredRequirement[];
    const corrections = (overrides.data ?? [])
      .filter((o) => o.application_id === applicationId) as unknown as OverrideRow[];
    return applyOverrides(rows, corrections).requirements.map((r) => ({
      applicationId, skill: r.label, isRequired: r.is_required, result: r.effectiveStatus,
    }));
  });
}
