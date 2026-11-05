// app/recruiter/applications/[id]/questions/QuestionsClient.tsx
'use client';
import { useState, useTransition, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ProgressNote } from '@/components/ui/progress';
import { useToast } from '@/components/ui/toast';
import { generateSetAction, regenerateOneAction, removeQuestionAction, updateQuestionAction } from './actions';
import type { ActionResult } from './actions';
import styles from './questions.module.css';

export type QuestionRow = {
  id: string; kind: 'role' | 'project'; difficulty: 'beginner' | 'intermediate' | 'advanced';
  skill: string | null; question: string; answer_guidelines: string; evidence_quote: string | null;
  support: 'not_applicable' | 'verified' | 'needs_review'; edited: boolean;
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

function Question({ q, canEdit }: { q: QuestionRow; canEdit: boolean }) {
  const { pending, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<'remove' | 'regenerate' | null>(null);
  const [question, setQuestion] = useState(q.question);
  const [guidelines, setGuidelines] = useState(q.answer_guidelines);

  const regenerate = () => run(() => regenerateOneAction(q.id), 'Question regenerated', () => setConfirm(null));
  const remove = () => run(() => removeQuestionAction(q.id), 'Question removed');

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

      {q.kind === 'project' && q.support === 'verified' && (
        <blockquote className={styles.evidence}><mark>{q.evidence_quote}</mark></blockquote>
      )}
      {q.support === 'needs_review' && (
        <p className={styles.warning}>Not found in resume. Check before asking.</p>
      )}

      <details className={styles.guidelines}>
        <summary>Answer guidelines</summary>
        <p>{q.answer_guidelines}</p>
      </details>

      {canEdit && (confirm ? (
        <div className={styles.actions}>
          <span>{confirm === 'remove' ? 'Remove this question?' : 'Replace your edited question?'}</span>
          <Button variant="ghost" disabled={pending} onClick={confirm === 'remove' ? remove : regenerate}>
            {confirm === 'remove' ? 'Remove' : 'Replace'}
          </Button>
          <Button variant="ghost" disabled={pending} onClick={() => setConfirm(null)}>Keep</Button>
        </div>
      ) : (
        <div className={styles.actions}>
          <Button variant="ghost" disabled={pending} onClick={() => setEditing(true)}>Edit</Button>
          <Button variant="ghost" disabled={pending}
            onClick={() => (q.edited ? setConfirm('regenerate') : regenerate())}>
            {pending ? 'Writing…' : 'Regenerate'}
          </Button>
          <Button variant="ghost" disabled={pending} onClick={() => setConfirm('remove')}>Remove</Button>
        </div>
      ))}
    </li>
  );
}

export function QuestionsClient({ applicationId, breadcrumb, canEdit, hasProjects, questions }: {
  applicationId: string; breadcrumb: ReactNode; canEdit: boolean; hasProjects: boolean; questions: QuestionRow[];
}) {
  const { pending, run } = useAction();
  const hasEdited = questions.some((q) => q.edited);
  const role = questions.filter((q) => q.kind === 'role');
  const project = questions.filter((q) => q.kind === 'project');

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.breadcrumb}>{breadcrumb}</p>
          <h1 className={styles.title}>Interview questions</h1>
        </div>
        {canEdit && (
          <Button variant="primary" loading={pending}
            onClick={() => run(() => generateSetAction(applicationId), 'Questions ready')}>
            {pending ? 'Writing questions…' : questions.length ? 'Regenerate all' : 'Generate questions'}
          </Button>
        )}
      </header>

      {pending && <ProgressNote label="Writing questions from this resume and job..." className="mb-4" />}
      {!canEdit && <p className={styles.note}>Shortlist this applicant to write or change questions.</p>}
      {canEdit && hasEdited && <p className={styles.note}>Regenerate all keeps the questions you edited.</p>}

      {questions.length === 0 && canEdit && (
        <p className={styles.note}>No questions yet. Generate questions to write a set for this applicant.</p>
      )}

      {role.length > 0 && (
        <section>
          <h2 className={styles.section}>Role skills</h2>
          <ul className={styles.list}>{role.map((q) => <Question key={q.id} q={q} canEdit={canEdit} />)}</ul>
        </section>
      )}

      {questions.length > 0 && (
        <section>
          <h2 className={styles.section}>Candidate projects</h2>
          {project.length > 0
            ? <ul className={styles.list}>{project.map((q) => <Question key={q.id} q={q} canEdit={canEdit} />)}</ul>
            : <p className={styles.note}>
                {hasProjects ? 'No project questions in this set.' : 'No project section found in this resume, so no project questions were written.'}
              </p>}
        </section>
      )}
    </div>
  );
}
