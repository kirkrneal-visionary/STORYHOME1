# Contract — County Stories

**Who / why:** Eligible Story Pro publishers stage a short county Story. The durable object is a Story Slot. Media is temporary.

**Intended:** Waves 1–4 are accepted and hosted. Wave 5 captions / accessibility (`0085`) plus Mux signed HLS provider processing (`0086`) are implemented in-repo and **not hosted**. Public publishing stays disabled. There is no consumer UI, composer, or viewer. Wave 6 is not authorized.

## Waves

| Wave | Status | Job |
|---|---|---|
| 1 | Accepted, hosted `0081` | Story Day, launch-seven activation, publisher eligibility, slots/days schema. No media. |
| 2 | Accepted, hosted `0082` | Private staged video. Playback-ready `valid` only. Storage-first orphan cleanup. |
| 3 | Accepted, hosted `0083` | Atomic publish, one slot per professional per Story Day, one replacement, idempotency, concurrency. Public publish off. |
| 4 | Accepted, hosted `0084` | Policy hide, enforcement events, rolling 7-day strikes, 7-day publishing suspension. Public publish off. |
| 5 | In-repo `0085` + `0086`. Hosted migrations **not** applied. | Captions, professional confirmation, accessible description, Mux signed HLS prepared playback, publish/replace require playback + accessibility. Public publish off. No UI. |
| 6 UI | Not authorized | Professional composer. |

Do not increase the County Stories wave count here. Placement of normalization is decided before UI authorization.

## Feature gate

`county_story_launch.publish_enabled` defaults to **false**. Hosted must stay false until a later launch wave turns it on.

API `/api/county-stories/publish` and `/replace` check the gate before RPC. The RPC also refuses with `FEATURE_DISABLED`. A signed-in professional who finds the route cannot publish.

Isolated tests may set the launch row true. That is not production.

## Publish transaction

`publish_county_story` is the only accept path. Service-role only. One function, one transaction.

Lock order:

1. Professional + Story Day (`pg_advisory_xact_lock`)
2. County + Story Day (row lock on `county_story_days`)
3. Media row, then slot insert + attach + reconstruct `accepted_count`

Allocation: `max(slot_number) + 1` under the county/day lock. Slot numbers stay 1–30. Unique `(county_fips, story_day, slot_number)` and unique `(professional_owner_id, story_day)` are the last line of defense. `accepted_count` is rebuilt from slot rows and is advisory.

Recognized source media (`valid` or `needs_normalization`) may attach only after **prepared provider playback** and accessibility readiness. Source MP4/H.264 probe is not enough. HEVC/MOV may publish after Mux marks signed HLS ready. The source row is never relabeled.

## Eligibility

- Story Pro purpose (`county_story_publisher_eligible` / `mayUseStoryProDb`): consumer and `other_professional` → `STORY_PRO_REQUIRED`
- Verified Texas license plus not inspector/appraiser/lender (`county_story_publish_eligible`): missing license or excluded type → `NOT_ELIGIBLE`
- Null `brokerage_id` does not reject a verified broker
- Optional `listing_id`: listing agent or same-brokerage managing broker, and listing `county_fips` must match

Rules acknowledgment is a required boolean on every publication. Version 1 stores `rules_acknowledged_at`. A replacement is a second publication and stores `replacement_rules_acknowledged_at` without overwriting the original. No fake UI.

Advertising snapshots are copied from verified profile/brokerage rows at accept. Client brokerage strings are ignored.

## Idempotency

Same professional + same key + same request hash returns the stored success.

Only **successful** `PUBLISHED` / `REPLACED` rows are stored on `county_story_publish_intents`. Failures do not leave an intent without a Story.

Same key with different media, county, type, listing, or operation → `IDEMPOTENCY_CONFLICT`.

New key after a successful Story Day slot → `ALREADY_POSTED` (not `COUNTY_FULL`).

## Replacement

