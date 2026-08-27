# Seller metric definitions

A seller number without a definition should not exist.

Capture path: `POST /api/listing-activity` (service role). Client helper: `reportListingActivity()` — never throws.

## Views

| Field | Value |
|---|---|
| NAME | Views |
| DEFINITION | A qualified listing-detail open. Counted once per visitor per UTC day per listing. |
| SOURCE EVENT | `listing_analytics_events.event_type = 'view'` written by `ListingViewBeacon` on `/marketplace/[id]` |
| COUNTING METHOD | Increment `listing_analytics.views` and `views_this_week` when the event is new |
| DEDUPLICATION | SHA-256 of listing + kind + UTC day + IP + user-agent, stored as `viewer_fingerprint` |
| PERSON / SESSION / EVENT | Daily visitor-hash (not a logged-in person) |
| BOT CONSIDERATION | Obvious bot / health-check user-agents are skipped. Not perfect human detection. Compatible with later Phase 3 filtering. |
| DATABASE | `listing_analytics.views`, `listing_analytics_events` |
| ZERO vs UNKNOWN | **0** means zero captured views after this path shipped. Views are **measured**. |
| STATUS | Measured |
| KNOWN LIMITATIONS | Reloads the same day do not increment. Shared IP/NAT can under-count. No dwell-time gate. Week counters are increment-only (not a rolling 7-day window reset). |

## Saves

| Field | Value |
|---|---|
| NAME | Saves |
| DEFINITION | Buyer added this listing to a Suite (album). |
| SOURCE EVENT | `listing_analytics_events.event_type = 'save'` from `SaveToSuiteModal` after add |
| COUNTING METHOD | Increment `listing_analytics.saves` and `saves_this_week` when the daily visitor-hash is new |
| DEDUPLICATION | Same daily visitor-hash as views, kind=`save` |
| PERSON / SESSION / EVENT | Daily visitor-hash |
| BOT CONSIDERATION | Same UA skip as views |
| DATABASE | `listing_analytics.saves`, `listing_analytics_events` |
| ZERO vs UNKNOWN | **0** means zero captured suite-saves. Saves are **measured**. |
| STATUS | Measured |
| KNOWN LIMITATIONS | Removing a listing from a Suite does not decrement. Creating a new suite and adding counts as a save. Product analytics also fires `listing_saved` (separate table). |

## Clicks

| Field | Value |
|---|---|
| NAME | Clicks |
| DEFINITION | Not defined — card/gallery click capture is not wired. |
| SOURCE EVENT | none |
| COUNTING METHOD | none |
| DEDUPLICATION | n/a |
| STATUS | **Unknown** — UI shows `—`, never `0` |
| KNOWN LIMITATIONS | A `clicks` column exists on `listing_analytics` from init schema. Phase 2 does not write it and does not display the column as a real number. |

## Repeat viewers

| Field | Value |
|---|---|
| NAME | Repeat viewers |
| DEFINITION | Not defined — return-visitor identity is not wired. |
| SOURCE EVENT | none |
| STATUS | **Unknown** — UI shows `—` |
| KNOWN LIMITATIONS | `repeat_viewers` column exists; unused. |

## Avg time viewed

| Field | Value |
|---|---|
| NAME | Avg time viewed |
| DEFINITION | Not defined — no dwell timer. |
| SOURCE EVENT | none |
| STATUS | **Unknown** — UI shows `—` |
| KNOWN LIMITATIONS | `avg_time_viewed_seconds` column exists; unused. |

## Boost

Boost is a **placement / county-slot prototype**. It is not paid. It does not guarantee buyers, a sale, leads, or extra views.

Language in the seller portal: boost changes placement when later paid; it does not guarantee buyers, a sale, or extra views.

## What we removed / changed

| Before | After |
|---|---|
| Missing analytics row mapped to all zeros | Views/saves measured (0 = zero events). Clicks / repeat / avg time **unknown** (`—`) |
| “Sample figures… not live marketplace traffic” as the only sentence | Kept that phrase for unmeasured figures. Views now defined as once-per-visitor-per-day listing opens |
| Implied clicks / time were real | Labeled **Not measured yet** |

## Reproduction

1. Open a listing as a non-bot browser → one `view` event that UTC day → Views +1.
2. Reload same listing same day → no increment (`deduped`).
3. Add listing to a Suite → one `save` event that UTC day → Saves +1.
4. Seller portal shows those integers for views/saves and `—` for clicks / repeat / time.
