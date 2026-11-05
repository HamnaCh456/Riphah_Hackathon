import { describe, expect, it } from 'vitest';
import { PROJECT_KEY, buildRequirements, inputHash } from './requirements';

const rows = [
  { id: 'a', kind: 'skill', label: 'Python', importance: 5, is_required: true },
  { id: 'b', kind: 'skill', label: 'Redis', importance: 2, is_required: false },
  { id: 'c', kind: 'experience', label: '3+ years backend', importance: 3, is_required: true },
];

describe('buildRequirements', () => {
  it('adds one project requirement naming only the required skills', () => {
    const reqs = buildRequirements('Backend Developer', rows);
    const project = reqs.find((r) => r.key === PROJECT_KEY)!;
    expect(project.component).toBe('project');
    expect(project.label).toContain('Backend Developer');
    expect(project.label).toContain('Python');
    expect(project.label).not.toContain('Redis');
  });

  it('adds nothing for a job with no requirements', () => {
    expect(buildRequirements('Backend Developer', [])).toEqual([]);
  });
});

describe('inputHash', () => {
  const reqs = buildRequirements('Backend Developer', rows);
  it('changes when the resume or the job changes, and only then', () => {
    expect(inputHash(reqs, 'text')).toBe(inputHash(reqs, 'text'));
    expect(inputHash(reqs, 'text')).not.toBe(inputHash(reqs, 'other'));
    expect(inputHash(reqs.slice(1), 'text')).not.toBe(inputHash(reqs, 'text'));
  });
});
