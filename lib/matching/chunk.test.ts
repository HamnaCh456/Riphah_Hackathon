import { describe, expect, it } from 'vitest';
import { chunkResume } from './chunk';

describe('chunkResume', () => {
  it('assigns sections from headers and keeps offsets into the raw text', () => {
    const raw = 'Sam Lee\nsam@x.dev\n\nSKILLS\nPython, Docker\n\nWork Experience\nBuilt APIs in Django.\n\nProjects:\nA booking system.';
    const chunks = chunkResume(raw);
    expect(chunks.map((c) => c.section)).toEqual(['contact', 'skills', 'experience', 'project']);
    for (const c of chunks) expect(raw.slice(c.startOffset)).toContain(c.content.split('\n')[0]);
  });

  it('does not lose a resume that has no headers', () => {
    const raw = 'Sam Lee\nsam@x.dev\n0300-1234567\nI built APIs in Django for five years.\nI also run Postgres.';
    const chunks = chunkResume(raw);
    expect(chunks[0].section).toBe('contact');
    expect(chunks[1].section).toBe('other');
    expect(chunks[1].content).toContain('Django');
  });

  it('splits long sections and never exceeds the size limit by much', () => {
    const line = 'Worked on backend services and shipped features to production.';
    const chunks = chunkResume(`Experience\n${Array(40).fill(line).join('\n')}`);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.content.length).toBeLessThanOrEqual(800);
  });

  it('returns nothing for empty text', () => {
    expect(chunkResume('  \n ')).toEqual([]);
  });
});
