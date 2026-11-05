// app/recruiter/applications/[id]/interview/InterviewRowActions.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { cancelInterviewAction } from '@/app/recruiter/interviews/actions';

export function CancelInterview({ interviewId }: { interviewId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) return <Button variant="ghost" onClick={() => setConfirming(true)}>Cancel interview</Button>;
  return (
    <>
      <span>Cancel this interview?</span>
      <Button variant="ghost" disabled={pending} onClick={() => start(async () => {
        const result = await cancelInterviewAction(interviewId);
        if (!result.ok) { toast(result.error, { tone: 'error' }); return; }
        toast('Interview cancelled.');
        router.refresh();
      })}>Yes, cancel it</Button>
      <Button variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>Keep it</Button>
    </>
  );
}
