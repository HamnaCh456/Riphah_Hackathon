import Link from 'next/link';

import { AppShell } from '@/components/app-shell';
import { formatDate } from '@/components/matching/labels';
import { requireCandidate } from '@/lib/auth/guards';
import { PUBLIC_STATUS } from '@/lib/pipeline/status';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'My applications | Talent Intelligence' };

interface MyApplication {
  application_id: string;
  job_title: string;
  applied_at: string;
  public_status: string;
}
interface TimelineStep { public_status: string; at: string }

// Reads only the two candidate functions, which return simplified stages and nothing recruiter-only.
export default async function MyApplicationsPage() {
  const profile = await requireCandidate();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('my_applications');
  if (error) throw new Error('Could not load your applications');

  const applications = await Promise.all((data as MyApplication[]).map(async (application) => {
    const timeline = await supabase.rpc('my_application_timeline', {
      p_application_id: application.application_id,
    });
    return { ...application, timeline: (timeline.data ?? []) as TimelineStep[] };
  }));

  return (
    <AppShell profile={profile}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">My applications</h1>
        <Link href="/candidate/jobs" className="textlink font-arial text-sm">Browse open jobs</Link>
      </div>

      {applications.length === 0 && (
        <p className="mt-6 border-t pt-4 text-sm">You have not applied to any jobs yet.</p>
      )}

      <div className="mt-5 max-w-3xl">
        {applications.map((application) => {
          const current = PUBLIC_STATUS[application.public_status];
          return (
            <section key={application.application_id} className="border-t py-4 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="text-[15px]">{application.job_title}</h2>
                <span className="text-mist">{current.label}</span>
              </div>
              <p className="mt-1">{current.help}</p>
              <ol className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                {application.timeline.map((step) => (
                  <li key={step.at}>
                    {PUBLIC_STATUS[step.public_status].label} · <span className="tabular-nums">{formatDate(step.at)}</span>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
