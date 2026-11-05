// app/recruiter/analytics/RingList.tsx
import { Ring, type RingSegment } from '@/components/ui/ring';
import { DrillLink, type DrillTarget } from './DrillDialog';
import styles from './analytics.module.css';

export type RingItem = {
  key: string; label: string; value: number; total: number; segments: RingSegment[];
  href: string; drill: DrillTarget; detail: string;
};

export function RingList({ items, ariaLabel }: { items: RingItem[]; ariaLabel: string }) {
  return (
    <ul className={styles.rings} aria-label={ariaLabel}>
      {items.map((item) => (
        <li key={item.key}>
          <DrillLink href={item.href} target={item.drill} className={styles.ringRow} title={`${item.label}: ${item.detail}. Open applicants.`}>
            <Ring size={38} stroke={4} total={item.total} segments={item.segments} label={`${item.label}: ${item.detail}`}>
              <span className="text-[13px]">{item.value}</span>
            </Ring>
            <span className={styles.ringLabel}>{item.label}</span>
            <span className={styles.ringDetail}>{item.detail}</span>
          </DrillLink>
        </li>
      ))}
    </ul>
  );
}
