import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell';
import { ActionForm } from '@/components/matching/ActionForm';
import { AutoRefresh } from '@/components/matching/AutoRefresh';
import { STATUS_LABELS } from '@/components/matching/labels';
import { RequirementRow } from '@/components/matching/RequirementRow';
import { RetryAssessment } from '@/components/matching/RetryAssessment';
import { ScoreMeter } from '@/components/matching/ScoreMeter';
import { SkillsPanel } from '@/components/matching/SkillsPanel';
import { AuditTrail } from '@/components/pipeline/AuditTrail';
import { NotesPanel } from '@/components/pipeline/NotesPanel';
import { StatusControls } from '@/components/pipeline/StatusControls';
import { requireRecruiter } from '@/lib/auth/guards';
import { getOwnedJob } from '@/lib/jobs/queries';
import { effectiveSkills } from '@/lib/matching/corrections';
import { loadApplication } from '@/lib/matching/read';
import { runAssessmentAction, togglePinAction } from './actions';

export const metadata = { title: 'Applicant | Talent Intelligence' };
export const maxDuration = 60;

const COMPONENT_LABEL = {
  skill: 'Skills',
  experience: 'Experience',
  project: 'Projects',
  qualification: 'Qualifications',
} as const;
const COMPONENTS = ['skill', 'experience', 'project', 'qualification'] as const;
const INTERVIEW_STAGES = ['shortlisted', 'interview', 'selected'];

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

  return (
    <AppShell profile={profile}>
      <AutoRefresh active={assessmentState === 'running'} />

      <header className="-mx-5 -mt-6 border-b bg-abyss px-5 pb-3 pt-4 lg:-mx-10 lg:px-10 xl:sticky xl:top-0 xl:z-10">
        <nav aria-label="Breadcrumb" className="font-arial text-[13px]">
          <Link href={`/recruiter/jobs/${jobId}/applicants`} className="textlink">{owned.jobTitle}</Link>
        </nav>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-2xl">{owned.candidateName}</h1>
            <span className="text-sm text-mist">{STATUS_LABELS[owned.status]}</span>
            <div className="flex flex-wrap items-baseline gap-x-3 font-arial text-[13px]">
              <ActionForm action={togglePinAction}>
                <input type="hidden" name="applicationId" value={applicationId} />
                <input type="hidden" name="pinned" value={String(!data.pinned)} />
                <button className="textlink cursor-pointer">{data.pinned ? 'Unpin' : 'Pin to top'}</button>
              </ActionForm>
              <Link href={`/recruiter/applications/${applicationId}/questions`} className="textlink">
                Interview questions
              </Link>
              {INTERVIEW_STAGES.includes(owned.status) && (
                <Link href={`/recruiter/applications/${applicationId}/interview`} className="textlink">
                  Schedule interview
                </Link>
              )}
            </div>
          </div>
          <StatusControls applicationId={applicationId} status={owned.status} />
        </div>
      </header>

      <div className="mt-5 grid gap-x-10 gap-y-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {!data.resumeReadable && (
            <p className="text-sm text-mist">This resume could not be read, so there is no AI score. You can still review this person by hand.</p>
          )}
          {data.resumeReadable && !canAssess && (
            <p className="text-sm text-mist">
              This job has no requirements to compare against, so there is no AI score.{' '}
              <Link href={`/recruiter/jobs/${jobId}/edit`} className="textlink">Add requirements</Link>
            </p>
          )}
          {canAssess && assessmentState === 'running' && (
            <p className="text-sm text-mist">Assessing this resume. Results appear here automatically.</p>
          )}
          {needsRun && (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <p className="text-mist">
                {assessmentState === 'failed' ? 'The AI assessment failed, so no score was given.' : 'No AI assessment yet.'}
              </p>
              <RetryAssessment
                applicationId={applicationId}
                label={assessmentState === 'failed' ? 'Try again' : 'Run AI assessment'}
                action={runAssessmentAction}
              />
              {data.assessmentError && (
                <details className="w-full text-[13px]">
                  <summary className="w-fit cursor-pointer transition-colors hover:text-platinum">Technical detail</summary>
                  <p className="mt-1 break-words">{data.assessmentError}</p>
                </details>
              )}
            </div>
          )}

          {result && (
            <>
              <section>
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-mono text-4xl tabular-nums text-lavender">{result.score}</span>
                  <span className="text-sm">/ 100</span>
                  <span className="text-mist">{data.recommendation}</span>
                  <span className="text-[13px]">AI guidance only. You decide.</span>
                </div>
                <ScoreMeter score={result.score} ceiling={result.ceiling} className="mt-2 max-w-xl" />
                <p className="mt-3 max-w-[78ch] text-sm leading-relaxed">{data.summary}</p>
                <nav aria-label="Score parts" className="mt-3 flex flex-wrap gap-2 font-arial text-[13px]">
                  {result.components.filter((c) => c.weight > 0).map((c) => (
                    <a
                      key={c.component}
                      href={`#part-${c.component}`}
                      className="rounded-small border px-2.5 py-1.5 transition-colors hover:bg-wash hover:text-platinum"
                    >
                      {COMPONENT_LABEL[c.component]}{' '}
                      <span className="font-mono tabular-nums text-lavender">{Math.round(c.credit * 100)}%</span>
                      {' '}of {Math.round(c.weight * 100)}% weight
                    </a>
                  ))}
                </nav>
                {result.rescaled && (
                  <p className="mt-2 text-[13px]">Weights are scaled up because this job does not ask for every part.</p>
                )}
              </section>

              <div id="evidence" className="scroll-mt-28">
                {COMPONENTS.map((component) => {
                  const reqs = result.requirements.filter((r) => r.component === component);
                  if (reqs.length === 0) return null;
                  return (
                    <section key={component} id={`part-${component}`} className="mt-6 scroll-mt-28">
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
        </div>

        <aside className="min-w-0 space-y-8">
          <NotesPanel applicationId={applicationId} notes={data.notes} />
          <AuditTrail events={data.events} />
        </aside>
      </div>
    </AppShell>
  );
}
