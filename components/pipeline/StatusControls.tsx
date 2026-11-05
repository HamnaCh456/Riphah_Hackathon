import { changeStatusAction } from '@/app/recruiter/jobs/[jobId]/applicants/[applicationId]/actions';
import { ActionForm } from '@/components/matching/ActionForm';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RECRUITER_MOVES, type ApplicationStatus, type MoveOption } from '@/lib/pipeline/status';

/** Every move here is a recruiter's click. Keyed by stage so an open reason box closes after a move. */
export function StatusControls({ applicationId, status }: { applicationId: string; status: ApplicationStatus }) {
  const moves = RECRUITER_MOVES[status];
  return (
    <div key={status} className="flex flex-wrap items-center gap-2">
      {moves.map((move) =>
        move.requiresReason
          ? <ReasonMove key={move.to} applicationId={applicationId} move={move} />
          : (
            <ActionForm key={move.to} action={changeStatusAction}>
              <input type="hidden" name="applicationId" value={applicationId} />
              <input type="hidden" name="to" value={move.to} />
              <Button size="sm" variant={move.primary ? 'primary' : 'ghost'}>{move.label}</Button>
            </ActionForm>
          ))}
    </div>
  );
}

function ReasonMove({ applicationId, move }: { applicationId: string; move: MoveOption }) {
  return (
    <details className="relative">
      <summary className={`${buttonVariants({ variant: 'ghost', size: 'sm' })} list-none [&::-webkit-details-marker]:hidden`}>
        {move.label}
      </summary>
      <ActionForm
        action={changeStatusAction}
        className="absolute right-0 z-20 mt-2 w-[min(20rem,calc(100vw-40px))] space-y-2 rounded-small border bg-kelp p-3 max-sm:left-0 max-sm:right-auto"
      >
        <input type="hidden" name="applicationId" value={applicationId} />
        <input type="hidden" name="to" value={move.to} />
        <label className="block font-arial text-[13px]" htmlFor={`reason-${move.to}`}>
          Reason (required, never shown to the candidate)
        </label>
        <Input id={`reason-${move.to}`} name="reason" required minLength={3} maxLength={1000} className="h-10" />
        <Button variant="ghost" size="sm" className="w-full">{move.label}</Button>
      </ActionForm>
    </details>
  );
}
