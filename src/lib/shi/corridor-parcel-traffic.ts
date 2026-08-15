/**
 * Corridors 2.0-B — best-effort parcel ↔ traffic association (client).
 * No PostGIS segment join yet — always label honesty.
 *
 * Rule version: parcel-traffic-associate-v1
 */

import type { TrafficStation } from "@/lib/shi/corridors";
import {
  CORRIDOR_STATUS_LABEL,
  TRAFFIC_INTENSITY_LABEL,
  corridorStatusFromHistory,
  trafficIntensityClass,
  vehiclesPerDayCaption,
} from "@/lib/shi/corridor-language";

export const PARCEL_TRAFFIC_RULE_VERSION = "parcel-traffic-associate-v1" as const;

/** Miles — beyond this we refuse a nearby count. */
export const PARCEL_TRAFFIC_MAX_MILES = 2;

export type CorridorParcelPick = {
  propId: string;
  source?: string;
  countyFips?: string;
  situsAddress?: string | null;
  ownerName?: string | null;
  legalAcreage?: number | null;
  marketValue?: number | null;
  lat: number;
  lng: number;
};

export type ParcelTrafficAssociation =
  | {
      kind: "estimated";
      confidence: "high" | "moderate" | "limited";
      station: TrafficStation;
      distanceMiles: number;
      label: string;
      detail: string;
    }
  | {
      kind: "unavailable";
      confidence: "limited";
      label: string;
      detail: string;
    };

function haversineMiles(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 3958.7613;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(bLat - aLat);
  const dLng = toR(bLng - aLng);
  const lat1 = toR(aLat);
  const lat2 = toR(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Nearest published station within max miles.
 * Never claims "measured at property" without road-segment association (C2.0-C+).
 */
export function associateParcelTraffic(
  pick: CorridorParcelPick,
  stations: TrafficStation[],
  maxMiles = PARCEL_TRAFFIC_MAX_MILES,
): ParcelTrafficAssociation {
  let best: { station: TrafficStation; miles: number } | null = null;
  for (const s of stations) {
    if (!Number.isFinite(s.lat) || !Number.isFinite(s.lng)) continue;
    const miles = haversineMiles(pick.lat, pick.lng, s.lat, s.lng);
    if (miles > maxMiles) continue;
    if (!best || miles < best.miles) best = { station: s, miles };
  }

  if (!best) {
    return {
      kind: "unavailable",
      confidence: "limited",
      label: "Limited data",
      detail: `No published TxDOT count within ${maxMiles} miles of this parcel (${PARCEL_TRAFFIC_RULE_VERSION}).`,
    };
  }

  const confidence: "high" | "moderate" | "limited" =
    best.miles <= 0.15 ? "high" : best.miles <= 0.5 ? "moderate" : "limited";

  return {
    kind: "estimated",
    confidence,
    station: best.station,
    distanceMiles: best.miles,
    label: "Estimated traffic exposure",
    detail: `Nearest published count is ${best.miles.toFixed(2)} mi away${
      best.station.onRoad ? ` on ${best.station.onRoad}` : ""
    }. Not measured at the property boundary — segment frontage arrives in a later wave (${PARCEL_TRAFFIC_RULE_VERSION}).`,
  };
}

export function parcelTrafficSummary(assoc: ParcelTrafficAssociation): {
  vehiclesLabel: string;
  caption: string;
  intensity: string | null;
  status: string | null;
  statusWhy: string | null;
} {
  if (assoc.kind === "unavailable") {
    return {
      vehiclesLabel: "—",
      caption: assoc.label,
      intensity: null,
      status: null,
      statusWhy: assoc.detail,
    };
  }
  const s = assoc.station;
  const status = corridorStatusFromHistory(s.history);
  return {
    vehiclesLabel:
      s.latestAadt != null && Number.isFinite(s.latestAadt)
        ? Math.round(s.latestAadt).toLocaleString("en-US")
        : "—",
    caption: vehiclesPerDayCaption(s.latestYear),
    intensity: TRAFFIC_INTENSITY_LABEL[trafficIntensityClass(s.latestAadt)],
    status: CORRIDOR_STATUS_LABEL[status.status],
    statusWhy: status.why,
  };
}

export function formatAcres(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} acres`;
}
