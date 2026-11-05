// lib/interviews/time.ts
const ZONE = 'Asia/Karachi';

export function parsePkt(date: string, time: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error('Invalid date or time');
  }
  const parsed = new Date(`${date}T${time}:00+05:00`);
  // new Date rolls 31 Feb into March, so check the date survived unchanged.
  if (Number.isNaN(parsed.getTime()) || toPktFields(parsed.toISOString()).date !== date) {
    throw new Error('Invalid date or time');
  }
  return parsed;
}

export function addMinutes(start: Date, minutes: number): Date {
  return new Date(start.getTime() + minutes * 60_000);
}

export function toPktFields(iso: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

export function formatTimeRange(startIso: string, endIso: string): string {
  return `${toPktFields(startIso).time} – ${toPktFields(endIso).time} PKT`;
}

export function formatDay(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('weekday')}, ${get('day')} ${get('month')} ${get('year')}`;
}

export const TIME_SLOTS: string[] = Array.from({ length: 49 }, (_, i) => {
  const minutes = 8 * 60 + i * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});
