/**
 * Parcel position model — Phase 1 (data only, no Research UI).
 * Founder Interpreter (build process only) — not a product.
 *
 * Traffic = published road fact.
 * Position = this parcel's relationship to roads.
 * Never add two roads' AADT. Never copy a neighbor's derived fields.
 * Access stays Not Verified until an authoritative source exists.
 *
 * Rule version: parcel-position-v1
 */

import { corridorStatusFromHistory } from "@/lib/shi/corridor-language";
import type { TrafficYearPoint } from "@/lib/shi/corridors";

export const PARCEL_POSITION_RULE_VERSION = "parcel-position-v1" as const;

/** Phase 6 phone card renders this copy. */
export const PARCEL_POSITION_COPY = {
  worthALook: "Properties worth a look",
  whyStandsOut: "Why this property stands out",
  seeEvidence: "See the evidence",
  accessNotVerified: "Not verified",
  accessExplain:
    "Road exposure is confirmed from mapped data. Development access has not been verified.",
  frontageApprox: "Approximate · mapped, not a survey",
  disclaimer:
    "Archie organizes available property and market evidence for research. Verify development, access, zoning, title, survey, and financial assumptions before relying on them.",
} as const;

export type TrafficObservationKind = "published_aadt" | "unknown";

export type PositionConfidence =
  | "confirmed"
  | "strong"
  | "limited"
  | "not_verified";

export type AccessStatus = "not_verified";

export type ParcelRoadPositionClass =
  | "unknown"
  | "mid_block"
  | "dual_road"
  | "multi_road"
  | "intersection_adjacent"
  | "intersection_corner"
  | "interchange_adjacent";

/** One published traffic fact. Never a sum of two roads. */
export type ParcelTrafficFact = {
  vehiclesPerDay: number | null;
  year: number | null;
  source: string;
  sourceRecordId: string | null;
  road: string | null;
  observationKind: TrafficObservationKind;
  distanceMiles: number | null;
  history: TrafficYearPoint[];
};

export type ParcelRoadExposure = {
  road: string;
  approxFrontageFt: number;
  traffic: ParcelTrafficFact | null;
  segmentId: string | null;
};

export type ParcelIntersectionFact = {
  approxDistanceM: number | null;
  roads: [string, string] | null;
};

export type ParcelPositionRecord = {
  propId: string;
  source: string;
  algorithmVersion: typeof PARCEL_POSITION_RULE_VERSION;
  derivedAt: string;
  exposures: ParcelRoadExposure[];
  exposureCount: number;
  primary: ParcelRoadExposure | null;
  secondary: ParcelRoadExposure | null;
  combinedApproxFrontageFt: number;
  positionClass: ParcelRoadPositionClass;
  intersection: ParcelIntersectionFact | null;
  access: AccessStatus;
  accessExplain: typeof PARCEL_POSITION_COPY.accessExplain;
  confidence: PositionConfidence;
  confidenceWhy: string;
};

const NEAR_INTERSECTION_M = 40;

export function classifyRoadPosition(opts: {
  exposureCount: number;
  intersectionDistanceM: number | null;
  hasRampEvidence?: boolean;
}): ParcelRoadPositionClass {
  if (opts.hasRampEvidence) return "interchange_adjacent";
  const near =
    opts.intersectionDistanceM != null &&
    Number.isFinite(opts.intersectionDistanceM) &&
    opts.intersectionDistanceM <= NEAR_INTERSECTION_M;
  if (opts.exposureCount >= 3) {
    return near ? "intersection_corner" : "multi_road";
  }
  if (opts.exposureCount === 2) {
    return near ? "intersection_corner" : "dual_road";
  }
  if (opts.exposureCount === 1) {
    return near ? "intersection_adjacent" : "mid_block";
  }
  return "unknown";
}

/**
 * Trend from one station/road history only.
 * Returns null when years are incomparable or missing — never invent.
 */
export function trafficTrendFromSameHistory(history: TrafficYearPoint[]): {
  direction: "growing" | "stable" | "declining" | "limited";
  changePct: number | null;
  why: string;
} | null {
  if (!history.length) return null;
  const status = corridorStatusFromHistory(history);
  if (status.status === "limited_history" || status.changePct == null) {
    return {
      direction: "limited",
      changePct: null,
      why: status.why,
    };
  }
  const direction =
    status.status === "declining"
      ? "declining"
      : status.status === "stable"
        ? "stable"
        : "growing";
  return { direction, changePct: status.changePct, why: status.why };
}

