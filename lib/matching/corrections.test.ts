import { describe, expect, it } from 'vitest';
import { effectiveSkills, overridesFromCorrection } from './corrections';

const norm = (s: string) => (s.toLowerCase() === 'postgres' ? 'postgresql' : s.toLowerCase());
const reqs = [{ requirement_key: 'pg', label: 'PostgreSQL', component: 'skill' as const }];

describe('overridesFromCorrection', () => {
  it('adding a required skill counts as matched, using normalized names', () => {
    expect(overridesFromCorrection({ action: 'add', skill_name: 'Postgres', new_name: null, reason: 'Checked' }, reqs, norm))
      .toEqual([{ requirement_key: 'pg', status: 'matched', reason: 'Skill added by recruiter: Checked' }]);
  });
  it('removing a required skill returns it to not mentioned', () => {
    expect(overridesFromCorrection({ action: 'remove', skill_name: 'PostgreSQL', new_name: null, reason: 'Wrong' }, reqs, norm)[0].status)
      .toBe('no_evidence');
  });
  it('renaming onto a required skill counts as matched', () => {
    expect(overridesFromCorrection({ action: 'rename', skill_name: 'PG', new_name: 'PostgreSQL', reason: 'Typo' }, reqs, norm)[0].status)
      .toBe('matched');
  });
  it('does nothing for a skill the job does not ask for', () => {
    expect(overridesFromCorrection({ action: 'add', skill_name: 'Go', new_name: null, reason: 'x' }, reqs, norm)).toEqual([]);
  });
});

describe('effectiveSkills', () => {
  it('applies corrections in order and marks the source', () => {
    const out = effectiveSkills(
      [{ name: 'PG', excerpt: 'used PG' }, { name: 'Java', excerpt: 'Java' }],
      [
        { action: 'rename', skill_name: 'PG', new_name: 'PostgreSQL', reason: 'r' },
        { action: 'remove', skill_name: 'Java', new_name: null, reason: 'r' },
        { action: 'add', skill_name: 'Go', new_name: null, reason: 'r' },
      ],
    );
    expect(out).toEqual([
      { name: 'PostgreSQL', excerpt: 'used PG', source: 'corrected' },
      { name: 'Go', excerpt: null, source: 'recruiter' },
    ]);
  });
});
