# Story Home Intelligence (SHI) — Build Waves

**Product name:** Story Home Intelligence (menu: **SHI**)  
**Home:** Story Pro → SHI · deep link `/portal/intelligence`  
**Positioning:** Research your market. Public records. Professional workflow.

## Boundary (do not blur)

| Surface | Role |
|---|---|
| **Listing upload CAD** | MLS-limited: tract search + pin-drop for the listing form only |
| **Story Home Intelligence** | Full Property Intelligence product for agents |

Do **not** turn listing CAD into market research. Do **not** show internal source keys (`polk_cad`) in UI — use “Polk County”.

## Wave map (front-end + back-end tied)

Source of truth in code: `src/lib/shi/waves.ts`

### SHI-0 — Shell & brand entry ✅

| Front-end | Back-end |
|---|---|
| Story Pro tab **SHI** + brandable `ShiIcon` | Reuse pro gate on `/portal` |
| Property Intelligence page shell | No ingest changes |
| Deep link `/portal/intelligence` | — |

### SHI-1 — Search · Map · Property record ✅ (current)

| Front-end | Back-end |
|---|---|
| Search + filters (county-first, real fields) | `GET /api/shi/search` + `searchProperties` |
| MapLibre parcel map (MVT viewport tiles) | `GET /api/shi/property` + `getProperty` |
| Property Intelligence panel + results | Reuse `/api/parcels/{z}/{x}/{y}` (no full download) |
| County labels + freshness chips | `GET /api/shi/freshness` (pro-safe DTO) |

**Index note:** fuzzy owner/address search uses `ILIKE`. Prefer county-scoped search. Recommended: `pg_trgm` GIN on `owner_name`, `situs_address`, `legal_description`.

### SHI-2 — Relationships · Area · History

| Front-end | Back-end |
|---|---|
| Owner matches (EXACT / POSSIBLE) | Owner match service + confidence tiers |
| Multi-tract viz · area analyze | Area aggregation queries |
| Observed CAD history timeline | History events (or document need) |

### SHI-3 — Prospects · Notes · CRM convert

| Front-end | Back-end |
|---|---|
| Add to Prospects · lists · statuses · notes | `agent_prospects` / lists / notes + RLS |
| Create Seller Lead (prefill) | CRM convert API; never mutate CAD |

### SHI-4 — Farms · Change intelligence

| Front-end | Back-end |
|---|---|
| Save farm · farm detail | `saved_farms` + RLS |
| Since last review deltas | Delta vs 72h refresh / last_seen |

### SHI-5 — Find Similar · Portfolio polish

| Front-end | Back-end |
|---|---|
| Find Similar (explainable) | Deterministic similarity query |
| Owner portfolio map | Portfolio for EXACT matches only |

## Out of scope for SHI UI waves

- Fake AI / AVM / seller-probability scores
- Plugins / bulk county download
- Phone/email scraping
- CAD ingest reliability hardening (safe replace, locks) — separate ops track

## Suggested branch naming

`cursor/shi-0-shell-6cf4` · `cursor/shi-1-search-map-6cf4` · … through `shi-5-…`
