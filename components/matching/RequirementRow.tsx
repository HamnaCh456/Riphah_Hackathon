import { overrideRequirementAction } from '@/app/recruiter/jobs/[jobId]/applicants/[applicationId]/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { EffectiveRequirement } from '@/lib/matching/effective';
import type { RequirementRecord } from '@/lib/matching/read';
import type { MatchStatus } from '@/lib/matching/types';
import { ActionForm } from './ActionForm';
import { MATCH_LABELS } from './labels';

/** The shape carries the meaning too, so these stay different without colour. */
function MatchMark({ status }: { status: MatchStatus }) {
  if (status === 'confirmed_absent') {
    return (
      <svg aria-hidden="true" viewBox="0 0 10 10" className="size-2.5 shrink-0 text-coral">
        <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (status === 'no_evidence') {
    return <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full border border-dashed border-silver" />;
  }
  if (status === 'partial') {
    return (
      <span
        aria-hidden="true"
        className="size-2.5 shrink-0 rounded-full border border-mist bg-[linear-gradient(90deg,var(--color-liquid-mist)_50%,transparent_50%)]"
      />
    );
  }
  return <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-mist" />;
}

const WORD_TONE: Record<MatchStatus, string> = {
  matched: 'text-mist',
  partial: 'text-mist',
  no_evidence: 'text-silver',
  confirmed_absent: 'text-coral',
};

export function RequirementRow({ applicationId, req }: {
  applicationId: string;
  req: EffectiveRequirement<RequirementRecord>;
}) {
  const status = req.effectiveStatus;
  const real = req.assessment_evidence.filter((e) => e.verified);
  const fake = req.assessment_evidence.filter((e) => !e.verified);
  const listedOnly = status === 'matched' && req.effectiveDepth === 'listed';
  const showHelp = status === 'no_evidence' || status === 'confirmed_absent';

  return (
    <div className="border-b border-hairline-soft py-4 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-[15px]">
          {req.label}
          {!req.is_required && <span className="font-normal text-silver"> (preferred)</span>}
        </h3>
        <span className={`inline-flex items-center gap-2 ${WORD_TONE[status]}`}>
          <MatchMark status={status} />
          {listedOnly ? 'Listed only, no use described' : MATCH_LABELS[status].word}
        </span>
      </div>

      {showHelp && !req.overrideReason && <p className="mt-1 max-w-[78ch]">{MATCH_LABELS[status].help}</p>}

      {req.overrideReason ? (
        <p className="mt-1 max-w-[78ch]">
          Changed by a recruiter: {req.overrideReason}. AI result was “{MATCH_LABELS[req.aiStatus].word}”.
        </p>
      ) : (
        <p className="mt-1 max-w-[78ch]">{req.explanation}</p>
      )}

      {real.map((e) => (
        <p key={e.id} className="mt-2 max-w-[78ch] leading-relaxed">
          <mark className="rounded-[2px] bg-citrine px-1 py-px text-abyss [-webkit-box-decoration-break:clone] [box-decoration-break:clone]">
            {e.quote}
          </mark>
          {e.section && <span className="text-[13px]"> from {e.section}</span>}
        </p>
      ))}
      {fake.map((e) => (
        <p key={e.id} className="mt-2 max-w-[78ch] text-[13px]">
          AI claim not found in the resume, not counted: <span className="line-through">{e.quote}</span>
        </p>
      ))}
      {req.needs_review && !req.overrideReason && (
        <p className="mt-2 font-medium text-mist">Needs manual check</p>
      )}
      {req.learning_suggestion && status !== 'matched' && (
        <p className="mt-2 max-w-[78ch] text-[13px]">Learning area: {req.learning_suggestion}</p>
      )}

      <details className="mt-2">
        <summary className="w-fit cursor-pointer text-[13px] transition-colors hover:text-platinum">
          Correct this result
        </summary>
        <ActionForm action={overrideRequirementAction} className="mt-3 space-y-3" reset>
          <input type="hidden" name="applicationId" value={applicationId} />
          <input type="hidden" name="requirementKey" value={req.requirement_key} />
          <div role="radiogroup" aria-label="Result" className="flex flex-wrap gap-1.5 font-arial text-[13px]">
            {(Object.keys(MATCH_LABELS) as MatchStatus[]).map((value) => (
              <ResultOption key={value} value={value} label={MATCH_LABELS[value].word} checked={value === status} />
            ))}
            {req.overrideReason && <ResultOption value="clear" label="Go back to the AI result" />}
          </div>
          <div className="flex max-w-xl flex-wrap items-center gap-2">
            <Input
              name="reason"
              required
              minLength={3}
              maxLength={1000}
              aria-label="Reason for this correction"
              placeholder="Reason, e.g. confirmed on the phone"
              className="h-10 min-w-0 flex-1 basis-56"
            />
            <Button variant="ghost" size="sm">Save correction</Button>
          </div>
        </ActionForm>
      </details>
    </div>
  );
}

function ResultOption({ value, label, checked }: { value: string; label: string; checked?: boolean }) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name="status" value={value} defaultChecked={checked} required className="peer sr-only" />
      <span className="block rounded-small border px-2.5 py-1.5 transition-colors hover:bg-wash hover:text-platinum peer-checked:border-hairline-strong peer-checked:bg-kelp peer-checked:text-platinum peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lavender">
        {label}
      </span>
    </label>
  );
}
