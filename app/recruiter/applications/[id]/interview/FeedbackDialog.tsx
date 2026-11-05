// app/recruiter/applications/[id]/interview/FeedbackDialog.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { saveFeedbackAction } from '@/app/recruiter/interviews/actions';
import type { FeedbackValues } from '@/lib/interviews/read';
import { RATING_CRITERIA, RECOMMENDATIONS } from '@/lib/interviews/schemas';
import styles from '@/app/recruiter/interviews/interviews.module.css';

export function FeedbackDialog({ interviewId, interviewerName, initial }: {
  interviewId: string; interviewerName: string; initial: FeedbackValues | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({
    technical_skill: initial?.technical_skill ?? 0, problem_solving: initial?.problem_solving ?? 0,
    communication: initial?.communication ?? 0, job_knowledge: initial?.job_knowledge ?? 0,
  });
  const [recommendation, setRecommendation] = useState(initial?.recommendation ?? '');
  const [strengths, setStrengths] = useState(initial?.strengths ?? '');
  const [concerns, setConcerns] = useState(initial?.concerns ?? '');

  const save = () => start(async () => {
    const result = await saveFeedbackAction({ interviewId, ...ratings, recommendation, strengths, concerns });
    if (!result.ok) { toast(result.error, { tone: 'error' }); return; }
    toast('Feedback saved');
    setOpen(false);
    router.refresh();
  });

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>{initial ? 'Edit feedback' : 'Add feedback'}</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Feedback from ${interviewerName}`}
        footer={<Button variant="primary" disabled={pending} onClick={save}>Save feedback</Button>}>
        <div className={styles.ratings}>
          {RATING_CRITERIA.map(({ key, label }) => (
            <div key={key} className={styles.ratingRow} role="radiogroup" aria-label={label}>
              <span>{label}</span>
              <div className={styles.scale}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={ratings[key] === n}
                    aria-label={`${label}: ${n} out of 5`}
                    onClick={() => setRatings((r) => ({ ...r, [key]: n }))}>{n}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className={styles.field}>
          <Select label="Recommendation" value={recommendation} onChange={setRecommendation} options={[...RECOMMENDATIONS]} />
        </div>
        <label className={styles.field}>Strengths
          <textarea className={styles.textarea} rows={4} value={strengths} onChange={(e) => setStrengths(e.target.value)} />
        </label>
        <label className={styles.field}>Concerns
          <textarea className={styles.textarea} rows={4} value={concerns} onChange={(e) => setConcerns(e.target.value)} />
        </label>
      </Dialog>
    </>
  );
}
