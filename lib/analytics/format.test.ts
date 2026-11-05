// lib/analytics/format.test.ts
import { describe, expect, it } from 'vitest';
import { formatDuration, formatPercent } from '@/lib/analytics/format';

const MIN = 60_000;

describe('formatDuration', () => {
  it.each([
    [null, '–'],
    [20_000, 'Under 1 min'],
    [4 * MIN, '4 min'],
    [90 * MIN, '1.5 h'],
    [47 * 60 * MIN, '47 h'],
    [72 * 60 * MIN, '3 days'],
    [84 * 60 * MIN, '3.5 days'],
  ])('%s becomes %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});

describe('formatPercent', () => {
  it('shows a dash for no data and a real 0%', () => {
    expect(formatPercent(null)).toBe('–');
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(25)).toBe('25%');
  });
});
