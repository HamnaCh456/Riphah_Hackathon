// app/recruiter/applications/[id]/questions/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { getOwnedApplication } from '@/lib/auth/ownership';
import { requireRecruiter } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { QuestionsClient, type QuestionRow } from './QuestionsClient';

export const dynamic = 'force-dynamic';

export default async function QuestionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recruiter = await requireRecruiter();
  const app = await getOwnedApplication(id, recruiter.id);
  if (!app) notFound();

  const [questions, projects] = await Promise.all([
    db().from('interview_questions')
      .select('id, kind, difficulty, skill, question, answer_guidelines, evidence_quote, support, edited')
      .eq('application_id', id).order('created_at'),
    db().from('resume_chunks').select('id', { count: 'exact', head: true })
      .eq('resume_id', app.resumeId).eq('section', 'project'),
  ]);
  if (questions.error) throw questions.error;

  return (
    <AppShell profile={recruiter}>
      <QuestionsClient
        applicationId={id}
        breadcrumb={<Link href={`/recruiter/jobs/${app.jobId}/applicants/${id}`}>{app.candidateName} · {app.jobTitle}</Link>}
        canEdit={app.status === 'shortlisted' || app.status === 'interview'}
        hasProjects={(projects.count ?? 0) > 0}
        questions={(questions.data ?? []) as QuestionRow[]}
      />
    </AppShell>
  );
}
