import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { ActionForm } from '@/components/matching/ActionForm';
import { MergedNotice } from '@/components/duplicates/MergedNotice';
import { AutoRefresh } from '@/components/matching/AutoRefresh';
import { STATUS_LABELS, stageTone } from '@/components/matching/labels';
import { RequirementRow } from '@/components/matching/RequirementRow';
import { RetryAssessment } from '@/components/matching/RetryAssessment';
import { ScoreRing } from '@/components/matching/ScoreRing';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProgressNote } from '@/components/ui/progress';
import { Ring } from '@/components/ui/ring';
import { SkillsPanel } from '@/components/matching/SkillsPanel';
import { NotesPanel } from '@/components/pipeline/NotesPanel';
import { StatusControls } from '@/components/pipeline/StatusControls';
import { FairnessPanel } from '@/components/trust/FairnessPanel';
import { InterviewCard } from '@/app/recruiter/applications/[id]/interview/InterviewCard';
import { ScheduleDialog } from '@/app/recruiter/applications/[id]/interview/ScheduleDialog';
import { QuestionsDialog } from '@/app/recruiter/applications/[id]/questions/QuestionsDialog';
import type { QuestionRow } from '@/app/recruiter/applications/[id]/questions/QuestionsClient';
import { requireRecruiter } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { loadApplicationInterviews, loadInterviewers } from '@/lib/interviews/read';
import { toPktFields } from '@/lib/interviews/time';
import { getOwnedJob } from '@/lib/jobs/queries';
import { effectiveSkills } from '@/lib/matching/corrections';
import { loadApplication } from '@/lib/matching/read';
import { runAssessmentAction, togglePinAction } from './actions';

export const metadata = { title: 'Applicant' };
export const maxDuration = 60;

const COMPONENT_LABEL = {
  skill: 'Skills',
  experience: 'Experience',
  project: 'Projects',
  qualification: 'Qualifications',
} as const;
const COMPONENTS = ['skill', 'experience', 'project', 'qualification'] as const;