function cloneTraffic(fact: ParcelTrafficFact | null): ParcelTrafficFact | null {
  if (!fact) return null;
  return {
    ...fact,
    history: fact.history.map((h) => ({ ...h })),
  };
}

function sortExposures(rows: ParcelRoadExposure[]): ParcelRoadExposure[] {
  return [...rows].sort((a, b) => {
    if (b.approxFrontageFt !== a.approxFrontageFt) {
      return b.approxFrontageFt - a.approxFrontageFt;
    }
    return (b.traffic?.vehiclesPerDay ?? -1) - (a.traffic?.vehiclesPerDay ?? -1);
  });
}

export function positionConfidence(opts: {
  exposureCount: number;
  hasPublishedTraffic: boolean;
  frontageSource: "postgis" | "client_approx" | "none";
}): { confidence: PositionConfidence; why: string } {
  if (opts.exposureCount === 0 && !opts.hasPublishedTraffic) {
    return {
      confidence: "not_verified",
      why: "No mapped-road frontage or published count tied to this parcel.",
    };
  }
  if (opts.frontageSource === "postgis" && opts.hasPublishedTraffic) {
    return {
      confidence: "confirmed",
      why: "Published traffic observation plus mapped parcel–road frontage.",
    };
  }
  if (opts.frontageSource === "client_approx" && opts.hasPublishedTraffic) {
    return {
      confidence: "strong",
      why: "Published traffic plus approximate mapped frontage — not a survey.",
    };
  }
  if (opts.hasPublishedTraffic) {
    return {
      confidence: "limited",
      why: "Published count nearby — not yet tied to this parcel's frontage.",
    };
  }
  return {
    confidence: "limited",
    why: "Mapped frontage without a published count on that road.",
  };
}

export type BuildParcelPositionInput = {
  propId: string;
  source?: string;
  exposures: ParcelRoadExposure[];
  intersection?: ParcelIntersectionFact | null;
  frontageSource?: "postgis" | "client_approx" | "none";
  derivedAt?: string;
};

/**
 * Build one parcel's position record from THAT parcel's exposures.
 * Callers must not pass a neighbor's frontage or intersection.
 */
export function buildParcelPosition(
  input: BuildParcelPositionInput,
): ParcelPositionRecord {
  const exposures = sortExposures(
    input.exposures
      .filter((e) => e.road.trim() && e.approxFrontageFt >= 0)
      .map((e) => ({
        road: e.road.trim(),
        approxFrontageFt: Math.round(e.approxFrontageFt),
        traffic: cloneTraffic(e.traffic),
        segmentId: e.segmentId,
      })),
  );
  const exposureCount = exposures.filter((e) => e.approxFrontageFt > 0).length;
  const primary = exposures[0] ?? null;
  const secondary = exposures[1] ?? null;
  const combinedApproxFrontageFt = exposures.reduce(
    (s, e) => s + Math.max(0, e.approxFrontageFt),
    0,
  );
  const hasPublishedTraffic = exposures.some(
    (e) =>
      e.traffic?.observationKind === "published_aadt" &&
      e.traffic.vehiclesPerDay != null,
  );
  const conf = positionConfidence({
    exposureCount,
    hasPublishedTraffic,
    frontageSource: input.frontageSource ?? (exposureCount > 0 ? "client_approx" : "none"),
  });
  const ix = input.intersection ?? null;

  return {
    propId: input.propId,
    source: input.source ?? "",
    algorithmVersion: PARCEL_POSITION_RULE_VERSION,
    derivedAt: input.derivedAt ?? new Date().toISOString(),
    exposures,
    exposureCount,
    primary,
    secondary,
    combinedApproxFrontageFt,
    positionClass: classifyRoadPosition({
      exposureCount,
      intersectionDistanceM: ix?.approxDistanceM ?? null,
    }),
    intersection: ix,
    access: "not_verified",
    accessExplain: PARCEL_POSITION_COPY.accessExplain,
    confidence: conf.confidence,
    confidenceWhy: conf.why,
  };
}

/** Guard — two facts stay separate. Never a combined vehicles/day. */
export function sameHighwayTrafficFact(
  left: ParcelTrafficFact | null,
  right: ParcelTrafficFact | null,
): boolean {
  if (!left || !right) return false;
  return (
    left.vehiclesPerDay === right.vehiclesPerDay &&
    left.year === right.year &&
    left.source === right.source &&
    left.sourceRecordId === right.sourceRecordId &&
    left.road === right.road &&
    left.observationKind === right.observationKind
  );
}
