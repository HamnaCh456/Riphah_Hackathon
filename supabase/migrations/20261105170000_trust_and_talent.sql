-- Additive only. Rollback: drop the function, the two tables and the two columns below.

-- Why a real quote was still flagged for a person to check.
alter table public.assessment_requirements add column review_reason text;

-- A merge only links records. Applications and accounts stay as they are, so each person's own
-- history is unchanged and clearing this column reverses a merge.
alter table public.profiles add column merged_into uuid references public.profiles (id);

create table public.candidate_preferences (
  candidate_id uuid primary key references public.profiles (id) on delete cascade,
  talent_pool_consent boolean not null default false,
  interests text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- Possible duplicates are worked out when the page loads. Only a recruiter's decision is stored.
create table public.duplicate_decisions (
  id uuid primary key default gen_random_uuid(),
  candidate_a uuid not null references public.profiles (id) on delete cascade,
  candidate_b uuid not null references public.profiles (id) on delete cascade,
  decision text not null check (decision in ('merged', 'dismissed')),
  kept_candidate uuid references public.profiles (id),
  decided_by uuid not null references public.profiles (id),
  decided_at timestamptz not null default now(),
  check (candidate_a < candidate_b),
  unique (candidate_a, candidate_b)
);

-- No policies, so the browser can't reach these. Server code checks role and ownership.
alter table public.candidate_preferences enable row level security;
alter table public.duplicate_decisions enable row level security;

-- The only code that merges. It needs a recruiter who has an application from both people.
create function public.merge_candidates(p_keep uuid, p_other uuid, p_recruiter uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_a uuid := least(p_keep, p_other);
  v_b uuid := greatest(p_keep, p_other);
begin
  if p_keep = p_other then raise exception 'This merge request is not valid'; end if;
  if not exists (select 1 from profiles where id = p_recruiter and role = 'recruiter') then
    raise exception 'This merge request is not valid';
  end if;
  if (select count(distinct a.candidate_id)
      from applications a join jobs j on j.id = a.job_id
      where j.recruiter_id = p_recruiter and a.candidate_id in (p_keep, p_other)) <> 2 then
    raise exception 'This merge request is not valid';
  end if;
  if exists (select 1 from duplicate_decisions where candidate_a = v_a and candidate_b = v_b)
     or exists (select 1 from profiles where id in (p_keep, p_other) and merged_into is not null) then
    raise exception 'This was already decided';
  end if;

  update profiles set merged_into = p_keep where id = p_other;
  update profiles set merged_into = p_keep where merged_into = p_other;
  insert into duplicate_decisions (candidate_a, candidate_b, decision, kept_candidate, decided_by)
    values (v_a, v_b, 'merged', p_keep, p_recruiter);
end;
$$;

revoke all on function public.merge_candidates(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.merge_candidates(uuid, uuid, uuid) to service_role;
