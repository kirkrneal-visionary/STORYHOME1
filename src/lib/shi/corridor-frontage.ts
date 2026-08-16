/**
 * Corridors 2.0-C + IX-1 — approx frontage, dual-road, confidence,
 * and approx meters to nearest mapped-road crossing.
 * Pure geometry helpers (armor + JS fallback when PostGIS cache is cold).
 *
 * Rule versions:
 * - corridor-frontage-v1
 * - corridor-data-confidence-v1
 * - corridor-intersection-v1
 */

import type { TrafficCorridorSegment, TrafficStation } from "@/lib/shi/corridors";
import type { EvidenceTier } from "@/lib/shi/evidence-tier";

export const CORRIDOR_FRONTAGE_RULE_VERSION = "corridor-frontage-v1" as const;
export const CORRIDOR_DATA_CONFIDENCE_RULE_VERSION =
  "corridor-data-confidence-v1" as const;
export const CORRIDOR_INTERSECTION_RULE_VERSION =
  "corridor-intersection-v1" as const;

/** Meters — road buffer for “touches / fronts” approximation. */
export const FRONTAGE_BUFFER_M = 35;
/** Minimum frontage feet to count a road as an exposure. */
export const MIN_FRONTAGE_FT = 25;
/** Meters — how close two different routes must be to count as a crossing. */
export const INTERSECTION_JOIN_M = 20;
/** Meters — only consider road segments within this of the parcel. */
export const INTERSECTION_SEARCH_M = 200;

export type FrontageRoadHit = {
  routeId: string;
  approxFrontageFt: number;
  aadt: number | null;
  segmentId: string;
};

export type IntersectionDistanceHit = {
  approxDistanceToIntersectionM: number;
  routeA: string;
  routeB: string;
};

export type ParcelLocationIntel = {
  roads: FrontageRoadHit[];
  /** Sum of approx frontage across roads (ft). */
  totalApproxFrontageFt: number;
  dualRoad: boolean;
  cornerLikely: boolean;
  /**
   * Approx meters from parcel centroid to nearest mapped-road crossing.
   * Null when unknown — never invent. Label APPROX; not a survey.
   */
  approxDistanceToIntersectionM: number | null;
  /** CALCULATED (PostGIS) · ESTIMATED (JS) · null when retracted. */
  intersectionTier: Extract<EvidenceTier, "CALCULATED" | "ESTIMATED"> | null;
  intersectionRuleVersion: typeof CORRIDOR_INTERSECTION_RULE_VERSION;
  intersectionRouteIds: [string, string] | null;
  confidence: "high" | "moderate" | "limited";
  confidenceWhy: string;
  ruleVersion: typeof CORRIDOR_FRONTAGE_RULE_VERSION;
  source: "postgis" | "client_approx" | "station_fallback";
};

function toRad(d: number) {
  return (d * Math.PI) / 180;
}

/** Local meters from lon/lat using equirectangular (fine for East Texas parcels). */
function project(
  lng: number,
  lat: number,
  originLng: number,
  originLat: number,
): [number, number] {
  const x =
    (toRad(lng - originLng) * 6371000) * Math.cos(toRad(originLat));
  const y = toRad(lat - originLat) * 6371000;
  return [x, y];
}

function dist2(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function distPointToSeg(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  if (ab2 <= 1e-9) return Math.sqrt(dist2(px, py, ax, ay));
  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt(dist2(px, py, ax + t * abx, ay + t * aby));
}

function ringCoords(
  geojson: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  },
): number[][] {
  if (geojson.type === "Polygon") {
    return (geojson.coordinates as number[][][])[0] ?? [];
  }
  const multi = geojson.coordinates as number[][][][];
  let best: number[][] = [];
  for (const poly of multi) {
    const ring = poly[0] ?? [];
    if (ring.length > best.length) best = ring;
  }
  return best;
}

function segmentPaths(
  geom: GeoJSON.LineString | GeoJSON.MultiLineString,
): number[][][] {
  if (geom.type === "LineString") return [geom.coordinates];
  return geom.coordinates;
}

/**
 * Approx frontage: exterior ring edges whose midpoint is within buffer of a road.
 * Returns feet per routeId. Label APPROX in UI.
 */
