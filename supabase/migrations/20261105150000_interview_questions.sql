create table interview_questions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  kind text not null check (kind in ('role', 'project')),
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  skill text,
  question text not null check (length(trim(question)) > 0),
  answer_guidelines text not null check (length(trim(answer_guidelines)) > 0),
  evidence_id uuid references resume_chunks(id) on delete set null,
  evidence_quote text,
  -- not_applicable: role question, makes no claim about this candidate
  -- verified: the quote was found in the linked resume excerpt
  -- needs_review: project question whose quote could not be found
  support text not null check (support in ('not_applicable', 'verified', 'needs_review')),
  edited boolean not null default false,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index interview_questions_application_idx on interview_questions (application_id);

-- Server-only table: no policies, so the browser can never read answer guidelines directly.
alter table interview_questions enable row level security;
