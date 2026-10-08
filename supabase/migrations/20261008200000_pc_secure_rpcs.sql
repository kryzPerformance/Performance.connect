-- =============================================================================
-- Performance Connect — server-side Performance Key checks + seller aliases
-- Part 1 of 2 (ADDITIVE ONLY: nothing existing changes behaviour).
-- Part 2 (20261008210000_pc_lockdown.sql) removes the old open access and is
-- applied only after the pages that use these functions are live.
--
-- Every write now goes through a SECURITY DEFINER function that checks the
-- Performance Key inside the database, so the key and seller emails never
-- need to be readable from the browser.
-- =============================================================================

-- ── Seller aliases ───────────────────────────────────────────────────────────
alter table public.sellers add column if not exists alias text;

create or replace function public.pc_rand_chars(n int)
returns text language plpgsql volatile set search_path = '' as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   -- no I, O, 0, 1
  b bytea := extensions.gen_random_bytes(n);
  r text := '';
  i int;
begin
  for i in 0 .. n - 1 loop
    r := r || substr(chars, (get_byte(b, i) % 32) + 1, 1);
  end loop;
  return r;
end $$;

create or replace function public.pc_new_alias()
returns text language plpgsql volatile set search_path = '' as $$
declare a text;
begin
  loop
    a := 'Seller ' || public.pc_rand_chars(4);
    exit when not exists (select 1 from public.sellers where alias = a);
  end loop;
  return a;
end $$;

create or replace function public.pc_sellers_set_alias()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.alias is null then new.alias := public.pc_new_alias(); end if;
  return new;
end $$;

drop trigger if exists trg_sellers_alias on public.sellers;
create trigger trg_sellers_alias before insert on public.sellers
  for each row execute function public.pc_sellers_set_alias();

do $$
declare r record;
begin
  for r in select seller_id from public.sellers where alias is null loop
    update public.sellers set alias = public.pc_new_alias() where seller_id = r.seller_id;
  end loop;
end $$;

create unique index if not exists sellers_alias_key on public.sellers (alias);

-- Public-facing name: garage name > @instagram > alias. Never the email.
alter table public.sellers add column if not exists display_name text
  generated always as (
    coalesce(
      nullif(btrim(garage_name), ''),
      case when nullif(btrim(instagram), '') is not null
           then '@' || ltrim(btrim(instagram), '@') end,
      alias)
  ) stored;

-- Lets pages show an "Email seller" button without ever seeing the address.
alter table public.sellers add column if not exists has_email boolean
  generated always as (coalesce(btrim(email), '') <> '') stored;

-- ── Key helpers (internal) ───────────────────────────────────────────────────
create or replace function public.pc_norm_key(p_key text)
returns text language sql immutable set search_path = '' as $$
  select case
    when length(c) = 10 and left(c, 2) = 'PC' then 'PC-' || substr(c, 3, 4) || '-' || substr(c, 7, 4)
    when length(c) = 8 then 'PC-' || substr(c, 1, 4) || '-' || substr(c, 5, 4)
    else null end
  from (select upper(regexp_replace(coalesce(p_key, ''), '[^A-Za-z0-9]', '', 'g')) as c) s
$$;

create or replace function public.pc_owner(p_key text)
returns bigint language sql stable security definer set search_path = '' as $$
  select seller_id from public.sellers where performance_key = public.pc_norm_key(p_key)
$$;

create or replace function public.pc_seller_json(s public.sellers)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'seller_id', s.seller_id, 'instagram', s.instagram, 'email', s.email,
    'garage_name', s.garage_name, 'alias', s.alias, 'display_name', s.display_name,
    'has_email', s.has_email)
$$;

