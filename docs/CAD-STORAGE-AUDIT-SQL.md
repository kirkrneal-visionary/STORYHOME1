# CAD storage audit SQL (read-only)

Paste into: https://supabase.com/dashboard/project/ksvllgzsnzyahqsjuove/sql/new  

Run **Query A**, then **Query B**, then **Query C**. Copy each result grid (or CSV) and send back.

**Do not run anything that writes.** These are `SELECT` only.

---

## Query A — Combined CAD table sizes (heap / index / TOAST / total)

```sql
-- CAD-only relation sizes (excludes Story Home app tables, excludes WAL)
with cad as (
  select unnest(array[
    'county_parcels',
    'county_parcel_values',
    'county_parcel_change_events',
    'cad_county_status'
  ]) as relname
)
select
  n.nspname as schema,
  c.relname as table_name,
  pg_size_pretty(pg_relation_size(c.oid))                         as heap_pretty,
  pg_relation_size(c.oid)                                         as heap_bytes,
  pg_size_pretty(pg_indexes_size(c.oid))                          as index_pretty,
  pg_indexes_size(c.oid)                                          as index_bytes,
  pg_size_pretty(pg_total_relation_size(c.oid) - pg_relation_size(c.oid) - pg_indexes_size(c.oid))
                                                                  as toast_pretty,
  (pg_total_relation_size(c.oid) - pg_relation_size(c.oid) - pg_indexes_size(c.oid))
                                                                  as toast_bytes,
  pg_size_pretty(pg_total_relation_size(c.oid))                   as total_pretty,
  pg_total_relation_size(c.oid)                                   as total_bytes,
  c.reltuples::bigint                                             as planner_row_estimate
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join cad on cad.relname = c.relname
where n.nspname = 'public'
  and c.relkind = 'r'
order by pg_total_relation_size(c.oid) desc;
```

---

## Query B — PostGIS geometry vs GeoJSON column weight + GiST index

```sql
-- Geometry / GeoJSON attributed size + GiST index on geom
select
  'county_parcels.geom (sum pg_column_size)' as metric,
  pg_size_pretty(coalesce(sum(pg_column_size(geom)), 0)) as pretty,
  coalesce(sum(pg_column_size(geom)), 0) as bytes
from public.county_parcels
union all
select
  'county_parcels.geojson (sum pg_column_size)',
  pg_size_pretty(coalesce(sum(pg_column_size(geojson)), 0)),
  coalesce(sum(pg_column_size(geojson)), 0)
from public.county_parcels
union all
select
  'index county_parcels_geom_gix',
  pg_size_pretty(pg_relation_size('public.county_parcels_geom_gix')),
  pg_relation_size('public.county_parcels_geom_gix')
where exists (
  select 1 from pg_class where relname = 'county_parcels_geom_gix'
);
```

---

## Query C — Per county × REAL/PERSONAL (unique prop rows) + bytes

```sql
-- Per-source / category attributed storage (shared table — not physical per-county tables)
-- "row_bytes" ≈ detoasted column payload for the parcel row (incl. geom + geojson)
select
  p.source,
  coalesce(s.county_name, p.source) as county_name,
  p.property_category,
  count(*)::bigint as unique_parcel_rows,
  count(distinct p.prop_id)::bigint as distinct_prop_ids,
  count(*) filter (where p.geom is not null) as with_geom,
  count(*) filter (where p.geojson is not null) as with_geojson,
  coalesce(sum(pg_column_size(p)), 0) as row_bytes_total,
  coalesce(sum(pg_column_size(p.geom)), 0) as geom_bytes_total,
  coalesce(sum(pg_column_size(p.geojson)), 0) as geojson_bytes_total,
  round(avg(pg_column_size(p))::numeric, 1) as avg_row_bytes,
  round(avg(pg_column_size(p.geom))::numeric, 1) as avg_geom_bytes,
  round(avg(pg_column_size(p.geojson))::numeric, 1) as avg_geojson_bytes
from public.county_parcels p
left join public.cad_county_status s on s.source = p.source
group by p.source, coalesce(s.county_name, p.source), p.property_category
order by p.source, p.property_category;
```

---

## Query D (optional) — Values table share per county

```sql
select
  v.source,
  count(*)::bigint as value_rows,
  coalesce(sum(pg_column_size(v)), 0) as values_row_bytes_total,
  round(avg(pg_column_size(v))::numeric, 1) as avg_value_row_bytes
from public.county_parcel_values v
group by v.source
order by v.source;
```

---

## Notes for the report

1. There are **no separate physical tables per county**. Counties share `county_parcels` / `county_parcel_values` / `county_parcel_change_events`, keyed by `source`.
2. **Combined** heap/index/TOAST come from Query A (true Postgres catalog sizes).
3. **Per-county** sizes come from Query C (attributed `pg_column_size` sums). Index bytes cannot be split perfectly by county; allocate index proportionally by row count or by geom_bytes share.
4. PostGIS geometry size ≈ `sum(pg_column_size(geom))` + GiST index `county_parcels_geom_gix`. GeoJSON is a second copy in `jsonb` (often TOAST-heavy).
