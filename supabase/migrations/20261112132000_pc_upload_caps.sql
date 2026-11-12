-- Site-wide caps on anonymous photo uploads.
--
-- Anyone can upload listing photos and "Feature my build" photos without an
-- account, so without a cap a script could fill storage (and the bill).
-- Storage can't see the uploader's IP, so these are whole-site limits, set
-- well above real use (busiest hour so far: 10 listing photos).
--
-- The check lives in a schema the public API doesn't expose, so it can't be
-- called from the site directly.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.pc_upload_ok(p_bucket text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select case p_bucket
    when 'listing-photos' then
          (select count(*) from storage.objects where bucket_id = p_bucket and created_at > now() - interval '1 hour') < 200
      and (select count(*) from storage.objects where bucket_id = p_bucket and created_at > now() - interval '1 day')  < 1000
    when 'feature-photos' then
          (select count(*) from storage.objects where bucket_id = p_bucket and created_at > now() - interval '1 hour') < 40
      and (select count(*) from storage.objects where bucket_id = p_bucket and created_at > now() - interval '1 day')  < 100
    else true
  end
$$;
revoke all on function private.pc_upload_ok(text) from public;
grant execute on function private.pc_upload_ok(text) to anon, authenticated;

-- (No extra index: storage.objects is owned by Supabase, and these counts
--  only scan the last day of one bucket.)

alter policy "public upload photos" on storage.objects
  with check (bucket_id = 'listing-photos' and private.pc_upload_ok(bucket_id));
alter policy "public uploads feature photos" on storage.objects
  with check (bucket_id = 'feature-photos' and private.pc_upload_ok(bucket_id));
