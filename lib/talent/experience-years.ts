const MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec";
const DATE = `(?:(${MONTHS})[a-z]*\\.?\\s+|(\\d{1,2})\\/)?((?:19|20)\\d{2})`;
const RANGE = new RegExp(
  `${DATE}\\s*(?:-|–|—|to)\\s*(?:${DATE}|(present|current|now|today|ongoing|date))`,
  "gi",
);
const MONTHS_PER_YEAR = 12;

function toMonths(
  name: string | undefined,
  number: string | undefined,
  year: string,
  fallbackMonth: number,
): number {
  const month = name
    ? MONTHS.split("|").indexOf(name.slice(0, 3).toLowerCase())
    : number
      ? Number(number) - 1
      : fallbackMonth;
  return Number(year) * MONTHS_PER_YEAR + month;
}

/** The resume lines holding the dates behind careerYears, word for word. */
export function datedLines(experienceTexts: string[]): string[] {
  return experienceTexts
    .flatMap((text) => text.split(/?
/))
    .filter((line) => line.search(RANGE) >= 0)
    .map((line) => line.trim());
}

/**
 * Years of work from the date ranges in a resume's experience section, counting overlapping jobs
 * once. Normal code does this so the same dates always give the same answer. Null means no dates
 * were found, which doesn't mean the person has no experience.
 */
export function careerYears(experienceTexts: string[], now: Date): number | null {
  const today = now.getUTCFullYear() * MONTHS_PER_YEAR + now.getUTCMonth();
  const ranges: [number, number][] = [];
  for (const text of experienceTexts) {
    for (const m of text.matchAll(RANGE)) {
      const start = toMonths(m[1], m[2], m[3], 0);
      // "Jan 2020 - Dec 2021" includes December. "2020 - 2021" is counted as one year.
      const end = m[6]
        ? toMonths(m[4], m[5], m[6], -1) + 1
        : today;
      if (end > start) ranges.push([start, Math.min(end, today)]);
    }
  }
  if (ranges.length === 0) return null;

  let months = 0;
  let coveredTo = -Infinity;
  for (const [start, end] of ranges.sort((a, b) => a[0] - b[0])) {
    const from = Math.max(start, coveredTo);
    if (end > from) months += end - from;
    coveredTo = Math.max(coveredTo, end);
  }
  return Math.round((months / MONTHS_PER_YEAR) * 10) / 10;
}
