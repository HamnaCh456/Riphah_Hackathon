import { describe, expect, it } from 'vitest';
import { recommendation, summarize } from './explain';
import type { Component, MatchStatus } from './types';

const r = (label: string, status: MatchStatus, component: Component = 'skill', isRequired = true) =>
  ({ label, status, component, isRequired });

describe('recommendation', () => {
  it('follows the score bands', () => {
    expect(recommendation(80, 85)).toBe('Review first');
    expect(recommendation(60, 70)).toBe('Worth reviewing');
    expect(recommendation(30, 40)).toBe('Few requirements backed');
  });
  it('does not judge a thin resume on a low score', () => {
    expect(recommendation(20, 90)).toBe('Not enough resume evidence');
  });
});

describe('summarize', () => {
  it('names gaps with the right words', () => {
    const text = summarize(62, 80, [
      r('Python', 'matched'), r('Django', 'partial'),
      r('Docker', 'no_evidence'), r('Kafka', 'confirmed_absent'),
    ]);
    expect(text).toContain('1 of 4 required skills');
    expect(text).toContain('Related experience only: Django');
    expect(text).toContain('Not mentioned in the resume: Docker');
    expect(text).toContain('Confirmed missing: Kafka');
    expect(text).toContain('could reach 80');
  });
  it('omits the ceiling sentence when nothing is unknown', () => {
    expect(summarize(100, 100, [r('Python', 'matched')])).not.toContain('could reach');
  });
});
