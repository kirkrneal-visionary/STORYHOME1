# Archie's Intelligence — Build Waves

**Product name:** Archie's Intelligence (menu: logo + **INTELLIGENCE**)  
**Never show “SHI” in the UI** — internal API prefixes only.  
**Home:** Story Pro → Archie's Intelligence · deep link `/portal/intelligence`

## Boundary

| Surface | Role |
|---|---|
| **Listing upload CAD** | MLS-limited listing form only |
| **Archie's Intelligence** | Full Property Intelligence for agents |

## Two big waves (this pass)

### 1 · ARCHIE-LOOKALIKE-CONTEXT ✅
Lookalike CAD band + assumption ranges on carry math.

### 2 · ARCHIE-OBS-OPS (current)
Observation health — empty feed honesty, readiness for **0027/0028**, county pull status, absence chip.

#### Ops SQL (if feed still empty / Building history)
1. [SQL editor](https://supabase.com/dashboard/project/ksvllgzsnzyahqsjuove/sql/new)
2. Confirm **0027** events table + **0028** `absent_at` (see migration files)
3. Optional batched `first_seen_at` backfill if still null (repeat until 0 rows):

```sql
UPDATE public.county_parcels p
SET
  first_seen_at = coalesce(p.ingested_at, now()),
  last_seen_at = coalesce(p.last_seen_at, p.ingested_at, now())
FROM (
  SELECT id FROM public.county_parcels
  WHERE first_seen_at IS NULL
  LIMIT 5000
) s
WHERE p.id = s.id;
```

4. Full refresh: `node scripts/ingest-cad.mjs --source polk_cad --all`

## Done
- Foundation OS · Farms · Discover · N3
- Ownership Stability · County change feed
- CAD evidence · market context
- Lookalike CAD band · assumption ranges

## Out of scope forever
- Fake seller-probability theater / AVM guarantees  
- Phone/email scraping · bulk county download plugins  
