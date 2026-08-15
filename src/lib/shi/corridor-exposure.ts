/**
 * Corridors 2.0-D — Traffic Exposure + Commercial Exposure (deterministic).
 * No LLM. Every score ships a WHY? factor breakdown.
 *
 * Rule versions:
 * - traffic-exposure-v1
 * - commercial-exposure-v1
 */

import type { TrafficStation } from "@/lib/shi/corridors";
import {
  CORRIDOR_STATUS_LABEL,
  TRAFFIC_INTENSITY_LABEL,
  corridorStatusFromHistory,
  trafficIntensityClass,
  type CorridorStatusClass,
  type TrafficIntensityClass,
} from "@/lib/shi/corridor-language";
import type { ParcelLocationIntel } from "@/lib/shi/corridor-frontage";
import {
  associateParcelTraffic,
  type CorridorParcelPick,
} from "@/lib/shi/corridor-parcel-traffic";

export const TRAFFIC_EXPOSURE_RULE_VERSION = "traffic-exposure-v1" as const;
export const COMMERCIAL_EXPOSURE_RULE_VERSION =
  "commercial-exposure-v1" as const;

export type ExposureFactor = {
  id: string;
  label: string;
  points: number;
  maxPoints: number;
  detail: string;
};

export type TrafficExposureScore = {
  score: number;
  maxScore: number;
  band: "strong" | "solid" | "moderate" | "limited";
  factors: ExposureFactor[];
  ruleVersion: typeof TRAFFIC_EXPOSURE_RULE_VERSION;
  vehiclesPerDay: number | null;
  intensity: TrafficIntensityClass | null;
  corridorStatus: CorridorStatusClass | null;
};

export type CommercialExposureScore = {
  score: number;
  maxScore: number;
  band: "strong" | "solid" | "moderate" | "limited";
  factors: ExposureFactor[];
  traffic: TrafficExposureScore;
  ruleVersion: typeof COMMERCIAL_EXPOSURE_RULE_VERSION;
};

export type RankedSite = {
  propId: string;
  source: string;
  lat: number;
  lng: number;
  situsAddress: string | null;
  ownerName: string | null;
  legalAcreage: number | null;
  marketValue: number | null;
  commercial: CommercialExposureScore;
  rank: number;
};

function bandFromScore(
  score: number,
  max: number,
): TrafficExposureScore["band"] {
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.72) return "strong";
  if (pct >= 0.52) return "solid";
  if (pct >= 0.32) return "moderate";
  return "limited";
}

function volumePoints(aadt: number | null): ExposureFactor {
  const maxPoints = 35;
  const cls = trafficIntensityClass(aadt);
  let points = 0;
  let detail = "No published vehicles/day nearby.";
  if (aadt != null && Number.isFinite(aadt)) {
    if (cls === "very_high") points = 35;
    else if (cls === "high") points = 28;
    else if (cls === "moderate") points = 18;
    else points = 8;
    detail = `${Math.round(aadt).toLocaleString("en-US")} vehicles/day · ${TRAFFIC_INTENSITY_LABEL[cls]} (${TRAFFIC_EXPOSURE_RULE_VERSION}).`;
  }
  return {
    id: "volume",
    label: "Vehicles / day",
    points,
    maxPoints,
    detail,
  };
}

function growthPoints(station: TrafficStation | null): ExposureFactor {
  const maxPoints = 20;
  if (!station) {
    return {
      id: "growth",
      label: "Corridor status",
      points: 0,
      maxPoints,
      detail: "No station history for growth.",
    };
  }
  const status = corridorStatusFromHistory(station.history);
  const map: Record<CorridorStatusClass, number> = {
    rapidly_growing: 20,
    growing: 14,
    stable: 10,
    declining: 4,
    limited_history: 6,
  };
  return {
    id: "growth",
    label: "Corridor status",
    points: map[status.status],
    maxPoints,
    detail: `${CORRIDOR_STATUS_LABEL[status.status]} — ${status.why}`,
  };
}

function frontagePoints(intel: ParcelLocationIntel | null): ExposureFactor {
  const maxPoints = 20;
  const ft = intel?.totalApproxFrontageFt ?? 0;
  let points = 0;
  if (ft >= 300) points = 20;
  else if (ft >= 150) points = 15;
  else if (ft >= 75) points = 10;
  else if (ft >= 25) points = 6;
  const dualBonus =
    intel?.dualRoad || intel?.cornerLikely
      ? Math.min(5, (intel.dualRoad ? 3 : 0) + (intel.cornerLikely ? 2 : 0))
      : 0;
  const capped = Math.min(maxPoints, points + dualBonus);
  return {
    id: "frontage",
    label: "Approx. frontage",
    points: capped,
    maxPoints,
    detail:
      ft > 0
        ? `Approx. ${ft.toLocaleString("en-US")} ft${
            intel?.dualRoad ? " · dual-road" : ""
          }${intel?.cornerLikely ? " · corner likely" : ""} — not surveyed.`
        : "No approx frontage yet — volume uses nearby published count only.",
  };
}

function confidencePoints(
  conf: "high" | "moderate" | "limited",
): ExposureFactor {
  const maxPoints = 10;
  const points = conf === "high" ? 10 : conf === "moderate" ? 6 : 2;
  return {
    id: "confidence",
    label: "Data confidence",
    points,
    maxPoints,
    detail: `${conf.toUpperCase()} (${TRAFFIC_EXPOSURE_RULE_VERSION}).`,
  };
}

