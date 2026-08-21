/**
 * Parcel position engine — Phase 2.
 * Founder Interpreter (build process only) — not a product.
 *
 * ROAD → published traffic observation → THIS parcel's frontage → parcel.
 * Never assign a nearby station just because the centroid is close.
 * Never add two roads' AADT. Never copy a neighbor's derived fields.
 *
 * Rule version: parcel-position-engine-v1
 */

import { MIN_FRONTAGE_FT, type ParcelLocationIntel } from "@/lib/shi/corridor-frontage";
import type { TrafficStation } from "@/lib/shi/corridors";
import {
  buildParcelPosition,
  type ParcelPositionRecord,
  type ParcelRoadExposure,
  type ParcelTrafficFact,
} from "@/lib/shi/parcel-position";

export const PARCEL_POSITION_ENGINE_VERSION =
  "parcel-position-engine-v1" as const;

/** Miles — only among stations that already match the frontage road. */
export const FRONTAGE_STATION_MAX_MILES = 2;

const CLASS_ALIASES: Array<[RegExp, string]> = [
  [/^STATEHIGHWAY/, "SH"],
  [/^USHIGHWAY/, "US"],
  [/^FARMTOMARKET/, "FM"],
  [/^INTERSTATE/, "IH"],
  [/^HIGHWAY/, "SH"],
];

/**
 * US 190 · US0190 · US0190-KG · FM 350 · FM0350 → US190 / FM350.
 */
export function roadMatchKey(raw: string | null | undefined): string {
  if (!raw) return "";
  let s = raw.trim().toUpperCase();
  s = s.replace(/-[A-Z]{1,6}$/g, "");
  s = s.replace(/[^A-Z0-9]+/g, "");
  for (const [re, to] of CLASS_ALIASES) s = s.replace(re, to);
  s = s.replace(/^I(?=\d)/, "IH");
  const m = s.match(/^([A-Z]+)0*(\d+)([A-Z]*)$/);
  if (!m) return s;
  return `${m[1]}${m[2]}${m[3]}`;
}

export function roadsLikelyMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const ka = roadMatchKey(a);
  const kb = roadMatchKey(b);
  return Boolean(ka && kb && ka === kb);
}

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
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(aLat)) * Math.cos(toR(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function matchStationToFrontageRoad(opts: {
  routeId: string;
  stations: TrafficStation[];
  lat?: number | null;
  lng?: number | null;
  maxMiles?: number;
}): { station: TrafficStation; distanceMiles: number | null } | null {
  const matches = opts.stations.filter((s) =>
    roadsLikelyMatch(s.onRoad, opts.routeId),
  );
  if (matches.length === 0) return null;

  const hasPoint =
    opts.lat != null &&
    opts.lng != null &&
    Number.isFinite(opts.lat) &&
    Number.isFinite(opts.lng);
  const maxMiles = opts.maxMiles ?? FRONTAGE_STATION_MAX_MILES;

  if (!hasPoint) {
    const station = [...matches].sort(
      (a, b) => (b.latestAadt ?? -1) - (a.latestAadt ?? -1),
    )[0]!;
    return { station, distanceMiles: null };
  }

  let best: { station: TrafficStation; miles: number } | null = null;
  for (const station of matches) {
    if (!Number.isFinite(station.lat) || !Number.isFinite(station.lng)) continue;
    const miles = haversineMiles(opts.lat!, opts.lng!, station.lat, station.lng);
    if (miles > maxMiles) continue;
    if (!best || miles < best.miles) best = { station, miles };
  }
  if (best) return { station: best.station, distanceMiles: best.miles };

  /* Same road, station farther than the window — still that road's published count. */
  const station = [...matches].sort(
    (a, b) => (b.latestAadt ?? -1) - (a.latestAadt ?? -1),
  )[0]!;
  const miles = haversineMiles(opts.lat!, opts.lng!, station.lat, station.lng);
  return {
    station,
    distanceMiles: Number.isFinite(miles) ? miles : null,
  };
}

function factFromStation(
  station: TrafficStation,
  distanceMiles: number | null,
): ParcelTrafficFact {
  return {
    vehiclesPerDay: station.latestAadt,
    year: station.latestYear,
    source: "txdot",
    sourceRecordId: station.stationId,
    road: station.onRoad,
    observationKind: "published_aadt",
    distanceMiles,
    history: station.history.map((h) => ({ ...h })),
  };
}

function factFromSegmentAadt(opts: {
  routeId: string;
  aadt: number;
  segmentId: string;
}): ParcelTrafficFact {
  return {
    vehiclesPerDay: opts.aadt,
    year: null,
    source: "txdot",
    sourceRecordId: opts.segmentId,
    road: opts.routeId,
    observationKind: "published_aadt",
    distanceMiles: null,
    history: [],
  };
}

/**
 * One parcel. One intel. No neighbor fields.
 */
export function deriveParcelPosition(opts: {
  propId: string;
  source?: string;
  intel: ParcelLocationIntel;
  stations: TrafficStation[];
  lat?: number | null;
  lng?: number | null;
  derivedAt?: string;
}): ParcelPositionRecord {
  const exposures: ParcelRoadExposure[] = [];

  for (const road of opts.intel.roads) {
    if (!road.routeId?.trim()) continue;
    if (road.approxFrontageFt < MIN_FRONTAGE_FT) continue;

    const hit = matchStationToFrontageRoad({
      routeId: road.routeId,
      stations: opts.stations,
      lat: opts.lat,
      lng: opts.lng,
    });

    let traffic: ParcelTrafficFact | null = null;
    if (hit) {
      traffic = factFromStation(hit.station, hit.distanceMiles);
    } else if (road.aadt != null && Number.isFinite(road.aadt)) {
      traffic = factFromSegmentAadt({
        routeId: road.routeId,
        aadt: road.aadt,
        segmentId: road.segmentId,
      });
    }

    exposures.push({
      road: road.routeId,
      approxFrontageFt: road.approxFrontageFt,
      traffic,
      segmentId: road.segmentId,
    });
  }

  const ix =
    opts.intel.intersectionRouteIds &&
    opts.intel.approxDistanceToIntersectionM != null
      ? {
          approxDistanceM: opts.intel.approxDistanceToIntersectionM,
          roads: opts.intel.intersectionRouteIds,
        }
      : null;

  const frontageSource =
    opts.intel.source === "postgis" || opts.intel.source === "client_approx"
      ? opts.intel.source
      : exposures.length > 0
        ? "client_approx"
        : "none";

  return buildParcelPosition({
    propId: opts.propId,
    source: opts.source,
    exposures,
    intersection: ix,
    frontageSource,
    derivedAt: opts.derivedAt,
  });
}
