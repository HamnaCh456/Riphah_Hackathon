import { computeScore } from './score';
import type { Component, Depth, MatchStatus, ScoreResult } from './types';

export interface StoredRequirement {
  requirement_key: string;
  component: Component;
  label: string;
  importance: number;
  is_required: boolean;
  status: MatchStatus;
  depth: Depth;
}

export interface OverrideRow {
  requirement_key: string;
  status: MatchStatus | null;
  reason: string;
  created_at: string;
}

export type EffectiveRequirement<T> = T & {
  aiStatus: MatchStatus;
  effectiveStatus: MatchStatus;
  effectiveDepth: Depth;
  overrideReason: string | null;
};

export function applyOverrides<T extends StoredRequirement>(
  requirements: T[], overrides: OverrideRow[],
): ScoreResult & { requirements: EffectiveRequirement<T>[] } {
  const latest = new Map<string, OverrideRow>();
  for (const o of [...overrides].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    latest.set(o.requirement_key, o);
  }
  const effective = requirements.map((r) => {
    const override = latest.get(r.requirement_key);
    const active = override?.status ? override : null;
    return {
      ...r,
      aiStatus: r.status,
      effectiveStatus: active?.status ?? r.status,
      effectiveDepth: active ? (active.status === 'matched' ? 'demonstrated' as const : null) : r.depth,
      overrideReason: active?.reason ?? null,
    };
  });
  const scored = computeScore(effective.map((r) => ({
    component: r.component,
    importance: r.importance,
    isRequired: r.is_required,
    status: r.effectiveStatus,
    depth: r.effectiveDepth,
  })));
  return { ...scored, requirements: effective };
}
