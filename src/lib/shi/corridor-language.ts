/**
 * Corridors 2.0 — realtor language + versioned classification rules.
 * C2.0-A: vehicles/day primary; intensity + corridor status (deterministic).
 *
 * Rule set versions are frozen in docs/shi/ARCHIE-CORRIDORS-2.md.
 * Do not invent classifications via LLM.
 */

import type { TrafficYearPoint } from "@/lib/shi/corridors";

export const CORRIDORS_2_PURPOSE =
  "Find properties positioned around real traffic movement.";

export const CORRIDORS_2_HERO =
  "See where people are moving — then which land sits in that flow.";

export const CORRIDORS_2_SUPPORT =
  "Traffic is an input. The product is location intelligence: volume, growth, and the properties positioned around the corridor.";

/** aadt-explainer-v1 */
export const AADT_EXPLAINER_V1 =
  "Average Annual Daily Traffic estimates the average number of vehicles traveling this roadway each day across the year.";

export const TRAFFIC_INTENSITY_RULE_VERSION = "traffic-intensity-v1" as const;
export const CORRIDOR_STATUS_RULE_VERSION = "corridor-status-v1" as const;

export const TRAFFIC_INTENSITY_CLASSES = [
  "lower",
  "moderate",
  "high",
  "very_high",
] as const;

export type TrafficIntensityClass = (typeof TRAFFIC_INTENSITY_CLASSES)[number];

export const TRAFFIC_INTENSITY_LABEL: Record<TrafficIntensityClass, string> = {
  lower: "Lower traffic",
  moderate: "Moderate traffic",
  high: "High traffic",
  very_high: "Very high traffic",
};

/** Map paint colors — restrained hierarchy (not a rainbow). */
export const TRAFFIC_INTENSITY_COLOR: Record<TrafficIntensityClass, string> = {
  lower: "#5a7a8a",
  moderate: "#2a9d8f",
  high: "#c9a227",
  very_high: "#c0392b",
};

/** traffic-intensity-v1 thresholds (vehicles/day). */
export function trafficIntensityClass(
  vehiclesPerDay: number | null | undefined,
): TrafficIntensityClass {
  const n = vehiclesPerDay ?? 0;
  if (!Number.isFinite(n) || n < 5000) return "lower";
  if (n < 15000) return "moderate";
  if (n < 30000) return "high";
  return "very_high";
}

export const CORRIDOR_STATUS_CLASSES = [
  "rapidly_growing",
  "growing",
  "stable",
  "declining",
  "limited_history",
] as const;

export type CorridorStatusClass = (typeof CORRIDOR_STATUS_CLASSES)[number];

export const CORRIDOR_STATUS_LABEL: Record<CorridorStatusClass, string> = {
  rapidly_growing: "Rapidly growing",
  growing: "Growing",
  stable: "Stable",
  declining: "Declining",
  limited_history: "Limited history",
};

export type CorridorStatusResult = {
  status: CorridorStatusClass;
  /** Percent change oldest→newest non-null years; null if limited history */
  changePct: number | null;
  yearsCompared: number;
  ruleVersion: typeof CORRIDOR_STATUS_RULE_VERSION;
  /** One-line why (deterministic). */
  why: string;
};

/**
 * corridor-status-v1 — same history order as station chips (newest first).
 */
export function corridorStatusFromHistory(
  history: TrafficYearPoint[],
): CorridorStatusResult {
  const vals = history
    .filter((h) => h.aadt != null && Number.isFinite(h.aadt))
    .map((h) => h.aadt as number);
  if (vals.length < 2) {
    return {
      status: "limited_history",
      changePct: null,
      yearsCompared: vals.length,
      ruleVersion: CORRIDOR_STATUS_RULE_VERSION,
      why: "Fewer than two published years — Archie will not invent a trend.",
    };
  }
  const newest = vals[0]!;
  const oldest = vals[vals.length - 1]!;
  if (oldest <= 0) {
    return {
      status: "limited_history",
      changePct: null,
      yearsCompared: vals.length,
      ruleVersion: CORRIDOR_STATUS_RULE_VERSION,
      why: "Published history is too thin to classify growth.",
    };
  }
  const changePct = ((newest - oldest) / oldest) * 100;
  let status: CorridorStatusClass;
  if (changePct >= 20) status = "rapidly_growing";
  else if (changePct >= 8) status = "growing";
  else if (changePct <= -8) status = "declining";
  else status = "stable";

  const signed = `${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}%`;
  return {
    status,
    changePct,
    yearsCompared: vals.length,
    ruleVersion: CORRIDOR_STATUS_RULE_VERSION,
    why: `Traffic changed ${signed} across ${vals.length} published years (${CORRIDOR_STATUS_RULE_VERSION}).`,
  };
}

/** MapLibre step expression aligned to traffic-intensity-v1. */
export function trafficIntensityColorExpr(): unknown[] {
  return [
    "step",
    ["coalesce", ["get", "aadt"], 0],
    TRAFFIC_INTENSITY_COLOR.lower,
    5000,
    TRAFFIC_INTENSITY_COLOR.moderate,
    15000,
    TRAFFIC_INTENSITY_COLOR.high,
    30000,
    TRAFFIC_INTENSITY_COLOR.very_high,
  ];
}

export function vehiclesPerDayCaption(
  year: number | null | undefined,
  source = "TxDOT",
): string {
  if (year != null && year > 1900) {
    return `${year} AADT · ${source}`;
  }
  return `AADT · ${source}`;
}
