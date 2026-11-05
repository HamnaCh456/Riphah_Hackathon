// lib/interview-questions/load.ts
import 'server-only';
import type { OwnedApplication } from '@/lib/auth/ownership';
import { db } from '@/lib/db';
import { loadSkillResults } from '@/lib/matching/skill-results';
import { toProjectEvidence } from './projects';
import type { QuestionInput } from './schema';

export async function loadQuestionInput(app: OwnedApplication): Promise<QuestionInput> {
  const [requirements, chunks, results] = await Promise.all([
    db().from('job_requirements').select('label, is_required').eq('job_id', app.jobId).eq('kind', 'skill'),
    db().from('resume_chunks').select('id, content')
      .eq('resume_id', app.resumeId).eq('section', 'project').order('ordinal'),
    loadSkillResults([app.id]),
  ]);
  if (requirements.error) throw requirements.error;
  if (chunks.error) throw chunks.error;

  const resultBySkill = new Map(results.map((r) => [r.skill.trim().toLowerCase(), r.result]));
  return {
    jobTitle: app.jobTitle,
    jobDescription: app.jobDescription,
    skills: (requirements.data ?? []).map((r) => ({
      skill: r.label,
      importance: r.is_required ? 'required' as const : 'preferred' as const,
      result: resultBySkill.get(r.label.trim().toLowerCase()) ?? 'not_assessed',
    })),
    projects: toProjectEvidence(chunks.data ?? [], app.candidateName),
  };
}
