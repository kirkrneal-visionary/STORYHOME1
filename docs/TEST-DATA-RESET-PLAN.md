# Test-data reset plan

**DO NOT DELETE anything until the founder approves this plan and a backup exists.**

This file is the plan. `docs/TEST-DATA-RESET-RESULT.md` is written only after an approved run.

Canonical project: **storyhome-1-eqmg**.

---

## Counts (founder SQL 2026-09-01)

Read-only inventory pasted by the founder. Wipe **executed** 2026-09-01. After: 0 users, 0 listings, 345,387 parcels. See `docs/TEST-DATA-RESET-RESULT.md`.

The agent cannot see production Auth or Storage from this checkout. The query below is what filled the table. Do not run deletes.

```sql
-- Read-only inventory
select 'auth.users' as item, count(*) from auth.users
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
union all select 'suites', count(*) from public.suites
union all select 'follows', count(*) from public.follows
union all select 'inquiries', count(*) from public.inquiries
union all select 'listing_comments', count(*) from public.listing_comments
union all select 'saved_searches', count(*) from public.saved_searches
union all select 'product_analytics_events', count(*) from public.product_analytics_events
union all select 'county_parcels', count(*) from public.county_parcels;
```

| Item | Count |
|---|---|
| Auth users | **23** |
| Consumer profiles | **10** |
| Story Pro (agent) | **10** |
| Brokers | **3** |
| Prospects | **4** |
| Farms | **6** |
| Studies / frames | **3 / 3** |
| My Home | **7** |
| CRM buyers / sellers | **0 / 0** |
| Messages | **0** |
| Referrals | **0** |
| Inquiries | **1** |
| Product analytics events | **1,904** |
| `county_parcels` (must preserve) | **345,387** |
| Storage objects | UNKNOWN — Storage UI |
| Listings classified TEST | UNKNOWN |
| Listings classified REAL | UNKNOWN |
| Listings UNKNOWN | **1** — do not auto-wipe |

---

## MUST NOT be deleted

- `county_parcels`, `county_parcel_values`, `county_parcel_change_events`
- `cad_county_status`, CAD ingest/observation history needed for truth
- `corridor_road_segments`, `corridor_traffic_observations`
- `clerk_deed_transfers`, `clerk_county_coverage` (system index)
- Parcel MVT functions, DEM/imagery caches, tile caches
- Flood / PUCT / NWI / TIGER / TxDOT system facts
- Migrations, source registries, boost_tiers (catalog)
- Brand / system storage that is not user-owned

---

## MUST be deleted after approval (user-generated)

Auth users and their owned rows, unless the founder names an account to keep:

- `profiles` and Auth users
- Prospects, notes, farms, baselines, study folders/frames, map memory
- My Home + documents + storage objects under `home-docs/{user_id}`
- CRM buyers, seller_clients, activities, campaigns
- Community posts/threads/questions/answers created by those users
- Messages, referrals, inquiries, follows, suites
- Seller portal sessions / listing_analytics_events for test listings
- Product analytics events (optional — noisy test traffic)
- `living-marks` objects under test user folders
- `shi-studies` objects under test user folders

---

## Listings — do not auto-wipe

Classify every listing as TEST / SYSTEM / REAL / UNKNOWN.

**UNKNOWN must not be silently deleted.** Founder approves the list.

---

## Order (after backup + approval)

1. Backup / snapshot timestamp recorded  
2. Inventory accounts + owned rows/files  
3. Optionally freeze public signup  
4. Delete dependent user rows (children first)  
5. Delete storage objects for those users  
6. Delete profiles  
7. Delete Auth users (admin API — not profile-only)  
8. Verify zero leftover test identities  
9. Confirm county_parcels count unchanged  
10. Write `TEST-DATA-RESET-RESULT.md`  
11. Re-run RLS / login / marketplace / Research smoke tests  

---

## Rollback

Restore the Supabase backup taken in step 1. Do not “undo” from git. Deleting a commit does not restore a database.

---

## Signup after reset

Recommendation: keep public signup **gated** until payment + WAF LOG period are done. Not a permanent business decision — founder approves.
