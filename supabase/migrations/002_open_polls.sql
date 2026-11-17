-- Open-ended polls (no options yet), shared dealbreakers, and creator-only edits.

-- Responses to an open-ended poll have no option.
alter table public.votes alter column option_id drop not null;

-- Dealbreakers the creator chose to show the jury.
alter table public.polls add column if not exists dealbreakers jsonb not null default '[]'::jsonb;

-- SHA-256 of the creator's owner key; the key itself is never stored.
alter table public.polls add column if not exists owner_key_hash text;

-- RLS stays on with no policies: only the server (secret key) can read/write.