-- ── Sellers ──────────────────────────────────────────────────────────────────
-- Sign in / look up with a key. Returns the owner's own details (incl. email)
-- or null. Never returns the key itself.
create or replace function public.pc_seller_by_key(p_key text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select public.pc_seller_json(s) from public.sellers s
  where s.performance_key = public.pc_norm_key(p_key)
$$;

-- Is this Instagram handle / email already registered? -> 'email' | 'instagram' | null
create or replace function public.pc_contact_taken(p_instagram text, p_email text, p_except bigint default null)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  ig text := lower(ltrim(btrim(coalesce(p_instagram, '')), '@'));
  em text := lower(btrim(coalesce(p_email, '')));
begin
  if em <> '' and exists (select 1 from public.sellers
      where lower(btrim(email)) = em and seller_id is distinct from p_except) then
    return 'email';
  end if;
  if ig <> '' and exists (select 1 from public.sellers
      where lower(ltrim(btrim(instagram), '@')) = ig and seller_id is distinct from p_except) then
    return 'instagram';
  end if;
  return null;
end $$;

-- New seller. The key is generated here (server-side) and returned ONCE.
create or replace function public.pc_create_seller(p_instagram text, p_email text, p_garage_name text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  ig text := nullif(ltrim(btrim(coalesce(p_instagram, '')), '@'), '');
  em text := nullif(btrim(coalesce(p_email, '')), '');
  gn text := nullif(left(btrim(coalesce(p_garage_name, '')), 40), '');
  taken text;
  k text;
  s public.sellers;
begin
  if ig is null and em is null then raise exception 'contact_required'; end if;
  if em is not null and em !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'bad_email'; end if;
  taken := public.pc_contact_taken(ig, em);
  if taken is not null then raise exception 'contact_taken:%', taken; end if;
  loop
    k := 'PC-' || public.pc_rand_chars(4) || '-' || public.pc_rand_chars(4);
    exit when not exists (select 1 from public.sellers where performance_key = k);
  end loop;
  insert into public.sellers (performance_key, instagram, email, garage_name)
  values (k, ig, em, gn) returning * into s;
  return public.pc_seller_json(s) || jsonb_build_object('performance_key', k);
end $$;

-- Update the owner's contact details. p_garage_name: null = leave as is, '' = clear.
create or replace function public.pc_update_seller(p_key text, p_instagram text, p_email text, p_garage_name text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  sid bigint := public.pc_owner(p_key);
  ig text := nullif(ltrim(btrim(coalesce(p_instagram, '')), '@'), '');
  em text := nullif(btrim(coalesce(p_email, '')), '');
  taken text;
  s public.sellers;
begin
  if sid is null then raise exception 'invalid_key'; end if;
  if ig is null and em is null then raise exception 'contact_required'; end if;
  if em is not null and em !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'bad_email'; end if;
  taken := public.pc_contact_taken(ig, em, sid);
  if taken is not null then raise exception 'contact_taken:%', taken; end if;
  update public.sellers set
    instagram = ig, email = em,
    garage_name = case when p_garage_name is null then garage_name
                       else nullif(left(btrim(p_garage_name), 40), '') end,
    updated_at = now()
  where seller_id = sid returning * into s;
  -- keep the Instagram button on existing listings in sync
  update public.listings set instagram = ig where seller_id = sid;
  update public.partout_vehicles set instagram = ig where seller_id = sid;
  return public.pc_seller_json(s);
end $$;

-- ── Listings ─────────────────────────────────────────────────────────────────
create or replace function public.pc_create_listing(p_key text, p_listing jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  sid bigint := public.pc_owner(p_key);
  s public.sellers;
  r public.listings;
begin
  if sid is null then raise exception 'invalid_key'; end if;
  if coalesce(btrim(p_listing->>'title'), '') = '' then raise exception 'title_required'; end if;
  if coalesce(p_listing->>'category', '') not in ('vehicles','wheels','parts','tools','fluids') then
    raise exception 'bad_category';
  end if;
  select * into s from public.sellers where seller_id = sid;
  r := jsonb_populate_record(null::public.listings, p_listing);
  insert into public.listings (category, title, price, condition, location, description,
                               instagram, email, details, photo_urls, status, seller_id)
  values (r.category, r.title, r.price, r.condition, r.location, r.description,
          s.instagram, null, coalesce(r.details, '{}'::jsonb), coalesce(r.photo_urls, '{}'), 'active', sid)
  returning * into r;
  return to_jsonb(r) - 'email';
end $$;

create or replace function public.pc_update_listing(p_key text, p_id bigint, p_patch jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  sid bigint := public.pc_owner(p_key);
  r public.listings;
  patch jsonb;
begin
  if sid is null then raise exception 'invalid_key'; end if;
  select * into r from public.listings where id = p_id and seller_id = sid for update;
  if not found then raise exception 'not_found'; end if;
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into patch
  from jsonb_each(coalesce(p_patch, '{}'::jsonb))
  where key in ('title','price','condition','location','description','details','photo_urls','status');
  r := jsonb_populate_record(r, patch);
  if r.status not in ('active','sold','archived') then raise exception 'bad_status'; end if;
  update public.listings set
    title = r.title, price = r.price, condition = r.condition, location = r.location,
    description = r.description, details = r.details, photo_urls = r.photo_urls, status = r.status
  where id = p_id;
  return to_jsonb(r) - 'email';
end $$;

create or replace function public.pc_delete_listing(p_key text, p_id bigint)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare sid bigint := public.pc_owner(p_key);
begin
  if sid is null then raise exception 'invalid_key'; end if;
  delete from public.listings where id = p_id and seller_id = sid;
  return found;
end $$;

-- ── Part-outs ────────────────────────────────────────────────────────────────
create or replace function public.pc_create_partout(p_key text, p_vehicle jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  sid bigint := public.pc_owner(p_key);
  s public.sellers;
  r public.partout_vehicles;
begin
  if sid is null then raise exception 'invalid_key'; end if;
  select * into s from public.sellers where seller_id = sid;
  r := jsonb_populate_record(null::public.partout_vehicles, p_vehicle);
  if r.year is null or coalesce(btrim(r.make), '') = '' or coalesce(btrim(r.model), '') = '' then
    raise exception 'vehicle_required';
  end if;
  insert into public.partout_vehicles (seller_id, year, make, model, "trim", engine, transmission, vin,
      mileage, exterior_color, interior_color, location, description, instagram, email, photos, status)
  values (sid, r.year, r.make, r.model, r."trim", r.engine, r.transmission, r.vin,
      r.mileage, r.exterior_color, r.interior_color, r.location, r.description, s.instagram, null,
      coalesce(r.photos, '[]'::jsonb), 'active')
  returning * into r;
  return to_jsonb(r) - 'email';
end $$;

create or replace function public.pc_update_partout(p_key text, p_id uuid, p_patch jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  sid bigint := public.pc_owner(p_key);
  r public.partout_vehicles;
  patch jsonb;
begin
  if sid is null then raise exception 'invalid_key'; end if;
  select * into r from public.partout_vehicles where id = p_id and seller_id = sid for update;
  if not found then raise exception 'not_found'; end if;
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into patch
  from jsonb_each(coalesce(p_patch, '{}'::jsonb))
  where key in ('year','make','model','trim','engine','transmission','vin','mileage','exterior_color',
                'interior_color','location','description','photos','status');
  r := jsonb_populate_record(r, patch);
  update public.partout_vehicles set
    year = r.year, make = r.make, model = r.model, "trim" = r."trim", engine = r.engine,
    transmission = r.transmission, vin = r.vin, mileage = r.mileage, exterior_color = r.exterior_color,
    interior_color = r.interior_color, location = r.location, description = r.description,
    photos = r.photos, status = r.status
  where id = p_id returning * into r;
  return to_jsonb(r) - 'email';
end $$;

create or replace function public.pc_delete_partout(p_key text, p_id uuid)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare sid bigint := public.pc_owner(p_key);
begin
  if sid is null then raise exception 'invalid_key'; end if;
  delete from public.partout_vehicles where id = p_id and seller_id = sid;   -- parts cascade
  return found;
end $$;

-- p_parts: JSON array of part objects (name required; other columns optional)
create or replace function public.pc_add_parts(p_key text, p_vehicle_id uuid, p_parts jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  sid bigint := public.pc_owner(p_key);
  v_out jsonb;
begin
  if sid is null then raise exception 'invalid_key'; end if;
  if not exists (select 1 from public.partout_vehicles where id = p_vehicle_id and seller_id = sid) then
    raise exception 'not_found';
  end if;
  with ins as (
    insert into public.partout_parts (vehicle_id, name, category, subcategory, price, quantity, condition,
        description, photos, shipping_available, local_pickup, compatibility_notes, oem_part_number,
        compat_years, compat_makes, compat_models, status)
    select p_vehicle_id, btrim(r.name), coalesce(nullif(btrim(r.category), ''), 'Uncategorized'), r.subcategory,
        r.price, coalesce(r.quantity, 1), coalesce(r.condition, 'used_good'), r.description,
        coalesce(r.photos, '[]'::jsonb), coalesce(r.shipping_available, false), coalesce(r.local_pickup, true),
        r.compatibility_notes, r.oem_part_number, r.compat_years, r.compat_makes, r.compat_models,
        coalesce(r.status, 'available')
    from jsonb_populate_recordset(null::public.partout_parts,
           case when jsonb_typeof(p_parts) = 'array' then p_parts else '[]'::jsonb end) r
    where coalesce(btrim(r.name), '') <> ''
    returning *
  )
  select coalesce(jsonb_agg(to_jsonb(ins.*) - 'search_vec'), '[]'::jsonb) into v_out from ins;
  return v_out;
end $$;

create or replace function public.pc_update_parts(p_key text, p_ids uuid[], p_patch jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  sid bigint := public.pc_owner(p_key);
  patch jsonb;
  r public.partout_parts;
  v_out jsonb := '[]'::jsonb;
begin
  if sid is null then raise exception 'invalid_key'; end if;
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into patch
  from jsonb_each(coalesce(p_patch, '{}'::jsonb))
  where key in ('name','category','subcategory','price','quantity','condition','description','photos',
                'shipping_available','local_pickup','compatibility_notes','oem_part_number',
                'compat_years','compat_makes','compat_models','status');
  for r in select * from public.partout_parts where id = any(p_ids) and seller_id = sid for update loop
    r := jsonb_populate_record(r, patch);
    update public.partout_parts set
      name = r.name, category = r.category, subcategory = r.subcategory, price = r.price,
      quantity = r.quantity, condition = r.condition, description = r.description, photos = r.photos,
      shipping_available = r.shipping_available, local_pickup = r.local_pickup,
      compatibility_notes = r.compatibility_notes, oem_part_number = r.oem_part_number,
      compat_years = r.compat_years, compat_makes = r.compat_makes, compat_models = r.compat_models,
      status = r.status
    where id = r.id returning * into r;
    v_out := v_out || jsonb_build_array(to_jsonb(r) - 'search_vec');
  end loop;
  return v_out;
end $$;

create or replace function public.pc_delete_parts(p_key text, p_ids uuid[])
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare sid bigint := public.pc_owner(p_key); n integer;
begin
  if sid is null then raise exception 'invalid_key'; end if;
  delete from public.partout_parts where id = any(p_ids) and seller_id = sid;
  get diagnostics n = row_count;
  return n;
end $$;

-- Everything the Manage page needs, including archived items, in one call.
create or replace function public.pc_dashboard(p_key text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  sid bigint := public.pc_owner(p_key);
  s public.sellers;
begin
  if sid is null then return null; end if;
  select * into s from public.sellers where seller_id = sid;
  return jsonb_build_object(
    'seller', public.pc_seller_json(s),
    'listings', coalesce((select jsonb_agg(to_jsonb(l) - 'email' order by l.created_at desc)
                          from public.listings l where l.seller_id = sid), '[]'::jsonb),
    'partouts', coalesce((select jsonb_agg(to_jsonb(v) - 'email' order by v.created_at desc)
                          from public.partout_vehicles v where v.seller_id = sid), '[]'::jsonb),
    'summary',  coalesce((select jsonb_agg(to_jsonb(x)) from (
                   select v.id as vehicle_id,
                     count(p.id) filter (where p.status = 'available') as available_count,
                     count(p.id) filter (where p.status = 'pending')   as pending_count,
                     count(p.id) filter (where p.status = 'reserved')  as reserved_count,
                     count(p.id) filter (where p.status = 'sold')      as sold_count,
                     count(p.id) as total_count
                   from public.partout_vehicles v
                   left join public.partout_parts p on p.vehicle_id = v.id
                   where v.seller_id = sid group by v.id) x), '[]'::jsonb));
end $$;

-- Parts list for one of the owner's part-outs (works even when archived).
create or replace function public.pc_parts_for(p_key text, p_vehicle_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare sid bigint := public.pc_owner(p_key);
begin
  if sid is null then raise exception 'invalid_key'; end if;
  return coalesce((select jsonb_agg(to_jsonb(p) - 'search_vec' order by p.created_at)
                   from public.partout_parts p
                   where p.vehicle_id = p_vehicle_id and p.seller_id = sid), '[]'::jsonb);
end $$;

-- ── Contact relay rate-limit log (edge function only) ────────────────────────
create table if not exists public.contact_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  ip_hash text,
  seller_id bigint,
  target text
);
alter table public.contact_log enable row level security;   -- no policies: service role only
revoke all on public.contact_log from anon, authenticated;
create index if not exists contact_log_ip_idx on public.contact_log (ip_hash, created_at);
create index if not exists contact_log_seller_idx on public.contact_log (seller_id, created_at);

-- ── Permissions ──────────────────────────────────────────────────────────────
revoke execute on function public.pc_rand_chars(int), public.pc_new_alias(), public.pc_sellers_set_alias(),
  public.pc_owner(text), public.pc_seller_json(public.sellers), public.pc_norm_key(text)
  from public, anon, authenticated;

revoke execute on function
  public.pc_seller_by_key(text), public.pc_contact_taken(text, text, bigint),
  public.pc_create_seller(text, text, text), public.pc_update_seller(text, text, text, text),
  public.pc_create_listing(text, jsonb), public.pc_update_listing(text, bigint, jsonb),
  public.pc_delete_listing(text, bigint), public.pc_create_partout(text, jsonb),
  public.pc_update_partout(text, uuid, jsonb), public.pc_delete_partout(text, uuid),
  public.pc_add_parts(text, uuid, jsonb), public.pc_update_parts(text, uuid[], jsonb),
  public.pc_delete_parts(text, uuid[]), public.pc_dashboard(text), public.pc_parts_for(text, uuid)
  from public;
grant execute on function
  public.pc_seller_by_key(text), public.pc_contact_taken(text, text, bigint),
  public.pc_create_seller(text, text, text), public.pc_update_seller(text, text, text, text),
  public.pc_create_listing(text, jsonb), public.pc_update_listing(text, bigint, jsonb),
  public.pc_delete_listing(text, bigint), public.pc_create_partout(text, jsonb),
  public.pc_update_partout(text, uuid, jsonb), public.pc_delete_partout(text, uuid),
  public.pc_add_parts(text, uuid, jsonb), public.pc_update_parts(text, uuid[], jsonb),
  public.pc_delete_parts(text, uuid[]), public.pc_dashboard(text), public.pc_parts_for(text, uuid)
  to anon, authenticated;
