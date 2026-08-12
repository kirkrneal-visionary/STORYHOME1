# Archie's Intelligence — Build Waves

**Product name:** Archie's Intelligence (menu: logo + **INTELLIGENCE**)  
**Never show “SHI” in the UI** — internal API prefixes only.  
**Home:** Story Pro → Archie's Intelligence · deep link `/portal/intelligence`

## Boundary

| Surface | Role |
|---|---|
| **Listing upload CAD** | MLS-limited listing form only |
| **Archie's Intelligence** | Full Property Intelligence for agents |

## Current: ARCHIE-OWNER-CHURN (4.2 + thin 4.3)

| Front-end | Back-end |
|---|---|
| **Ownership Stability Index** (300–850, explainable) on property record | Migration **0027** `first_seen_at` / `last_seen_at` + `county_parcel_change_events` |
| Observed history includes owner-field changes between CAD pulls | Ingest compares owner id/name before upsert |

**Honesty:** Not a credit score. Not a prediction the owner will sell. Not deed history. Index builds as CAD refreshes run after 0027.

### Apply 0027 (click path)
1. [Supabase SQL editor](https://supabase.com/dashboard/project/ksvllgzsnzyahqsjuove/sql/new)
2. Paste `supabase/migrations/0027_cad_observation_events.sql` → Run
3. Refresh CAD so diffs can start: `node scripts/ingest-cad.mjs --source polk_cad --all`

## Done
- Foundation OS (Research · Prospects · Farms · Discover · N3 shell)
- Farms since-last-review (4.1)

## Next (separate)
- **4.3 full** — county change feed · absence on full pulls · more fields  
- **ARCHIE-TRUTH-MARKET** — broader truth lane + market projection scenarios  

## Out of scope
- Fake seller-probability theater / AVM guarantees  
- Phone/email scraping · bulk county download plugins  
