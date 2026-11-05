-- One set of interview questions per job, instead of one set per applicant.
-- Additive only: the old interview_questions table stays as it was, and nothing reads it now.
-- Rollback: drop the function and the table below.
create table public.job_interview_questions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  skill text,
  question text not null check (length(trim(question)) > 0),
  answer_guidelines text not null check (length(trim(answer_guidelines)) > 0),
  edited boolean not null default false,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index job_interview_questions_job_idx on public.job_interview_questions (job_id);

-- Server-only table: no policies, so the browser can never read answer guidelines directly.
alter table public.job_interview_questions enable row level security;

-- Saves a whole set only if the job has none, so two clicks at once can't create two sets.
create function public.save_job_questions(p_job_id uuid, p_created_by uuid, p_questions jsonb)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  perform 1 from jobs where id = p_job_id for update;
  if exists (select 1 from job_interview_questions where job_id = p_job_id) then
    return false;
  end if;
  insert into job_interview_questions (job_id, difficulty, skill, question, answer_guidelines, created_by)
    select p_job_id, q.difficulty, q.skill, q.question, q.answer_guidelines, p_created_by
    from jsonb_to_recordset(p_questions)
      as q(difficulty text, skill text, question text, answer_guidelines text);
  return true;
end;
$$;

revoke all on function public.save_job_questions(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_job_questions(uuid, uuid, jsonb) to service_role;
