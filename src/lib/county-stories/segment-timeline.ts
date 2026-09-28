/** Capture budget for one County Story. The sum of accepted clips, not each clip alone. */

export const COUNTY_STORY_TOTAL_MS = 30_000;

export type TimedSegment = { durationMs: number };

export function usedSegmentMs(segments: readonly TimedSegment[]): number {
  return segments.reduce((sum, segment) => sum + Math.max(0, segment.durationMs), 0);
}

export function remainingSegmentMs(segments: readonly TimedSegment[]): number {
  return Math.max(0, COUNTY_STORY_TOTAL_MS - usedSegmentMs(segments));
}

export function segmentFitsBudget(segments: readonly TimedSegment[], nextMs: number): boolean {
  return nextMs > 0 && usedSegmentMs(segments) + nextMs <= COUNTY_STORY_TOTAL_MS;
}

/** Stop the live recorder when this many milliseconds of the current clip have elapsed. */
export function activeClipStopMs(segments: readonly TimedSegment[]): number {
  return remainingSegmentMs(segments);
}
