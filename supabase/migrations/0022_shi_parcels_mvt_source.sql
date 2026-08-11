-- SHI map click disambiguation: include source + county_fips in MVT props.
-- Property IDs can collide across counties; tiles must carry county identity.

create or replace function public.parcels_mvt(z int, x int, y int)
returns bytea
language plpgsql stable parallel safe security definer set search_path = public as $$
declare
  result bytea;
  env geometry := ST_TileEnvelope(z, x, y);   -- 3857
begin
  if z < 13 then
    return ''::bytea;
  end if;
  select ST_AsMVT(t, 'parcels', 4096, 'geom') into result
  from (
    select
      p.prop_id,
      p.source,
      p.county_fips,
      p.owner_name,
      p.situs_address,
      p.legal_acreage,
      p.market_value,
      ST_AsMVTGeom(
        ST_Transform(p.geom, 3857),
        env,
        4096, 64, true
      ) as geom
    from public.county_parcels p
    where p.geom is not null
      and p.geom && ST_Transform(env, 4326)
  ) as t
  where t.geom is not null;
  return coalesce(result, ''::bytea);
end;
$$;

grant execute on function public.parcels_mvt(int, int, int) to anon, authenticated;
