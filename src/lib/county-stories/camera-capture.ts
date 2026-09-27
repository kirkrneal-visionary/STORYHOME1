/** In-app County Story camera. The browser prepares a portrait take. Mux prepares playback later. */

export const COUNTY_STORY_CAMERA_MAX_SEC = 30;

export type CountyStoryCameraFacing = "user" | "environment";

export function countyStoryCameraRequest(facing: CountyStoryCameraFacing) {
  return {
    audio: true,
    video: {
      facingMode: { ideal: facing },
      width: { ideal: 1080 },
      height: { ideal: 1920 },
      frameRate: { ideal: 30 },
    },
  };
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
