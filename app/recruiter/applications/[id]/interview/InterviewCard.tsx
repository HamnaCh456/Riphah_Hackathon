// app/recruiter/applications/[id]/interview/InterviewCard.tsx
import { Button } from '@/components/ui/button';
import { INTERVIEW_TYPES, RATING_CRITERIA, RECOMMENDATIONS } from '@/lib/interviews/schemas';
import { formatDay, formatTimeRange, toPktFields } from '@/lib/interviews/time';
import type { InterviewRow } from '@/lib/interviews/read';
import { FeedbackDialog } from './FeedbackDialog';
import { CancelInterview } from './InterviewRowActions';
import { ScheduleDialog, type InterviewerOption } from './ScheduleDialog';
import styles from '@/app/recruiter/interviews/interviews.module.css';

const label = (list: readonly { value: string; label: string }[], value: string) =>
  list.find((i) => i.value === value)?.label ?? value;

function Rating({ value }: { value: number }) {
  return (
    <span role="img" aria-label={`${value} out of 5`} className={styles.dots}>
      {[1, 2, 3, 4, 5].map((n) => <span key={n} className={n <= value ? styles.dotOn : styles.dot} />)}
    </span>
  );
}

/** One interview with everything a recruiter can do to it, without leaving the screen. */
export function InterviewCard({ applicationId, row, interviewers, today }: {
  applicationId: string; row: InterviewRow; interviewers: InterviewerOption[]; today: string;
}) {
  const feedback = Array.isArray(row.interview_feedback) ? row.interview_feedback[0] ?? null : row.interview_feedback;
  const fields = toPktFields(row.starts_at);
  const minutes = (Date.parse(row.ends_at) - Date.parse(row.starts_at)) / 60_000;

  return (
    <>
      <p className={styles.who}>{formatDay(row.starts_at)}, {formatTimeRange(row.starts_at, row.ends_at)}</p>
      <p>
        {label(INTERVIEW_TYPES, row.type)} · {row.interviewers.name}
        {row.status !== 'scheduled' && ` · ${row.status === 'completed' ? 'Completed' : 'Cancelled'}`}
      </p>

      {feedback && (
        <dl className={styles.feedback}>
          {RATING_CRITERIA.map(({ key, label: name }) => (
            <div key={key} className={styles.ratingLine}><dt>{name}</dt><dd><Rating value={feedback[key]} /></dd></div>
          ))}
          <div className={styles.ratingLine}><dt>Recommendation</dt><dd>{label(RECOMMENDATIONS, feedback.recommendation)}</dd></div>
          {feedback.strengths && <div><dt>Strengths</dt><dd>{feedback.strengths}</dd></div>}
          {feedback.concerns && <div><dt>Concerns</dt><dd>{feedback.concerns}</dd></div>}
        </dl>
      )}

      <div className={styles.actions}>
        {row.status !== 'cancelled' && (
          <FeedbackDialog interviewId={row.id} interviewerName={row.interviewers.name} initial={feedback} />
        )}
        {row.status === 'scheduled' && (
          <>
            <ScheduleDialog applicationId={applicationId} interviewers={interviewers} today={today}
              initial={{ interviewId: row.id, interviewerId: row.interviewer_id, type: row.type,
                date: fields.date, time: fields.time, durationMinutes: minutes }}
              trigger={<Button variant="ghost" size="sm">Move</Button>} />
            <CancelInterview interviewId={row.id} />
          </>
        )}
      </div>
    </>
  );
}