`replace_county_story_media` once per slot. Requires its own rules acknowledgment. No capacity, slot number, county, or ownership change. Version 1 `rules_acknowledged_at` is preserved. Original media stays current until the new pointer commits. Then storage-first retire of the superseded object (`county_story_media_mark_retired`). Storage delete failure does not roll the Story back.

There is **no** delete-slot / surrender / reopen-capacity path.

## Capacity read

`county_story_capacity` / `GET /api/county-stories/capacity?county=` returns consumed `N / 30` for the current Story Day. Informational. Hidden Stories still count. Replacement and policy hide do not change it.

## Policy hide and suspension

`hide_county_story_for_policy` is service-role database authority only. Ordinary client JWTs cannot execute it. There is no public or professional HTTP policy-hide route. Command/admin HTTP is deferred until a narrow Story Home admin authorization layer exists. The server-internal `hideCountyStoryForPolicy` helper is for that later integration. The Supabase service-role secret is not an externally supplied moderation credential. An explicit bounded reason is required. There is no `delete_county_story_slot`.

`unauthorized_property` detaches the optional `listing_id` on the slot and stores it as `prior_listing_id` on the enforcement event. Replacement may reactivate the same slot without that listing, or with a newly authorized listing. It cannot restore the detached listing. Hide does not surrender the slot or reduce capacity.

A qualifying hide of accepted media:

1. Sets the slot `state = hidden` (playback stops)
2. Leaves the durable slot and slot number in place
3. Does not decrement capacity
4. Writes one `county_story_enforcement_events` row (unique per slot+media+action and per owner+idempotency key)
5. Counts that professional’s qualifying events in `[occurred_at - 7 days, occurred_at]`
6. On the third event, inserts one `county_story_suspensions` row: `starts_at = occurred_at`, `ends_at = occurred_at + 7 days` (not midnight, not Story Day)
7. After commit, storage-first delete of the temporary video/poster. Cleanup failure keeps the Story hidden and the event recorded

Technical/system failures never write enforcement rows. Publish/replace failures, validation, codec, cleanup, feature-gate, and capacity errors are a separate path.

An unused one-time replacement survives a first or second hide. Successful replace reactivates the same slot (`state = accepted`) and does not erase strikes or return capacity. An active suspension blocks both publish and replace with `POSTING_SUSPENDED` plus `eligible_at`. Server authority only — no client `isSuspended`.

`GET /api/county-stories/suspension` and `county_story_suspension_status` are the composer read foundation: suspended flag, start, end, eligible_at, rolling qualifying count. No admin notes.

## Captions and accessibility (Wave 5)

Captions belong to the media version, not the durable slot. Canonical store is `webvtt_cues` (`start_ms`, `end_ms`, `text`, `index`). Overlapping cues are rejected. Adjacent `end == next start` is allowed.

`county_story_media_is_accessibility_ready` is the publish fact. It requires confirmed synchronized captions plus a professional visual-information confirmation (`spoken_audio` or a supplied description). Client booleans are ignored. Publish/replace fail with `ACCESSIBILITY_NOT_READY` and do not create a slot, move capacity, or write enforcement.

Automatic transcription uses `CountyStoryTranscriptionProvider`. Mux is the first adapter: one English on-demand caption track, imported as Story Home `webvtt_cues` with `auto_ready`. Failure or missing Mux credentials is `PROVIDER_UNAVAILABLE`, not a strike. Manual complete cue sets confirm on save. Auto sets stay `auto_ready` until `county_story_confirm_captions`. Edits use `expected_revision`; a stale revision returns `CAPTION_REVISION_CONFLICT`.

Cue text and the video-specific description delete with superseded, policy-removed, or expired media. Job/revision/confirmation facts may remain. Transcripts are not indexed for search, Archie, SEO, or profile history.

Wave 7 viewer requirements (track only, not this wave): keyboard controls, non-swipe alternatives, screen-reader labels, focus management, visible focus, caption contrast, text scaling, reduced motion, panel pause/resume, return focus after panel close, position such as “3 of 12”.

## Source probe vs prepared playback

