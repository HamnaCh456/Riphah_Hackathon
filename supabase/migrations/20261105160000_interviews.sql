create table interviewers (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references profiles(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);
create unique index interviewers_unique_name on interviewers (recruiter_id, lower(trim(name)));

create table interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  -- Copied from the application so conflict queries need no joins.
  candidate_id uuid not null references profiles(id),
  recruiter_id uuid not null references profiles(id),
  interviewer_id uuid not null references interviewers(id),
  type text not null check (type in ('phone_screen', 'technical', 'hr', 'final')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  conflict_acknowledged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index interviews_interviewer_time_idx on interviews (interviewer_id, starts_at);
create index interviews_candidate_time_idx on interviews (candidate_id, starts_at);
create index interviews_recruiter_time_idx on interviews (recruiter_id, starts_at);
create index interviews_application_idx on interviews (application_id);

create table interview_feedback (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null unique references interviews(id) on delete cascade,
  technical_skill int not null check (technical_skill between 1 and 5),
  problem_solving int not null check (problem_solving between 1 and 5),
  communication int not null check (communication between 1 and 5),
  job_knowledge int not null check (job_knowledge between 1 and 5),
  recommendation text not null check (recommendation in ('advance', 'hold', 'do_not_advance')),
  strengths text not null default '',
  concerns text not null default '',
  recorded_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, created_at desc);

-- Server-only tables: no policies, so the browser can never read them directly.
alter table interviewers enable row level security;
alter table interviews enable row level security;
alter table interview_feedback enable row level security;
alter table notifications enable row level security;
