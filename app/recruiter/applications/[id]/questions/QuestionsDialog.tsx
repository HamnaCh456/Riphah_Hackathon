// app/recruiter/applications/[id]/questions/QuestionsDialog.tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { QuestionsClient, type QuestionRow } from './QuestionsClient';

export function QuestionsDialog({ applicationId, candidateName, canEdit, hasProjects, questions }: {
  applicationId: string; candidateName: string; canEdit: boolean; hasProjects: boolean; questions: QuestionRow[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Interview questions{questions.length > 0 ? ` (${questions.length})` : ''}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} size="wide" title={`Interview questions for ${candidateName}`}>
        <QuestionsClient applicationId={applicationId} canEdit={canEdit} hasProjects={hasProjects} questions={questions} />
      </Dialog>
    </>
  );
}
