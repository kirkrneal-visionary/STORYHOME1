# CAD storage audit — PARTIAL (read-only)

**Date:** 2026-08-12  
**Project:** `ksvllgzsnzyahqsjuove` (STORYHOME)  
**Scope:** CAD storage only. No production writes.  
**Status:** Inventory + architecture complete. **True heap / index / TOAST / GiST catalog sizes are blocked** until Query A–C are run in the SQL editor (this environment has REST/service-role only, not Postgres catalog access).

SQL to paste: [CAD-STORAGE-AUDIT-SQL.md](./CAD-STORAGE-AUDIT-SQL.md)  
SQL editor: https://supabase.com/dashboard/project/ksvllgzsnzyahqsjuove/sql/new

---

## 1. Architecture (critical)

CAD is **not** stored as one physical table per county.

| Object | Role |
|---|---|
| `public.county_parcels` | All county parcels; keyed by `source` (e.g. `polk_cad`) |
| `public.county_parcel_values` | Tax-year value rows (linked by source + prop_id) |
| `public.county_parcel_change_events` | Archie observation diffs between pulls |
| `public.cad_county_status` | Tiny per-county refresh status |

**Geometry is stored twice on each parcel row:**
1. `geojson` (`jsonb`) — source payload  
2. `geom` (`geometry(MultiPolygon,4326)`) — PostGIS copy + GiST index `county_parcels_geom_gix` for map tiles  

So “PostGIS geometry size” and “GeoJSON / TOAST size” are **both** CAD cost. There is no separate `polk_cad` table to size — only attributed share of the shared tables.

**Excluded from this audit (as requested):** WAL, listings, CRM, prospects, farms, studies, messages, auth, etc.

---

## 2. Live inventory (REST, authoritative row counts)

Measured via Supabase REST against live `county_parcels` (not just `cad_county_status` counters, which can lag).

### Combined

| Metric | Count |
|---|---:|
| Unique parcel rows (`county_parcels`) | **345,154** |
| REAL | **343,179** (99.43%) |
| PERSONAL | **1,975** (0.57%) |
| Value rows (`county_parcel_values`) | **264,520** (~0.77 value rows per parcel) |
| Status rows (`cad_county_status`) | 8 seeded counties (Montgomery empty) |
| Change events | Not readable via REST (403) — confirm in SQL |

### Per county (`source`)

| County | source | Total parcels | REAL | PERSONAL | With geojson |
|---|---|---:|---:|---:|---:|
| Angelina | `angelina_cad` | 54,251 | 54,170 | 81 | 54,251 |
| Liberty | `liberty_cad` | 114,497 | 114,497 | 0 | 114,412 |
| Montgomery | `montgomery_cad` | 0 | 0 | 0 | 0 |
| Polk | `polk_cad` | 57,572 | 56,402 | 1,170 | 57,572 |
| San Jacinto | `san_jacinto_cad` | 35,148 | 35,147 | 1 | 35,148 |
| Trinity | `trinity_cad` | 24,592 | 24,591 | 1 | 24,592 |
| Tyler | `tyler_cad` | 23,508 | 23,507 | 1 | 23,508 |
| Walker | `walker_cad` | 35,586 | 34,865 | 721 | 35,584 |
| **Combined** | | **345,154** | **343,179** | **1,975** | ~345k |

Note: `cad_county_status.parcel_count` is **higher** than live rows for several counties (stale status after dedupe/partial loads). Prefer live counts above for capacity math.

---

## 3. What we cannot truthfully report yet (needs Query A–C)

Without Postgres catalog access, these must **not** be invented:

- Total table size / heap / index / TOAST per CAD relation  
- Exact PostGIS `geom` on-disk bytes + GiST index bytes  
- Exact bytes per unique REAL vs PERSONAL record (including indexes + values share)  
- Hard projections to 1M / 2M / 4.5M / 5M / 10M with index growth + 25% headroom  

**GeoJSON payload samples (API JSON length — NOT database bytes):**

| Category | Sample n | Avg geojson JSON bytes | p50 | p90 |
|---|---:|---:|---:|---:|
| REAL | 400 | ~726 | 367 | 1,764 |
| PERSONAL | 500 | ~443 | 293 | 515 |

These show PERSONAL geometry payloads are often smaller on average, but **DB storage** (TOAST compression, `geom` WKB, indexes, values rows) will differ — Query C is required.

---

## 4. How the final report will be calculated (once SQL returns)

### Bytes per unique REAL / PERSONAL record

For each category:

```
bytes_per_parcel ≈
  (sum pg_column_size(parcel row) for category) / n
  + (allocated share of county_parcels indexes) / n
  + (values_row_bytes attributable to those parcels) / n
  + (change_events share — usually small; optional)
```

Index allocation options (state which was used):
1. **By row count** (simple)  
2. **By geom_bytes share** (fairer for GiST)

### Projections (1M, 2M, 4.5M, 5M, 10M)

Assume mix stays ~current (**~99.4% REAL / ~0.6% PERSONAL**) unless you specify otherwise:

```
base(N) = N_real * bytes_per_real + N_personal * bytes_per_personal
with_headroom(N) = base(N) * 1.25
```

Also report:
- Parcels-only vs parcels + values  
- Index component growth (scale with N; GiST often scales with geometry volume)  
- Note: loading **38 counties / 4.5M** will dominate current ~0.35M footprint (~13× rows before headroom)

### 38-county / 4.5M context vs today

| | Today | Target |
|---|---:|---:|
| Counties with data | 7 (+1 empty) | 38 |
| Parcel rows | ~0.345M | ~4.5M |
| Row scale factor | 1× | ~13.0× |

If bytes/row stays similar, raw CAD data order-of-magnitude is **~13× current CAD footprint**, then **×1.25 headroom**. Exact GB figures wait on Query A+C.

---

## 5. What you need to do (2 minutes)

1. Open https://supabase.com/dashboard/project/ksvllgzsnzyahqsjuove/sql/new  
2. Run **Query A**, **Query B**, **Query C** (and optional D) from `docs/CAD-STORAGE-AUDIT-SQL.md`  
3. Paste the result tables back into chat (or CSV export)  
4. You will get the finished audit: exact sizes, bytes/REAL, bytes/PERSONAL, and projections at 1M / 2M / 4.5M / 5M / 10M including index growth + 25% headroom  

**No production modifications required.**
