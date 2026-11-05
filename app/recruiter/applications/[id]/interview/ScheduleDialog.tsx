// app/recruiter/applications/[id]/interview/ScheduleDialog.tsx
'use client';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { addInterviewerAction, moveToInterviewAction, saveInterviewAction } from '@/app/recruiter/interviews/actions';
import { DURATIONS, INTERVIEW_TYPES } from '@/lib/interviews/schemas';
import { TIME_SLOTS } from '@/lib/interviews/time';
import styles from '@/app/recruiter/interviews/interviews.module.css';

// The calendar is the heaviest part of this page and only opens with this dialog.
const DatePicker = dynamic(() => import('@/components/ui/date-picker').then((m) => m.DatePicker), {
  loading: () => <Skeleton className="mt-6 h-10" />,
});

export type InterviewerOption = { id: string; name: string };
export type ScheduleInitial = {
  interviewId: string; interviewerId: string; type: string; date: string; time: string; durationMinutes: number;
};

const NEW = '__new__';

/** With advance set, this is the Move to interview step: saving also moves the applicant. */
export function ScheduleDialog({ applicationId, interviewers, initial, trigger, today, advance = false }: {
  applicationId: string; interviewers: InterviewerOption[]; initial?: ScheduleInitial; trigger: ReactNode; today: string;
  advance?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(interviewers);
  const [interviewerId, setInterviewerId] = useState(initial?.interviewerId ?? interviewers[0]?.id ?? NEW);
  const [newName, setNewName] = useState('');
  const [type, setType] = useState(initial?.type ?? 'technical');
  const [date, setDate] = useState(initial?.date ?? '');
  const [time, setTime] = useState(initial?.time ?? '10:00');
  const [duration, setDuration] = useState(String(initial?.durationMinutes ?? 60));
  const [conflicts, setConflicts] = useState<string[]>([]);

  const submit = (acknowledgeConflict: boolean) => start(async () => {
    let chosen = interviewerId;
    if (chosen === NEW) {
      const added = await addInterviewerAction(newName);
      if (!added.ok) { toast(added.error, { tone: 'error' }); return; }
      setList((l) => [...l, { id: added.id, name: added.name }]);
      setInterviewerId(added.id);
      chosen = added.id;
    }
    const result = await saveInterviewAction({
      applicationId, interviewId: initial?.interviewId ?? null, interviewerId: chosen, type, date, time,
      durationMinutes: Number(duration), acknowledgeConflict,
    });
    if (result.ok) {
      toast(initial ? 'Interview moved.' : 'Interview scheduled.');
      setOpen(false); setConflicts([]); router.refresh();
    } else if ('conflicts' in result) {
      setConflicts(result.conflicts);
    } else {
      toast(result.error, { tone: 'error' });
    }
  });

  const scheduleLater = () => start(async () => {
    const result = await moveToInterviewAction(applicationId);
    if (!result.ok) { toast(result.error, { tone: 'error' }); return; }
    toast('Moved to interview.');
    setOpen(false);
    router.refresh();
  });

  // Changing any field invalidates a warning about the old slot.
  const edit = <T,>(setter: (v: T) => void) => (value: T) => { setter(value); setConflicts([]); };

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onClose={() => setOpen(false)}
        title={initial ? 'Move interview' : advance ? 'Move to interview' : 'Schedule interview'}
        footer={
          <>
            {advance && <Button variant="ghost" size="sm" disabled={pending} onClick={scheduleLater}>Schedule later</Button>}
            {conflicts.length
              ? <Button variant="primary" size="sm" disabled={pending} onClick={() => submit(true)}>Schedule anyway</Button>
              : <Button variant="primary" size="sm" loading={pending} onClick={() => submit(false)}>{initial ? 'Move interview' : 'Schedule interview'}</Button>}
          </>
        }>
        {conflicts.length > 0 && (
          <div className={styles.alert} role="alert">
            {conflicts.map((c) => <p key={c}><strong>Conflict:</strong> {c}</p>)}
            <p>Change the time or interviewer, or schedule anyway.</p>
          </div>
        )}
        <div className={styles.fieldGrid}>
          <DatePicker label="Date" value={date} min={today} onChange={edit(setDate)} />
          <Select label="Time (PKT)" value={time} onChange={edit(setTime)}
            options={TIME_SLOTS.map((t) => ({ value: t, label: t }))} />
          <Select label="Duration" value={duration} onChange={edit(setDuration)}
            options={DURATIONS.map((d) => ({ value: String(d), label: `${d} minutes` }))} />
          <Select label="Interview type" value={type} onChange={edit(setType)} options={[...INTERVIEW_TYPES]} />
          <div className={styles.fieldWide}>
            <Select label="Interviewer" value={interviewerId} onChange={edit(setInterviewerId)}
              options={[...list.map((i) => ({ value: i.id, label: i.name })), { value: NEW, label: 'Add new interviewer' }]} />
          </div>
          {interviewerId === NEW && (
            <label className={styles.fieldWide}>New interviewer’s name
              <input className={styles.textarea} value={newName} onChange={(e) => setNewName(e.target.value)} />
            </label>
          )}
        </div>
      </Dialog>
    </>
  );
}
