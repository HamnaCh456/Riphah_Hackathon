// app/recruiter/applications/[id]/interview/DecisionControl.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { recordDecisionAction } from '@/app/recruiter/interviews/actions';
import styles from '@/app/recruiter/interviews/interviews.module.css';

export function DecisionControl({ applicationId, candidateName }: { applicationId: string; candidateName: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [decision, setDecision] = useState<'selected' | 'rejected' | null>(null);
  const [reason, setReason] = useState('');
  const [needsConfirm, setNeedsConfirm] = useState(false);

  const close = () => { setDecision(null); setNeedsConfirm(false); };
  const submit = () => start(async () => {
    const result = await recordDecisionAction({ applicationId, decision, reason, confirmNoFeedback: needsConfirm });
    if (result.ok) {
      toast('Decision recorded.');
      close();
      router.refresh();
    } else if ('needsNoFeedbackConfirm' in result) {
      setNeedsConfirm(true);
    } else {
      toast(result.error, { tone: 'error' });
    }
  });

  const verb = decision === 'selected' ? 'Select' : 'Reject';
  return (
    <>
      <Button size="sm" onClick={() => setDecision('selected')}>Select</Button>
      <Button variant="ghost" size="sm" onClick={() => setDecision('rejected')}>Reject</Button>
      <Dialog open={decision !== null} onClose={close} title={`${verb} ${candidateName}?`}
        footer={<Button variant="primary" size="sm" loading={pending} onClick={submit}>
          {needsConfirm ? `${verb} without feedback` : `${verb} candidate`}
        </Button>}>
        {needsConfirm && (
          <div className={styles.alert} role="alert"><p>No interview feedback has been recorded yet.</p></div>
        )}
        <label className={styles.field}>Reason (not shown to the candidate)
          <textarea className={styles.textarea} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      </Dialog>
    </>
  );
}