Wave 2 source probing still decides invalid / too long / too large / recognized / `needs_normalization`. Those fields stay **source** facts (`container`, `codec_video`, `state`). Mux does not relabel the original file.

Canonical **prepared playback** after Mux:

- Mux asset successfully processed
- signed / private playback id and policy exist (`provider_playback_policy = signed`)
- `playback_kind = hls`
- `playback_ready_at` set
- Story Home may use that asset

This is **not** “a static MP4 rendition exists.” Static MP4 renditions are not requested. `valid` means the source probe passed a launch pair. Publish requires prepared playback + accessibility.

| Source container | Source codec | Source state |
|---|---|---|
| MP4 | `avc1` or `avc3` (H.264 / AVC) | `valid` (still enters Mux) |
| WebM | `vp08` (VP8) or `vp09` (VP9) | `valid` (still enters Mux) |
| WebM | `avc1` (H.264) | `needs_normalization` |
| MP4 or WebM | `av01` (AV1) | `needs_normalization` |
| MP4 or QuickTime/MOV | `hvc1` / `hev1` (HEVC / H.265) | `needs_normalization` |
| QuickTime/MOV | any, including H.264 | `needs_normalization` |

Limits that stay: 80 MiB max staged upload, 30.000 s max duration, 6-hour abandoned staging lifetime. Over-limit or unread files are `invalid`, not `valid`.

## Mux provider (Wave 5)

Mux is County Stories media infrastructure only. Missing `MUX_TOKEN_ID` / `MUX_TOKEN_SECRET` / `MUX_WEBHOOK_SECRET` fails safely as `PROVIDER_UNAVAILABLE`. Never `NEXT_PUBLIC_`. Future viewer tokens also need `MUX_SIGNING_KEY_ID` and `MUX_SIGNING_KEY_PRIVATE_KEY`.

Webhook path `/api/county-stories/webhooks/mux` verifies Mux signatures. Invalid signatures do nothing. Events may update provider/caption processing only. They cannot publish, hide, strike, allocate, change ownership, or bypass accessibility. Replay is idempotent.

Deletion order: Story Home playback authority off → Mux asset delete → Supabase source delete → caption/accessibility purge. Failed Mux delete is retryable and must not mark provider content deleted. Abandoned 6-hour staging removes Mux assets too.

## Cleanup

Eligible unpublished media (no `slot_id`, object not yet gone, expired), plus superseded and policy-removed media:

1. Turn off Story Home playback authority
2. Delete the Mux provider asset
3. Only after Mux is gone (204/404), delete Storage objects on `county-story-media`
4. Only after Storage succeeds, set `state = deleted` and `media_deleted_at` and purge captions
5. If Mux delete fails, keep the local hide/expiry and record `provider_delete_error` for retry. Do not mark provider deleted.

Unpublished staged media is excluded when `slot_id` is set. Superseded replacement media uses `county_story_media_list_superseded` + `county_story_media_mark_retired` after the new pointer commits. Policy-removed media on a hidden slot uses `county_story_media_list_policy_removed` + `county_story_media_mark_policy_deleted`. Cleanup failure does not restore playback.

## Required pre-Wave-6 infrastructure gate

Mux signed HLS processing is implemented in-repo (`0086`). Hosted Mux credentials and hosted `0085` / `0086` are not applied. Wave 6 composer UI is still not authorized.

A normal professional recording on an iPhone should enter Mux automatically after source probe. The professional should not convert codecs by hand.

## Related

- Not Living Marks, Home Docs, or SHI Studies. Dedicated private bucket `county-story-media`.
- Not P1C geography. Launch-seven FIPS only until a later wave says otherwise.
- Not Marketplace, Agent World, Homepage, or County page UI.
- Tests: `npm run test:county-stories-w1`, `npm run test:county-stories-w2`, `npm run test:county-stories-w3`, `npm run test:county-stories-w4`, `npm run test:county-stories-w5`, `npm run test:county-stories-w5-mux`.
