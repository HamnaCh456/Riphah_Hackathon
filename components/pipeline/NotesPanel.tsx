import { addNoteAction } from '@/app/recruiter/jobs/[jobId]/applicants/[applicationId]/actions';
import { ActionForm } from '@/components/matching/ActionForm';
import { formatTime } from '@/components/matching/labels';
import { Button } from '@/components/ui/button';
import type { NoteRecord } from '@/lib/matching/read';

export function NotesPanel({ applicationId, notes }: { applicationId: string; notes: NoteRecord[] }) {
  const sorted = [...notes].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <section>
      <h2 className="text-lg">Private notes</h2>
      <ActionForm action={addNoteAction} className="mt-2 space-y-2" reset>
        <input type="hidden" name="applicationId" value={applicationId} />
        <textarea
          name="body"
          required
          rows={4}
          maxLength={5000}
          aria-label="Add a private note"
          placeholder="Only you can see this. The candidate never does."
          className="block w-full rounded-small border border-hairline bg-deep px-3.5 py-3 font-arial text-sm text-mist transition-colors placeholder:text-silver/70 hover:border-hairline-strong focus:border-silver"
        />
        <Button variant="ghost" size="sm">Save note</Button>
      </ActionForm>
      {sorted.map((note) => (
        <div key={note.id} className="mt-3 border-t border-hairline-soft pt-3 text-sm">
          <p className="whitespace-pre-wrap break-words text-mist">{note.body}</p>
          <p className="mt-1 text-[13px]">{formatTime(note.created_at)}</p>
        </div>
      ))}
    </section>
  );
}
