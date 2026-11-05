import { applyAction } from '@/app/candidate/applications/actions';
import { ActionForm } from '@/components/matching/ActionForm';
import { Button } from '@/components/ui/button';

// Ghost, because a list of jobs has many of these and a screen gets one aurora button at most.
export function ApplyButton({ jobId }: { jobId: string }) {
  return (
    <ActionForm action={applyAction}>
      <input type="hidden" name="jobId" value={jobId} />
      <Button variant="ghost" size="sm">Apply with my resume</Button>
    </ActionForm>
  );
}
