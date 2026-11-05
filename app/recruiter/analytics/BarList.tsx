// app/recruiter/analytics/BarList.tsx
import Link from 'next/link';
import styles from './analytics.module.css';

export type Bar = { key: string; label: string; value: number; href: string; detail?: string };

export function BarList({ bars, ariaLabel }: { bars: Bar[]; ariaLabel: string }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <ul className={styles.bars} aria-label={ariaLabel}>
      {bars.map((bar) => (
        <li key={bar.key}>
          <Link href={bar.href} className={styles.bar} title={`${bar.label}: ${bar.detail ?? bar.value}. Open applicants.`}>
            <span className={styles.barLabel}>{bar.label}</span>
            <span className={styles.barTrack} aria-hidden="true">
              {bar.value > 0 && <span className={styles.barFill} style={{ width: `${(bar.value / max) * 100}%` }} />}
            </span>
            <span className={styles.barValue}>{bar.detail ?? bar.value}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
