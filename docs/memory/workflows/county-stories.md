# Contract — County Stories

**Who / why:** Eligible Story Pro publishers stage a short county Story. The durable object is a Story Slot. Media is temporary.

**Intended:** Waves 1–3 exist in the repo. Wave 1 and Wave 2 are accepted and hosted. Wave 3 publish/replace is implemented and **not hosted**. Public publishing stays disabled. There is no consumer UI, composer, viewer, captions, strikes, or share URLs. Wave 4 is not authorized.

## Waves

| Wave | Status | Job |
|---|---|---|
| 1 | Accepted, hosted `0081` | Story Day, launch-seven activation, publisher eligibility, slots/days schema. No media. |
| 2 | Accepted, hosted `0082` | Private staged video. Playback-ready `valid` only. Storage-first orphan cleanup. |
| 3 | In-repo `0083`. Hosted migration **not** applied. | Atomic publish, one slot per professional per Story Day, one replacement, idempotency, concurrency. Public publish off. |
| 4 | Not authorized | Policy hide/removal, strikes, 7-day suspension. |
| 6 UI | Not authorized | Professional composer. Blocked on the normalization gate below. |

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

Only `state = valid` media may attach. `needs_normalization` (HEVC/MOV/AV1) is refused.

## Eligibility

- Story Pro purpose (`county_story_publisher_eligible` / `mayUseStoryProDb`): consumer and `other_professional` → `STORY_PRO_REQUIRED`
- Verified Texas license plus not inspector/appraiser/lender (`county_story_publish_eligible`): missing license or excluded type → `NOT_ELIGIBLE`
- Null `brokerage_id` does not reject a verified broker
- Optional `listing_id`: listing agent or same-brokerage managing broker, and listing `county_fips` must match

Rules acknowledgment is a required boolean on publish. The accepted slot stores `rules_acknowledged_at`. No fake UI.

Advertising snapshots are copied from verified profile/brokerage rows at accept. Client brokerage strings are ignored.

## Idempotency

Same professional + same key + same request hash returns the stored success.

Only **successful** `PUBLISHED` / `REPLACED` rows are stored on `county_story_publish_intents`. Failures do not leave an intent without a Story.

Same key with different media, county, type, listing, or operation → `IDEMPOTENCY_CONFLICT`.

New key after a successful Story Day slot → `ALREADY_POSTED` (not `COUNTY_FULL`).

## Replacement

`replace_county_story_media` once per slot. No capacity, slot number, county, or ownership change. Original media stays current until the new pointer commits. Then storage-first retire of the superseded object (`county_story_media_mark_retired`). Storage delete failure does not roll the Story back.

There is **no** delete-slot / surrender / reopen-capacity path.

## Capacity read

`county_story_capacity` / `GET /api/county-stories/capacity?county=` returns consumed `N / 30` for the current Story Day. Informational. Hidden Stories still count later. Replacement does not change it.

## Playback-ready (`state = valid`)

Wave 3 may consume only `valid` media. Never treat `needs_normalization` as publishable.

| Container | Codec | Result |
|---|---|---|
| MP4 | `avc1` or `avc3` (H.264 / AVC) | Playback-ready |
| WebM | `vp08` (VP8) or `vp09` (VP9) | Playback-ready |
| WebM | `avc1` (H.264) | `needs_normalization` |
| MP4 or WebM | `av01` (AV1) | `needs_normalization` |
| MP4 or QuickTime/MOV | `hvc1` / `hev1` (HEVC / H.265) | `needs_normalization` |
| QuickTime/MOV | any, including H.264 | `needs_normalization` |

`valid` means launch playback-ready for the Story Home web viewer. Codec is never approved apart from its container. Filename extensions and client claims are not authority.

Limits that stay: 80 MiB max staged upload, 30.000 s max duration, 6-hour abandoned staging lifetime. Over-limit or unread files are `invalid`, not `valid`.

## Cleanup

Eligible unpublished media (no `slot_id`, object not yet gone, expired):

1. Attempt Storage object delete on `county-story-media`
2. Only after that succeeds, set `state = deleted` and `media_deleted_at`
3. If Storage delete fails, keep the row and record `cleanup_error` for a safe retry

Slot-attached / current Story media is excluded. Superseded replacement media uses `county_story_media_list_superseded` + `county_story_media_mark_retired` after the new pointer commits.

## Required pre-Wave-6 infrastructure gate

**Not implemented. No vendor selected. Not this wave.**

Before the professional County Stories composer is released to users, Story Home needs an automatic normalization/transcoding path for common mobile inputs that are ingest-recognized but not launch playback-ready — especially iPhone HEVC/MOV.

A normal professional recording on an iPhone must not require the publisher to understand codecs or convert video by hand.

Exact implementation placement is decided before UI authorization. Do not add a paid transcoding vendor without a separate recommendation and approval.

## Related

- Not Living Marks, Home Docs, or SHI Studies. Dedicated private bucket `county-story-media`.
- Not P1C geography. Launch-seven FIPS only until a later wave says otherwise.
- Not Marketplace, Agent World, Homepage, or County page UI.
- Tests: `npm run test:county-stories-w1`, `npm run test:county-stories-w2`, `npm run test:county-stories-w3`.
