# Phase 2 completion

Phase 2 only. Does **not** begin Phase 3 (security, WAF, payments, user wipe, 100K load).

Canonical project: **storyhome-1-eqmg**. Ignore red Vercel on plain `storyhome-1`.

## A. Previous features preserved

Phase 1 Continuum / Story Glass / sound / hidden Following·Messages·Referrals remain. No new Research modes, no Corridors expansion, no deeds, no MLS-as-county-truth, no generative AI, no seller-probability scores, no county expansion.

## B. CAD ops status by county (eqmg 2026-08-27)

| County | Health | Last verified |
|---|---|---|
| Polk | Healthy | 2026-08-25 |
| Angelina | Healthy | 2026-08-25 |
| Trinity | Healthy | 2026-08-25 |
| San Jacinto | Healthy | 2026-08-25 |
| Walker | Healthy | 2026-08-26 |
| Liberty | Source degraded (DB timeout on later attempt) | 2026-08-22 remains |
| Tyler | Source degraded (zip 403) | 2026-08-22 remains |

See `docs/PHASE-2-DATA-TRUTH.md`.

## C. Observation reliability

Readiness now distinguishes building history, no change observed, refresh delayed, source unavailable, partial pull, loading, and request failure. Default freshness window is **72 hours**.

## D. Last-known-good verification

Failed / capped / under-fetched runs do not write `last_success_at`. Absence events only on verified full pulls. Change-event insert skips existing source+prop+field+observed_at.

## E. Farm data-health verification

Farm detail includes `observationReadiness`. Banner above “since last review” when the county is not current/quiet.

## F. Stability index verification

`computeOwnershipChurnSignal` takes optional `countyHealth`. Failed / partial / delayed counties return `index: null`, band `building`. Pure-history path unchanged for existing armor.

## G. Analytics architecture

First-party `track()` → `/api/analytics` → `product_analytics_events`. No second vendor. Non-blocking.

## H. Events implemented

Existing catalog plus: `listing_saved`, `research_mode_changed`, `prospect_created`, `farm_created`, `study_saved`, `my_home_opened`, `seller_portal_opened`.

## I. Events intentionally not tracked

Map pans/zooms, note text, documents, messages, owner names, addresses, raw query text, CAD refresh, analytics itself.

## J. Seller metrics verified

Views and saves are measured (0 = zero captured events). Clicks, repeat viewers, and avg time are unknown (`—`).

## K. Seller claims removed/changed

Unmeasured figures no longer display as 0. Boost copy states it does not guarantee buyers, a sale, or extra views.

## L. Consumer loop improvements

Listing detail has Save to Suite. Marketplace return keeps map center/zoom with filters/boundary. Agent profile + inquire unchanged.

## M. My Home improvements

Copy distinguishes owned-home vault vs saved listings. Link to Suites (`/saved`). Empty state is intentional.

## N–S. Continuum / map / sound / device

No new analytics wrappers that remount the shell. Map persist uses existing nav cache. No sound on CAD refresh, analytics, or background health. New listing Save button uses existing Story Glass `story-press` only (no extra success sound).

## T. Test results

| Script | Result |
|---|---|
| `scripts/test-phase-2-truth.mjs` | PASS |
| `scripts/test-shi-obs-ops.mjs` | PASS |
| `scripts/test-story-analytics-foundation.mjs` | PASS |
| `scripts/test-phase-1-coherence.mjs` | PASS |
| `scripts/test-shi-ownership-churn.mjs` | PASS |
| `scripts/test-story-analytics-destination.mjs` | PASS |
| `scripts/test-shi-farms.mjs` | PASS |
| `scripts/test-shi-county-ops.mjs` | PASS |
| `scripts/test-shi-change-feed.mjs` | PASS |
| `scripts/test-story-glass-g.mjs` | PASS |
| `scripts/test-story-messages-referrals.mjs` | PASS |

## U. Remaining issues

- Liberty timeout and Tyler 403 need source/ops attention — not a code rewrite.
- Ingest still upserts received rows on a partial pull; it does not roll back those rows (no staging tables).
- Seller week counters increment and do not auto-reset.
- `/api/cad/status` remains publicly readable (pre-existing). Phase 3 can tighten.
- No founder analytics dashboard (intentional).
- Phase 3 work not started.
