/** Server and provider maximum for one County Story. The sum of accepted clips, not each clip alone. */

export const COUNTY_STORY_TOTAL_MS = 30_000;

/**
 * The recorder stops this long before the server maximum.
 * The stop check runs every 200ms, and each recorded slice is 250ms, so a take
 * aimed exactly at 30.000 seconds can finish past the server limit. 500ms covers
 * that overshoot plus one frame of encoder rounding. The screen still says 30 seconds.
 * Speech already recorded is kept. The recorder simply ends at 29.5 seconds.
 */
export const COUNTY_STORY_CAPTURE_HEADROOM_MS = 500;
export const COUNTY_STORY_CAPTURE_BUDGET_MS =
  COUNTY_STORY_TOTAL_MS - COUNTY_STORY_CAPTURE_HEADROOM_MS;

export type TimedSegment = { durationMs: number };

export function usedSegmentMs(segments: readonly TimedSegment[]): number {
  return segments.reduce((sum, segment) => sum + Math.max(0, segment.durationMs), 0);
}

export function remainingSegmentMs(segments: readonly TimedSegment[]): number {
  return Math.max(0, COUNTY_STORY_CAPTURE_BUDGET_MS - usedSegmentMs(segments));
}

/** An uploaded file may use the full server maximum. The live recorder uses the shorter budget. */
export function segmentFitsBudget(segments: readonly TimedSegment[], nextMs: number): boolean {
  return nextMs > 0 && usedSegmentMs(segments) + nextMs <= COUNTY_STORY_TOTAL_MS;
}

/** Stop the live recorder when this many milliseconds of the current clip have elapsed. */
export function activeClipStopMs(segments: readonly TimedSegment[]): number {
  return remainingSegmentMs(segments);
}
