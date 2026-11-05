// app/recruiter/applications/[id]/interview/page.tsx
// Interviews now live on the applicant's page. Old links land there.
import { notFound, redirect } from 'next/navigation';
import { getOwnedApplication } from '@/lib/auth/ownership';
import { requireRecruiter } from '@/lib/auth/guards';

export default async function ApplicationInterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recruiter = await requireRecruiter();
  const app = await getOwnedApplication(id, recruiter.id);
  if (!app) notFound();
  redirect(`/recruiter/jobs/${app.jobId}/applicants/${id}`);
}
