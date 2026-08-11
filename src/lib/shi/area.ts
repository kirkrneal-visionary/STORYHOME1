import type { SupabaseClient } from "@supabase/supabase-js";
import {
  distanceMiles,
  pointInBounds,
  pointInPolygon,
  type DrawnBoundary,
  type LatLng,
  type MapBounds,
} from "@/lib/geo";
import { SHI_CAPS } from "@/lib/shi/caps";
import type { ShiAreaAnalysis, ShiAreaParcel } from "@/lib/shi/types";

const AREA_SELECT =
  "prop_id, source, county_fips, owner_name, situs_address, legal_acreage, market_value, land_value, improvement_value, property_category, centroid_lat, centroid_lng";

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
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * On-demand Market Frame analysis.
 * County-locked when source provided. Bounded query — never full-county dump.
 * Returns individual parcel values + estimated area market total.
 */
export async function analyzeArea(
  supabase: SupabaseClient,
  opts: { boundary: DrawnBoundary; source?: string },
): Promise<ShiAreaAnalysis> {
  if (!opts.source) {
    throw new Error("Pick a county before analyzing a market frame");
  }

  const bounds = boundsOf(opts.boundary);
  if (!bounds) {
    throw new Error("Draw a box or radius first");
  }

  const latSpan = bounds.north - bounds.south;
  const lngSpan = bounds.east - bounds.west;
  if (latSpan <= 0 || lngSpan <= 0) {
    throw new Error("Invalid frame size");
  }
  if (
    latSpan < SHI_CAPS.minAreaSpanDegrees &&
    lngSpan < SHI_CAPS.minAreaSpanDegrees
  ) {
    throw new Error("Frame is too small — draw a larger box");
  }
  if (
    latSpan > SHI_CAPS.maxAreaSpanDegrees ||
    lngSpan > SHI_CAPS.maxAreaSpanDegrees
  ) {
    throw new Error(
      "Frame is too large — zoom in or draw a smaller market box (safety cap)",
    );
  }

  const { data, error } = await supabase
    .from("county_parcels")
    .select(AREA_SELECT)
    .eq("source", opts.source)
    .gte("centroid_lat", bounds.south)
    .lte("centroid_lat", bounds.north)
    .gte("centroid_lng", bounds.west)
    .lte("centroid_lng", bounds.east)
    .not("centroid_lat", "is", null)
    .not("centroid_lng", "is", null)
    .limit(SHI_CAPS.maxParcelsPerAnalyze);
  if (error) throw new Error(error.message);

  const parcels: ShiAreaParcel[] = [];
  const acres: number[] = [];
  const values: number[] = [];
  let realCount = 0;
  let personalCount = 0;
  let estimatedTotalMarketValue = 0;
  let valuedParcelCount = 0;

  for (const row of data ?? []) {
    const lat = Number(row.centroid_lat);
    const lng = Number(row.centroid_lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (!inBoundary({ lat, lng }, opts.boundary)) continue;

    const marketValue = num(row.market_value);
    const legalAcreage = num(row.legal_acreage);
    if (legalAcreage != null) acres.push(legalAcreage);
    if (marketValue != null) {
      values.push(marketValue);
      estimatedTotalMarketValue += marketValue;
      valuedParcelCount += 1;
    }
    if (row.property_category === "personal") personalCount += 1;
    else if (row.property_category === "real") realCount += 1;

    parcels.push({
      propId: String(row.prop_id ?? ""),
      source: String(row.source ?? opts.source),
      ownerName: (row.owner_name as string | null) ?? null,
      situsAddress: (row.situs_address as string | null) ?? null,
      legalAcreage,
      marketValue,
      landValue: num(row.land_value),
      improvementValue: num(row.improvement_value),
      propertyCategory:
        (row.property_category as "real" | "personal" | null) ?? null,
      centroidLat: lat,
      centroidLng: lng,
    });
  }

  const scanned = (data ?? []).length;
  const hitCap = scanned >= SHI_CAPS.maxParcelsPerAnalyze;

  return {
    parcelCount: parcels.length,
    realCount,
    personalCount,
    totalAcres: acres.reduce((s, n) => s + n, 0),
    medianAcres: median(acres),
    medianMarketValue: median(values),
    estimatedTotalMarketValue,
    valuedParcelCount,
    method: "centroid_in_boundary",
    countySource: opts.source,
    note: hitCap
      ? `Hit safety cap (${SHI_CAPS.maxParcelsPerAnalyze} scan) — draw a smaller frame for a complete estimate.`
      : `Estimated area value sums CAD market_value on ${valuedParcelCount} valued parcels inside the frame (centroids).`,
    parcels,
  };
}

/** @deprecated alias — keep older imports compiling */
export type ShiAreaMetrics = Pick<
  ShiAreaAnalysis,
  | "parcelCount"
  | "realCount"
  | "personalCount"
  | "totalAcres"
  | "medianAcres"
  | "medianMarketValue"
  | "method"
  | "note"
>;
