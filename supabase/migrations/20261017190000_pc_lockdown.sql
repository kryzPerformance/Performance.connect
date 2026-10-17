-- =============================================================================
-- Performance Connect — Step 3, part 2: LOCKDOWN
-- Apply only AFTER the pages that use the pc_* functions are live on main.
--
-- After this:
--   • Nobody can insert/update/delete sellers, listings or part-outs directly.
--     All changes go through the pc_* functions, which check the Performance Key.
--   • Performance Keys and seller emails can't be read by the public at all.
--   • The admin (admin@performanceconnect.ca) can still delete anything.
-- =============================================================================

-- ── 1. Remove the "anyone can change anything" rules ─────────────────────────
drop policy if exists "Anyone can create a seller"  on public.sellers;
drop policy if exists "Anyone can update a seller"  on public.sellers;
drop policy if exists "public insert"               on public.listings;
drop policy if exists "public update listings"      on public.listings;
drop policy if exists "vehicles_anon_insert"        on public.partout_vehicles;
drop policy if exists "vehicles_anon_update"        on public.partout_vehicles;
drop policy if exists "vehicles_anon_delete"        on public.partout_vehicles;
drop policy if exists "parts_anon_insert"           on public.partout_parts;
drop policy if exists "parts_anon_update"           on public.partout_parts;
drop policy if exists "parts_anon_delete"           on public.partout_parts;

-- Belt and braces: take the write permissions away too. The admin keeps
-- DELETE (still limited to the admin account by the "admin delete" policies).
revoke insert, update, delete, truncate on public.sellers, public.listings,
  public.partout_vehicles, public.partout_parts from anon;
revoke insert, update, truncate on public.sellers, public.listings,
  public.partout_vehicles, public.partout_parts from authenticated;
revoke delete on public.sellers from authenticated;

-- ── 2. Sellers: only public columns are readable ─────────────────────────────
-- performance_key and email are left out, so they can't be read by anyone
-- outside the database functions.
revoke select on public.sellers from anon, authenticated;
grant select (seller_id, instagram, garage_name, alias, display_name, has_email,
              profile_photo, verified, rating, created_at)
  on public.sellers to anon, authenticated;

-- ── 3. Emails no longer live on listings / part-outs ─────────────────────────
-- They were copies of the seller's email (the seller row is the source of
-- truth, used by the contact relay). Nothing can write these columns now.
update public.listings         set email = null where email is not null;
update public.partout_vehicles set email = null where email is not null;

-- ── 4. Old helper that skipped the key check ─────────────────────────────────
drop function if exists public.bulk_create_parts(uuid, text[], text);

-- ── 5. Unused key column on events (always empty) ────────────────────────────
alter table public.events drop column if exists performance_key;

-- -----------------------------------------------------------------------------
-- Undo (only if something breaks and you need the old behaviour back fast):
--   create policy "Anyone can create a seller" on public.sellers for insert with check (true);
--   create policy "Anyone can update a seller" on public.sellers for update using (true);
--   create policy "public insert" on public.listings for insert with check (true);
--   create policy "public update listings" on public.listings for update using (true) with check (true);
--   create policy vehicles_anon_insert on public.partout_vehicles for insert with check (true);
--   create policy vehicles_anon_update on public.partout_vehicles for update using (true);
--   create policy vehicles_anon_delete on public.partout_vehicles for delete using (true);
--   create policy parts_anon_insert on public.partout_parts for insert with check (true);
--   create policy parts_anon_update on public.partout_parts for update using (true);
--   create policy parts_anon_delete on public.partout_parts for delete using (true);
--   grant select, insert, update, delete on public.sellers, public.listings,
--     public.partout_vehicles, public.partout_parts to anon, authenticated;
-- (Re-opening these brings the security holes back — fix forward instead if you can.)
-- -----------------------------------------------------------------------------
