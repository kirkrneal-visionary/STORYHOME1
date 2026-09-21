-- P2A2B: local-place slug/alias resolution. UUID remains identity.
-- No production seed or public routes.

alter table public.local_places
  add column canonical_slug text,
  add constraint local_places_slug_format check (
    canonical_slug is null
    or canonical_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  );

create table public.local_place_aliases (
  id uuid primary key default gen_random_uuid(),
  local_place_id uuid not null
    references public.local_places (id) on delete restrict on update restrict,
  alias_kind text not null check (alias_kind in ('name', 'slug')),
  raw_value text not null check (length(btrim(raw_value)) > 0),
  normalized_value text not null
    check (normalized_value ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  unique (local_place_id, normalized_value)
);

create function public.normalize_local_place_key(p_raw text)
returns text language sql immutable parallel safe set search_path = public as $$
  select nullif(trim(both '-' from regexp_replace(
    regexp_replace(lower(trim(coalesce(p_raw, ''))), '[^a-z0-9]+', '-', 'g'),
    '-+', '-', 'g')), '');
$$;

create function public.local_place_key_taken(p_place_id uuid, p_key text, p_county_fips text)
returns boolean language sql stable set search_path = public as $$
  select exists (
    select 1 from public.local_place_counties c
    join public.local_places p on p.id = c.local_place_id
    where c.county_fips = p_county_fips
      and c.local_place_id is distinct from p_place_id
      and (p.canonical_slug = p_key or exists (
        select 1 from public.local_place_aliases a
        where a.local_place_id = p.id and a.normalized_value = p_key
      ))
  );
$$;

create function public.local_place_guard_keys()
returns trigger language plpgsql set search_path = public as $$
declare
  k text;
  fips text;
  place uuid;
begin
  if tg_table_name = 'local_place_counties' then
    for k in
      select s.canonical_slug from public.local_places s
      where s.id = new.local_place_id and s.canonical_slug is not null
      union
      select a.normalized_value from public.local_place_aliases a
      where a.local_place_id = new.local_place_id
    loop
      if public.local_place_key_taken(new.local_place_id, k, new.county_fips) then
        raise exception 'local_place_key_conflict';
      end if;
    end loop;
    return new;
  end if;
  place := coalesce(new.id, new.local_place_id);
  if tg_table_name = 'local_places' then
    new.canonical_slug := public.normalize_local_place_key(new.canonical_slug);
    k := new.canonical_slug;
    if k is not null and exists (
      select 1 from public.local_place_aliases a
      where a.local_place_id = place and a.normalized_value = k
    ) then raise exception 'local_place_key_conflict'; end if;
  else
    new.normalized_value := public.normalize_local_place_key(new.raw_value);
    k := new.normalized_value;
    if k is null or exists (
      select 1 from public.local_places p where p.id = place and p.canonical_slug = k
    ) then raise exception 'local_place_key_conflict'; end if;
  end if;
  if k is null then return new; end if;
  for fips in select c.county_fips from public.local_place_counties c where c.local_place_id = place
  loop
    if public.local_place_key_taken(place, k, fips) then
      raise exception 'local_place_key_conflict';
    end if;
  end loop;
  return new;
end;
$$;

create trigger local_places_slug_guard
  before insert or update of canonical_slug on public.local_places
  for each row execute function public.local_place_guard_keys();
create trigger local_place_aliases_guard
  before insert or update of normalized_value, local_place_id, raw_value
  on public.local_place_aliases
  for each row execute function public.local_place_guard_keys();
create trigger local_place_counties_key_guard
  before insert or update of local_place_id, county_fips on public.local_place_counties
  for each row execute function public.local_place_guard_keys();

create function public.resolve_local_place(p_county_fips text, p_raw text)
returns table (
  local_place_id uuid,
  display_name text,
  canonical_slug text,
  primary_county_fips text,
  requested_county_associated boolean,
  key_class text
)
language plpgsql stable set search_path = public as $$
declare
  norm text := public.normalize_local_place_key(p_raw);
  n int;
begin
  if norm is null or not exists (
    select 1 from public.tx_counties t where t.county_fips = p_county_fips
  ) then return; end if;
  select count(distinct p.id) into n
  from public.local_places p
  join public.local_place_counties c on c.local_place_id = p.id
  where c.county_fips = p_county_fips
    and (p.canonical_slug = norm or exists (
      select 1 from public.local_place_aliases a
      where a.local_place_id = p.id and a.normalized_value = norm
    ));
  if n > 1 then raise exception 'ambiguous_local_place'; end if;
  if n = 0 then return; end if;
  return query
  select p.id, p.display_name, p.canonical_slug,
    (select c2.county_fips from public.local_place_counties c2
      where c2.local_place_id = p.id and c2.is_primary limit 1),
    true,
    case when p.canonical_slug = norm then 'canonical_slug' else 'alias' end
  from public.local_places p
  join public.local_place_counties c on c.local_place_id = p.id
  where c.county_fips = p_county_fips
    and (p.canonical_slug = norm or exists (
      select 1 from public.local_place_aliases a
      where a.local_place_id = p.id and a.normalized_value = norm
    ))
  limit 1;
end;
$$;

alter table public.local_place_aliases enable row level security;
alter table public.local_place_aliases force row level security;
revoke all on table public.local_place_aliases from public, anon, authenticated;
grant all on table public.local_place_aliases to service_role;
revoke all on function public.normalize_local_place_key(text) from public, anon, authenticated;
revoke all on function public.local_place_key_taken(uuid, text, text) from public, anon, authenticated;
revoke all on function public.local_place_guard_keys() from public, anon, authenticated;
revoke all on function public.resolve_local_place(text, text) from public, anon, authenticated;
grant execute on function public.normalize_local_place_key(text) to service_role;
grant execute on function public.resolve_local_place(text, text) to service_role;
