# Project overview

**Product:** Story Home — East Texas marketplace + Story Pro workspace. Intelligence brand: **Archie’s Intelligence**.

**Live (canonical):** https://www.storyhome.app  
**Ship check:** Vercel `storyhome-1-eqmg`. Ignore red Vercel on plain `storyhome-1`.

**Intended:** Two products in one app. Consumers browse and keep a home. Story Pro researches county tax-roll truth and watches territories. Archie is Pro only.

**Observed (2026-09-15, code + live `/api/cad/status`):** Next.js app on Vercel (`storyhome-1-eqmg`). Supabase Auth + Postgres + RLS + Storage. About 345,000 hosted parcels across Polk, Angelina, Trinity, Tyler, San Jacinto, Liberty, Walker. Montgomery listed, zero rows. Corridors lives inside Research Access and is shipped.

**Tested:** CAD status endpoint returns those counties (live HTTP 200 on 2026-09-15). Product line counts and parcel sums are inventory, not a load test.

**Assumption:** Payments / Story Pro from a card success page are **not** shipped. Boost UI is not a payment system.

## Stack (observed)

- App: Next.js 16 / React / TypeScript / Tailwind (`package.json`)
- Auth/data: Supabase (`src/lib/supabase`, `supabase/migrations`)
- Maps: MapLibre default; optional Mapbox Research chrome (`src/lib/shi/research-map-engine.ts`)
- No generative model in Archie. “Similar” is deterministic rules.

## Who is who (intended vs observed)

| Who | Intended | Observed |
|---|---|---|
| Logged out | Marketplace, listings, legal, seller code | Same |
| Consumer | My Home, settings, inquire | `account_purpose = consumer` |
| Individual Pro | Archie + Story Pro | `individual_pro` or legacy `account_kind` agent/broker |
| Managing broker | Same Pro, plus office | `managing_broker`; office does not lose Pro (`mayUseStoryPro`) |
| Other professional | No Archie | `other_professional` refused by `mayUseStoryPro` |
| Seller | Passcode portal only | Not a full login |

**View as buyer** is clothes only (`localStorage story-home-role`). It is not a second account. **Tested:** `scripts/test-settings-buyer-preview.ts`.

## Pointers

- Talk to the founder: `AGENTS.md`
- Older full brief (partly stale): `docs/SITE-SYSTEM-MAP-FOR-CHATGPT.md`
- Constitution: `docs/STORY-OS-CONSTITUTION.md`
- Current defects and next action: `CURRENT_WORK.md`
