'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { DecisionControl } from '@/app/recruiter/applications/[id]/interview/DecisionControl';
import { ScheduleDialog, type InterviewerOption } from '@/app/recruiter/applications/[id]/interview/ScheduleDialog';
import { changeStatusAction } from '@/app/recruiter/jobs/[jobId]/applicants/[applicationId]/actions';
import { ActionForm } from '@/components/matching/ActionForm';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { RECRUITER_MOVES, type ApplicationStatus, type MoveOption } from '@/lib/pipeline/status';

/** Every move here is a recruiter's click. Keyed by stage so an open pop-up closes after a move. */
export function StatusControls({ applicationId, status, candidateName, interviewers, today }: {
  applicationId: string;
  status: ApplicationStatus;
  candidateName: string;
  interviewers: InterviewerOption[];
  today: string;
}) {
  // The final decision also checks for feedback and tells the candidate.
  if (status === 'interview') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <DecisionControl applicationId={applicationId} candidateName={candidateName} />
      </div>
    );
  }

  return (
    <div key={status} className="flex flex-wrap items-center gap-2">
      {RECRUITER_MOVES[status].map((move) => {
        if (move.to === 'interview' && status === 'shortlisted') {
          return (
            <ScheduleDialog key={move.to} advance applicationId={applicationId} interviewers={interviewers} today={today}
              trigger={<Button size="sm">{move.label}</Button>} />
          );
        }
        if (move.requiresReason) {
          return <ReasonMove key={move.to} applicationId={applicationId} candidateName={candidateName} move={move} />;
        }
        return (
          <ActionForm key={move.to} action={changeStatusAction}>
            <input type="hidden" name="applicationId" value={applicationId} />
            <input type="hidden" name="to" value={move.to} />
            <Button size="sm" variant={move.primary ? 'primary' : 'ghost'}>{move.label}</Button>
          </ActionForm>
        );
      })}
    </div>
  );
}

function ReasonMove({ applicationId, candidateName, move }: {
  applicationId: string; candidateName: string; move: MoveOption;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  const submit = () => start(async () => {
    const data = new FormData();
    data.set('applicationId', applicationId);
    data.set('to', move.to);
    data.set('reason', reason);
    const result = await changeStatusAction(data);
    if (!result.ok) { toast(result.error, { tone: 'error' }); return; }
    if (result.message) toast(result.message);
    setOpen(false);
    router.refresh();
  });

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>{move.label}</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`${move.label}: ${candidateName}`}
        footer={<Button size="sm" loading={pending} disabled={reason.trim().length < 3} onClick={submit}>{move.label}</Button>}>
        <label className="block font-arial text-sm">
          Reason (required, never shown to the candidate)
          <textarea
            rows={3}
            maxLength={1000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-1 block w-full rounded-small border border-hairline bg-surface px-3 py-2 text-ink transition-colors hover:border-hairline-strong focus:border-brand"
          />
        </label>
      </Dialog>
    </>
  );
}