function acreagePoints(acres: number | null | undefined): ExposureFactor {
  const maxPoints = 15;
  if (acres == null || !Number.isFinite(acres) || acres <= 0) {
    return {
      id: "land",
      label: "Land size",
      points: 0,
      maxPoints,
      detail: "Acreage unknown — commercial exposure stays traffic-led.",
    };
  }
  let points = 4;
  let detail = `${acres.toLocaleString("en-US", { maximumFractionDigits: 2 })} acres.`;
  if (acres >= 0.5 && acres < 5) {
    points = 15;
    detail += " Common commercial pad scale.";
  } else if (acres >= 5 && acres < 20) {
    points = 12;
    detail += " Larger site — still land-first.";
  } else if (acres >= 20 && acres < 50) {
    points = 9;
    detail += " Campus / multi-pad scale.";
  } else if (acres >= 50) {
    points = 6;
    detail += " Large tract — traffic is one of many factors.";
  } else {
    points = 5;
    detail += " Small lot.";
  }
  return {
    id: "land",
    label: "Land size",
    points,
    maxPoints,
    detail: `${detail} (${COMMERCIAL_EXPOSURE_RULE_VERSION}).`,
  };
}

/** Pure Traffic Exposure from station associate + optional frontage intel. */
export function scoreTrafficExposure(opts: {
  pick: CorridorParcelPick;
  stations: TrafficStation[];
  intel?: ParcelLocationIntel | null;
}): TrafficExposureScore {
  const assoc = associateParcelTraffic(opts.pick, opts.stations);
  const station = assoc.kind === "estimated" ? assoc.station : null;
  const aadt = station?.latestAadt ?? null;
  const factors = [
    volumePoints(aadt),
    growthPoints(station),
    frontagePoints(opts.intel ?? null),
    confidencePoints(
      opts.intel?.confidence ??
        (assoc.kind === "estimated" ? assoc.confidence : "limited"),
    ),
  ];
  const score = factors.reduce((s, f) => s + f.points, 0);
  const maxScore = factors.reduce((s, f) => s + f.maxPoints, 0);
  return {
    score,
    maxScore,
    band: bandFromScore(score, maxScore),
    factors,
    ruleVersion: TRAFFIC_EXPOSURE_RULE_VERSION,
    vehiclesPerDay: aadt,
    intensity: aadt != null ? trafficIntensityClass(aadt) : null,
    corridorStatus: station
      ? corridorStatusFromHistory(station.history).status
      : null,
  };
}

/** Commercial Exposure = traffic exposure + land factor (land-first). */
export function scoreCommercialExposure(opts: {
  pick: CorridorParcelPick;
  stations: TrafficStation[];
  intel?: ParcelLocationIntel | null;
  legalAcreage?: number | null;
}): CommercialExposureScore {
  const traffic = scoreTrafficExposure(opts);
  const land = acreagePoints(opts.legalAcreage ?? opts.pick.legalAcreage);
  const factors = [...traffic.factors, land];
  const score = factors.reduce((s, f) => s + f.points, 0);
  const maxScore = factors.reduce((s, f) => s + f.maxPoints, 0);
  return {
    score,
    maxScore,
    band: bandFromScore(score, maxScore),
    factors,
    traffic,
    ruleVersion: COMMERCIAL_EXPOSURE_RULE_VERSION,
  };
}

export function rankSitesByCommercialExposure(opts: {
  parcels: Array<{
    propId: string;
    source: string;
    centroidLat: number;
    centroidLng: number;
    situsAddress?: string | null;
    ownerName?: string | null;
    legalAcreage?: number | null;
    marketValue?: number | null;
  }>;
  stations: TrafficStation[];
  limit?: number;
}): RankedSite[] {
  const limit = opts.limit ?? 12;
  const scored = opts.parcels
    .filter(
      (p) =>
        Number.isFinite(p.centroidLat) && Number.isFinite(p.centroidLng),
    )
    .map((p) => {
      const pick: CorridorParcelPick = {
        propId: p.propId,
        source: p.source,
        lat: p.centroidLat,
        lng: p.centroidLng,
        situsAddress: p.situsAddress ?? null,
        ownerName: p.ownerName ?? null,
        legalAcreage: p.legalAcreage ?? null,
        marketValue: p.marketValue ?? null,
      };
      const commercial = scoreCommercialExposure({
        pick,
        stations: opts.stations,
        legalAcreage: p.legalAcreage,
      });
      return {
        propId: p.propId,
        source: p.source,
        lat: p.centroidLat,
        lng: p.centroidLng,
        situsAddress: p.situsAddress ?? null,
        ownerName: p.ownerName ?? null,
        legalAcreage: p.legalAcreage ?? null,
        marketValue: p.marketValue ?? null,
        commercial,
        rank: 0,
      } satisfies RankedSite;
    })
    .sort((a, b) => b.commercial.score - a.commercial.score)
    .slice(0, limit);

  return scored.map((s, i) => ({ ...s, rank: i + 1 }));
}

export function exposureBandLabel(
  band: TrafficExposureScore["band"],
): string {
  switch (band) {
    case "strong":
      return "Strong exposure";
    case "solid":
      return "Solid exposure";
    case "moderate":
      return "Moderate exposure";
    default:
      return "Limited exposure";
  }
}

/** Map fill color steps for commercial exposure choropleth (land). */
export function exposureScoreColor(score: number, maxScore: number): string {
  const pct = maxScore > 0 ? score / maxScore : 0;
  if (pct >= 0.72) return "#C4A35A"; // gold
  if (pct >= 0.52) return "#8B7355";
  if (pct >= 0.32) return "#5C6B73";
  return "#3D4A52";
}
