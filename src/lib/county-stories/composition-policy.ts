/**
 * The composed file that enters Mux.
 * 1080×1920, H.264, yuv420p, MP4, AAC at 48 kHz,
 * constant 30/1 fps, video time base 1/30, start time 0, fast-start.
 * The server rejects a file longer than 30.000 seconds.
 * Wide shots keep their full picture. Unused space uses the blurred source.
 */

import { COUNTY_STORY_MEDIA_MAX_DURATION_MS } from "@/lib/county-stories/media";

export const COUNTY_STORY_CANVAS = {
  width: 1080,
  height: 1920,
  fps: 30,
} as const;

export const COUNTY_STORY_OUTPUT = {
  container: "mp4",
  videoCodec: "h264",
  pixelFormat: "yuv420p",
  audioCodec: "aac",
  audioSampleRate: 48_000,
  frameRate: "30/1",
  videoTimeBase: "1/30",
  startTimeSec: 0,
  fastStart: true,
  maxDurationMs: COUNTY_STORY_MEDIA_MAX_DURATION_MS,
} as const;

/** Story Home paper. Used only as the clean unused-space fill. */
export const COUNTY_STORY_NEUTRAL_BACKGROUND = "#f7f4ec";

export const COUNTY_STORY_BACKGROUND_MODES = ["blur", "neutral"] as const;

export type CountyStoryBackgroundMode = (typeof COUNTY_STORY_BACKGROUND_MODES)[number];

/**
 * Unused portrait space uses a blurred, dimmed copy of the source.
 * The paper fill stays implemented in the composition container.
 * Change this one value to use it. The publishing screen does not offer the choice.
 */
export const COUNTY_STORY_DEFAULT_BACKGROUND: CountyStoryBackgroundMode = "blur";

/** Cover may discard at most this fraction of either side. Anything more stays fully visible. */
export const COUNTY_STORY_FILL_CROP_LIMIT = 0.04;

export type StoryPlacement = "fill" | "contain";

export function isCountyStoryBackgroundMode(value: string | null | undefined): value is CountyStoryBackgroundMode {
  return value === "blur" || value === "neutral";
}

export function coverDiscard(sourceWidth: number, sourceHeight: number): { width: number; height: number } {
  const { width, height } = COUNTY_STORY_CANVAS;
  if (!(sourceWidth > 0) || !(sourceHeight > 0)) return { width: 1, height: 1 };
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  return {
    width: Math.max(0, 1 - width / (sourceWidth * scale)),
    height: Math.max(0, 1 - height / (sourceHeight * scale)),
  };
}

/** Portrait that already matches the canvas fills it. Every other shape keeps the full frame. */
export function placementForSource(sourceWidth: number, sourceHeight: number): StoryPlacement {
  const discard = coverDiscard(sourceWidth, sourceHeight);
  if (discard.width <= COUNTY_STORY_FILL_CROP_LIMIT && discard.height <= COUNTY_STORY_FILL_CROP_LIMIT) {
    return "fill";
  }
  return "contain";
}

export function containedSize(
  sourceWidth: number,
  sourceHeight: number,
): { width: number; height: number } {
  const { width, height } = COUNTY_STORY_CANVAS;
  if (!(sourceWidth > 0) || !(sourceHeight > 0)) return { width, height };
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  return {
    width: Math.round(sourceWidth * scale),
    height: Math.round(sourceHeight * scale),
  };
}
