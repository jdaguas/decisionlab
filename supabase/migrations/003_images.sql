-- Option photos shared for peer review. Kept in Postgres (base64) so access goes
-- through the server like everything else; there is no public storage bucket.
create table if not exists public.images (
  id           text primary key,
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp')),
  data         text not null check (char_length(data) <= 900000),
  created_at   timestamptz not null default now()
);

-- RLS on with no policies: only the server (secret key) can read/write.
alter table public.images enable row level security;
