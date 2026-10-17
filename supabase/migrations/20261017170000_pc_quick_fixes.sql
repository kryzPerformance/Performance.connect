-- Security Step 2 (quick fixes) — database part.
-- Apply AFTER the security-quick-fixes branch is tested, right before merging.

-- H1: anyone could overwrite any listing photo. The site now uploads with
-- random file names and upsert:false, so it never needs to update a file.
drop policy if exists "public update photos" on storage.objects;

-- M2: the part-out summary view ran with its owner's rights, skipping the
-- row rules. Make it follow the rules of whoever is reading it.
alter view public.partout_summary set (security_invoker = true);

-- Undo, if ever needed:
--   create policy "public update photos" on storage.objects for update
--     to public using (bucket_id = 'listing-photos');
--   alter view public.partout_summary set (security_invoker = false);
