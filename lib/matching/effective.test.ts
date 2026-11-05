import { describe, expect, it } from 'vitest';
import { applyOverrides } from './effective';
import type { StoredRequirement } from './effective';

const stored = (key: string, status: StoredRequirement['status']): StoredRequirement => ({
  requirement_key: key, component: 'skill', label: key, importance: 3, is_required: true,
  status, depth: status === 'matched' ? 'demonstrated' : null,
});

describe('applyOverrides', () => {
  const reqs = [stored('a', 'matched'), stored('b', 'no_evidence')];

  it('recalculates with the newest override and keeps the AI result', () => {
    const out = applyOverrides(reqs, [
      { requirement_key: 'b', status: 'confirmed_absent', reason: 'old', created_at: '2026-11-05T10:00:00Z' },
      { requirement_key: 'b', status: 'matched', reason: 'Confirmed on call', created_at: '2026-11-05T11:00:00Z' },
    ]);
    expect(out.score).toBe(100);
    const b = out.requirements.find((r) => r.requirement_key === 'b')!;
    expect(b).toMatchObject({ effectiveStatus: 'matched', aiStatus: 'no_evidence', overrideReason: 'Confirmed on call' });
  });

  it('a cleared override returns to the AI result', () => {
    const out = applyOverrides(reqs, [
      { requirement_key: 'b', status: 'matched', reason: 'x', created_at: '2026-11-05T10:00:00Z' },
      { requirement_key: 'b', status: null, reason: 'Mistake', created_at: '2026-11-05T11:00:00Z' },
    ]);
    expect(out.requirements[1]).toMatchObject({ effectiveStatus: 'no_evidence', overrideReason: null });
    expect(out.score).toBe(50);
  });

  it('marking something confirmed missing lowers the ceiling', () => {
    const out = applyOverrides(reqs, [
      { requirement_key: 'b', status: 'confirmed_absent', reason: 'Candidate said no', created_at: '2026-11-05T10:00:00Z' },
    ]);
    expect(out.ceiling).toBe(50);
  });
});
