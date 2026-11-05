import { STATUS_LABELS, formatTime } from '@/components/matching/labels';
import type { StatusEventRecord } from '@/lib/matching/read';

const ACTOR: Record<string, string> = { system: 'System', recruiter: 'Recruiter', candidate: 'Candidate' };

export function AuditTrail({ events }: { events: StatusEventRecord[] }) {
  const sorted = [...events].sort((a, b) => a.id - b.id);
  return (
    <section className="card p-5">
      <h2 className="text-lg">History</h2>
      <ol className="mt-1">
        {sorted.map((e) => (
          <li key={e.id} className="border-b border-hairline-soft py-2.5 text-sm last:border-b-0 last:pb-0">
            <p className="text-ink">
              {e.from_status ? `${STATUS_LABELS[e.from_status]} → ` : ''}{STATUS_LABELS[e.to_status]}
            </p>
            <p className="text-[13px]">{ACTOR[e.actor_kind]} · {formatTime(e.created_at)}</p>
            {e.reason && <p className="mt-1 break-words text-[13px]">{e.reason}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
