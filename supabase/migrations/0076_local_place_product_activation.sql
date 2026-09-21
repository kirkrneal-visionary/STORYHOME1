-- P2A4: local-place product activation. Canonical place ≠ public product.
-- No row means inactive. Does not create public routes.

create table public.local_place_product_activation (
  local_place_id uuid primary key
    references public.local_places (id)
    on delete restrict
    on update restrict,
  is_active boolean not null,
  activated_at timestamptz not null default now(),
  constraint local_place_product_activation_active_only check (is_active)
);

create function public.local_place_activation_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (
    select 1
    from public.local_place_counties c
    join public.tx_county_product_activation a on a.county_fips = c.county_fips
    where c.local_place_id = new.local_place_id
      and c.is_primary
  ) then
    raise exception 'local_place_activation_inactive_primary';
  end if;
  return new;
end;
$$;

create trigger local_place_activation_guard
  before insert or update of local_place_id, is_active
  on public.local_place_product_activation
  for each row execute function public.local_place_activation_guard();

insert into public.local_place_product_activation (local_place_id, is_active) values
  ('00029d4e-eb06-5551-83de-6e016d76fa06', true),
  ('e27d8dab-f9bb-5a40-88a0-989630cf6c91', true),
  ('57b6c1da-0815-5ea9-9202-ec53a86f6c87', true),
  ('d44ba033-63c7-5d3e-a701-9f07b33b78cd', true),
  ('33b96f7a-394f-508f-bb97-f53ea282e6a8', true),
  ('e48fe0cb-c8ee-5620-bf75-5cae48bf095f', true),
  ('860e0e40-a3b2-5e4f-baef-4b8e39f8e219', true)
on conflict (local_place_id) do update
  set is_active = excluded.is_active;

alter table public.local_place_product_activation enable row level security;
alter table public.local_place_product_activation force row level security;
revoke all on table public.local_place_product_activation
  from public, anon, authenticated;
grant all on table public.local_place_product_activation to service_role;
revoke all on function public.local_place_activation_guard()
  from public, anon, authenticated;
