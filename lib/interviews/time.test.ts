// lib/interviews/time.test.ts
import { describe, expect, it } from 'vitest';
import { addMinutes, formatDay, formatTimeRange, parsePkt, TIME_SLOTS, toPktFields } from '@/lib/interviews/time';

describe('parsePkt', () => {
  it('reads date and time as Pakistan time', () => {
    expect(parsePkt('2026-11-10', '10:00').toISOString()).toBe('2026-11-10T05:00:00.000Z');
  });
  it('rejects a date that does not exist', () => {
    expect(() => parsePkt('2026-02-31', '10:00')).toThrow();
  });
  it('rejects a badly formed time', () => {
    expect(() => parsePkt('2026-11-10', '25:00')).toThrow();
  });
});

describe('formatting', () => {
  it('shows a UTC time as Pakistan time regardless of the server zone', () => {
    expect(formatTimeRange('2026-11-10T05:00:00Z', '2026-11-10T06:00:00Z')).toBe('10:00 – 11:00 PKT');
    expect(formatDay('2026-11-10T20:00:00Z')).toBe('Wed, 11 Nov 2026');
  });
  it('turns a stored time back into form fields', () => {
    expect(toPktFields('2026-11-10T05:15:00Z')).toEqual({ date: '2026-11-10', time: '10:15' });
  });
});

describe('addMinutes', () => {
  it('adds a duration', () => {
    expect(addMinutes(new Date('2026-11-10T05:00:00Z'), 45).toISOString()).toBe('2026-11-10T05:45:00.000Z');
  });
});

describe('TIME_SLOTS', () => {
  it('runs every 15 minutes from 08:00 to 20:00', () => {
    expect(TIME_SLOTS[0]).toBe('08:00');
    expect(TIME_SLOTS[1]).toBe('08:15');
    expect(TIME_SLOTS.at(-1)).toBe('20:00');
  });
});
