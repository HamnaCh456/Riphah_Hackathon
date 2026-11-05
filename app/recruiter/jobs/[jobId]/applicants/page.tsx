import Form from 'next/form';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { JobStatusButton } from '@/components/jobs/job-status-button';
import { AutoRefresh } from '@/components/matching/AutoRefresh';
import { STATUS_LABELS, stageTone } from '@/components/matching/labels';
import { ScoreRing } from '@/components/matching/ScoreRing';
import { TalentPoolPanel } from '@/components/talent/TalentPoolPanel';
import { Badge } from '@/components/ui/badge';
import { requireRecruiter } from '@/lib/auth/guards';
import { getOwnedJob } from '@/lib/jobs/queries';
import { recommendation } from '@/lib/matching/explain';
import { filterApplicants, rankApplicants, type ApplicantRow } from '@/lib/matching/filters';
import { loadApplicants } from '@/lib/matching/read';

import { ApplicantFilterBar } from './ApplicantFilterBar';
import { CompareButton } from './CompareButton';

export const metadata = { title: 'Applicants' };
export const maxDuration = 60;

type Search = Record<string, string | undefined>;

const ANY = 'any';
// An assessment row appears a moment after applying, so keep refreshing for new applicants.
const JUST_APPLIED_MS = 120_000;

export default async function ApplicantsPage({
  params, searchParams,
}: { params: Promise<{ jobId: string }>; searchParams: Promise<Search> }) {
  const profile = await requireRecruiter();
  const { jobId } = await params;
  const q = await searchParams;
  const job = await getOwnedJob(jobId, profile.id);
  if (!job) notFound();

  const all = await loadApplicants(jobId);
  const minScore = q.minScore ? Number(q.minScore) : NaN;
  const skill = q.skill && q.skill !== ANY ? q.skill : undefined;
  const status = q.status && q.status !== ANY ? q.status : undefined;
  const rows = rankApplicants(filterApplicants(all, {
    name: q.q,
    minScore: Number.isNaN(minScore) ? undefined : minScore,
    skill,
    status,
    needsReview: q.needsReview === 'on',
    noRequiredGaps: q.noRequiredGaps === 'on',
  }));
  const skills = [...new Set(all.flatMap((r) => r.backedSkills))].sort();
  const stillWorking = all.some((r) => r.assessmentState === 'running'
    || (r.assessmentState === 'none' && Date.now() - new Date(r.appliedAt).getTime() < JUST_APPLIED_MS));

  return (
    <>
      <AutoRefresh active={stillWorking} />
      <nav aria-label="Breadcrumb" className="font-arial text-[13px]">
        <Link href="/recruiter/jobs" className="textlink">Jobs</Link>
      </nav>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="text-2xl">{job.title}</h1>
          <span className="text-sm tabular-nums">
            {rows.length === all.length ? `${all.length} applicant${all.length === 1 ? '' : 's'}` : `${rows.length} of ${all.length} applicants`}
          </span>
          {job.status === 'closed' && <Badge tone="neutral">Closed</Badge>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <JobStatusButton jobId={jobId} status={job.status} />
          {rows.length > 0 && (
            <Form id="compare-form" action={`/recruiter/jobs/${jobId}/compare`}>
              <CompareButton key={rows.map((r) => r.applicationId).join()} />
            </Form>
          )}
        </div>
      </div>

      {all.length === 0 ? (
        <p className="card mt-5 p-5 text-sm">No applications yet.</p>
      ) : (
        <>
          <ApplicantFilterBar
            skills={skills}
            values={{
              q: q.q ?? '',
              skill: skill ?? '',
              status: status ?? '',
              minScore: q.minScore ?? '',
              needsReview: q.needsReview === 'on',
              noRequiredGaps: q.noRequiredGaps === 'on',
            }}
          />

          {rows.length === 0 ? (
            <p className="card mt-3 p-5 text-sm">No applicants match these filters.</p>
          ) : (
            <ApplicantsTable jobId={jobId} rows={rows} />
          )}
        </>
      )}
      <TalentPoolPanel jobId={jobId} />
    </>
  );
}

function ApplicantsTable({ jobId, rows }: { jobId: string; rows: ApplicantRow[] }) {
  return (
    <div className="card mt-3 overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col" className="w-10 !pr-0">Compare</th>
            <th scope="col">Applicant</th>
            <th scope="col">Score</th>
            <th scope="col" className="max-md:hidden">AI guidance</th>
            <th scope="col">Stage</th>
            <th scope="col" className="max-md:hidden">Required skill gaps</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const href = `/recruiter/jobs/${jobId}/applicants/${r.applicationId}`;
            return (
              <tr key={r.applicationId} className="relative align-middle">
                <td className="!py-1 !pr-0">
                  {/* Sits above the row-wide link, and belongs to the compare form above the table. */}
                  <label className="relative z-10 flex min-h-11 min-w-8 cursor-pointer items-center">
                    <span className="sr-only">Compare {r.name}</span>
                    <input
                      type="checkbox"
                      name="a"
                      value={r.applicationId}
                      form="compare-form"
                      disabled={r.assessmentState !== 'complete'}
                    />
                  </label>
                </td>
                <td>
                  <Link href={href} className="font-medium text-navy underline-offset-4 transition-colors after:absolute after:inset-0 hover:text-brand-dark hover:underline">
                    {r.name}
                  </Link>
                  {r.pinned && <span className="text-[13px]"> · Pinned</span>}
                  {r.needsReview && <Badge tone="gold" className="mt-1 block">Needs manual check</Badge>}
                </td>
                <td>
                  <ScoreCell row={r} href={href} />
                </td>
                <td className="max-md:hidden">
                  {r.score !== null && r.ceiling !== null ? recommendation(r.score, r.ceiling) : ''}
                </td>
                <td><Badge tone={stageTone(r.status)}>{STATUS_LABELS[r.status]}</Badge></td>
                <td className="tabular-nums max-md:hidden">
                  {r.assessmentState === 'complete' ? r.requiredGaps : ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ScoreCell({ row, href }: { row: ApplicantRow; href: string }) {
  if (row.assessmentState === 'running') return <span className="inline-flex items-center gap-2 text-ink"><span aria-hidden="true" className="spinner" />Assessing…</span>;
  if (row.assessmentState === 'failed') return <span className="text-ink">AI failed, open to retry</span>;
  if (row.score === null || row.ceiling === null) return <span>Not assessed</span>;
  return (
    <Link href={`${href}#evidence`} className="group relative z-10 inline-flex items-center gap-2 rounded-full">
      <ScoreRing score={row.score} ceiling={row.ceiling} />
      {row.ceiling > row.score && <span className="text-[13px] leading-tight transition-colors group-hover:text-brand-dark">could reach {row.ceiling}</span>}
    </Link>
  );
}
