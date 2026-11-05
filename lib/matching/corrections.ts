import type { Component, MatchStatus } from './types';

export interface Correction {
  action: 'add' | 'remove' | 'rename';
  skill_name: string;
  new_name: string | null;
  reason: string;
}

export function overridesFromCorrection(
  correction: Correction,
  requirements: { requirement_key: string; label: string; component: Component }[],
  normalize: (name: string) => string,
): { requirement_key: string; status: MatchStatus; reason: string }[] {
  const target = correction.action === 'rename' ? correction.new_name! : correction.skill_name;
  const status: MatchStatus = correction.action === 'remove' ? 'no_evidence' : 'matched';
  const verb = { add: 'added', remove: 'removed', rename: 'renamed' }[correction.action];
  return requirements
    .filter((r) => r.component === 'skill' && normalize(r.label) === normalize(target))
    .map((r) => ({
      requirement_key: r.requirement_key,
      status,
      reason: `Skill ${verb} by recruiter: ${correction.reason}`,
    }));
}

export interface EffectiveSkill {
  name: string;
  excerpt: string | null;
  source: 'resume' | 'corrected' | 'recruiter';
}

export function effectiveSkills(
  extracted: { name: string; excerpt: string | null }[], corrections: Correction[],
): EffectiveSkill[] {
  let skills: EffectiveSkill[] = extracted.map((s) => ({ ...s, source: 'resume' }));
  for (const c of corrections) {
    if (c.action === 'add') skills.push({ name: c.skill_name, excerpt: null, source: 'recruiter' });
    if (c.action === 'remove') skills = skills.filter((s) => s.name !== c.skill_name);
    if (c.action === 'rename') {
      skills = skills.map((s) => (s.name === c.skill_name ? { ...s, name: c.new_name!, source: 'corrected' } : s));
    }
  }
  return skills;
}
