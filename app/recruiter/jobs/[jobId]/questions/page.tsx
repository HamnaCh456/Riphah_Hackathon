// app/recruiter/jobs/[jobId]/questions/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRecruiter } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { getOwnedJob } from '@/lib/jobs/queries';
import { QuestionsClient, type QuestionRow } from './QuestionsClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Interview questions' };
export const maxDuration = 60;

export default async function QuestionsPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const recruiter = await requireRecruiter();
  const job = await getOwnedJob(jobId, recruiter.id);
  if (!job) notFound();

  const { data, error } = await db().from('job_interview_questions')
    .select('id, difficulty, skill, question, answer_guidelines, edited')
    .eq('job_id', jobId).order('created_at');
  if (error) throw error;

  return (
    <QuestionsClient
      jobId={jobId}
      breadcrumb={<Link href={`/recruiter/jobs/${jobId}/applicants`}>{job.title}</Link>}
      questions={(data ?? []) as QuestionRow[]}
    />
  );
}