export function approxFrontageFromGeojson(opts: {
  parcelGeojson: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
  segments: TrafficCorridorSegment[];
  bufferM?: number;
}): FrontageRoadHit[] {
  const bufferM = opts.bufferM ?? FRONTAGE_BUFFER_M;
  const ring = ringCoords(opts.parcelGeojson);
  if (ring.length < 2 || opts.segments.length === 0) return [];

  const originLng = ring[0]![0]!;
  const originLat = ring[0]![1]!;
  const projectedRing = ring.map(([lng, lat]) =>
    project(lng!, lat!, originLng, originLat),
  );

  const roadMeters: {
    id: string;
    routeId: string;
    aadt: number | null;
    segs: Array<[number, number, number, number]>;
  }[] = opts.segments.map((s) => {
    const segs: Array<[number, number, number, number]> = [];
    for (const path of segmentPaths(s.geometry)) {
      for (let i = 0; i < path.length - 1; i++) {
        const a = project(path[i]![0]!, path[i]![1]!, originLng, originLat);
        const b = project(
          path[i + 1]![0]!,
          path[i + 1]![1]!,
          originLng,
          originLat,
        );
        segs.push([a[0], a[1], b[0], b[1]]);
      }
    }
    return { id: s.id, routeId: s.routeId, aadt: s.aadt, segs };
  });

  const byRoute = new Map<
    string,
    { ft: number; aadt: number | null; segmentId: string }
  >();

  for (let i = 0; i < projectedRing.length - 1; i++) {
    const [ax, ay] = projectedRing[i]!;
    const [bx, by] = projectedRing[i + 1]!;
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const edgeM = Math.sqrt(dist2(ax, ay, bx, by));
    if (edgeM < 0.5) continue;

    let best: { routeId: string; aadt: number | null; segmentId: string } | null =
      null;
    let bestD = Infinity;
    for (const road of roadMeters) {
      for (const [x1, y1, x2, y2] of road.segs) {
        const d = distPointToSeg(mx, my, x1, y1, x2, y2);
        if (d < bestD) {
          bestD = d;
          best = {
            routeId: road.routeId,
            aadt: road.aadt,
            segmentId: road.id,
          };
        }
      }
    }
    if (!best || bestD > bufferM) continue;
    const ft = edgeM * 3.28084;
    const prev = byRoute.get(best.routeId);
    if (!prev) {
      byRoute.set(best.routeId, {
        ft,
        aadt: best.aadt,
        segmentId: best.segmentId,
      });
    } else {
      prev.ft += ft;
      if (prev.aadt == null) prev.aadt = best.aadt;
    }
  }

  return [...byRoute.entries()]
    .map(([routeId, v]) => ({
      routeId,
      approxFrontageFt: Math.round(v.ft),
      aadt: v.aadt,
      segmentId: v.segmentId,
    }))
    .filter((r) => r.approxFrontageFt >= MIN_FRONTAGE_FT)
    .sort((a, b) => b.approxFrontageFt - a.approxFrontageFt);
}

