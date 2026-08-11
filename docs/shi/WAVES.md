# Archie's Intelligence — Build Waves

**Product name:** Archie's Intelligence (menu: logo + **INTELLIGENCE**)  
**Home:** Story Pro → Archie's Intelligence · deep link `/portal/intelligence`  
**Positioning:** Research your market. Public records. Professional workflow.  
**Code paths:** APIs/folders still use `shi` prefixes for stability.

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

### SHI-1 — Search · Map · Property record ✅

| Front-end | Back-end |
|---|---|
| Search + filters (county-first, real fields) | `GET /api/shi/search` + `searchProperties` |
| MapLibre parcel map (MVT viewport tiles) | `GET /api/shi/property` + `getProperty` |
| Property Intelligence panel + results | Reuse `/api/parcels/{z}/{x}/{y}` (no full download) |
| County labels + freshness chips | `GET /api/shi/freshness` (pro-safe DTO) |

**Index note:** fuzzy owner/address search uses `ILIKE`. Prefer county-scoped search. Apply migration `0024_shi_backlog_harden.sql` for `pg_trgm` GIN + centroid indexes.

### SHI-2 — Relationships · Area · History ✅

### SHI-2.5 — Market Frames · Analyzer · Study folders ✅

| Front-end | Back-end |
|---|---|
| Multi-box/radius/freehand frames on map | Hard caps (frames, area size, parcels) |
| On-demand analyze → parcel values + area estimate | `POST /api/shi/area` county-locked |
| Study folders (square + acronym) by county | `shi_study_folders` / frames / snapshots + RLS |
| Save geometry + metrics + Map Memory snap | `shi-studies` private storage |
| Reopen saved frames | Never writes CAD; no infinite jobs |

### SHI-2.6 — Research shell · Study Vault · Draw OS ✅

### SHI-2.7 — Analyzer harden ✅

| Front-end | Back-end |
|---|---|
| Frame county locked at draw time | Server recomputes analysis on save |
| Save form clears stale folders + shows errors | Resave can move frame to another folder |
| Honest capped-analysis messaging | Owner-match triggers + indexes (`0024`) |

### SHI-2.8 — Research perfect ✅

| Front-end | Back-end |
|---|---|
| Keep drafts when create rejected · live size warns | Honest area boundary copy |
| Pan/Esc · county guard before draw | No new migration |
| Remove/reopen/select trust · vault dialog errors · analyze loading | — |

### SHI-2 note (superseded analyzer)

| Front-end | Back-end |
|---|---|
| Owner relationships panel (EXACT / POSSIBLE) | `GET /api/shi/owner-matches` |
| Multi-tract map (gold EXACT / teal POSSIBLE) | Geometry on match rows (capped) |
| Area draw (radius / box) + metrics | `POST /api/shi/area` (centroid-in-boundary) |
| Observed CAD history timeline | Values + ingest only — no deed history |

**History gap:** No ownership-transfer event table yet. UI states this clearly. True change intel lands with farms (SHI-4).

### SHI-3 — Prospects · Notes · CRM convert ✅

| Front-end | Back-end |
|---|---|
| Save Prospect · Prospects module · dossier · notes | `shi_prospects` / `shi_prospect_notes` + RLS (`0025`) |
| Create Seller Lead (prefill; no invented contact) | convert → `seller_clients`; never mutate CAD |

See `docs/shi/SHI-3-PLAN.md`.

### SHI-4 — Farms · Change intelligence ✅

| Front-end | Back-end |
|---|---|
| Save as Farm · Farms module · change feed | `shi_farms` / `shi_farm_baselines` + RLS (`0026`) |
| Since your last review (honest baseline diff) | Live `analyzeArea` vs review baseline — not deed dates |

See `docs/shi/SHI-4-PLAN.md`.

### SHI-5 — Find Similar · Portfolio polish (current)

| Front-end | Back-end |
|---|---|
| Find Similar + explainable reasons · Portfolio panel | `POST /api/shi/similar` · `GET /api/shi/portfolio` |
| Exact vs possible owner lists never silently merged | No new migration — existing parcel indexes |

See `docs/shi/SHI-5-PLAN.md`.

## Out of scope for SHI UI waves

- Fake AI / AVM / seller-probability scores
- Plugins / bulk county download
- Phone/email scraping
- CAD ingest reliability hardening (safe replace, locks) — separate ops track

## Suggested branch naming

`cursor/shi-0-shell-6cf4` · `cursor/shi-1-search-map-6cf4` · … through `shi-5-…`
