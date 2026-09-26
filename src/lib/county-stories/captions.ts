/**
 * County Stories Wave 5 caption constants and cue validation.
 * Canonical cue model is WebVTT-compatible (start/end/text/index).
 * No UI. No vendor hardwire.
 */

export const COUNTY_STORY_CAPTION_STATES = [
  "not_requested",
  "processing",
  "auto_ready",
  "needs_review",
  "ready",
  "failed",
  "manual_ready",
] as const;

export type CountyStoryCaptionState =
  (typeof COUNTY_STORY_CAPTION_STATES)[number];

export const COUNTY_STORY_CAPTION_SOURCES = [
  "auto",
  "manual",
  "edited",
] as const;

export type CountyStoryCaptionSource =
  (typeof COUNTY_STORY_CAPTION_SOURCES)[number];

export const COUNTY_STORY_CAPTION_JOB_STATUSES = [
  "queued",
  "processing",
  "succeeded",
  "failed",
  "unavailable",
] as const;

export type CountyStoryCaptionJobStatus =
  (typeof COUNTY_STORY_CAPTION_JOB_STATUSES)[number];

export const COUNTY_STORY_VISUAL_INFO_BASES = [
  "spoken_audio",
  "supplied_description",
] as const;

export type CountyStoryVisualInfoBasis =
  (typeof COUNTY_STORY_VISUAL_INFO_BASES)[number];

export const COUNTY_STORY_CAPTION_CUE_FORMAT = "webvtt_cues";

export const COUNTY_STORY_CAPTION_MAX_CUES = 60;
export const COUNTY_STORY_CAPTION_MAX_TEXT = 200;

export const COUNTY_STORY_CAPTION_RESULT_CODES = [
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

export type CountyStoryCaptionCue = {
  index: number;
  start_ms: number;
  end_ms: number;
  text: string;
};

export function isCountyStoryCaptionState(
  value: string | null | undefined,
): value is CountyStoryCaptionState {
  return (
    !!value &&
    (COUNTY_STORY_CAPTION_STATES as readonly string[]).includes(value)
  );
}

export function captionsAreProfessionallyConfirmed(opts: {
  captionState: string | null | undefined;
  confirmedAt: string | null | undefined;
  revision: number | null | undefined;
  confirmedRevision: number | null | undefined;
}): boolean {
  if (!opts.confirmedAt) return false;
  if (opts.revision == null || opts.confirmedRevision == null) return false;
  if (opts.revision !== opts.confirmedRevision) return false;
  return opts.captionState === "ready" || opts.captionState === "manual_ready";
}

export function validateCountyStoryCaptionCues(
  cues: CountyStoryCaptionCue[],
  durationMs: number | null | undefined,
): { ok: true } | { ok: false; code: string } {
  if (durationMs == null || !Number.isFinite(durationMs) || durationMs <= 0) {
    return { ok: false, code: "CAPTION_DURATION_UNKNOWN" };
  }
  if (!Array.isArray(cues) || cues.length < 1) {
    return { ok: false, code: "CAPTION_INVALID" };
  }
  if (cues.length > COUNTY_STORY_CAPTION_MAX_CUES) {
    return { ok: false, code: "CAPTION_INVALID" };
  }
  for (let i = 0; i < cues.length; i += 1) {
    const cue = cues[i];
    const text = typeof cue?.text === "string" ? cue.text.trim() : "";
    if (cue.index !== i) return { ok: false, code: "CAPTION_INVALID" };
    if (!Number.isFinite(cue.start_ms) || cue.start_ms < 0) {
      return { ok: false, code: "CAPTION_INVALID" };
    }
    if (!Number.isFinite(cue.end_ms) || cue.end_ms <= cue.start_ms) {
      return { ok: false, code: "CAPTION_INVALID" };
    }
    if (cue.end_ms > durationMs) return { ok: false, code: "CAPTION_INVALID" };
    if (text.length < 1 || text.length > COUNTY_STORY_CAPTION_MAX_TEXT) {
      return { ok: false, code: "CAPTION_INVALID" };
    }
    if (i > 0 && cue.start_ms < cues[i - 1].end_ms) {
      return { ok: false, code: "CAPTION_INVALID" };
    }
  }
  return { ok: true };
}

export function countyStoryCuesToWebVtt(cues: CountyStoryCaptionCue[]): string {
  const lines = ["WEBVTT", ""];
  for (const cue of cues) {
    lines.push(String(cue.index + 1));
    lines.push(
      `${formatVttTimestamp(cue.start_ms)} --> ${formatVttTimestamp(cue.end_ms)}`,
    );
    lines.push(cue.text.trim());
    lines.push("");
  }
  return lines.join("\n");
}

function formatVttTimestamp(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms));
  const hours = Math.floor(clamped / 3_600_000);
  const minutes = Math.floor((clamped % 3_600_000) / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  const millis = clamped % 1000;
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const mmm = String(millis).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${mmm}`;
}
