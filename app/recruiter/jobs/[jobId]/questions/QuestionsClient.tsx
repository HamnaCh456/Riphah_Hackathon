// app/recruiter/jobs/[jobId]/questions/QuestionsClient.tsx
'use client';
import { useState, useTransition, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ProgressNote } from '@/components/ui/progress';
import { useToast } from '@/components/ui/toast';
import { generateSetAction, removeQuestionAction, updateQuestionAction } from './actions';
import type { ActionResult } from './actions';
import styles from './questions.module.css';

export type QuestionRow = {
  id: string; difficulty: 'beginner' | 'intermediate' | 'advanced';
  skill: string | null; question: string; answer_guidelines: string; edited: boolean;
};

const LEVEL: Record<QuestionRow['difficulty'], string> = {
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
};

function useAction() {
  const toast = useToast();
  const [pending, start] = useTransition();
  const run = (action: () => Promise<ActionResult>, done?: string, after?: () => void) =>
    start(async () => {
      const result = await action();
      if (!result.ok) { toast(result.error, { tone: 'error' }); return; }
      if (done) toast(done);
      after?.();
    });
  return { pending, run };
}

function Question({ q }: { q: QuestionRow }) {
  const { pending, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [question, setQuestion] = useState(q.question);
  const [guidelines, setGuidelines] = useState(q.answer_guidelines);

  if (editing) {
    return (
      <li className={styles.row}>
        <label className={styles.label}>Question
          <textarea className={styles.field} rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} />
        </label>
        <label className={styles.label}>Answer guidelines
          <textarea className={styles.field} rows={5} value={guidelines} onChange={(e) => setGuidelines(e.target.value)} />
        </label>
        <div className={styles.actions}>
          <Button variant="primary" disabled={pending} onClick={() =>
            run(() => updateQuestionAction(q.id, { question, answer_guidelines: guidelines }), 'Question saved', () => setEditing(false))}>
            Save question
          </Button>
          <Button variant="ghost" disabled={pending} onClick={() => {
            setQuestion(q.question); setGuidelines(q.answer_guidelines); setEditing(false);
          }}>Cancel</Button>
        </div>
      </li>
    );
  }

  return (
    <li className={styles.row}>
      <p className={styles.meta}>
        {LEVEL[q.difficulty]}{q.skill ? ` · ${q.skill}` : ''}{q.edited ? ' · Edited by you' : ''}
      </p>
      <p className={styles.question}>{q.question}</p>

      <details className={styles.guidelines}>
        <summary>Answer guidelines</summary>
        <p>{q.answer_guidelines}</p>
      </details>

      {confirmRemove ? (
        <div className={styles.actions}>
          <span>Remove this question?</span>
          <Button variant="ghost" disabled={pending}
            onClick={() => run(() => removeQuestionAction(q.id), 'Question removed')}>Remove</Button>
          <Button variant="ghost" disabled={pending} onClick={() => setConfirmRemove(false)}>Keep</Button>
        </div>
      ) : (
        <div className={styles.actions}>
          <Button variant="ghost" disabled={pending} onClick={() => setEditing(true)}>Edit</Button>
          <Button variant="ghost" disabled={pending} onClick={() => setConfirmRemove(true)}>Remove</Button>
        </div>
      )}
    </li>
  );
}

export function QuestionsClient({ jobId, breadcrumb, questions }: {
  jobId: string; breadcrumb: ReactNode; questions: QuestionRow[];
}) {
  const { pending, run } = useAction();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.breadcrumb}>{breadcrumb}</p>
          <h1 className={styles.title}>Interview questions</h1>
        </div>
        {questions.length === 0 && (
          <Button variant="primary" loading={pending}
            onClick={() => run(() => generateSetAction(jobId), 'Questions ready')}>
            {pending ? 'Writing questions…' : 'Generate questions'}
          </Button>
        )}
      </header>

      {pending && <ProgressNote label="Writing questions for this job..." className="mb-4" />}
      {questions.length === 0 && !pending && (
        <p className={styles.note}>No questions yet. Every applicant for this job gets the same set.</p>
      )}
      {questions.length > 0 && (
        <ul className={styles.list}>{questions.map((q) => <Question key={q.id} q={q} />)}</ul>
      )}
    </div>
  );
}
