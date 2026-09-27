/** In-app County Story camera. The browser prepares a portrait take. Mux prepares playback later. */

export const COUNTY_STORY_CAMERA_MAX_SEC = 30;

export type CountyStoryCameraFacing = "user" | "environment";

/**
 * Natural field of view. A 1080×1920 ideal makes iPhone Safari center-crop the
 * front sensor into a face close-up. 4:3 is the sensor's own frame. `ideal`
 * does not reject a camera that offers a different size.
 * The preview uses object-fit: contain so it shows the same pixels MediaRecorder saves.
 */
export const COUNTY_STORY_CAMERA_PREVIEW_FIT = "contain" as const;

export function countyStoryCameraRequest(facing: CountyStoryCameraFacing) {
  return {
    audio: true as const,
    video: {
      facingMode: { ideal: facing },
      width: { ideal: 1920 },
      height: { ideal: 1440 },
      aspectRatio: { ideal: 4 / 3 },
      frameRate: { ideal: 30 },
    },
  };
}

export type CountyStoryZoomRange = { min: number; max: number; step: number };

export function countyStoryZoomRange(
  capabilities: { zoom?: { min?: number; max?: number; step?: number } } | null | undefined,
): CountyStoryZoomRange | null {
  const zoom = capabilities?.zoom;
  if (!zoom || typeof zoom.min !== "number" || typeof zoom.max !== "number") return null;
  if (!(zoom.max > zoom.min)) return null;
  const step = typeof zoom.step === "number" && zoom.step > 0 ? zoom.step : 0.01;
  return { min: zoom.min, max: zoom.max, step };
}

export function snapZoom(value: number, range: CountyStoryZoomRange): number {
  const clamped = Math.min(range.max, Math.max(range.min, value));
  const steps = Math.round((clamped - range.min) / range.step);
  const snapped = range.min + steps * range.step;
  const precise = Math.round(snapped * 10000) / 10000;
  return Math.min(range.max, Math.max(range.min, precise));
}

/** 1× and 2× only when the camera reports those positions. */
export function countyStoryZoomStops(range: CountyStoryZoomRange): number[] {
  const stops: number[] = [];
  for (const mark of [1, 2]) {
    if (mark < range.min - 1e-6 || mark > range.max + 1e-6) continue;
    const snapped = snapZoom(mark, range);
    if (Math.abs(snapped - mark) > range.step / 2 + 1e-6) continue;
    if (!stops.includes(snapped)) stops.push(snapped);
  }
  return stops;
}

export function countyStoryZoomFromPinch(
  startZoom: number,
  startDistance: number,
  nextDistance: number,
  range: CountyStoryZoomRange,
): number {
  if (!(startDistance > 0) || !(nextDistance > 0)) return snapZoom(startZoom, range);
  return snapZoom(startZoom * (nextDistance / startDistance), range);
}

export function countyStoryZoomLabel(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text}×`;
}

export function countyStoryCameraReviewLabel(currentSec: number): string {
  return `${countyStoryCameraClock(currentSec)} of ${countyStoryCameraClock(COUNTY_STORY_CAMERA_MAX_SEC)}`;
}

/** Ask the browser not to crop when it offers that choice. Otherwise keep the opened frame. */
export async function countyStoryCameraPreferNaturalFrame(track: MediaStreamTrack): Promise<void> {
  const caps = track.getCapabilities?.() as { resizeMode?: string[] } | undefined;
  if (!caps?.resizeMode?.includes("none")) return;
  try {
    await track.applyConstraints({ resizeMode: "none" } as MediaTrackConstraints);
  } catch {
    /* The opened frame stays. The preview still shows every pixel of it. */
  }
}

export function countyStoryCameraClock(elapsedSec: number): string {
  const sec = Math.min(COUNTY_STORY_CAMERA_MAX_SEC, Math.max(0, Math.floor(elapsedSec)));
  return `0:${String(sec).padStart(2, "0")}`;
}

export function countyStoryCameraShouldStop(elapsedMs: number): boolean {
  return elapsedMs >= COUNTY_STORY_CAMERA_MAX_SEC * 1000;
}

export function countyStoryCameraFacingLabel(facing: CountyStoryCameraFacing): string {
  return facing === "user" ? "Front camera" : "Rear camera";
}

export function countyStoryCameraOtherFacing(facing: CountyStoryCameraFacing): CountyStoryCameraFacing {
  return facing === "user" ? "environment" : "user";
}

export function countyStoryCameraDeniedCopy(): string {
  return "Story Home needs the camera and microphone to record your County Story. You can allow access and try again, or upload a video.";
}

export function countyStoryCameraUnsupportedCopy(): string {
  return "Recording is not available in this browser. Upload a video instead.";
}

export function countyStoryCameraSwitchCopy(): string {
  return "This browser could not switch cameras.";
}
