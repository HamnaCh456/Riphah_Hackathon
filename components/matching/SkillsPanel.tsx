import { correctSkillAction } from '@/app/recruiter/jobs/[jobId]/applicants/[applicationId]/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { EffectiveSkill } from '@/lib/matching/corrections';
import { ActionForm } from './ActionForm';

function sourceLabel(skill: EffectiveSkill) {
  if (skill.source === 'recruiter') return 'Added by recruiter';
  if (skill.source === 'corrected') return 'Corrected';
  return skill.excerpt ? 'From resume' : 'No resume quote';
}

const FIELD = 'h-10 min-w-0 flex-1 basis-40';

export function SkillsPanel({ applicationId, skills }: { applicationId: string; skills: EffectiveSkill[] }) {
  return (
    <section className="card mt-5 p-5">
      <h2 className="text-lg">Extracted skills</h2>
      {skills.length === 0 && <p className="mt-2 text-sm">No skills were extracted from this resume.</p>}
      <div className="mt-1">
        {skills.map((skill, index) => (
          <div key={`${skill.name}-${index}`} className="border-b border-hairline-soft py-3 text-sm">
            <span className="font-medium text-navy">{skill.name}</span>
            <span className="text-[13px]"> · {sourceLabel(skill)}</span>
            {skill.excerpt && (
              <p className="mt-1.5 max-w-[78ch] leading-relaxed">
                <mark className="rounded-[2px] bg-highlight px-1 py-px text-navy [-webkit-box-decoration-break:clone] [box-decoration-break:clone]">
                  {skill.excerpt}
                </mark>
              </p>
            )}
            <details className="mt-1.5">
              <summary className="w-fit cursor-pointer text-[13px] transition-colors hover:text-brand-dark">
                Rename or remove
              </summary>
              <ActionForm action={correctSkillAction} className="mt-2 flex max-w-2xl flex-wrap items-center gap-2" reset>
                <input type="hidden" name="applicationId" value={applicationId} />
                <input type="hidden" name="skillName" value={skill.name} />
                <Input name="newName" maxLength={80} aria-label="New skill name" placeholder="New name" className={FIELD} />
                <Input name="reason" required minLength={3} maxLength={1000} aria-label="Reason" placeholder="Reason" className={FIELD} />
                <Button name="action" value="rename" variant="ghost" size="sm">Rename</Button>
                <Button name="action" value="remove" variant="ghost" size="sm">Remove</Button>
              </ActionForm>
            </details>
          </div>
        ))}
      </div>
      <ActionForm action={correctSkillAction} className="mt-3 flex max-w-2xl flex-wrap items-center gap-2" reset>
        <input type="hidden" name="applicationId" value={applicationId} />
        <input type="hidden" name="action" value="add" />
        <Input name="skillName" required maxLength={80} aria-label="Skill to add" placeholder="Add a skill" className={FIELD} />
        <Input name="reason" required minLength={3} maxLength={1000} aria-label="Reason" placeholder="Reason" className={FIELD} />
        <Button variant="ghost" size="sm">Add skill</Button>
      </ActionForm>
    </section>
  );
}
