/**
 * County Stories Wave 2 — staged media constants.
 * Not publish authority. Not a Story Slot. Not consumer UI.
 */

export const COUNTY_STORY_MEDIA_BUCKET = "county-story-media";

export const COUNTY_STORY_MEDIA_MAX_BYTES = 80 * 1024 * 1024;

export const COUNTY_STORY_MEDIA_MAX_DURATION_MS = 30_000;

export const COUNTY_STORY_MEDIA_RETENTION_HOURS = 6;

export const COUNTY_STORY_MEDIA_UPLOAD_TTL_SEC = 15 * 60;

export const COUNTY_STORY_MEDIA_READ_TTL_SEC = 120;

export const COUNTY_STORY_MEDIA_STATES = [
  "created",
  "uploaded",
  "validating",
  "valid",
  "invalid",
  "deleted",
] as const;

export type CountyStoryMediaState = (typeof COUNTY_STORY_MEDIA_STATES)[number];

export const COUNTY_STORY_MEDIA_PURPOSES = ["original", "replacement"] as const;

export type CountyStoryMediaPurpose =
  (typeof COUNTY_STORY_MEDIA_PURPOSES)[number];

export const COUNTY_STORY_MEDIA_DECLARED_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

export const COUNTY_STORY_MEDIA_CODECS = [
  "avc1",
  "avc3",
  "hev1",
  "hvc1",
  "vp08",
  "vp09",
  "av01",
] as const;

export const COUNTY_STORY_VALIDATION_CODES = [
  "INVALID_MEDIA_TYPE",
  "VIDEO_TOO_LONG",
  "FILE_TOO_LARGE",
  "UNSUPPORTED_CODEC",
  "INVALID_MEDIA",
  "OWNER_MISMATCH",
] as const;

export type CountyStoryValidationCode =
  (typeof COUNTY_STORY_VALIDATION_CODES)[number];

export function countyStoryMediaPath(
  ownerId: string,
  mediaId: string,
  filename: string,
): string {
  return `${ownerId}/${mediaId}/${filename}`;
}

export function countyStoryMediaExtension(
  declaredType: string | null | undefined,
): "mp4" | "mov" | "webm" | null {
  if (declaredType === "video/quicktime") return "mov";
  if (declaredType === "video/webm") return "webm";
  if (declaredType === "video/mp4") return "mp4";
  return null;
}

export function countyStoryMediaExpiresAt(
  from: Date = new Date(),
  hours = COUNTY_STORY_MEDIA_RETENTION_HOURS,
): Date {
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

export function isCountyStoryDeclaredVideoType(
  value: string | null | undefined,
): boolean {
  return !!value && (COUNTY_STORY_MEDIA_DECLARED_TYPES as readonly string[]).includes(
    value,
  );
}
