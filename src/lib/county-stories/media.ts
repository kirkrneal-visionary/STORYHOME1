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
  "needs_normalization",
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

/**
 * Launch playback-ready pairs for the Story Home web viewer.
 * Codec is never approved apart from its container.
 *
 * Playback-ready (`state=valid`) is only:
 *   MP4  + H.264/AVC (avc1, avc3)
 *   WebM + VP8 (vp08) or VP9 (vp09)
 *
 * Ingest-recognized but not publishable (`needs_normalization`):
 *   HEVC/H.265 (hvc1, hev1) in MP4 or QuickTime/MOV — iPhone default
 *   AV1 (av01) in MP4 or WebM — not a launch viewer pair
 *   WebM + H.264 — recognized, never playback-ready
 *   QuickTime/MOV with any codec, including H.264 — not a launch container
 *
 * No transcoding vendor is wired. Wave 3 may consume only `valid`.
 */
export const COUNTY_STORY_PLAYBACK_MATRIX = [
  { container: "mp4", codec: "avc1" },
  { container: "mp4", codec: "avc3" },
  { container: "webm", codec: "vp08" },
  { container: "webm", codec: "vp09" },
] as const;

/** Video codecs we can identify. Recognition is not playback approval. */
export const COUNTY_STORY_INGEST_CODECS = [
  "avc1",
  "avc3",
  "vp08",
  "vp09",
  "hvc1",
  "hev1",
  "av01",
] as const;

export const COUNTY_STORY_VALIDATION_CODES = [
  "INVALID_MEDIA_TYPE",
  "VIDEO_TOO_LONG",
  "FILE_TOO_LARGE",
  "UNSUPPORTED_CODEC",
  "NOT_PLAYBACK_READY",
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

export function isCountyStoryIngestRecognized(
  codec: string | null | undefined,
): boolean {
  return !!codec && (COUNTY_STORY_INGEST_CODECS as readonly string[]).includes(codec);
}

export function isCountyStoryPlaybackReady(
  container: string | null | undefined,
  codec: string | null | undefined,
): boolean {
  if (!container || !codec) return false;
  return COUNTY_STORY_PLAYBACK_MATRIX.some(
    (pair) => pair.container === container && pair.codec === codec,
  );
}
