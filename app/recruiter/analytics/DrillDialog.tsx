// app/recruiter/analytics/DrillDialog.tsx
'use client';
import Link from 'next/link';
import { createContext, useContext, useState, useTransition, type MouseEvent, type ReactNode } from 'react';
import { STATUS_LABELS, stageTone } from '@/components/matching/labels';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import type { DrillRow } from '@/lib/analytics/drill';
import { drillAction } from './actions';

export type DrillTarget = { metric: string; title: string; count: number };

const DrillContext = createContext<((target: DrillTarget) => void) | null>(null);

/** Lets any number on the dashboard open its applicants over the page. */
export function DrillProvider({ job, children }: { job?: string; children: ReactNode }) {
  const toast = useToast();
  const [target, setTarget] = useState<DrillTarget | null>(null);
  const [rows, setRows] = useState<DrillRow[] | null>(null);
  const [, start] = useTransition();

  const open = (next: DrillTarget) => {
    setTarget(next);
    setRows(null);
    start(async () => {
      try {
        const found = await drillAction(next.metric, job);
        if (!found) throw new Error('Not found');
        setRows(found);
      } catch {
        setTarget(null);
        toast('Could not load these applicants. Try again.', { tone: 'error' });
      }
    });
  };

  return (
    <DrillContext.Provider value={open}>
      {children}
      <Dialog open={target !== null} onClose={() => setTarget(null)} title={target?.title ?? ''}>
        {rows === null ? (
          <div role="status" aria-label="Loading" className="space-y-3">
            {Array.from({ length: Math.min(target?.count ?? 3, 6) || 1 }, (_, i) => <Skeleton key={i} className="h-9" />)}
          </div>
        ) : rows.length === 0 ? (
          <p>No applicants here yet.</p>
        ) : (
          <ul className="-my-2">
            {rows.map((row) => (
              <li key={row.id} className="border-b border-hairline-soft last:border-b-0">
                <Link
                  href={`/recruiter/jobs/${row.job_id}/applicants/${row.id}`}
                  className="-mx-2 flex items-center justify-between gap-3 rounded-small px-2 py-2.5 transition-colors hover:bg-wash"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-navy">{row.candidate.full_name}</span>
                    <span className="block text-[13px]">{row.jobs.title}</span>
                  </span>
                  <Badge tone={stageTone(row.status)}>{STATUS_LABELS[row.status]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </DrillContext.Provider>
  );
}

/** Opens the pop-up. A new-tab click, or no provider, still follows the real link. */
export function DrillLink({ href, target, className, title, children }: {
  href: string; target: DrillTarget; className?: string; title?: string; children: ReactNode;
}) {
  const open = useContext(DrillContext);
  const onClick = (event: MouseEvent) => {
    if (!open || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open(target);
  };
  return <Link href={href} prefetch={false} className={className} title={title} onClick={onClick}>{children}</Link>;
}
