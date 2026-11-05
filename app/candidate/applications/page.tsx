import Link from 'next/link';

import { formatDate } from '@/components/matching/labels';
import { ScoreRing } from '@/components/matching/ScoreRing';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { requireCandidate } from '@/lib/auth/guards';
import { getCandidateInterviews, getCandidateNotifications } from '@/lib/interviews/candidate-view';
import { INTERVIEW_TYPES } from '@/lib/interviews/schemas';
import { formatDay, formatTimeRange } from '@/lib/interviews/time';
import { loadMyScores } from '@/lib/matching/read';
import { PUBLIC_STATUS } from '@/lib/pipeline/status';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'My applications' };

const PUBLIC_TONE: Record<string, BadgeTone> = {
  shortlisted: 'gold', interview: 'blue', selected: 'teal', not_selected: 'neutral',
};

interface MyApplication {
  application_id: string;
  job_title: string;
  applied_at: string;
  public_status: string;
}
interface TimelineStep { public_status: string; at: string }

// Stages come from the two candidate functions. loadMyScores adds only the candidate's own two numbers.
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

  const [interviews, notifications, scores] = await Promise.all([
    getCandidateInterviews(profile.id),
    getCandidateNotifications(profile.id),
    loadMyScores(profile.id),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">My applications</h1>
        <Link href="/candidate/jobs" className="textlink font-arial text-sm">Browse open jobs</Link>
      </div>

      {applications.length === 0 && (
        <p className="card mt-5 p-5 text-sm">You have not applied to any jobs yet. <Link href="/candidate/jobs" className="textlink">Browse open jobs</Link></p>
      )}

      <div className="mt-5 max-w-3xl space-y-3">
        {applications.map((application) => {
          const current = PUBLIC_STATUS[application.public_status];
          const result = scores.get(application.application_id);
          return (
            <section key={application.application_id} className="card p-5 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="text-base">{application.job_title}</h2>
                <Badge tone={PUBLIC_TONE[application.public_status] ?? 'blue'}>{current.label}</Badge>
              </div>
              <p className="mt-1">{current.help}</p>
              {result && (
                <div className="mt-3 flex items-center gap-3">
                  <ScoreRing score={result.score} ceiling={result.ceiling} className="shrink-0" />
                  <p>
                    Your score for this job: {result.score}.
                    {result.ceiling > result.score && (
                      <> You could reach {result.ceiling} if you have the skills your resume doesn&apos;t mention yet.</>
                    )}
                  </p>
                </div>
              )}
              <ol className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
                {application.timeline.map((step) => (
                  <li key={step.at} className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
                    {PUBLIC_STATUS[step.public_status].label} · <span className="tabular-nums">{formatDate(step.at)}</span>
                  </li>
                ))}
              </ol>
              {interviews.filter((i) => i.application_id === application.application_id).map((i) => (
                <p key={i.starts_at} className="mt-2 text-ink">
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
        <section aria-label="Notifications" className="card mt-5 max-w-3xl p-5 text-sm">
          <h2 className="text-lg">Notifications</h2>
          <ul className="mt-2">
            {notifications.map((n) => (
              <li key={n.id} className="border-t border-hairline-soft py-2">
                <span className="text-ink">{n.title}.</span> {n.body}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
