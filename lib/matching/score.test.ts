import { describe, expect, it } from 'vitest';
import { computeScore } from './score';
import type { Component, Depth, MatchStatus, ScorableRequirement } from './types';

const r = (component: Component, status: MatchStatus, depth: Depth = null, isRequired = true): ScorableRequirement =>
  ({ component, importance: 3, isRequired, status, depth });

describe('computeScore', () => {
  it('applies 50/25/15/10 weights and the listed-only credit', () => {
    const result = computeScore([
      r('skill', 'matched', 'demonstrated'),
      r('skill', 'matched', 'demonstrated'),
      r('skill', 'matched', 'listed'),
      r('skill', 'no_evidence'),
      r('experience', 'matched', 'demonstrated'),
      r('project', 'partial', 'demonstrated'),
      r('qualification', 'matched', 'demonstrated'),
    ]);
    expect(result.score).toBe(76);
    expect(result.ceiling).toBe(89);
    expect(result.rescaled).toBe(false);
  });

  it('rescales when a component has no requirements', () => {
    const result = computeScore([
      r('skill', 'matched', 'demonstrated'),
      r('experience', 'no_evidence'),
      r('project', 'no_evidence'),
    ]);
    expect(result.score).toBe(56);
    expect(result.ceiling).toBe(100);
    expect(result.rescaled).toBe(true);
  });

  it('keeps the ceiling up for missing evidence and down for confirmed absence', () => {
    const missing = computeScore([r('skill', 'matched', 'demonstrated'), r('skill', 'no_evidence')]);
    const absent = computeScore([r('skill', 'matched', 'demonstrated'), r('skill', 'confirmed_absent')]);
    expect(missing.score).toBe(absent.score);
    expect(missing.ceiling).toBe(100);
    expect(absent.ceiling).toBe(50);
  });

  it('gives preferred requirements half weight', () => {
    const result = computeScore([
      r('skill', 'matched', 'demonstrated', true),
      r('skill', 'no_evidence', null, false),
    ]);
    expect(result.score).toBe(67);
    expect(result.ceiling).toBe(100);
  });

  it('returns zero for an all-absent candidate', () => {
    expect(computeScore([r('skill', 'confirmed_absent')])).toMatchObject({ score: 0, ceiling: 0 });
  });

  it('refuses to score nothing', () => {
    expect(() => computeScore([])).toThrow('no requirements');
  });
});
