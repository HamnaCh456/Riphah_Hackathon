-- Modules 5 and 6. applications and application_status were created by the jobs migration.
create extension if not exists vector;
create type public.match_status as enum ('matched','partial','no_evidence','confirmed_absent');
create table public.application_transitions (
  from_status public.application_status not null,
  to_status public.application_status not null,
  actor text not null check (actor in ('system','recruiter')),
  requires_reason boolean not null default false,
  primary key (from_status, to_status)
);
insert into public.application_transitions values
  ('submitted','parsed','system',false),
  ('parsed','assessed','system',false),
  ('submitted','in_review','recruiter',false),
  ('submitted','shortlisted','recruiter',false),
  ('submitted','rejected','recruiter',true),
  ('parsed','in_review','recruiter',false),
  ('parsed','shortlisted','recruiter',false),
  ('parsed','rejected','recruiter',true),
  ('assessed','in_review','recruiter',false),
  ('assessed','shortlisted','recruiter',false),
  ('assessed','rejected','recruiter',true),
  ('in_review','shortlisted','recruiter',false),
  ('in_review','rejected','recruiter',true),
  ('shortlisted','interview','recruiter',false),
  ('shortlisted','rejected','recruiter',true),
  ('shortlisted','in_review','recruiter',true),
  ('interview','selected','recruiter',false),
  ('interview','rejected','recruiter',true),
  ('interview','shortlisted','recruiter',true),
  ('selected','interview','recruiter',true),
  ('rejected','in_review','recruiter',true);

create table public.application_status_events (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.applications(id),
  from_status public.application_status,
  to_status public.application_status not null,
  actor_kind text not null check (actor_kind in ('system','recruiter','candidate')),
  actor_id uuid references public.profiles(id),
  reason text,
  created_at timestamptz not null default now()
);
create index on public.application_status_events (application_id, created_at);

create function public.reject_change() returns trigger language plpgsql as $$
begin raise exception 'This table is append-only'; end $$;
create trigger status_events_append_only before update or delete on public.application_status_events
  for each row execute function public.reject_change();

create function public.guard_application_status() returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status
     and coalesce(current_setting('app.status_rpc', true), '') <> 'on' then
    raise exception 'Status can only change through change_application_status';
  end if;
  return new;
end $$;
create trigger applications_guard_status before update on public.applications
  for each row execute function public.guard_application_status();

create function public.owns_job(p_job_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.jobs j where j.id = p_job_id and j.recruiter_id = auth.uid())
$$;
create function public.owns_application(p_application_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.applications a join public.jobs j on j.id = a.job_id
    where a.id = p_application_id and j.recruiter_id = auth.uid())
$$;
create function public.owns_resume_applicant(p_resume_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.applications a join public.jobs j on j.id = a.job_id
    where a.resume_id = p_resume_id and j.recruiter_id = auth.uid())
$$;

create function public.apply_to_job(p_job_id uuid, p_resume_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'candidate') then
    raise exception 'Only candidates can apply';
  end if;
  if not exists (select 1 from public.resumes where id = p_resume_id and candidate_id = auth.uid()) then
    raise exception 'Resume not found';
  end if;
  if not exists (select 1 from public.jobs where id = p_job_id and status = 'open') then
    raise exception 'This job is not open';
  end if;
  insert into public.applications (job_id, candidate_id, resume_id)
    values (p_job_id, auth.uid(), p_resume_id) returning id into v_id;
  insert into public.application_status_events (application_id, to_status, actor_kind, actor_id)
    values (v_id, 'submitted', 'candidate', auth.uid());
  return v_id;
exception when unique_violation then
  raise exception 'You have already applied to this job';
end $$;

