// lib/interviews/conflicts.ts
export type Slot = {
  id: string;
  interviewerId: string;
  candidateId: string;
  startsAt: string;
  endsAt: string;
  status: 'scheduled' | 'completed' | 'cancelled';
};

export type Conflict = { type: 'interviewer' | 'candidate'; withId: string };

function overlaps(a: Slot, b: Slot): boolean {
  return Date.parse(a.startsAt) < Date.parse(b.endsAt) && Date.parse(b.startsAt) < Date.parse(a.endsAt);
}

export function findConflicts(target: Slot, others: Slot[]): Conflict[] {
  if (target.status === 'cancelled') return [];
  const conflicts: Conflict[] = [];
  for (const other of others) {
    if (other.id === target.id || other.status === 'cancelled' || !overlaps(target, other)) continue;
    if (other.interviewerId === target.interviewerId) conflicts.push({ type: 'interviewer', withId: other.id });
    if (other.candidateId === target.candidateId) conflicts.push({ type: 'candidate', withId: other.id });
  }
  return conflicts;
}

export function flagConflicts(slots: Slot[]): Map<string, Conflict[]> {
  const flagged = new Map<string, Conflict[]>();
  for (const slot of slots) {
    const conflicts = findConflicts(slot, slots);
    if (conflicts.length) flagged.set(slot.id, conflicts);
  }
  return flagged;
}
