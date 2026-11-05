import Link from 'next/link';

import { ApplyButton } from '@/components/pipeline/ApplyButton';
import { requireCandidate } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { EMPLOYMENT_TYPES } from '@/lib/jobs/schema';
import { PUBLIC_STATUS } from '@/lib/pipeline/status';
import { getCurrentResume } from '@/lib/resume/service';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Open jobs' };
export const maxDuration = 60; // Applying runs the assessment after the response.

const PAGE_SIZE = 24;

const typeLabel = (value: string) =>
  EMPLOYMENT_TYPES.find((type) => type.value === value)?.label ?? value;

export default async function CandidateJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const profile = await requireCandidate();
  const { show } = await searchParams;
  const limit = Math.max(Number(show) || PAGE_SIZE, PAGE_SIZE);

  // Listed columns only: public posting details, never the recruiter or applicant data.
  const { data: jobs, error } = await db()
    .from('jobs')
    .select('id, title, department, location, employment_type, salary, description')
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (error) throw new Error('Could not load jobs');

  const [resume, mine] = await Promise.all([
    getCurrentResume(profile.id),
    createClient().then((supabase) => supabase.rpc('my_applications')),
  ]);
  if (mine.error) throw new Error('Could not load your applications');
  const applied = new Map(
    (mine.data as { job_id: string; public_status: string }[]).map((a) => [a.job_id, a.public_status]),
  );

  const shown = jobs.slice(0, limit);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">Open jobs</h1>
        <Link href="/candidate/applications" className="textlink font-arial text-sm">My applications</Link>
      </div>

      {!resume && (
        <p className="mt-4 text-sm text-ink">
          You need a resume to apply. <Link href="/candidate/resume" className="textlink">Upload your resume</Link>
        </p>
      )}

      {jobs.length === 0 && <p className="card mt-5 p-5 text-sm">No open jobs right now.</p>}

      <div className="mt-5 space-y-3">
        {shown.map((job) => {
          const status = applied.get(job.id);
          return (
            <article key={job.id} className="card p-5 text-sm transition-shadow hover:shadow-raised">
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                <div className="min-w-0 flex-1 basis-72">
                  <h2 className="text-base">{job.title}</h2>
                  <p className="mt-0.5 text-[13px]">
                    {[job.department, job.location, typeLabel(job.employment_type), job.salary].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {status ? (
                  <Link href="/candidate/applications" className="textlink font-arial">
                    Applied · {PUBLIC_STATUS[status].label}
                  </Link>
                ) : resume ? (
                  <ApplyButton jobId={job.id} />
                ) : (
                  <Link href="/candidate/resume" className="textlink font-arial">Upload resume to apply</Link>
                )}
              </div>
              <details className="mt-2">
                <summary className="w-fit cursor-pointer text-[13px] transition-colors hover:text-brand-dark">
                  Read the job description
                </summary>
                <p className="mt-2 max-w-[78ch] whitespace-pre-wrap leading-relaxed">{job.description}</p>
              </details>
            </article>
          );
        })}
      </div>

      {jobs.length > limit && (
        <Link href={`/candidate/jobs?show=${limit + PAGE_SIZE}`} className="textlink mt-4 inline-block font-arial text-sm">
          Show more ({jobs.length - limit} more)
        </Link>
      )}
    </>
  );
}
