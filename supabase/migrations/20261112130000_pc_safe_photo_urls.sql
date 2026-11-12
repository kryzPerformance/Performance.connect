-- Photos must be plain https links.
--
-- Listing and part-out photos are written by sellers (any Performance Key),
-- and pages build <img src="..."> from them. A "photo" containing a quote or
-- angle bracket could break out of the src attribute and run script for every
-- visitor. The pages escape these now too; this makes sure such a value can
-- never be saved in the first place.
--
-- Event cover photos are left out on purpose: people type them by hand (often
-- without https://), an admin approves every event, and events.html cleans
-- them with safeUrl() before use.

create or replace function public.pc_safe_url(u text)
returns boolean
language sql
immutable
set search_path to ''
as $$
  select u is null or u = ''
      or (length(u) <= 2048 and u ~ '^https://[^[:space:]"''<>`\\]+$')
$$;

create or replace function public.pc_safe_url_array(a text[])
returns boolean
language sql
immutable
set search_path to ''
as $$
  select a is null or not exists (select 1 from unnest(a) u where not public.pc_safe_url(u))
$$;

create or replace function public.pc_safe_url_json(j jsonb)
returns boolean
language sql
immutable
set search_path to ''
as $$
  select j is null
      or jsonb_typeof(j) = 'null'
      or (jsonb_typeof(j) = 'array'
          and not exists (
            select 1 from jsonb_array_elements(j) e
            where jsonb_typeof(e) <> 'string' or not public.pc_safe_url(e #>> '{}')
          ))
$$;

alter table public.listings
  add constraint listings_photo_urls_safe check (public.pc_safe_url_array(photo_urls));
alter table public.partout_vehicles
  add constraint partout_vehicles_photos_safe check (public.pc_safe_url_json(photos));
alter table public.partout_parts
  add constraint partout_parts_photos_safe check (public.pc_safe_url_json(photos));
alter table public.sellers
  add constraint sellers_profile_photo_safe check (public.pc_safe_url(profile_photo));
alter table public.profiles
  add constraint profiles_avatar_url_safe check (public.pc_safe_url(avatar_url));