export default async function ApplicationPage({
  params,
}: { params: Promise<{ jobId: string; applicationId: string }> }) {
  const profile = await requireRecruiter();
  const { jobId, applicationId } = await params;
  const data = await loadApplication(applicationId, profile.id);
  if (!data || data.owned.jobId !== jobId) notFound();
  const { owned, result, assessmentState } = data;

  const job = await getOwnedJob(jobId, profile.id);
  const canAssess = data.resumeReadable && (job?.requirements.length ?? 0) > 0;
  const needsRun = canAssess && (assessmentState === 'failed' || assessmentState === 'none');

  const [interviews, interviewers, questions, projects] = await Promise.all([
    loadApplicationInterviews(applicationId),
    loadInterviewers(profile.id),
    db().from('interview_questions')
      .select('id, kind, difficulty, skill, question, answer_guidelines, evidence_quote, support, edited')
      .eq('application_id', applicationId).order('created_at'),
    db().from('resume_chunks').select('id', { count: 'exact', head: true })
      .eq('resume_id', owned.resumeId).eq('section', 'project'),
  ]);
  if (questions.error) throw questions.error;
  const today = toPktFields(new Date().toISOString()).date;

  return (
    <>
      <AutoRefresh active={assessmentState === 'running'} />

      <header className="-mx-5 -mt-6 border-b bg-surface px-5 pb-3 pt-4 lg:-mx-10 lg:px-10 xl:sticky xl:top-[var(--nav-height)] xl:z-10">
        <nav aria-label="Breadcrumb" className="font-arial text-[13px]">
          <Link href={`/recruiter/jobs/${jobId}/applicants`} className="textlink">{owned.jobTitle}</Link>
        </nav>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-2xl">{owned.candidateName}</h1>
            <Badge tone={stageTone(owned.status)}>{STATUS_LABELS[owned.status]}</Badge>
            <ActionForm action={togglePinAction} className="font-arial text-[13px]">
              <input type="hidden" name="applicationId" value={applicationId} />
              <input type="hidden" name="pinned" value={String(!data.pinned)} />
              <button className="textlink cursor-pointer">{data.pinned ? 'Unpin' : 'Pin to top'}</button>
            </ActionForm>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <QuestionsDialog
              applicationId={applicationId}
              candidateName={owned.candidateName}
              canEdit={owned.status === 'shortlisted' || owned.status === 'interview'}
              hasProjects={(projects.count ?? 0) > 0}
              questions={(questions.data ?? []) as QuestionRow[]}
            />
            <StatusControls
              applicationId={applicationId}
              status={owned.status}
              candidateName={owned.candidateName}
              interviewers={interviewers}
              today={today}
            />
          </div>
        </div>
      </header>

      <div className="mt-5 grid gap-x-10 gap-y-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {!data.resumeReadable && (
            <p className="text-sm text-ink">This resume could not be read, so there is no AI score. You can still review this person by hand.</p>
          )}
          {data.resumeReadable && !canAssess && (
            <p className="text-sm text-ink">
              This job has no requirements to compare against, so there is no AI score.{' '}
              <Link href={`/recruiter/jobs/${jobId}/edit`} className="textlink">Add requirements</Link>
            </p>
          )}
          {canAssess && assessmentState === 'running' && (
            <ProgressNote label="Assessing this resume. Results appear here automatically." className="card max-w-none p-5" />
          )}
          {needsRun && (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <p className="text-ink">
                {assessmentState === 'failed' ? 'The AI assessment failed, so no score was given.' : 'No AI assessment yet.'}
              </p>
              <RetryAssessment
                applicationId={applicationId}
                label={assessmentState === 'failed' ? 'Try again' : 'Run AI assessment'}
                action={runAssessmentAction}
              />
              {data.assessmentError && (
                <details className="w-full text-[13px]">
                  <summary className="w-fit cursor-pointer transition-colors hover:text-brand-dark">Technical detail</summary>
                  <p className="mt-1 break-words">{data.assessmentError}</p>
                </details>
              )}
            </div>
          )}

          {result && (
            <>
              <section className="card p-5">
                <div className="flex items-center gap-4">
                  <ScoreRing score={result.score} ceiling={result.ceiling} size={84} />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-baseline gap-x-3">
                      <span className="text-lg font-medium text-navy">{data.recommendation}</span>
                      {result.ceiling > result.score && <span className="text-sm">Could reach {result.ceiling}</span>}
                    </p>
                    <p className="mt-0.5 text-[13px]">AI guidance only. You decide.</p>
                  </div>
                </div>
                <p className="mt-3 max-w-[78ch] text-sm leading-relaxed">{data.summary}</p>
                <nav aria-label="Score parts" className="mt-4 flex flex-wrap gap-x-5 gap-y-3 font-arial text-[13px]">
                  {result.components.filter((c) => c.weight > 0).map((c) => {
                    const percent = Math.round(c.credit * 100);
                    return (
                      <a key={c.component} href={`#part-${c.component}`} className="group flex items-center gap-2 rounded-small">
                        <Ring
                          size={44}
                          stroke={4}
                          total={100}
                          label={`${COMPONENT_LABEL[c.component]}: ${percent}%`}
                          segments={[{ value: percent, color: 'var(--color-brand)' }]}
                        >
                          <span className="text-[11px]">{percent}%</span>
                        </Ring>
                        <span className="leading-tight">
                          <span className="block font-medium text-ink transition-colors group-hover:text-brand-dark">{COMPONENT_LABEL[c.component]}</span>
                          {Math.round(c.weight * 100)}% weight
                        </span>
                      </a>
                    );
                  })}
                </nav>
                {result.rescaled && (
                  <p className="mt-2 text-[13px]">Weights are scaled up because this job does not ask for every part.</p>
                )}
              </section>

              <div id="evidence" className="scroll-mt-40">
                {COMPONENTS.map((component) => {
                  const reqs = result.requirements.filter((r) => r.component === component);
                  if (reqs.length === 0) return null;
                  return (
                    <section key={component} id={`part-${component}`} className="card mt-5 scroll-mt-40 p-5">
                      <h2 className="border-b pb-2 text-lg">{COMPONENT_LABEL[component]}</h2>
                      {reqs.map((req) => (
                        <RequirementRow key={req.requirement_key} applicationId={applicationId} req={req} />
                      ))}
                    </section>
                  );
                })}
              </div>
            </>
          )}

          <SkillsPanel applicationId={applicationId} skills={effectiveSkills(data.extractedSkills, data.corrections)} />
          <FairnessPanel applicationId={applicationId} />
        </div>

        <aside className="min-w-0 space-y-5">
          {/* Rarely shown and needs its own queries, so the page doesn't wait for it. */}
          <Suspense>
            <MergedNotice
              candidateId={owned.candidateId}
              applicationId={applicationId}
              recruiterId={profile.id}
            />
          </Suspense>
          {(interviews.length > 0 || owned.status === 'interview') && (
            <section className="card p-5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg">Interview</h2>
                {owned.status === 'interview' && (
                  <ScheduleDialog
                    applicationId={applicationId}
                    interviewers={interviewers}
                    today={today}
                    trigger={<Button variant="ghost" size="sm">Schedule interview</Button>}
                  />
                )}
              </div>
              {interviews.length === 0 && <p className="mt-2">No interview scheduled yet.</p>}
              {interviews.map((row) => (
                <div key={row.id} className="mt-3 border-t border-hairline-soft pt-3">
                  <InterviewCard applicationId={applicationId} row={row} interviewers={interviewers} today={today} />
                </div>
              ))}
            </section>
          )}
          <NotesPanel applicationId={applicationId} notes={data.notes} />
        </aside>
      </div>
    </>
  );
}