export function buildParcelLocationIntel(opts: {
  roads: FrontageRoadHit[];
  source: ParcelLocationIntel["source"];
  observationYear?: number | null;
  stationNearby?: boolean;
  intersection?: IntersectionDistanceHit | null;
  intersectionTier?: ParcelLocationIntel["intersectionTier"];
}): ParcelLocationIntel {
  const roads = opts.roads;
  const totalApproxFrontageFt = roads.reduce(
    (s, r) => s + r.approxFrontageFt,
    0,
  );
  const dualRoad = roads.length >= 2;
  const cornerLikely =
    dualRoad &&
    roads[0]!.approxFrontageFt >= MIN_FRONTAGE_FT &&
    roads[1]!.approxFrontageFt >= MIN_FRONTAGE_FT;

  const year = opts.observationYear ?? null;
  const recent = year != null && year >= new Date().getFullYear() - 2;

  let confidence: ParcelLocationIntel["confidence"];
  let confidenceWhy: string;

  if (opts.source === "postgis" && roads.length > 0 && recent) {
    confidence = "high";
    confidenceWhy =
      "Recent published traffic and PostGIS parcel–road proximity (corridor-data-confidence-v1).";
  } else if (roads.length > 0 && (opts.source === "client_approx" || recent)) {
    confidence = "moderate";
    confidenceWhy =
      "Approx frontage from mapped roads + published counts — not surveyed (corridor-data-confidence-v1).";
  } else if (opts.stationNearby || roads.length > 0) {
    confidence = "limited";
    confidenceWhy =
      "Thin geometry or older/nearby count only — treat as directional (corridor-data-confidence-v1).";
  } else {
    confidence = "limited";
    confidenceWhy =
      "No recent verified count tied to a mapped road near this parcel (corridor-data-confidence-v1).";
  }

  const hit = opts.intersection ?? null;
  const intersectionTier =
    hit != null ? (opts.intersectionTier ?? "ESTIMATED") : null;

  return {
    roads,
    totalApproxFrontageFt,
    dualRoad,
    cornerLikely,
    approxDistanceToIntersectionM:
      hit != null ? Math.round(hit.approxDistanceToIntersectionM) : null,
    intersectionTier,
    intersectionRuleVersion: CORRIDOR_INTERSECTION_RULE_VERSION,
    intersectionRouteIds: hit
      ? ([hit.routeA, hit.routeB] as [string, string])
      : null,
    confidence,
    confidenceWhy,
    ruleVersion: CORRIDOR_FRONTAGE_RULE_VERSION,
    source: opts.source,
  };
}

/** Station-only fallback when parcel polygon / segments unavailable. */
export function stationFallbackIntel(
  stations: TrafficStation[],
  lat: number,
  lng: number,
): ParcelLocationIntel {
  let best: TrafficStation | null = null;
  let bestMiles = Infinity;
  for (const s of stations) {
    const dx = (s.lng - lng) * 69 * Math.cos(toRad(lat));
    const dy = (s.lat - lat) * 69;
    const miles = Math.sqrt(dx * dx + dy * dy);
    if (miles < bestMiles) {
      bestMiles = miles;
      best = s;
    }
  }
  if (!best || bestMiles > 2) {
    return buildParcelLocationIntel({
      roads: [],
      source: "station_fallback",
      stationNearby: false,
    });
  }
  return buildParcelLocationIntel({
    roads: [
      {
        routeId: best.onRoad || best.stationId,
        approxFrontageFt: 0,
        aadt: best.latestAadt,
        segmentId: best.id,
      },
    ],
    source: "station_fallback",
    observationYear: best.latestYear,
    stationNearby: true,
  });
}

export function formatApproxFrontageFt(ft: number): string {
  if (!Number.isFinite(ft) || ft <= 0) return "—";
  return `Approx. ${Math.round(ft).toLocaleString("en-US")} ft`;
}

/**
 * Closest points between two finite segments in local meters.
 * Returns midpoint when they nearly meet (join), or exact intersection.
 */
function nearCrossing(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
  joinM: number,
): [number, number] | null {
  const den = (ax - bx) * (cy - dy) - (ay - by) * (cx - dx);
  if (Math.abs(den) > 1e-9) {
    const t =
      ((ax - cx) * (cy - dy) - (ay - cy) * (cx - dx)) / den;
    const u =
      -((ax - bx) * (ay - cy) - (ay - by) * (ax - cx)) / den;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return [ax + t * (bx - ax), ay + t * (by - ay)];
    }
  }
  /* Near-miss: closest approach within join buffer */
  let bestD = Infinity;
  let best: [number, number] | null = null;
  const samples: Array<[number, number]> = [
    [ax, ay],
    [bx, by],
    [cx, cy],
    [dx, dy],
  ];
  for (const [px, py] of [
    [ax, ay],
    [bx, by],
  ] as const) {
    const d = distPointToSeg(px, py, cx, cy, dx, dy);
    if (d < bestD) {
      bestD = d;
      const abx = dx - cx;
      const aby = dy - cy;
      const ab2 = abx * abx + aby * aby;
      let t = ab2 <= 1e-9 ? 0 : ((px - cx) * abx + (py - cy) * aby) / ab2;
      t = Math.max(0, Math.min(1, t));
      const qx = cx + t * abx;
      const qy = cy + t * aby;
      best = [(px + qx) / 2, (py + qy) / 2];
    }
  }
  for (const [px, py] of [
    [cx, cy],
    [dx, dy],
  ] as const) {
    const d = distPointToSeg(px, py, ax, ay, bx, by);
    if (d < bestD) {
      bestD = d;
      const abx = bx - ax;
      const aby = by - ay;
      const ab2 = abx * abx + aby * aby;
      let t = ab2 <= 1e-9 ? 0 : ((px - ax) * abx + (py - ay) * aby) / ab2;
      t = Math.max(0, Math.min(1, t));
      const qx = ax + t * abx;
      const qy = ay + t * aby;
      best = [(px + qx) / 2, (py + qy) / 2];
    }
  }
  void samples;
  if (best && bestD <= joinM) return best;
  return null;
}

