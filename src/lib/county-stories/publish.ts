/**
 * County Stories Wave 3 publish / replace constants.
 * Public publishing stays off until the launch row is enabled.
 */

export const COUNTY_STORY_MAX_SLOTS = 30;

export const COUNTY_STORY_TYPES = [
  "local_knowledge",
  "open_house_property",
] as const;

export type CountyStoryType = (typeof COUNTY_STORY_TYPES)[number];

export const COUNTY_STORY_RESULT_CODES = [
  "PUBLISHED",
  "REPLACED",
  "CAPACITY",
  "ALREADY_POSTED",
  "COUNTY_FULL",
  "COUNTY_INACTIVE",
  "NOT_ELIGIBLE",
  "STORY_PRO_REQUIRED",
  "MEDIA_NOT_VALID",
  "PLAYBACK_NOT_READY",
  "PLAYBACK_READY",
  "PLAYBACK_POLICY_INVALID",
  "PROVIDER_PROCESSING",
  "PROVIDER_ERRORED",
  "PROVIDER_EVENT_REPLAY",
  "PROVIDER_EVENT_ACCEPTED",
  "MEDIA_NOT_OWNED",
  "MEDIA_ALREADY_ATTACHED",
  "LISTING_NOT_AUTHORIZED",
  "LISTING_COUNTY_MISMATCH",
  "IDEMPOTENCY_CONFLICT",
  "REPLACEMENT_ALREADY_USED",
  "NOT_SLOT_OWNER",
  "STORY_DAY_ENDED",
  "FEATURE_DISABLED",
  "POSTING_SUSPENDED",
  "POLICY_HIDDEN",
  "INVALID_REASON",
  "NOT_PLAYABLE",
  "CAPTIONS_SAVED",
  "CAPTIONS_CONFIRMED",
  "CAPTIONS_REQUIRED",
  "CAPTION_INVALID",
  "CAPTION_REVISION_CONFLICT",
  "CAPTION_DURATION_UNKNOWN",
  "CAPTION_JOB_ACCEPTED",
  "CAPTION_JOB_REPLAY",
  "PROVIDER_UNAVAILABLE",
  "ACCESSIBILITY_NOT_READY",
  "ACCESSIBILITY_SAVED",
  "ACCESSIBILITY_READY",
] as const;

export type CountyStoryResultCode = (typeof COUNTY_STORY_RESULT_CODES)[number];

export function countyStoryHttpStatus(code: string): number {
  switch (code) {
    case "PUBLISHED":
    case "REPLACED":
    case "CAPACITY":
      return 200;
    case "FEATURE_DISABLED":
    case "NOT_ELIGIBLE":
    case "STORY_PRO_REQUIRED":
    case "NOT_SLOT_OWNER":
    case "POSTING_SUSPENDED":
      return 403;
    case "POLICY_HIDDEN":
    case "CAPTIONS_SAVED":
    case "CAPTIONS_CONFIRMED":
    case "CAPTION_JOB_ACCEPTED":
    case "CAPTION_JOB_REPLAY":
    case "ACCESSIBILITY_SAVED":
    case "ACCESSIBILITY_READY":
    case "PLAYBACK_READY":
    case "PROVIDER_PROCESSING":
    case "PROVIDER_EVENT_REPLAY":
    case "PROVIDER_EVENT_ACCEPTED":
      return 200;
    case "PROVIDER_UNAVAILABLE":
      return 503;
    case "ALREADY_POSTED":
    case "COUNTY_FULL":
    case "REPLACEMENT_ALREADY_USED":
    case "IDEMPOTENCY_CONFLICT":
    case "MEDIA_ALREADY_ATTACHED":
    case "CAPTION_REVISION_CONFLICT":
      return 409;
    case "COUNTY_INACTIVE":
    case "MEDIA_NOT_VALID":
    case "PLAYBACK_NOT_READY":
    case "PLAYBACK_POLICY_INVALID":
    case "PROVIDER_ERRORED":
    case "MEDIA_NOT_OWNED":
    case "LISTING_NOT_AUTHORIZED":
    case "LISTING_COUNTY_MISMATCH":
    case "STORY_DAY_ENDED":
    case "ACCESSIBILITY_NOT_READY":
    case "CAPTIONS_REQUIRED":
    case "CAPTION_INVALID":
    case "CAPTION_DURATION_UNKNOWN":
      return 400;
    default:
      return 400;
  }
}

export function isCountyStoryType(
  value: string | null | undefined,
): value is CountyStoryType {
  return !!value && (COUNTY_STORY_TYPES as readonly string[]).includes(value);
}
