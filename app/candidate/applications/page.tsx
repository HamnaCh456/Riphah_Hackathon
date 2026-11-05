import Link from 'next/link';

import { AppShell } from '@/components/app-shell';
import { formatDate } from '@/components/matching/labels';
import { requireCandidate } from '@/lib/auth/guards';
import { getCandidateInterviews, getCandidateNotifications } from '@/lib/interviews/candidate-view';
import { INTERVIEW_TYPES } from '@/lib/interviews/schemas';
import { formatDay, formatTimeRange } from '@/lib/interviews/time';
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

  const [interviews, notifications] = await Promise.all([
    getCandidateInterviews(profile.id),
    getCandidateNotifications(profile.id),
  ]);

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
              {interviews.filter((i) => i.application_id === application.application_id).map((i) => (
                <p key={i.starts_at} className="mt-2 text-mist">
                  {INTERVIEW_TYPES.find((t) => t.value === i.type)?.label} interview,{' '}
                  <span className="tabular-nums">{formatDay(i.starts_at)}, {formatTimeRange(i.starts_at, i.ends_at)}</span>
                  {i.status === 'cancelled' ? ' (cancelled)' : ''}
                </p>
              ))}
            </section>
          );
        })}
      </div>

      {notifications.length > 0 && (
        <section aria-label="Notifications" className="mt-6 max-w-3xl border-t pt-4 text-sm">
          <h2 className="text-[15px]">Notifications</h2>
          <p className="mt-1">Simulated in this demo. No email was sent.</p>
          <ul className="mt-2">
            {notifications.map((n) => (
              <li key={n.id} className="border-t border-hairline-soft py-2">
                <span className="text-mist">{n.title}.</span> {n.body}
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
