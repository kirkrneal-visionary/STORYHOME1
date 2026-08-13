/**
 * Story Home — central motion tokens.
 * Adjust globally here; do not scatter ms values across pages.
 */

export const MOTION_DURATION = {
  instant: 0,
  micro: 0.12,
  fast: 0.18,
  standard: 0.28,
  surface: 0.36,
  gesture: 0.42,
} as const;

export const MOTION_EASE = {
  standard: [0.22, 1, 0.36, 1] as const,
  enter: [0.16, 1, 0.3, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
  spring: { type: "spring" as const, stiffness: 420, damping: 36, mass: 0.8 },
  gesture: { type: "spring" as const, stiffness: 380, damping: 40, mass: 0.9 },
};

/** Desktop translation (px) — restrained. */
export const MOTION_DISTANCE = {
  desktop: 18,
  tablet: 28,
  mobile: 40,
} as const;

export const MOTION_OPACITY = {
  enterFrom: 0.92,
  exitTo: 0.96,
  reducedEnter: 0.88,
  reducedExit: 1,
} as const;

/** Left-edge swipe-back */
export const SWIPE_BACK = {
  edgeWidthPx: 22,
  thresholdPx: 96,
  cancelVelocity: 0.35,
} as const;

export type MotionDurationKey = keyof typeof MOTION_DURATION;
export type MotionEaseKey = keyof typeof MOTION_EASE;
