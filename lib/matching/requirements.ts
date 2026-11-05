import { createHash } from 'node:crypto';
import type { Component, Requirement } from './types';

export const PROJECT_KEY = 'project_relevance';
export const PROMPT_VERSION = 'v1';

export interface JobRequirementRow {
  id: string;
  kind: string;
  label: string;
  importance: number;
  is_required: boolean;
}

export function buildRequirements(jobTitle: string, rows: JobRequirementRow[]): Requirement[] {
  if (rows.length === 0) return [];
  const reqs: Requirement[] = rows.map((r) => ({
    key: r.id,
    component: r.kind as Component,
    label: r.label,
    importance: r.importance,
    isRequired: r.is_required,
  }));
  const required = rows.filter((r) => r.kind === 'skill' && r.is_required).map((r) => r.label);
  const uses = required.length ? ` using ${required.join(', ')} or close equivalents` : '';
  reqs.push({
    key: PROJECT_KEY,
    component: 'project',
    label: `Has built projects relevant to a ${jobTitle} role${uses}`,
    importance: 3,
    isRequired: true,
  });
  return reqs;
}

// Same input means the stored result is reused, so scores stay stable during a demo.
export function inputHash(reqs: Requirement[], resumeText: string): string {
  return createHash('sha256')
    .update(JSON.stringify({ PROMPT_VERSION, reqs, resumeText }))
    .digest('hex');
}
