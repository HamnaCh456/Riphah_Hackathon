// lib/analytics/format.ts
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const oneDecimal = (n: number) => String(Math.round(n * 10) / 10);

export function formatDuration(ms: number | null): string {
  if (ms === null) return '–';
  if (ms < MIN) return 'Under 1 min';
  if (ms < HOUR) return `${Math.round(ms / MIN)} min`;
  if (ms < 48 * HOUR) return `${oneDecimal(ms / HOUR)} h`;
  return `${oneDecimal(ms / DAY)} days`;
}

export function formatPercent(percent: number | null): string {
  return percent === null ? '–' : `${percent}%`;
}
