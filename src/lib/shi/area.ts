import type { SupabaseClient } from "@supabase/supabase-js";
import {
  distanceMiles,
  pointInBounds,
  pointInPolygon,
  type DrawnBoundary,
  type LatLng,
  type MapBounds,
} from "@/lib/geo";
import type { ShiAreaMetrics } from "@/lib/shi/types";

const AREA_SELECT =
  "prop_id, source, county_fips, legal_acreage, market_value, property_category, centroid_lat, centroid_lng";

function boundsOf(boundary: DrawnBoundary): MapBounds | null {
  if (boundary.type === "rectangle" || boundary.type === "viewport") {
    return boundary.bounds;
  }
  if (boundary.type === "circle") {
    const { center, radiusMiles } = boundary;
    const latR = radiusMiles / 69;
    const lngR =
      radiusMiles / (69 * Math.max(0.2, Math.cos((center.lat * Math.PI) / 180)));
    return {
      north: center.lat + latR,
      south: center.lat - latR,
      east: center.lng + lngR,
      west: center.lng - lngR,
    };
  }
  if (boundary.type === "polygon" && boundary.points.length >= 3) {
    let north = -90;
    let south = 90;
    let east = -180;
    let west = 180;
    for (const p of boundary.points) {
      north = Math.max(north, p.lat);
      south = Math.min(south, p.lat);
      east = Math.max(east, p.lng);
      west = Math.min(west, p.lng);
    }
    return { north, south, east, west };
  }
  return null;
}

function inBoundary(point: LatLng, boundary: DrawnBoundary): boolean {
  if (boundary.type === "polygon") {
    return pointInPolygon(point, boundary.points);
  }
  if (boundary.type === "circle") {
    return distanceMiles(point, boundary.center) <= boundary.radiusMiles;
  }
  return pointInBounds(point, boundary.bounds);
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Area analysis via centroid-in-boundary (bounded bbox query).
 * Geometry-accurate ST_Intersects can replace this later; no full-county download.
 */
export async function analyzeArea(
  supabase: SupabaseClient,
  opts: { boundary: DrawnBoundary; source?: string },
): Promise<ShiAreaMetrics> {
  const bounds = boundsOf(opts.boundary);
  if (!bounds) {
    throw new Error("Draw a rectangle, radius, or polygon first");
  }

  const latSpan = bounds.north - bounds.south;
  const lngSpan = bounds.east - bounds.west;
  if (latSpan > 0.6 || lngSpan > 0.6 || latSpan <= 0 || lngSpan <= 0) {
    throw new Error("Area is too large — zoom in or draw a smaller area");
  }

  let req = supabase
    .from("county_parcels")
    .select(AREA_SELECT)
    .gte("centroid_lat", bounds.south)
    .lte("centroid_lat", bounds.north)
    .gte("centroid_lng", bounds.west)
    .lte("centroid_lng", bounds.east)
    .not("centroid_lat", "is", null)
    .not("centroid_lng", "is", null)
    .limit(2500);

  if (opts.source) req = req.eq("source", opts.source);

  const { data, error } = await req;
  if (error) throw new Error(error.message);

  const acres: number[] = [];
  const values: number[] = [];
  let realCount = 0;
  let personalCount = 0;
  let parcelCount = 0;

  for (const row of data ?? []) {
    const lat = Number(row.centroid_lat);
    const lng = Number(row.centroid_lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (!inBoundary({ lat, lng }, opts.boundary)) continue;
    parcelCount += 1;
    const a = row.legal_acreage == null ? null : Number(row.legal_acreage);
    if (a != null && Number.isFinite(a)) acres.push(a);
    const v = row.market_value == null ? null : Number(row.market_value);
    if (v != null && Number.isFinite(v)) values.push(v);
    if (row.property_category === "personal") personalCount += 1;
    else if (row.property_category === "real") realCount += 1;
  }

  const scanned = (data ?? []).length;
  return {
    parcelCount,
    realCount,
    personalCount,
    totalAcres: acres.reduce((s, n) => s + n, 0),
    medianAcres: median(acres),
    medianMarketValue: median(values),
    method: "centroid_in_boundary",
    note:
      scanned >= 2500
        ? "Hit scan cap (2,500) — draw a smaller area for complete metrics."
        : "Metrics use parcel centroids inside your drawn area (not full polygon clip).",
  };
}
