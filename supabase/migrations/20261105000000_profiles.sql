-- One profile per auth user. The role lives here, never in editable user metadata.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('recruiter', 'candidate')),
  full_name text not null check (char_length(full_name) between 2 and 100),
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users read their own row only. No insert/update/delete policy, so the role can't be changed.
create policy "Users read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    new.raw_user_meta_data ->> 'role',
    trim(new.raw_user_meta_data ->> 'full_name'),
    new.email
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