create function public.change_application_status(
  p_application_id uuid, p_to public.application_status, p_reason text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare v_from public.application_status; v_needs_reason boolean;
begin
  if not public.owns_application(p_application_id) then raise exception 'Not allowed'; end if;
  select status into v_from from public.applications where id = p_application_id for update;
  select requires_reason into v_needs_reason from public.application_transitions
    where from_status = v_from and to_status = p_to and actor = 'recruiter';
  if not found then raise exception 'Cannot move from % to %', v_from, p_to; end if;
  if v_needs_reason and coalesce(trim(p_reason), '') = '' then raise exception 'A reason is required'; end if;
  perform set_config('app.status_rpc', 'on', true);
  update public.applications set status = p_to, status_changed_at = now() where id = p_application_id;
  insert into public.application_status_events
    (application_id, from_status, to_status, actor_kind, actor_id, reason)
    values (p_application_id, v_from, p_to, 'recruiter', auth.uid(), nullif(trim(p_reason), ''));
end $$;

-- Does nothing if a recruiter has already moved the application on, so AI can never undo a human.
create function public.system_advance_application(
  p_application_id uuid, p_to public.application_status
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_from public.application_status;
begin
  select status into v_from from public.applications where id = p_application_id for update;
  if not exists (select 1 from public.application_transitions
    where from_status = v_from and to_status = p_to and actor = 'system') then return false; end if;
  perform set_config('app.status_rpc', 'on', true);
  update public.applications set status = p_to, status_changed_at = now() where id = p_application_id;
  insert into public.application_status_events (application_id, from_status, to_status, actor_kind)
    values (p_application_id, v_from, p_to, 'system');
  return true;
end $$;
revoke all on function public.system_advance_application(uuid, public.application_status) from public, anon, authenticated;
grant execute on function public.system_advance_application(uuid, public.application_status) to service_role;
revoke all on function public.apply_to_job(uuid, uuid) from public, anon;
revoke all on function public.change_application_status(uuid, public.application_status, text) from public, anon;
grant execute on function public.apply_to_job(uuid, uuid) to authenticated;
grant execute on function public.change_application_status(uuid, public.application_status, text) to authenticated;

create table public.resume_chunks (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  section text not null,
  ordinal int not null,
  content text not null,
  start_offset int not null,
  embedding vector(768),
  unique (resume_id, ordinal)
);
create index on public.resume_chunks (resume_id);

create function public.match_resume_chunks(
  p_resume_id uuid, p_embedding vector(768), p_sections text[], p_k int
) returns table (id uuid, section text, content text, similarity double precision)
language sql stable set search_path = public, extensions as $$
  select c.id, c.section, c.content, 1 - (c.embedding <=> p_embedding)
  from public.resume_chunks c
  where c.resume_id = p_resume_id and c.section = any (p_sections) and c.embedding is not null
  order by c.embedding <=> p_embedding
  limit p_k
$$;
revoke all on function public.match_resume_chunks(uuid, vector, text[], int) from public, anon, authenticated;
grant execute on function public.match_resume_chunks(uuid, vector, text[], int) to service_role;

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id),
  input_hash text not null,
  status text not null check (status in ('running','complete','failed')),
  model text not null,
  error text,
  score int,
  ceiling int,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (application_id, input_hash)
);
create table public.assessment_requirements (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  requirement_key text not null,
  component text not null check (component in ('skill','experience','project','qualification')),
  label text not null,
  importance int not null,
  is_required boolean not null,
  status public.match_status not null,
  depth text check (depth in ('demonstrated','listed')),
  explanation text not null,
  learning_suggestion text,
  needs_review boolean not null default false,
  top_similarity double precision,
  unique (assessment_id, requirement_key)
);
create table public.assessment_evidence (
  id uuid primary key default gen_random_uuid(),
  assessment_requirement_id uuid not null references public.assessment_requirements(id) on delete cascade,
  chunk_id uuid references public.resume_chunks(id),
  quote text not null,
  section text,
  verified boolean not null,
  similarity double precision
);
-- Append-only: the newest row per key wins and a null status clears the override, so history is kept.
create table public.requirement_overrides (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.applications(id),
  requirement_key text not null,
  status public.match_status,
  reason text not null check (length(trim(reason)) > 0),
  recruiter_id uuid not null references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create table public.skill_corrections (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.applications(id),
  action text not null check (action in ('add','remove','rename')),
  skill_name text not null,
  new_name text,
  reason text not null check (length(trim(reason)) > 0),
  recruiter_id uuid not null references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create table public.application_review (
  application_id uuid primary key references public.applications(id),
  pinned boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.applications enable row level security;
alter table public.application_transitions enable row level security;
alter table public.application_status_events enable row level security;
alter table public.resume_chunks enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_requirements enable row level security;
alter table public.assessment_evidence enable row level security;
alter table public.requirement_overrides enable row level security;
alter table public.skill_corrections enable row level security;
alter table public.application_review enable row level security;

create policy recruiter_read on public.applications for select to authenticated using (public.owns_job(job_id));
create policy recruiter_read on public.application_status_events for select to authenticated using (public.owns_application(application_id));
create policy recruiter_read on public.assessments for select to authenticated using (public.owns_application(application_id));
create policy recruiter_read on public.assessment_requirements for select to authenticated using (
  exists (select 1 from public.assessments a where a.id = assessment_id and public.owns_application(a.application_id)));
create policy recruiter_read on public.assessment_evidence for select to authenticated using (
  exists (select 1 from public.assessment_requirements r join public.assessments a on a.id = r.assessment_id
          where r.id = assessment_requirement_id and public.owns_application(a.application_id)));
create policy recruiter_read on public.resume_chunks for select to authenticated using (public.owns_resume_applicant(resume_id));
create policy recruiter_read on public.requirement_overrides for select to authenticated using (public.owns_application(application_id));
create policy recruiter_write on public.requirement_overrides for insert to authenticated
  with check (public.owns_application(application_id) and recruiter_id = auth.uid());
create policy recruiter_read on public.skill_corrections for select to authenticated using (public.owns_application(application_id));
create policy recruiter_write on public.skill_corrections for insert to authenticated
  with check (public.owns_application(application_id) and recruiter_id = auth.uid());
create policy recruiter_all on public.application_review for all to authenticated
  using (public.owns_application(application_id)) with check (public.owns_application(application_id));

-- Module 4 tables: a recruiter may read only the resumes of people who applied to their own jobs.
create policy applicant_resume_read on public.resumes for select to authenticated using (public.owns_resume_applicant(id));
create policy applicant_skills_read on public.candidate_skills for select to authenticated using (public.owns_resume_applicant(resume_id));
