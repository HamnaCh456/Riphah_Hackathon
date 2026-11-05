'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import type { ActionResult } from './ActionForm';

const GIVE_UP_MS = 90_000;

/**
 * The assessment starts just after the action returns, so the first refresh can still show the old
 * state. This keeps refreshing until the server shows a new one, then this button unmounts.
 */
export function RetryAssessment({ applicationId, label, action }: {
  applicationId: string;
  label: string;
  action: (data: FormData) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!waiting) return;
    const refresh = setInterval(() => router.refresh(), 3000);
    const stop = setTimeout(() => setWaiting(false), GIVE_UP_MS);
    return () => {
      clearInterval(refresh);
      clearTimeout(stop);
    };
  }, [waiting, router]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      loading={pending || waiting}
      onClick={() =>
        start(async () => {
          const data = new FormData();
          data.set('applicationId', applicationId);
          const result = await action(data);
          if (!result.ok) {
            toast(result.error, { tone: 'error' });
            return;
          }
          setWaiting(true);
          router.refresh();
        })
      }
    >
      {pending || waiting ? 'Assessing…' : label}
    </Button>
  );
}
