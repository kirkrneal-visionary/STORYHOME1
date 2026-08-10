# Story Home

*Every home has a story.*

Premium two-sided real estate marketplace and professional network.

## Brand system

| Token | Value | Use |
|---|---|---|
| Navy | `#0E1E38` | Headers, nav, professional cool base |
| Gold | `#F0B93B` | Consumer accent, CTAs, unread dots |
| Teal | `#123F38` | Professional accent, Following/Claimed |
| Paper | `#F7F4EC` | Consumer page background |
| Ink | `#20242C` | Body text |
| Hairline | `rgba(21,42,78,0.14)` | Borders |

**Typography:** Fraunces (display) · Inter (UI) · IBM Plex Mono (data/labels)

**Wayfinding:** Consumer = warm Paper + Gold · Professional = cool Navy + Teal

## App routes

- `/marketplace` — browse + filters + listing cards
- `/marketplace/[id]` — listing detail
- `/agents/[id]` — public agent profile
- `/saved` · `/following` — consumer collections
- `/network` — professional directory
- `/referrals` — referral board
- `/messages` — shared inbox
- `/profile` — account shell
- `/seller` — seller client portal access (code entry)
- `/seller/portal/[code]` — listing analytics + boost purchase UI

### Seller boost inventory (per county)

| Tier | Price | Slots / county |
|---|---|---|
| Starter | $25/mo | 3 |
| Growth | $50/mo | 3 |
| Max | $100/mo | 1 |

County capacity is enforced in SQL via `assert_boost_slot_available()` once MLS county mapping is live. Demo codes: `WILLOW-875`, `RIDGE-1245`.

## Getting started

```bash
npm install
npm run dev
```

## Backend (Supabase)

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example`) to switch from demo mode to real Supabase Auth + Postgres. With those unset, the app runs fully in local demo mode.

Apply the database in a Supabase project (SQL editor or `supabase db push`):

1. `supabase/migrations/0001_init.sql` — schema, helper functions, and the auth trigger that creates a `profiles` row for each new user.
2. `supabase/migrations/0002_rls.sql` — Row Level Security policies.
3. `supabase/migrations/0003_homes.sql` — consumer "My Home" vault (homes, records, expenses, documents, access grants) + consent RLS.
4. `supabase/migrations/0004_storage.sql` — private Storage bucket for home documents.
5. Continue through `0020_cad_l4.sql` for Wave L4 CAD columns + 72h refresh status.

RLS is verified against plain Postgres via `supabase/test/` (shim + scenario + assertions).

## Wave L4 — CAD ingestion (7 launch counties)

Ingest **Real + Personal** (mobile homes) property only from county appraisal districts. Mineral / auto / other classes are excluded. Mobile-home serial numbers parsed from CAD legal descriptions populate MLS listing fields. Each county refreshes on a **72-hour** cycle.

| County | Mode | Source |
|---|---|---|
| Polk | ArcGIS | BIS PolkCADWebService |
| Angelina | ArcGIS | AngelinaParcels FeatureServer |
| Trinity | ArcGIS | BIS TrinityCADWebService |
| San Jacinto | ArcGIS | BIS SanJacintoCADWebService |
| Liberty | ArcGIS | BIS LibertyCADWebService |
| Walker | ArcGIS | BIS WalkerCADWebService |
| Tyler | File | Official shapefile download (geometry + prop_id; agent fills detail) |

```bash
npm run cad:list
npm run cad:ingest -- --source polk_cad --all
npm run cad:ingest -- --source trinity_cad --all
npm run cad:ingest -- --source tyler_cad --download
npm run cad:refresh          # re-ingest counties older than 72h (parallel)
```

Live upserts require `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. A GitHub Action (`.github/workflows/cad-refresh.yml`) runs the refresh daily; configure those secrets on the repo.
