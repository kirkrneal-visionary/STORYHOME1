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
  "MEDIA_NOT_OWNED",
  "MEDIA_ALREADY_ATTACHED",
  "LISTING_NOT_AUTHORIZED",
  "LISTING_COUNTY_MISMATCH",
  "IDEMPOTENCY_CONFLICT",
  "REPLACEMENT_ALREADY_USED",
  "NOT_SLOT_OWNER",
  "STORY_DAY_ENDED",
  "FEATURE_DISABLED",
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
      return 403;
    case "ALREADY_POSTED":
    case "COUNTY_FULL":
    case "REPLACEMENT_ALREADY_USED":
    case "IDEMPOTENCY_CONFLICT":
    case "MEDIA_ALREADY_ATTACHED":
      return 409;
    case "COUNTY_INACTIVE":
    case "MEDIA_NOT_VALID":
    case "MEDIA_NOT_OWNED":
    case "LISTING_NOT_AUTHORIZED":
    case "LISTING_COUNTY_MISMATCH":
    case "STORY_DAY_ENDED":
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
