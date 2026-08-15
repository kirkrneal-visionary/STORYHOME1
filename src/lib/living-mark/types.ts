/** Story Walk — Living Mark library types (SW-2). */

export type LivingMarkRecord = {
  /** Still / poster inside the circle (temporary or frozen headshot). */
  stillUrl: string | null;
  /** Welcome video URL — played in SW-3; stored from SW-2 upload. */
  videoUrl: string | null;
  updatedAt: string;
};

export const LIVING_MARK_DEMO_KEY = "story-living-mark-v1";
export const LIVING_MARK_MAX_VIDEO_BYTES = 12 * 1024 * 1024; // demo / soft cap
export const LIVING_MARK_MAX_IMAGE_BYTES = 6 * 1024 * 1024;
