# Contract — County Stories

**Who / why:** Eligible Story Pro publishers stage a short county Story. The durable object is a Story Slot. Media is temporary.

**Intended:** Wave 1 authority and Wave 2 private staging are accepted. There is no consumer UI, composer, viewer, captions, or publish yet. Wave 3 is not authorized.

## Waves

| Wave | Status | Job |
|---|---|---|
| 1 | Accepted, hosted `0081` | Story Day, launch-seven activation, publisher eligibility, slots/days schema. No media. |
| 2 | Accepted, hosted `0082` | Private staged video. Playback-ready `valid` only. Storage-first orphan cleanup. |
| 3 | Not started | Accept/attach to a Story Slot. Separate authorization. Start from updated `main`. |
| 6 UI | Not authorized | Professional composer. Blocked on the normalization gate below. |

Do not increase the County Stories wave count here. Placement of normalization is decided before UI authorization.

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

Slot-attached / current Story media is excluded. Later replacement and 8:00 AM expiration have their own paths (not Wave 2).

## Required pre-Wave-6 infrastructure gate

**Not implemented. No vendor selected. Not this closeout.**

Before the professional County Stories composer is released to users, Story Home needs an automatic normalization/transcoding path for common mobile inputs that are ingest-recognized but not launch playback-ready — especially iPhone HEVC/MOV.

A normal professional recording on an iPhone must not require the publisher to understand codecs or convert video by hand.

Exact implementation placement is decided before UI authorization. Do not add a paid transcoding vendor without a separate recommendation and approval.

## Related

- Not Living Marks, Home Docs, or SHI Studies. Dedicated private bucket `county-story-media`.
- Not P1C geography. Launch-seven FIPS only until a later wave says otherwise.
- Not Marketplace, Agent World, Homepage, or County page UI.
- Tests: `npm run test:county-stories-w1`, `npm run test:county-stories-w2`.
