/**
 * Story Home — Story Continuum motion tokens.
 *
 * Metaphor: walk rooms of one house / market — not flip TV channels.
 * Adjust globally here; do not scatter ms values across pages.
 */

/** Seconds — tuned for belonging, not snap. */
export const MOTION_DURATION = {
  instant: 0,
  micro: 0.14,
  fast: 0.22,
  standard: 0.38,
  surface: 0.48,
  gesture: 0.52,
  /** Soft settle after swipe commit / cancel */
  settle: 0.44,
  cancel: 0.36,
} as const;

/**
 * Cubic-bezier tuples for Framer / CSS.
 * enterContinuum: longer ease-out — arrives, then rests.
 */
export const MOTION_EASE = {
  standard: [0.22, 1, 0.36, 1] as const,
  enter: [0.22, 1, 0.32, 1] as const,
  /** Softer arrival — Story Continuum default */
  enterContinuum: [0.18, 0.9, 0.2, 1] as const,
  exit: [0.4, 0, 0.85, 0.35] as const,
  /** Archie “study” — precise, less bounce */
  enterStudy: [0.25, 0.85, 0.2, 1] as const,
  /** Marketplace room step — slight physicality */
  enterBrowse: [0.16, 0.95, 0.18, 1] as const,
  spring: { type: "spring" as const, stiffness: 280, damping: 34, mass: 0.95 },
  gesture: { type: "spring" as const, stiffness: 260, damping: 36, mass: 1 },
};

/** Desktop/tablet/mobile translation (px) — enough to feel space, not a slideshow. */
export const MOTION_DISTANCE = {
  desktop: 14,
  tablet: 24,
  mobile: 32,
} as const;

export const MOTION_OPACITY = {
  enterFrom: 0.94,
  exitTo: 0.97,
  reducedEnter: 0.9,
  reducedExit: 1,
  lateralFrom: 0.88,
  studyFrom: 0.96,
} as const;

/**
 * Left-edge swipe-back — hand-honest physics.
 * Follow is ~1:1 until rubber band; commit uses velocity OR distance.
 */
export const SWIPE_BACK = {
  edgeWidthPx: 28,
  /** Distance commit (px) — slightly higher so casual flicks don’t teleport */
  thresholdPx: 110,
  /** Fraction of viewport width that also counts as commit */
  thresholdViewport: 0.28,
  /** px/ms — committed if moving decisively past minDx */
  velocityCommit: 0.55,
  minDxForVelocity: 42,
  /** Vertical cancel */
  verticalCancelPx: 56,
  /** Rubber-band starts after this drag (px) */
  rubberAfterPx: 120,
  /** Resistance after rubberAfter (0–1, lower = more resistance) */
  rubberFactor: 0.38,
  /** Max visual drag as fraction of viewport */
  maxDragViewport: 0.82,
  /** Underlay peek opacity at full drag */
  peekMaxOpacity: 0.22,
} as const;

/**
 * Network “temperature” — how physical the room feels.
 * browse > social > home > work > study (coolest spatial motion)
 */
export type ContinuumTemperature =
  | "browse"
  | "social"
  | "home"
  | "work"
  | "study"
  | "still";

export const CONTINUUM_TEMPERATURE = {
  browse: {
    distanceScale: 1.15,
    durationKey: "surface" as const,
    easeKey: "enterBrowse" as const,
    opacityFrom: 0.95,
  },
  social: {
    distanceScale: 0.85,
    durationKey: "standard" as const,
    easeKey: "enterContinuum" as const,
    opacityFrom: 0.92,
  },
  home: {
    distanceScale: 0.9,
    durationKey: "standard" as const,
    easeKey: "enterContinuum" as const,
    opacityFrom: 0.93,
  },
  work: {
    distanceScale: 0.45,
    durationKey: "fast" as const,
    easeKey: "enter" as const,
    opacityFrom: 0.96,
  },
  study: {
    distanceScale: 0.55,
    durationKey: "standard" as const,
    easeKey: "enterStudy" as const,
    opacityFrom: 0.97,
  },
  still: {
    distanceScale: 0,
    durationKey: "micro" as const,
    easeKey: "enter" as const,
    opacityFrom: 0.94,
  },
} as const;

export type MotionDurationKey = keyof typeof MOTION_DURATION;
export type MotionEaseKey = keyof typeof MOTION_EASE;
