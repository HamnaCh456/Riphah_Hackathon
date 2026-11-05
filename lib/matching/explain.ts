import type { Component, MatchStatus } from './types';

interface Item { label: string; status: MatchStatus; component: Component; isRequired: boolean }

export function recommendation(score: number, ceiling: number): string {
  if (ceiling - score >= 40) return 'Not enough resume evidence';
  if (score >= 75) return 'Review first';
  if (score >= 50) return 'Worth reviewing';
  return 'Few requirements backed';
}

// Written by code from verified results, so the summary cannot contain an invented claim.
export function summarize(score: number, ceiling: number, items: Item[]): string {
  const required = items.filter((i) => i.component === 'skill' && i.isRequired);
  const backed = required.filter((i) => i.status === 'matched').length;
  const names = (status: MatchStatus) =>
    items.filter((i) => i.component !== 'project' && i.status === status).map((i) => i.label).join(', ');

  const parts = [`${backed} of ${required.length} required skills backed by resume text.`];
  if (names('partial')) parts.push(`Related experience only: ${names('partial')}.`);
  if (names('no_evidence')) parts.push(`Not mentioned in the resume: ${names('no_evidence')}.`);
  if (names('confirmed_absent')) parts.push(`Confirmed missing: ${names('confirmed_absent')}.`);
  if (ceiling > score) parts.push(`Scored ${score}, could reach ${ceiling} if the missing evidence is confirmed.`);
  return parts.join(' ');
}
