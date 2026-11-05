import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell';
import { AutoRefresh } from '@/components/matching/AutoRefresh';
import { FormSelect } from '@/components/matching/FormSelect';
import { STATUS_LABELS } from '@/components/matching/labels';
import { ScoreMeter } from '@/components/matching/ScoreMeter';
import { TalentPoolPanel } from '@/components/talent/TalentPoolPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requireRecruiter } from '@/lib/auth/guards';
import { getOwnedJob } from '@/lib/jobs/queries';
import { recommendation } from '@/lib/matching/explain';
import { filterApplicants, rankApplicants, type ApplicantRow } from '@/lib/matching/filters';
import { loadApplicants } from '@/lib/matching/read';

export const metadata = { title: 'Applicants | Talent Intelligence' };
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
    <AppShell profile={profile}>
      <AutoRefresh active={stillWorking} />
      <nav aria-label="Breadcrumb" className="font-arial text-[13px]">
        <Link href="/recruiter/jobs" className="textlink">Jobs</Link>
      </nav>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
        <h1 className="text-2xl">{job.title}</h1>
        <span className="text-sm tabular-nums">
          {rows.length === all.length ? `${all.length} applicant${all.length === 1 ? '' : 's'}` : `${rows.length} of ${all.length} applicants`}
        </span>
      </div>

      {all.length === 0 ? (
        <p className="mt-6 border-t pt-4 text-sm">No applications yet.</p>
      ) : (
        <>
          <form className="mt-4 flex flex-wrap items-end gap-3">
            <div className="w-32">
              <label htmlFor="minScore" className="mb-1 block font-arial text-sm">Minimum score</label>
              <Input
                id="minScore"
                name="minScore"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={3}
                defaultValue={q.minScore}
              />
            </div>
            <FormSelect
              name="skill"
              label="Backed skill"
              defaultValue={skill ?? ANY}
              options={[{ value: ANY, label: 'Any' }, ...skills.map((s) => ({ value: s, label: s }))]}
            />
            <FormSelect
              name="status"
              label="Stage"
              defaultValue={status ?? ANY}
              options={[{ value: ANY, label: 'Any' }, ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))]}
            />
            <Toggle name="needsReview" label="Needs manual check" checked={q.needsReview === 'on'} />
            <Toggle name="noRequiredGaps" label="All required skills backed" checked={q.noRequiredGaps === 'on'} />
            <Button variant="ghost" size="sm" className="h-12">Apply filters</Button>
            <Link href={`/recruiter/jobs/${jobId}/applicants`} className="textlink flex h-12 items-center font-arial text-sm">
              Clear
            </Link>
          </form>

          {rows.length === 0 ? (
            <p className="mt-6 border-t pt-4 text-sm">No applicants match these filters.</p>
          ) : (
            <>
              <form id="compare-form" action={`/recruiter/jobs/${jobId}/compare`} method="get" className="mt-5 flex flex-wrap items-center gap-3">
                <Button type="submit" variant="ghost" size="sm">Compare selected</Button>
                <span className="text-sm">Tick 2 to 4 assessed applicants.</span>
              </form>
              <ApplicantsTable jobId={jobId} rows={rows} />
            </>
          )}
        </>
      )}
      <TalentPoolPanel jobId={jobId} />
    </AppShell>
  );
}

function Toggle({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="cursor-pointer font-arial text-sm">
      <input type="checkbox" name={name} defaultChecked={checked} className="peer sr-only" />
      <span className="flex h-12 items-center rounded-small border px-3 transition-colors hover:bg-wash hover:text-platinum peer-checked:border-hairline-strong peer-checked:bg-kelp peer-checked:text-platinum peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lavender">
        {label}
      </span>
    </label>
  );
}

function ApplicantsTable({ jobId, rows }: { jobId: string; rows: ApplicantRow[] }) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-hairline-soft text-left font-mono text-[10px] uppercase tracking-[.16em]">
            <th scope="col" className="w-10 py-2 pr-2 font-normal"><span className="sr-only">Compare</span></th>
            <th scope="col" className="py-2 pr-4 font-normal">Applicant</th>
            <th scope="col" className="py-2 pr-4 font-normal">Score</th>
            <th scope="col" className="py-2 pr-4 font-normal max-md:hidden">AI guidance</th>
            <th scope="col" className="py-2 pr-4 font-normal">Stage</th>
            <th scope="col" className="py-2 font-normal max-md:hidden">Required skill gaps</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const href = `/recruiter/jobs/${jobId}/applicants/${r.applicationId}`;
            return (
              <tr key={r.applicationId} className="relative border-b border-hairline-soft align-top transition-colors hover:bg-wash">
                <td className="py-1 pr-2">
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
                <td className="py-3 pr-4">
                  <Link href={href} className="text-platinum underline-offset-4 after:absolute after:inset-0 hover:underline">
                    {r.name}
                  </Link>
                  {r.pinned && <span className="text-[13px]"> · Pinned</span>}
                  {r.needsReview && <p className="mt-0.5 text-[13px] text-mist">Needs manual check</p>}
                </td>
                <td className="py-3 pr-4">
                  <ScoreCell row={r} href={href} />
                </td>
                <td className="py-3 pr-4 max-md:hidden">
                  {r.score !== null && r.ceiling !== null ? recommendation(r.score, r.ceiling) : ''}
                </td>
                <td className="whitespace-nowrap py-3 pr-4">{STATUS_LABELS[r.status]}</td>
                <td className="py-3 tabular-nums max-md:hidden">
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
  if (row.assessmentState === 'running') return <span>Assessing…</span>;
  if (row.assessmentState === 'failed') return <span className="text-mist">AI failed, open to retry</span>;
  if (row.score === null || row.ceiling === null) return <span>Not assessed</span>;
  return (
    <Link href={`${href}#evidence`} className="group relative z-10 block w-28">
      <span className="font-mono text-base tabular-nums text-lavender group-hover:underline">{row.score}</span>
      {row.ceiling > row.score && <span className="text-[13px]"> could reach {row.ceiling}</span>}
      <ScoreMeter score={row.score} ceiling={row.ceiling} className="mt-1" />
    </Link>
  );
}
