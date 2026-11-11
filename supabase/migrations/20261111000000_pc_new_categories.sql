-- Allow the three new marketplace categories: powersports, electrical (Audio & Electrical), accessories.
-- Same function as 20261017180000_pc_secure_rpcs.sql; only the category list changed.
create or replace function public.pc_create_listing(p_key text, p_listing jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  sid bigint := public.pc_owner(p_key);
  s public.sellers;
  r public.listings;
begin
  if sid is null then raise exception 'invalid_key'; end if;
  if coalesce(btrim(p_listing->>'title'), '') = '' then raise exception 'title_required'; end if;
  if coalesce(p_listing->>'category', '') not in
     ('vehicles','wheels','parts','tools','fluids','powersports','electrical','accessories') then
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
