/**
 * Story Home — Story Continuum motion tokens.
 *
 * Metaphor: walk rooms of one house / market — not flip TV channels.
 * Visibility goal: noticeable belonging on phone + desktop — not invisible CSS.
 * Adjust globally here; do not scatter ms values across pages.
 */

/** Seconds — tuned for belonging, not snap. */
export const MOTION_DURATION = {
  instant: 0,
  micro: 0.14,
  fast: 0.24,
  standard: 0.42,
  surface: 0.52,
  gesture: 0.56,
  /** Soft settle after swipe commit / cancel */
  settle: 0.48,
  cancel: 0.38,
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

/**
 * Desktop/tablet/mobile translation (px).
 * Raised so room-step reads as belonging, not a 1% opacity blink.
 */
export const MOTION_DISTANCE = {
  desktop: 32,
  tablet: 44,
  mobile: 56,
} as const;

export const MOTION_OPACITY = {
  enterFrom: 0.86,
  exitTo: 0.94,
  reducedEnter: 0.88,
  reducedExit: 1,
  /** Lateral network hops — clearer dissolve */
  lateralFrom: 0.72,
  studyFrom: 0.9,
} as const;

/**
 * Left-edge swipe-back — hand-honest physics.
 * Follow is ~1:1 until rubber band; commit uses velocity OR distance.
 */
export const SWIPE_BACK = {
  /** Slightly wider so the gesture is discoverable without stealing maps */
  edgeWidthPx: 36,
  /** Distance commit (px) */
  thresholdPx: 100,
  /** Fraction of viewport width that also counts as commit */
  thresholdViewport: 0.26,
  /** px/ms — committed if moving decisively past minDx */
  velocityCommit: 0.5,
  minDxForVelocity: 36,
  /** Vertical cancel */
  verticalCancelPx: 56,
  /** Rubber-band starts after this drag (px) */
  rubberAfterPx: 110,
  /** Resistance after rubberAfter (0–1, lower = more resistance) */
  rubberFactor: 0.4,
  /** Max visual drag as fraction of viewport */
  maxDragViewport: 0.85,
  /** Underlay peek opacity at full drag — must be obvious */
  peekMaxOpacity: 0.42,
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
    distanceScale: 1.2,
    durationKey: "surface" as const,
    easeKey: "enterBrowse" as const,
    opacityFrom: 0.82,
  },
  social: {
    distanceScale: 0.95,
    durationKey: "standard" as const,
    easeKey: "enterContinuum" as const,
    opacityFrom: 0.84,
  },
  home: {
    distanceScale: 1,
    durationKey: "standard" as const,
    easeKey: "enterContinuum" as const,
    opacityFrom: 0.86,
  },
  work: {
    distanceScale: 0.55,
    durationKey: "fast" as const,
    easeKey: "enter" as const,
    opacityFrom: 0.9,
  },
  study: {
    distanceScale: 0.7,
    durationKey: "standard" as const,
    easeKey: "enterStudy" as const,
    opacityFrom: 0.88,
  },
  still: {
    distanceScale: 0,
    durationKey: "micro" as const,
    easeKey: "enter" as const,
    opacityFrom: 0.92,
  },
} as const;

export type MotionDurationKey = keyof typeof MOTION_DURATION;
export type MotionEaseKey = keyof typeof MOTION_EASE;
