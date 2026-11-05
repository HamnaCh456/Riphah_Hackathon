// lib/interview-questions/verify.test.ts
import { describe, expect, it } from 'vitest';
import { verifyQuestion } from '@/lib/interview-questions/verify';
import type { GeneratedQuestion, ProjectEvidence } from '@/lib/interview-questions/schema';

const projects: ProjectEvidence[] = [{
  id: 'p1', label: 'Shopwise',
  excerpt: 'Built the Shopwise order API with Django REST Framework and PostgreSQL, serving 2,000 daily orders.',
}];

const base: GeneratedQuestion = {
  kind: 'project', difficulty: 'intermediate', skill: 'Django',
  question: 'How did you design the Shopwise order API?',
  answer_guidelines: 'Look for clear reasoning about endpoints and data model.',
  evidence_id: 'p1', evidence_quote: 'order API with Django REST Framework',
};

describe('verifyQuestion', () => {
  it('marks a project question verified when the quote is in the linked excerpt', () => {
    expect(verifyQuestion(base, projects).support).toBe('verified');
  });

  it('ignores case and spacing differences in the quote', () => {
    const q = { ...base, evidence_quote: 'ORDER  API with\ndjango REST framework' };
    expect(verifyQuestion(q, projects).support).toBe('verified');
  });

  it('flags a quote that is not in the excerpt', () => {
    const q = { ...base, evidence_quote: 'led a team of twelve engineers' };
    expect(verifyQuestion(q, projects).support).toBe('needs_review');
  });

  it('flags and clears an evidence id that belongs to no project', () => {
    const result = verifyQuestion({ ...base, evidence_id: 'invented' }, projects);
    expect(result.support).toBe('needs_review');
    expect(result.evidence_id).toBeNull();
  });

  it('flags a very short quote that would match almost anything', () => {
    expect(verifyQuestion({ ...base, evidence_quote: 'API' }, projects).support).toBe('needs_review');
  });

  it('flags a project question when the candidate has no projects', () => {
    expect(verifyQuestion(base, []).support).toBe('needs_review');
  });

  it('marks role questions not_applicable and drops any evidence fields', () => {
    const result = verifyQuestion({ ...base, kind: 'role' }, projects);
    expect(result).toMatchObject({ support: 'not_applicable', evidence_id: null, evidence_quote: null });
  });
});
