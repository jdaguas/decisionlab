-- DecisionLab v1 schema: only the shareable Friend Jury lives server-side.
-- Solo dilemmas (pros/cons, criteria, outcome) stay in the creator's browser.

create table if not exists public.polls (
  id          uuid primary key default gen_random_uuid(),
  share_token text not null unique,
  question    text not null check (char_length(question) between 1 and 200),
  options     jsonb not null,
  created_at  timestamptz not null default now(),
  closes_at   timestamptz
);

create table if not exists public.votes (
  id         uuid primary key default gen_random_uuid(),
  poll_id    uuid not null references public.polls(id) on delete cascade,
  option_id  text not null,
  voter_id   text not null,
  reason     text check (reason is null or char_length(reason) <= 280),
  created_at timestamptz not null default now(),
  unique (poll_id, voter_id)
);

create index if not exists votes_poll_id_idx on public.votes(poll_id);

-- RLS on, with NO policies: the anon/publishable key can't read or write
-- anything. All access goes through the Next.js API routes using the
-- server-only secret key, which validates input and never exposes voter_id.
alter table public.polls enable row level security;
alter table public.votes enable row level security;
