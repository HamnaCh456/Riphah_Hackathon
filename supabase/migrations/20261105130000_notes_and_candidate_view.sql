create table public.application_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id),
  author_id uuid not null references public.profiles(id) default auth.uid(),
  body text not null check (length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index on public.application_notes (application_id, created_at);
alter table public.application_notes enable row level security;
create policy recruiter_read on public.application_notes for select to authenticated
  using (public.owns_application(application_id));
create policy recruiter_write on public.application_notes for insert to authenticated
  with check (public.owns_application(application_id) and author_id = auth.uid());

-- Collapses internal stages. A candidate never learns that an AI assessment exists or finished.
create function public.public_application_status(p public.application_status) returns text
language sql immutable set search_path = '' as $$
  select case p
    when 'submitted' then 'submitted'
    when 'parsed' then 'under_review'
    when 'assessed' then 'under_review'
    when 'in_review' then 'under_review'
    when 'shortlisted' then 'shortlisted'
    when 'interview' then 'interview'
    when 'selected' then 'selected'
    when 'rejected' then 'not_selected'
  end
$$;

create function public.my_applications()
returns table (application_id uuid, job_id uuid, job_title text, applied_at timestamptz,
               public_status text, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id, a.job_id, j.title, a.created_at, public.public_application_status(a.status), a.status_changed_at
  from public.applications a join public.jobs j on j.id = a.job_id
  where a.candidate_id = auth.uid()
  order by a.created_at desc
$$;

create function public.my_application_timeline(p_application_id uuid)
returns table (public_status text, at timestamptz)
language sql stable security definer set search_path = '' as $$
  select public_status, at from (
    select public.public_application_status(e.to_status) as public_status, e.created_at as at,
           lag(public.public_application_status(e.to_status)) over (order by e.created_at, e.id) as previous
    from public.application_status_events e
    join public.applications a on a.id = e.application_id
    where e.application_id = p_application_id and a.candidate_id = auth.uid()
  ) t
  where previous is distinct from public_status
  order by at
$$;

revoke all on function public.my_applications() from public, anon;
revoke all on function public.my_application_timeline(uuid) from public, anon;
grant execute on function public.my_applications() to authenticated;
grant execute on function public.my_application_timeline(uuid) to authenticated;