/**
 * IX-1 — approx meters from parcel centroid to nearest mapped-road crossing
 * (two different route_ids whose linework meets within join buffer).
 * Returns null on fail — never invent.
 */
export function approxIntersectionDistanceFromGeojson(opts: {
  parcelGeojson: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
  segments: TrafficCorridorSegment[];
  joinM?: number;
  searchM?: number;
}): IntersectionDistanceHit | null {
  const joinM = opts.joinM ?? INTERSECTION_JOIN_M;
  const searchM = opts.searchM ?? INTERSECTION_SEARCH_M;
  const ring = ringCoords(opts.parcelGeojson);
  if (ring.length < 3 || opts.segments.length < 2) return null;

  const originLng = ring[0]![0]!;
  const originLat = ring[0]![1]!;
  const projectedRing = ring.map(([lng, lat]) =>
    project(lng!, lat!, originLng, originLat),
  );
  let cx = 0;
  let cy = 0;
  for (const [x, y] of projectedRing) {
    cx += x;
    cy += y;
  }
  cx /= projectedRing.length;
  cy /= projectedRing.length;

  type Piece = {
    routeId: string;
    ax: number;
    ay: number;
    bx: number;
    by: number;
  };
  const pieces: Piece[] = [];
  for (const s of opts.segments) {
    for (const path of segmentPaths(s.geometry)) {
      for (let i = 0; i < path.length - 1; i++) {
        const a = project(path[i]![0]!, path[i]![1]!, originLng, originLat);
        const b = project(
          path[i + 1]![0]!,
          path[i + 1]![1]!,
          originLng,
          originLat,
        );
        const mx = (a[0] + b[0]) / 2;
        const my = (a[1] + b[1]) / 2;
        if (Math.sqrt(dist2(mx, my, cx, cy)) > searchM) continue;
        pieces.push({
          routeId: s.routeId,
          ax: a[0],
          ay: a[1],
          bx: b[0],
          by: b[1],
        });
      }
    }
  }
  if (pieces.length < 2) return null;

  let bestD = Infinity;
  let best: IntersectionDistanceHit | null = null;
  const limit = Math.min(pieces.length, 400);
  for (let i = 0; i < limit; i++) {
    const p = pieces[i]!;
    for (let j = i + 1; j < limit; j++) {
      const q = pieces[j]!;
      if (p.routeId === q.routeId) continue;
      const cross = nearCrossing(
        p.ax,
        p.ay,
        p.bx,
        p.by,
        q.ax,
        q.ay,
        q.bx,
        q.by,
        joinM,
      );
      if (!cross) continue;
      const d = Math.sqrt(dist2(cross[0], cross[1], cx, cy));
      if (d < bestD) {
        bestD = d;
        best = {
          approxDistanceToIntersectionM: d,
          routeA: p.routeId,
          routeB: q.routeId,
        };
      }
    }
  }
  return best;
}

export function formatApproxIntersectionM(meters: number | null): string {
  if (meters == null || !Number.isFinite(meters)) return "—";
  const m = Math.round(meters);
  if (m < 1) return "Approx. at mapped crossing";
  return `Approx. ${m.toLocaleString("en-US")} m to mapped crossing`;
}
