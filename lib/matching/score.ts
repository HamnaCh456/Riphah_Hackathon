import type { Component, ScorableRequirement, ScoreResult } from './types';

export const COMPONENT_WEIGHTS: Record<Component, number> = {
  skill: 0.5,
  experience: 0.25,
  project: 0.15,
  qualification: 0.1,
};

export function creditFor(req: Pick<ScorableRequirement, 'status' | 'depth'>): number {
  if (req.status === 'matched') return req.depth === 'listed' ? 0.7 : 1;
  if (req.status === 'partial') return 0.5;
  return 0;
}

const weightOf = (r: ScorableRequirement) => r.importance * (r.isRequired ? 1 : 0.5);

export function computeScore(reqs: ScorableRequirement[]): ScoreResult {
  if (reqs.length === 0) throw new Error('Cannot score: no requirements');

  const present = (Object.keys(COMPONENT_WEIGHTS) as Component[])
    .filter((c) => reqs.some((r) => r.component === c));
  const activeWeight = present.reduce((sum, c) => sum + COMPONENT_WEIGHTS[c], 0);

  let score = 0;
  let ceiling = 0;
  const components = present.map((component) => {
    const items = reqs.filter((r) => r.component === component);
    const total = items.reduce((sum, r) => sum + weightOf(r), 0);
    const credit = items.reduce((sum, r) => sum + weightOf(r) * creditFor(r), 0) / total;
    const potential = items.reduce(
      (sum, r) => sum + weightOf(r) * (r.status === 'no_evidence' ? 1 : creditFor(r)), 0,
    ) / total;
    const weight = COMPONENT_WEIGHTS[component] / activeWeight;
    score += weight * credit;
    ceiling += weight * potential;
    return { component, weight, credit };
  });

  return {
    score: Math.round(score * 100),
    ceiling: Math.round(ceiling * 100),
    components,
    rescaled: present.length < 4,
  };
}
