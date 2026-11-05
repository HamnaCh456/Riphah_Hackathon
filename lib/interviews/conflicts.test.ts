// lib/interviews/conflicts.test.ts
import { describe, expect, it } from 'vitest';
import { findConflicts, flagConflicts, type Slot } from '@/lib/interviews/conflicts';

const slot = (id: string, start: string, end: string, over: Partial<Slot> = {}): Slot => ({
  id, interviewerId: 'ali', candidateId: id, status: 'scheduled',
  startsAt: `2026-11-10T${start}:00Z`, endsAt: `2026-11-10T${end}:00Z`, ...over,
});

describe('findConflicts', () => {
  const booked = slot('a', '10:00', '11:00', { candidateId: 'c1' });

  it('flags the same interviewer at an overlapping time', () => {
    expect(findConflicts(slot('b', '10:30', '11:30'), [booked]))
      .toEqual([{ type: 'interviewer', withId: 'a' }]);
  });

  it('flags an interview fully inside another', () => {
    expect(findConflicts(slot('b', '10:15', '10:45'), [booked])).toHaveLength(1);
  });

  it('flags the same candidate with a different interviewer', () => {
    expect(findConflicts(slot('b', '10:30', '11:30', { interviewerId: 'sara', candidateId: 'c1' }), [booked]))
      .toEqual([{ type: 'candidate', withId: 'a' }]);
  });

  it('reports both when interviewer and candidate both clash', () => {
    expect(findConflicts(slot('b', '10:30', '11:30', { candidateId: 'c1' }), [booked])).toHaveLength(2);
  });

  it('allows back-to-back interviews', () => {
    expect(findConflicts(slot('b', '11:00', '12:00'), [booked])).toEqual([]);
    expect(findConflicts(slot('b', '09:00', '10:00'), [booked])).toEqual([]);
  });

  it('allows different people at the same time', () => {
    expect(findConflicts(slot('b', '10:00', '11:00', { interviewerId: 'sara' }), [booked])).toEqual([]);
  });

  it('ignores cancelled interviews', () => {
    expect(findConflicts(slot('b', '10:30', '11:30'), [{ ...booked, status: 'cancelled' }])).toEqual([]);
  });

  it('does not clash with itself when rescheduling', () => {
    expect(findConflicts(slot('a', '10:30', '11:30'), [booked])).toEqual([]);
  });

  it('compares times correctly when stored in different formats', () => {
    const other = { ...booked, startsAt: '2026-11-10T15:00:00+05:00', endsAt: '2026-11-10T16:00:00+05:00' };
    expect(findConflicts(slot('b', '10:30', '11:30'), [other])).toHaveLength(1);
  });
});

describe('flagConflicts', () => {
  it('flags both interviews in a clash and leaves others alone', () => {
    const flagged = flagConflicts([
      slot('a', '10:00', '11:00'), slot('b', '10:30', '11:30'), slot('c', '14:00', '15:00'),
    ]);
    expect(flagged.get('a')).toHaveLength(1);
    expect(flagged.get('b')).toHaveLength(1);
    expect(flagged.get('c')).toBeUndefined();
  });

  it('does not flag a cancelled interview', () => {
    const flagged = flagConflicts([
      slot('a', '10:00', '11:00'), slot('b', '10:30', '11:30', { status: 'cancelled' }),
    ]);
    expect(flagged.size).toBe(0);
  });
});
