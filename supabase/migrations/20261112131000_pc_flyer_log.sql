-- Rate-limit log for the AI flyer reader (supabase/functions/flyer-parser).
-- One row per attempt: a salted hash of the caller's IP (never the IP itself)
-- and the time. Only the function writes and reads it, using the secret key;
-- RLS is on with no policies, so the site's public key can't touch it.

create table if not exists public.flyer_log (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists flyer_log_ip_time on public.flyer_log (ip_hash, created_at desc);
create index if not exists flyer_log_time on public.flyer_log (created_at desc);

alter table public.flyer_log enable row level security;
revoke all on public.flyer_log from anon, authenticated;
