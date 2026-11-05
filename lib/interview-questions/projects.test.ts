import { describe, expect, it } from 'vitest';
import { toProjectEvidence } from '@/lib/interview-questions/projects';

describe('toProjectEvidence', () => {
  const chunk = {
    id: 'c1',
    content: 'Shopwise\nAyesha Khan built the order API. Contact ayesha@mail.com.',
  };

  it('uses the first line as the label', () => {
    expect(toProjectEvidence([chunk], 'Ayesha Khan')[0].label).toBe('Shopwise');
  });

  it("removes the candidate's name and contact details", () => {
    const { excerpt } = toProjectEvidence([chunk], 'Ayesha Khan')[0];
    expect(excerpt).not.toContain('Ayesha');
    expect(excerpt).not.toContain('ayesha@mail.com');
    expect(excerpt).toContain('built the order API');
  });
});
