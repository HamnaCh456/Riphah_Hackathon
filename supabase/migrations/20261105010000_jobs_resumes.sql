-- Modules 3 and 4. Row level security is on with no policies, so these tables can't be reached from
-- the browser. Server code uses the secret key and checks role and ownership itself.

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references public.profiles (id),
  title text not null check (char_length(title) between 2 and 120),
  department text,
  location text,
  employment_type text not null default 'full_time'
    check (employment_type in ('full_time', 'part_time', 'contract', 'internship')),
  salary text,
  description text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_recruiter_id_idx on public.jobs (recruiter_id, created_at desc);

-- One row per skill, experience or qualification the job asks for.
create table public.job_requirements (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  kind text not null check (kind in ('skill', 'experience', 'qualification')),
  label text not null check (char_length(label) between 1 and 200),
  importance int not null default 3 check (importance between 1 and 5),
  is_required boolean not null default true,
  created_at timestamptz not null default now()
);
create index job_requirements_job_id_idx on public.job_requirements (job_id);

-- One row per successfully read upload. The newest parsed row is the candidate's current resume,
-- so a failed new upload never replaces a good one.
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.profiles (id) on delete cascade,
  file_name text not null,
  file_type text not null check (file_type in ('pdf', 'docx')),
  raw_text text not null,
  parse_status text not null default 'pending'
    check (parse_status in ('pending', 'parsed', 'empty', 'failed')),
  failure_code text,
  extracted jsonb,  -- what the AI returned, never edited
  parsed jsonb,     -- the current version, including the candidate's corrections
  corrected_at timestamptz,
  created_at timestamptz not null default now()
);
create index resumes_candidate_id_idx on public.resumes (candidate_id, created_at desc);

create table public.candidate_skills (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes (id) on delete cascade,
  name text not null,             -- standard name, e.g. JavaScript
  normalized_name text not null,  -- comparison key, e.g. javascript
  raw_term text,                  -- as written in the resume, e.g. JS
  excerpt text,                   -- supporting resume text, null if the candidate added the skill
  verified boolean not null default false,  -- the excerpt was found in the resume text
  source text not null default 'ai' check (source in ('ai', 'candidate')),
  created_at timestamptz not null default now(),
  unique (resume_id, normalized_name)
);

-- Same definition as the pipeline plan (module 6), which owns these from here on. They exist now so
-- applicant counts on the jobs page are real.
create type public.application_status as enum
  ('submitted', 'parsed', 'assessed', 'in_review', 'shortlisted', 'interview', 'selected', 'rejected');

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id),
  candidate_id uuid not null references public.profiles (id),
  resume_id uuid not null references public.resumes (id),
  status public.application_status not null default 'submitted',
  status_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (job_id, candidate_id)
);
create index applications_job_id_status_idx on public.applications (job_id, status);
create index applications_candidate_id_idx on public.applications (candidate_id);
create index applications_resume_id_idx on public.applications (resume_id);

alter table public.jobs enable row level security;
alter table public.job_requirements enable row level security;
alter table public.resumes enable row level security;
alter table public.candidate_skills enable row level security;
alter table public.applications enable row level security;
