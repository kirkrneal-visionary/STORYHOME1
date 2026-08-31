# Production reset plan

**DO NOT DELETE anything until the founder replies APPROVE RESET and a backup exists.**

This is the plan. Nothing in this file is an instruction to wipe production.

Canonical project: **storyhome-1-eqmg**.  
Related: `docs/TEST-DATA-RESET-PLAN.md` (same gate).

Outside-created accounts are **test accounts** unless the founder names one to keep.

---

## Before counts (2026-08-31)

The agent cannot see Auth or Storage. Public CAD status is the only live count we trust without SQL.

| Item | Count | Source |
|---|---|---|
| Auth users | **UNKNOWN** | Needs SQL |
| Consumer profiles | **UNKNOWN** | Needs SQL |
| Story Pro (agent) | **UNKNOWN** | Needs SQL |
| Brokers | **UNKNOWN** | Needs SQL |
| Prospects | **UNKNOWN** | Needs SQL |
| Farms | **UNKNOWN** | Needs SQL |
| Studies / frames | **UNKNOWN** | Needs SQL |
| My Home / documents | **UNKNOWN** | Needs SQL |
| CRM buyers / sellers | **UNKNOWN** | Needs SQL |
| Community / messages / referrals | **UNKNOWN** | Needs SQL |
| Seller sessions / analytics events | **UNKNOWN** | Needs SQL |
| Storage objects | **UNKNOWN** | Storage UI |
| Listings TEST | **UNKNOWN** | Founder classifies |
| Listings REAL / intended | **UNKNOWN** | Founder classifies |
| Listings UNKNOWN | **All listings until classified** | Do not auto-wipe |
| `county_parcels` (must preserve) | **See CAD table below** | `/api/cad/status` |

### Platform truth to preserve (eqmg 2026-08-31)

| County | DB parcels | Last verified |
|---|---|---|
| Polk | 57,578 | 2026-08-28 |
| Angelina | 54,251 | 2026-08-28 |
| Trinity | 24,593 | 2026-08-28 |
| Tyler | 23,508 | 2026-08-28 |
| San Jacinto | 35,158 | 2026-08-28 |
| Liberty | 114,678 | 2026-08-29 |
| Walker | 35,607 | 2026-08-30 |

Also preserve: CAD observation history, MVT, traffic/AADT, TxDOT, flood, PUCT, wetlands, TIGER, LiDAR/DEM, imagery cache, source registries, evidence definitions, migrations, boost catalog.

---

## Read-only inventory SQL (fill UNKNOWN)

Paste in the Supabase SQL editor. Do **not** run deletes.

```sql
select 'auth.users' as item, count(*)::bigint as n from auth.users
union all select 'profiles', count(*) from public.profiles
union all select 'profiles_consumer', count(*) from public.profiles where account_kind = 'consumer'
union all select 'profiles_agent', count(*) from public.profiles where account_kind = 'agent'
union all select 'profiles_broker', count(*) from public.profiles where account_kind = 'broker'
union all select 'listings', count(*) from public.listings
union all select 'shi_prospects', count(*) from public.shi_prospects
union all select 'shi_farms', count(*) from public.shi_farms
union all select 'shi_study_folders', count(*) from public.shi_study_folders
union all select 'shi_market_frames', count(*) from public.shi_market_frames
union all select 'homes', count(*) from public.homes
union all select 'messages', count(*) from public.messages
union all select 'referrals', count(*) from public.referrals
union all select 'buyers', count(*) from public.buyers
union all select 'seller_clients', count(*) from public.seller_clients
union all select 'suites', count(*) from public.suites
union all select 'follows', count(*) from public.follows
union all select 'inquiries', count(*) from public.inquiries
union all select 'listing_analytics_events', count(*) from public.listing_analytics_events
union all select 'product_analytics_events', count(*) from public.product_analytics_events
union all select 'county_parcels', count(*) from public.county_parcels;
```

Listing classification (do not delete UNKNOWN):

```sql
select id, address_serif, city, status, agent_id, created_at
from public.listings
order by created_at;
```

---

## Proposed for deletion (after approval)

All Auth users and owned rows **except** accounts the founder names to keep:

- profiles, suites, follows, My Home + `home-docs/{user_id}`
- Prospects, notes, Farms, baselines, study folders/frames, map memory
- CRM buyers, seller_clients, activities
- Community content created by those users
- Messages, referrals, inquiries
- Seller analytics events for **TEST** listings only
- `shi-studies` / `living-marks` objects under test user folders
- Product analytics (optional — noisy test traffic)

Deleting `auth.users` does **not** automatically clean every table. Children first.

---

## Must not be deleted

CAD parcels/geometry, county normalization, MVT, ingest/observation history, traffic, TxDOT, flood, PUCT, wetlands, TIGER, LiDAR/DEM, imagery infrastructure, system config, evidence definitions, migrations, algorithms.

**UNKNOWN listings require review. Never silently destroy them.**

---

## Order (only after backup + APPROVE RESET)

1. Record backup timestamp  
2. Freeze signup if founder wants (temporary, not a business policy)  
3. Delete dependent user rows  
4. Delete test storage objects  
5. Delete profiles  
6. Delete Auth users (admin API)  
7. Invalidate sessions  
8. Confirm `county_parcels` counts unchanged vs the table above  
9. Write `TEST-DATA-RESET-RESULT.md`  
10. Smoke: marketplace, login, Research, empty states  

## Rollback

Restore the Supabase backup from step 1. Git cannot roll back the database.

## After reset

Empty production must look intentional: 0 consumers, 0 Pro users, 0 Prospects/Farms/Studies/CRM. Do not seed fake people.

Signup gate after reset is a founder decision.

## Human gate

STOP. Present counts + keep-list + this plan.  
Do not execute until the founder explicitly approves.
