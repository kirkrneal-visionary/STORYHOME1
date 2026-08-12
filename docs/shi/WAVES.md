# Archie's Intelligence — Build Waves

**Product name:** Archie's Intelligence (menu: logo + **INTELLIGENCE**)  
**Never show “SHI” in the UI** — internal API prefixes only.  
**Home:** Story Pro → Archie's Intelligence · deep link `/portal/intelligence`

## Boundary

| Surface | Role |
|---|---|
| **Listing upload CAD** | MLS-limited listing form only |
| **Archie's Intelligence** | Full Property Intelligence for agents |

## Current: ARCHIE-CHANGE-FEED (4.3 full)

| Front-end | Back-end |
|---|---|
| **County observation feed** on Research + Farms | Migration **0028** `county_parcels.absent_at` |
| Filter by field · open property into Research | Ingest diffs owner + situs + value + acreage |
| Property history includes presence / expanded fields | Full-pull absence marking (capped) + `GET /api/shi/changes` |

**Honesty:** Not deed history. Not a sale prediction. Events are what Archie saw change between CAD pulls.

### Apply 0028 (click path)
1. [Supabase SQL editor](https://supabase.com/dashboard/project/ksvllgzsnzyahqsjuove/sql/new)
2. Paste only this (no giant UPDATE):

```sql
alter table public.county_parcels
  add column if not exists absent_at timestamptz;

create index if not exists county_parcels_source_absent_idx
  on public.county_parcels (source, absent_at)
  where absent_at is not null;
```

3. Run
4. After deploy, full refresh so absences can mark: `node scripts/ingest-cad.mjs --source polk_cad --all`

## Done
- Foundation OS (Research · Prospects · Farms · Discover · N3 shell)
- Farms since-last-review (4.1)
- Ownership Stability Index + CAD observation events (4.2 / thin 4.3 · migration **0027**)

## Next (separate)
- **ARCHIE-TRUTH-MARKET** — broader truth lane + market projection scenarios  

## Out of scope
- Fake seller-probability theater / AVM guarantees  
- Phone/email scraping · bulk county download plugins  
